import bcrypt from 'bcrypt';
import jwt from 'jwt-simple';
import crypto from 'crypto';
import { redisService } from './redis.service';
import { socketService } from './socket.service';
import { userRepository } from '../repositories/user.repository';
import { sessionRepository } from '../repositories/session.repository';
import { workspaceRepository } from '../repositories/workspace.repository';
import { runInTransaction, prisma } from '../prisma';
import { userAuthSelect } from '../utils/selectors';

const JWT_SECRET = process.env.JWT_SECRET as string;
const ACCESS_TOKEN_EXPIRY_S = 15 * 60; // 15 mins
const REFRESH_TOKEN_EXPIRY_S = 30 * 24 * 60 * 60; // 30 days

class AuthService {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateAccessToken(userId: string, sessionId: string, email: string, name: string | null): string {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const payload = {
      sub: userId,
      sessionId,
      email,
      name,
      // RFC 7519: iat/exp are NumericDate (seconds since epoch). jwt-simple
      // enforces exp as `Date.now() > exp * 1000`, so seconds are required.
      iat: nowInSeconds,
      exp: nowInSeconds + ACCESS_TOKEN_EXPIRY_S,
    };
    return jwt.encode(payload, JWT_SECRET, 'HS256');
  }

  generateRefreshToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  hashRefreshToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async signup(data: any, ip?: string, userAgent?: string) {
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Error('Email already in use');
    }

    const passwordHash = await this.hashPassword(data.password);

    const { newUser } = await runInTransaction(async (tx) => {
      const createdUser = await userRepository.create({
        email: data.email,
        name: data.name,
        passwordHash,
      }, tx);

      const personalWorkspace = await workspaceRepository.create({
        name: `${data.name || 'Personal'}'s Workspace`,
        createdBy: createdUser.id,
      }, tx);

      await workspaceRepository.addMember(personalWorkspace.id, createdUser.id, 'OWNER', tx);

      return { newUser: createdUser, workspaceId: personalWorkspace.id };
    });

    const { accessToken, refreshToken } = await this.createSession(newUser.id, ip, userAgent);
    const finalUser = await prisma.user.findUnique({ where: { id: newUser.id }, select: userAuthSelect });

