import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        name?: string;
        role?: string;
        [key: string]: unknown;
      };
      workspaceId?: string;
    }
  }
}
