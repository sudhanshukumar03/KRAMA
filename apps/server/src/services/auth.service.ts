import bcrypt from 'bcrypt';
import jwt from 'jwt-simple';
import crypto from 'crypto';
import { redisService } from './redis.service';
import { userRepository } from '../repositories/user.repository';
import { sessionRepository } from '../repositories/session.repository';
import { workspaceRepository } from '../repositories/workspace.repository';
import { runInTransaction } from '../prisma';

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

    return { 
      accessToken, 
      refreshToken,
      user: { 
        id: newUser.id, 
        email: newUser.email, 
        name: newUser.name,
        memberships: [{ workspaceId, role: 'OWNER' }]
      }
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
    const { passwordHash, ...safeUser } = user;
    return { accessToken, refreshToken, user: safeUser };
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

  async refresh(refreshToken: string, ip?: string, userAgent?: string) {
    const hash = this.hashRefreshToken(refreshToken);
    const cachedSessionStr = await redisService.get(`session:${hash}`);
    
    let sessionData = null;
    if (cachedSessionStr) {
      sessionData = JSON.parse(cachedSessionStr);
    } else {
      const dbSession = await sessionRepository.findByHash(hash);
      if (dbSession && !dbSession.revokedAt && dbSession.expiresAt > new Date()) {
        sessionData = { userId: dbSession.userId, expiresAt: dbSession.expiresAt, sessionId: dbSession.id };
        await redisService.set(`session:${hash}`, JSON.stringify(sessionData), Math.floor((dbSession.expiresAt.getTime() - Date.now()) / 1000));
      }
    }

    if (!sessionData || new Date(sessionData.expiresAt) < new Date()) {
      throw new Error('Invalid refresh token');
    }

    // Revoke old
    await this.revokeSession(refreshToken);

    // Create new
    return this.createSession(sessionData.userId, ip, userAgent);
  }
}

export const authService = new AuthService();
