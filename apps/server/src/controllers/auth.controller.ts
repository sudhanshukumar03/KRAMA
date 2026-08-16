import type { Request, Response } from 'express';
import { SignupSchema, LoginSchema } from '@krama/validation';
import { authService } from '../services/auth.service';
import { prisma } from '../prisma';
import { userAuthSelect } from '../utils/selectors';

export const signup = async (req: Request, res: Response) => {
  try {
    const validatedData = SignupSchema.parse(req.body);
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await authService.signup(validatedData, ip, userAgent);

    res.cookie('krama_refresh', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    if (error.message === 'Email already in use') {
      return res.status(400).json({ message: error.message });
    }
    console.error(error); return res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const validatedData = LoginSchema.parse(req.body);
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await authService.login(validatedData, ip, userAgent);

    res.cookie('krama_refresh', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({ message: error.message });
    }
    console.error('Login error:', error);
    console.error(error); return res.status(500).json({ message: 'Internal server error' });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.krama_refresh || req.body.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token provided' });
    }

    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await authService.refresh(refreshToken, ip, userAgent);

    res.cookie('krama_refresh', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({ accessToken: result.accessToken });
  } catch (error: any) {
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.krama_refresh || req.body.refreshToken;
    if (refreshToken) {
      await authService.revokeSession(refreshToken);
    }
    res.clearCookie('krama_refresh', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    console.error(error); return res.status(500).json({ message: 'Internal server error' });
  }
};

export const logoutAll = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    await authService.revokeAllSessions(userId);
    res.clearCookie('krama_refresh', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    return res.status(200).json({ message: 'Logged out of all sessions' });
  } catch (error) {
    console.error('LogoutAll error:', error);
    console.error(error); return res.status(500).json({ message: 'Internal server error' });
  }
};

export const me = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userAuthSelect
    });

    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({ user });
  } catch (error) {
    console.error(error); return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updatePreferences = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user.id;
    const { timerPreferences } = req.body;

    if (!timerPreferences) {
      return res.status(400).json({ message: 'timerPreferences object is required' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const currentMetadata = (user.metadata as Record<string, any>) || {};

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        metadata: {
          ...currentMetadata,
          timerPreferences: {
            ...(currentMetadata.timerPreferences || {}),
            ...timerPreferences
          }
        }
      },
      select: userAuthSelect
    });

    return res.status(200).json({ user: updatedUser });
  } catch (error) {
    console.error('Error updating user preferences', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
