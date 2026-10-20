import { socketService } from '../services/socket.service';
import type { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { SignupSchema, LoginSchema, PreferencesSchema } from '@krama/validation';
import { authService, PasswordChangeError } from '../services/auth.service';
import { prisma } from '../prisma';
import { userAuthSelect } from '../utils/selectors';
import { rememberUserTimeZone } from '../services/userTimeZone.service';
import { handleControllerError } from '../utils/errors';

const getRefreshCookieOptions = (req: Request) => {
  const isSecure = process.env.COOKIE_SECURE !== undefined
    ? process.env.COOKIE_SECURE === 'true'
    : (process.env.NODE_ENV === 'production' && (req.secure || req.headers['x-forwarded-proto'] === 'https'));

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'strict' as const,
  };
};

export const signup = async (req: Request, res: Response) => {
  try {
    const validatedData = SignupSchema.parse(req.body);
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await authService.signup(validatedData, ip, userAgent);

    res.cookie('krama_refresh', result.refreshToken, {
      ...getRefreshCookieOptions(req),
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      accessToken: result.accessToken,
      // Also returned in-body so non-cookie clients (e.g. mobile or CLI apps)
      // can persist and replay it via req.body.refreshToken. The web app ignores
      // this and relies on the httpOnly cookie.
      refreshToken: result.refreshToken,
      user: result.user,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Email already in use') {
      return res.status(400).json({ message: error.message });
    }
    return handleControllerError(res, error);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const validatedData = LoginSchema.parse(req.body);
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await authService.login(validatedData, ip, userAgent);

    res.cookie('krama_refresh', result.refreshToken, {
      ...getRefreshCookieOptions(req),
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      accessToken: result.accessToken,
      // See signup: in-body copy for non-cookie clients.
      refreshToken: result.refreshToken,
      user: result.user,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid credentials') {
      return res.status(401).json({ message: error.message });
    }
    return handleControllerError(res, error);
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
      ...getRefreshCookieOptions(req),
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      accessToken: result.accessToken,
      // See signup: in-body copy for non-cookie clients so they can persist
      // the rotated refresh token.
      refreshToken: result.refreshToken,
    });
  } catch {
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.krama_refresh || req.body.refreshToken;
    if (refreshToken) {
      await authService.revokeSession(refreshToken);
    }
    res.clearCookie('krama_refresh', getRefreshCookieOptions(req));
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const logoutAll = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    await authService.revokeAllSessions(userId);
    res.clearCookie('krama_refresh', getRefreshCookieOptions(req));
    return res.status(200).json({ message: 'Logged out of all sessions' });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const me = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    await rememberUserTimeZone(userId, req.get('x-timezone'));
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userAuthSelect
    });

    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({ user });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid timezone') return res.status(400).json({ message: error.message });
    return handleControllerError(res, error);
  }
};

export const updatePreferences = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const parsed = PreferencesSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid preferences', errors: parsed.error.issues });
    const { timerPreferences, locationConfig, weeklyCapacityMinutes, focusWallpaper, focusLayout } = parsed.data;

    // Read and merge metadata under the same row lock as the write. Concurrent
    // layout and timer patches must not restore an older metadata snapshot.
    const updatedUser = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) return null;

      const currentMetadata = user.metadata && typeof user.metadata === 'object' && !Array.isArray(user.metadata) ? user.metadata : {};
      const savedTimer = currentMetadata.timerPreferences;
      const currentTimer = savedTimer && typeof savedTimer === 'object' && !Array.isArray(savedTimer) ? savedTimer : {};

      const updateData: Prisma.UserUpdateInput = {};
      if (timerPreferences !== undefined || focusWallpaper || focusLayout) {
        updateData.metadata = {
          ...currentMetadata,
          ...(timerPreferences !== undefined ? {
            timerPreferences: {
              ...currentTimer,
              ...timerPreferences
            }
          } : {}),
          ...(focusWallpaper ? { focusWallpaper } : {}),
          ...(focusLayout ? { focusLayout } : {})
        };
      }
      if (locationConfig) {
        updateData.countryCode = locationConfig.countryCode || 'IN';
        updateData.regionCode = locationConfig.regionCode ? locationConfig.regionCode : null;
      }
      if (weeklyCapacityMinutes !== undefined) {
        updateData.weeklyCapacityMinutes = weeklyCapacityMinutes;
      }

      return tx.user.update({
        where: { id: userId },
        data: updateData,
        select: userAuthSelect
      });
    });
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });

    socketService.emitToUser(userId, 'preferences:updated', {});
    return res.status(200).json({ user: updatedUser });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const changePassword = async (req: Request, res: Response) => {
  if (!req.user?.id || !req.user.sessionId) return res.status(401).json({ message: 'Unauthorized' });
  try {
    await authService.changePassword(req.user.id, req.user.sessionId, req.body);
    res.clearCookie('krama_refresh', getRefreshCookieOptions(req));
    return res.status(200).json({ message: 'Password changed. Sign in with your new password.' });
  } catch (error) {
    if (error instanceof PasswordChangeError) return res.status(error.status).json({ message: error.message });
    return handleControllerError(res, error, 'Unable to change password. Try again.');
  }
};
