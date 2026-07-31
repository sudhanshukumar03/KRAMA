import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { SignupSchema, LoginSchema } from '@krama/validation';
import { authService } from '../services/auth.service';
import { redisService } from '../services/redis.service';

const prisma = new PrismaClient();

export const signup = async (req: Request, res: Response) => {
  try {
    const validatedData = SignupSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const passwordHash = await authService.hashPassword(validatedData.password);

    // Create user, personal workspace, and owner membership atomically
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: validatedData.email,
          name: validatedData.name,
          passwordHash,
        },
      });

      const personalWorkspace = await tx.workspace.create({
        data: {
          name: `${validatedData.name || 'Personal'}'s Workspace`,
          createdBy: newUser.id,
        },
      });

      await tx.workspaceMember.create({
        data: {
          userId: newUser.id,
          workspaceId: personalWorkspace.id,
          role: 'OWNER',
        },
      });

      return newUser;
    });

    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const { accessToken, refreshToken } = await authService.createSession(user.id, ip, userAgent);

    res.cookie('krama_refresh', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      accessToken,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const validatedData = LoginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValid = await authService.verifyPassword(validatedData.password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const { accessToken, refreshToken } = await authService.createSession(user.id, ip, userAgent);

    res.cookie('krama_refresh', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      accessToken,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const refresh = async (req: Request, res: Response) => {
  const oldRefreshToken = req.cookies.krama_refresh;
  if (!oldRefreshToken) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const hash = authService.hashRefreshToken(oldRefreshToken);
  
  // Fast path Redis check
  const cachedStr = await redisService.get(`session:${hash}`);
  let userId = null;

  if (cachedStr) {
    const cached = JSON.parse(cachedStr);
    userId = cached.userId;
  } else {
    // Slow path Postgres fallback
    const dbSession = await prisma.session.findUnique({
      where: { refreshTokenHash: hash },
    });
    
    if (dbSession && dbSession.revokedAt === null && dbSession.expiresAt > new Date()) {
      userId = dbSession.userId;
    }
  }

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Rotate token to prevent replay attacks
  await authService.revokeSession(oldRefreshToken);
  
  const ip = req.ip || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];
  const { accessToken, refreshToken } = await authService.createSession(userId, ip, userAgent);

  res.cookie('krama_refresh', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  return res.status(200).json({
    accessToken,
    user: { id: user!.id, email: user!.email, name: user!.name },
  });
};

export const logout = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.krama_refresh;
  if (refreshToken) {
    await authService.revokeSession(refreshToken);
  }
  res.clearCookie('krama_refresh');
  return res.status(200).json({ message: 'Logged out' });
};

export const logoutAll = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  await authService.revokeAllSessions(req.user.id);
  res.clearCookie('krama_refresh');
  return res.status(200).json({ message: 'All sessions revoked' });
};

export const me = async (req: Request, res: Response) => {
  const userWithMemberships = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { memberships: true }
  });
  return res.status(200).json({ user: userWithMemberships });
};
