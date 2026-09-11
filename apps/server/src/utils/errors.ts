import type { Response } from 'express';
import { ZodError } from 'zod';
import { logger } from './logger';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', isOperational = true) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export function handleControllerError(res: Response, error: any, defaultMessage = 'Internal server error') {
  // 1. Zod validation error
  if (error instanceof ZodError) {
    const primaryMessage = error.issues[0]?.message || 'Validation failed';
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_FAILED',
      message: primaryMessage,
      errors: error.issues,
    });
  }

  // 2. Custom AppError
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      code: error.code,
      message: error.message,
    });
  }

  // 3. JWT Authentication Errors
  if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Invalid or expired session token.',
    });
  }

  // 4. Prisma Known Request Errors
  if (error?.code === 'P2025') {
    return res.status(404).json({
      success: false,
      code: 'NOT_FOUND',
      message: error.message || 'Requested resource was not found.',
    });
  }

  if (error?.code === 'P2002') {
    return res.status(409).json({
      success: false,
      code: 'CONFLICT',
      message: 'A unique constraint was violated.',
      target: error.meta?.target,
    });
  }

  if (error?.code === 'P2003') {
    return res.status(400).json({
      success: false,
      code: 'FOREIGN_KEY_VIOLATION',
      message: 'Referenced entity does not exist.',
      field: error.meta?.field_name,
    });
  }

  if (error?.name === 'PrismaClientValidationError') {
    return res.status(400).json({
      success: false,
      code: 'INVALID_QUERY_ARGUMENT',
      message: 'Invalid database query parameters provided.',
    });
  }

  // 5. Explicit "Not Found" convention
  if (error?.message === 'Task not found' || error?.message?.toLowerCase().includes('not found')) {
    return res.status(404).json({
      success: false,
      code: 'NOT_FOUND',
      message: error.message,
    });
  }

  // 6. Log internal / unexpected errors
  logger.error(defaultMessage, { error: error?.message || error, stack: error?.stack });

  const statusCode = error?.statusCode || error?.status || 500;
  const isDev = process.env.NODE_ENV === 'development';

  return res.status(statusCode).json({
    success: false,
    code: error?.code || (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST'),
    message: statusCode === 500 && !isDev ? defaultMessage : (error?.message || defaultMessage),
    ...(isDev && statusCode >= 500 ? { stack: error?.stack } : {}),
  });
}
