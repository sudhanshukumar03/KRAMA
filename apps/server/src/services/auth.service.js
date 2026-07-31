import bcrypt from 'bcrypt';
import jwt from 'jwt-simple';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { redisService } from './redis.service';
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'krama-os-secret-jwt-key-2026';
const ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 mins
const REFRESH_TOKEN_EXPIRY_S = 30 * 24 * 60 * 60; // 30 days
export class AuthService {
    async hashPassword(password) {
        return bcrypt.hash(password, 12);
    }
    async verifyPassword(password, hash) {
        return bcrypt.compare(password, hash);
    }
    generateAccessToken(userId, sessionId, email, name) {
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
    generateRefreshToken() {
        return crypto.randomBytes(40).toString('hex');
    }
    hashRefreshToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
    async createSession(userId, ip, userAgent) {
        const refreshToken = this.generateRefreshToken();
        const refreshTokenHash = this.hashRefreshToken(refreshToken);
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_S * 1000);
        // Save to Postgres (Source of truth)
        const session = await prisma.session.create({
            data: {
                userId,
                refreshTokenHash,
                expiresAt,
                ip,
                userAgent,
            },
        });
        // Save to Redis (Fast path)
        await redisService.set(`session:${refreshTokenHash}`, JSON.stringify({ userId, expiresAt: expiresAt.toISOString(), sessionId: session.id }), REFRESH_TOKEN_EXPIRY_S);
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const accessToken = this.generateAccessToken(userId, session.id, user.email, user.name);
        return { accessToken, refreshToken };
    }
    async revokeSession(refreshToken) {
        const hash = this.hashRefreshToken(refreshToken);
        // Delete from Redis (Fast path)
        await redisService.del(`session:${hash}`);
        // Mark as revoked in Postgres
        await prisma.session.update({
            where: { refreshTokenHash: hash },
            data: { revokedAt: new Date() },
        }).catch(() => { });
    }
    async revokeAllSessions(userId) {
        const sessions = await prisma.session.findMany({
            where: { userId, revokedAt: null },
        });
        const pipeline = redisService.client.multi();
        for (const s of sessions) {
            pipeline.del(`session:${s.refreshTokenHash}`);
        }
        await pipeline.exec();
        await prisma.session.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }
}
export const authService = new AuthService();
//# sourceMappingURL=auth.service.js.map