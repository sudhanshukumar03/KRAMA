import { randomUUID } from 'node:crypto';
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

/**
 * Translate service failures into the HTTP statuses the client uses for input
 * validation, permission recovery and stale-write handling.
 */
function errorRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};
}

// Compatibility for services not yet migrated to AppError. Match only known
// public messages: an internal "file not found at ..." must remain a 5xx.
const legacyMissingResources = new Set(['Task not found', 'Goal not found', 'Habit not found', 'Workspace not found', 'Space not found', 'Document not found', 'Parent document not found or has been deleted', 'Target parent document not found']);
const legacyConflicts = new Set(['Conflict: version mismatch', 'Conflict: nothing to restore']);

export function handleControllerError(res: Response, error: unknown, defaultMessage = 'Internal server error', options: { conflictOnMissingRecord?: boolean } = {}) {
  if (error instanceof AppError && (!error.isOperational || !Number.isInteger(error.statusCode) || error.statusCode < 400 || error.statusCode >= 600)) {
    return handleUnexpectedError(res, error, defaultMessage, true);
  }
  const details = errorRecord(error);
  const message = typeof details.message === 'string' ? details.message : undefined;
  const code = typeof details.code === 'string' ? details.code : undefined;
  const meta = errorRecord(details.meta);
  if (message && legacyConflicts.has(message)) {
    return res.status(409).json({ success: false, code: 'CONFLICT', message });
  }
  // 1. Zod validation error
  if (error instanceof ZodError || (details.name === 'ZodError' && Array.isArray(details.issues))) {
    const rawIssues = error instanceof ZodError ? error.issues : details.issues as unknown[];
    // Library versions differ, and issue metadata can contain the rejected input.
    // Publish only the stable field contract consumed by forms, never raw input.
    const issues = rawIssues.slice(0, 100).map(value => {
      const issue = errorRecord(value);
      return {
        code: typeof issue.code === 'string' ? issue.code.slice(0, 100) : 'custom',
        path: Array.isArray(issue.path) ? issue.path.filter((part): part is string | number => typeof part === 'string' || typeof part === 'number' && Number.isFinite(part)).slice(0, 32) : [],
        message: typeof issue.message === 'string' && issue.message ? issue.message.slice(0, 2000) : 'Validation failed',
      };
    });
    const primaryMessage = issues[0]?.message || 'Validation failed';
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_FAILED',
      message: primaryMessage,
      errors: issues,
    });
  }

  // 2. Custom AppError
  if (error instanceof AppError && error.isOperational) {
    return res.status(error.statusCode).json({
      success: false,
      code: error.code,
      message: error.message,
    });
  }

  // 3. JWT Authentication Errors
  if (details.name === 'JsonWebTokenError' || details.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Invalid or expired session token.',
    });
  }

  // 4. Prisma Known Request Errors
  if (code === 'P2025') {
    if (options.conflictOnMissingRecord) return res.status(409).json({ success: false, code: 'CONFLICT', message: 'Conflict: version mismatch' });
    return res.status(404).json({
      success: false,
      code: 'NOT_FOUND',
      message: 'Requested resource was not found.',
    });
  }

  if (code === 'P2002') {
    return res.status(409).json({
      success: false,
      code: 'CONFLICT',
      message: 'A unique constraint was violated.',
      target: typeof meta.target === 'string' ? meta.target : Array.isArray(meta.target) && meta.target.every(field => typeof field === 'string') ? meta.target : undefined,
    });
  }

  if (code === 'P2003') {
    return res.status(400).json({
      success: false,
      code: 'FOREIGN_KEY_VIOLATION',
      message: 'Referenced entity does not exist.',
      field: typeof meta.field_name === 'string' ? meta.field_name : undefined,
    });
  }

  if (details.name === 'PrismaClientValidationError') {
    return res.status(400).json({
      success: false,
      code: 'INVALID_QUERY_ARGUMENT',
      message: 'Invalid database query parameters provided.',
    });
  }

  // 5. Explicit "Not Found" convention
  if (message && legacyMissingResources.has(message)) {
    return res.status(404).json({
      success: false,
      code: 'NOT_FOUND',
      message,
    });
  }

  return handleUnexpectedError(res, error, defaultMessage);
}

function handleUnexpectedError(res: Response, error: unknown, defaultMessage: string, forceServerError = false) {
  const details = errorRecord(error);
  const message = typeof details.message === 'string' ? details.message : undefined;
  const stack = typeof details.stack === 'string' ? details.stack : undefined;
  const code = typeof details.code === 'string' ? details.code : undefined;
  const requestId = randomUUID();
  const rawStatus = details.statusCode || details.status;
  const requestedStatus = typeof rawStatus === 'number' || typeof rawStatus === 'string' ? Number(rawStatus) : 500;
  const statusCode = Number.isInteger(requestedStatus) && requestedStatus >= (forceServerError ? 500 : 400) && requestedStatus < 600 ? requestedStatus : 500;
  const isDev = process.env.NODE_ENV === 'development';
  // Raw adapter messages/stacks can contain SQL inputs, note bodies or credentials.
  // Production diagnostics retain an identifier and bounded error classification.
  logger.error(defaultMessage, { requestId,
    errorName: typeof details.name === 'string' && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(details.name) ? details.name : 'UnknownError',
    ...(code && /^[A-Z][A-Z0-9_]{1,63}$/.test(code) ? { code } : {}),
    ...(isDev ? { error: message, stack } : {}),
  });

  return res.status(statusCode).json({
    success: false,
    code: statusCode >= 500 && !isDev ? 'INTERNAL_SERVER_ERROR' : (code || 'BAD_REQUEST'),
    message: statusCode >= 500 && !isDev ? defaultMessage : (message || defaultMessage),
    ...(statusCode >= 500 ? { requestId } : {}),
    ...(isDev && statusCode >= 500 ? { stack } : {}),
  });
}
