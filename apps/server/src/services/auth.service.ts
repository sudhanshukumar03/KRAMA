import bcrypt from 'bcrypt';
import jwt from 'jwt-simple';
import crypto from 'crypto';
import { redisService } from './redis.service';
import { userRepository } from '../repositories/user.repository';
import { sessionRepository } from '../repositories/session.repository';
import { workspaceRepository } from '../repositories/workspace.repository';
import { runInTransaction, prisma } from '../prisma';
import { userAuthSelect } from '../utils/selectors';

const JWT_SECRET = process.env.JWT_SECRET || 'krama-os-secret-jwt-key-2026';
const ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 mins
const REFRESH_TOKEN_EXPIRY_S = 30 * 24 * 60 * 60; // 30 days

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateAccessToken(userId: string, sessionId: string, email: string, name: string | null): string {
    const payload = {
      sub: userId,
      sessionId,
      email,
      name,
      iat: Date.now(),
      exp: Date.now() + ACCESS_TOKEN_EXPIRY_MS,
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

    const { newUser, workspaceId } = await runInTransaction(async (tx) => {
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

  async createSession(userId: string, ip?: string, userAgent?: string): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshToken = this.generateRefreshToken();
    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_S * 1000);

    const session = await sessionRepository.create({
      userId,
      refreshTokenHash,
      expiresAt,
      ip,
      userAgent,
    });

    await redisService.set(
      `session:${refreshTokenHash}`,
      JSON.stringify({ userId, expiresAt: expiresAt.toISOString(), sessionId: session.id }),
      REFRESH_TOKEN_EXPIRY_S
    );

    const user = await userRepository.findById(userId);
    const accessToken = this.generateAccessToken(userId, session.id, user!.email, user!.name);

    return { accessToken, refreshToken };
  }

  async revokeSession(refreshToken: string): Promise<void> {
    const hash = this.hashRefreshToken(refreshToken);
    await redisService.del(`session:${hash}`);
    await sessionRepository.updateByHash(hash, { revokedAt: new Date() }).catch(() => {});
  }

  async revokeAllSessions(userId: string): Promise<void> {
    const sessions = await sessionRepository.findActiveByUserId(userId);

    const pipeline = redisService.client.multi();
    for (const s of sessions) {
      pipeline.del(`session:${s.refreshTokenHash}`);
    }
    await pipeline.exec();

    await sessionRepository.updateManyActiveByUserId(userId, { revokedAt: new Date() });
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
    
    // Atomically consume from Redis if present
    const deletedCount = await redisService.del(`session:${hash}`);
    let sessionData = null;

    if (deletedCount === 1) {
      // It was in Redis, and WE atomically deleted it.
      // We must fetch it from DB to get the actual data since we deleted it without reading it.
      // Or rather, we should have read it first? If we read then delete, it's not atomic.
      // Wait, we can read from DB since it's the source of truth, and we know it was valid in Redis.
      const dbSession = await sessionRepository.findByHash(hash);
      if (dbSession && !dbSession.revokedAt && dbSession.expiresAt > new Date()) {
        sessionData = { userId: dbSession.userId, expiresAt: dbSession.expiresAt, sessionId: dbSession.id };
      }
    } else {
      // Not in Redis (or already consumed). We MUST use an atomic test-and-set in Postgres.
      // We update revokedAt to current time where it is currently null.
      const now = new Date();
      const updatedCount = await prisma.session.updateMany({
        where: { refreshTokenHash: hash, revokedAt: null, expiresAt: { gt: now } },
        data: { revokedAt: now }
      });
      
      if (updatedCount.count === 1) {
        // We atomically consumed it! Now fetch the details to generate the new session.
        const dbSession = await sessionRepository.findByHash(hash);
        if (dbSession) {
          sessionData = { userId: dbSession.userId, expiresAt: dbSession.expiresAt, sessionId: dbSession.id };
        }
      }
    }

    if (!sessionData) {
      throw new Error('Invalid or already consumed refresh token');
    }

    // Ensure it's revoked in DB if we consumed it from Redis
    if (deletedCount === 1) {
      await sessionRepository.updateByHash(hash, { revokedAt: new Date() }).catch(() => {});
    }

    // Create new
    return this.createSession(sessionData.userId, ip, userAgent);
  }
}

export const authService = new AuthService();