    return { 
      accessToken, 
      refreshToken,
      user: finalUser
    };
  }

  async login(data: any, ip?: string, userAgent?: string) {
    const user = await userRepository.findByEmail(data.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValid = await this.verifyPassword(data.password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    const { accessToken, refreshToken } = await this.createSession(user.id, ip, userAgent);
    const finalUser = await prisma.user.findUnique({ where: { id: user.id }, select: userAuthSelect });
    
    return { accessToken, refreshToken, user: finalUser };
  }

  async createSession(userId: string, ip?: string, userAgent?: string, familyId?: string): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshToken = this.generateRefreshToken();
    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_S * 1000);
    const newFamilyId = familyId || crypto.randomUUID();

    const session = await sessionRepository.create({
      userId,
      familyId: newFamilyId,
      refreshTokenHash,
      expiresAt,
      ip,
      userAgent,
    });

    await redisService.set(
      `session:${refreshTokenHash}`,
      JSON.stringify({ userId, expiresAt: expiresAt.toISOString(), sessionId: session.id, familyId: newFamilyId }),
      REFRESH_TOKEN_EXPIRY_S
    );

    const user = await userRepository.findById(userId);
    const accessToken = this.generateAccessToken(userId, session.id, user!.email, user!.name);

    return { accessToken, refreshToken };
  }

  async revokeSession(refreshToken: string): Promise<void> {
    const hash = this.hashRefreshToken(refreshToken);
    const session = await sessionRepository.findByHash(hash);
    if (!session) return;
    await sessionRepository.updateByHash(hash, { revokedAt: new Date() });
    await this.invalidateSession(session);
  }

  private async invalidateSession(session: { id: string; refreshTokenHash: string }, disconnect = true): Promise<void> {
    // Both HTTP and Socket.IO authorization consult this key. Overwrite the
    // positive cache rather than leaving a revoked session valid for its TTL.
    await redisService.set(`session_revoked:${session.id}`, 'true', ACCESS_TOKEN_EXPIRY_S);
    await redisService.del(`session:${session.refreshTokenHash}`);
    await redisService.del(`grace:${session.refreshTokenHash}`);
    if (disconnect) socketService.revokeSessionConnections(session.id);
  }

  async revokeAllSessions(userId: string): Promise<void> {
    const sessions = await sessionRepository.findActiveByUserId(userId);
    await sessionRepository.updateManyActiveByUserId(userId, { revokedAt: new Date() });
    await Promise.all(sessions.map((session) => this.invalidateSession(session)));
  }

  private inFlightRefreshes = new Map<string, Promise<{ accessToken: string; refreshToken: string }>>();

  async refresh(refreshToken: string, ip?: string, userAgent?: string) {
    if (this.inFlightRefreshes.has(refreshToken)) {
      return this.inFlightRefreshes.get(refreshToken)!;
    }

    const refreshPromise = this._executeRefresh(refreshToken, ip, userAgent);
    this.inFlightRefreshes.set(refreshToken, refreshPromise);

    try {
      return await refreshPromise;
    } finally {
      this.inFlightRefreshes.delete(refreshToken);
    }
  }

  private async _executeRefresh(refreshToken: string, ip?: string, userAgent?: string) {
    const hash = this.hashRefreshToken(refreshToken);
    
    if (redisService.isConnected) {
      const graceData = await redisService.get(`grace:${hash}`);
      if (graceData) {
        try {
          const parsed = JSON.parse(graceData);
          return { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken };
        } catch {}
      }
    }
    
    // Atomically consume from Redis if present
    const deletedCount = await redisService.del(`session:${hash}`);
    let sessionData = null;
    let dbSession = null;

    if (deletedCount === 1) {
      dbSession = await sessionRepository.findByHash(hash);
      if (dbSession && !dbSession.revokedAt && dbSession.expiresAt > new Date()) {
        sessionData = { userId: dbSession.userId, expiresAt: dbSession.expiresAt, sessionId: dbSession.id, familyId: dbSession.familyId };
      }
    } else {
      // We lost the race to delete in Redis, or Redis didn't have it.
      // Another node might be creating the grace token right now. Wait briefly.
      if (redisService.isConnected) {
        for (let i = 0; i < 3; i++) {
          await new Promise(resolve => setTimeout(resolve, 400));
          const retryGrace = await redisService.get(`grace:${hash}`);
          if (retryGrace) {
            try {
              const parsed = JSON.parse(retryGrace);
              return { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken };
            } catch {}
          }
        }
      }

      // If still no grace token, it might be genuine reuse or Redis was flushed. Fallback to DB.
      const now = new Date();
      const updatedCount = await prisma.session.updateMany({
        where: { refreshTokenHash: hash, revokedAt: null, expiresAt: { gt: now } },
        data: { revokedAt: now }
      });
      
      if (updatedCount.count === 1) {
        dbSession = await sessionRepository.findByHash(hash);
        if (dbSession) {
          sessionData = { userId: dbSession.userId, expiresAt: dbSession.expiresAt, sessionId: dbSession.id, familyId: dbSession.familyId };
        }
      }
    }

    if (!sessionData) {
      dbSession = dbSession || await sessionRepository.findByHash(hash);
      if (dbSession && dbSession.familyId) {
        await this.revokeFamily(dbSession.familyId);
      }
      throw new Error('Invalid or already consumed refresh token');
    }

    // Ensure it's revoked in DB if we consumed it from Redis
    if (deletedCount === 1) {
      await sessionRepository.updateByHash(hash, { revokedAt: new Date() });
    }
    await this.invalidateSession({ id: sessionData.sessionId, refreshTokenHash: hash }, false);

    // Create new
    const newPair = await this.createSession(sessionData.userId, ip, userAgent, sessionData.familyId);
    
    if (redisService.isConnected) {
      await redisService.set(`grace:${hash}`, JSON.stringify(newPair), 10);
    }
    
    // Publish rotation only after its replacement/grace pair can be recovered.
    socketService.revokeSessionConnections(sessionData.sessionId, 'rotated');
    return newPair;
  }

  async revokeFamily(familyId: string): Promise<void> {
    const sessions = await sessionRepository.findActiveByFamilyId(familyId);
    await sessionRepository.updateManyActiveByFamilyId(familyId, { revokedAt: new Date() });
    await Promise.all(sessions.map((session) => this.invalidateSession(session)));
  }
}

export const authService = new AuthService();
