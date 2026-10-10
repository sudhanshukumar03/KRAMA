export interface RequestUser {
  id: string;
  email: string;
  name: string | null;
  sessionId: string;
}

// Augment Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
      workspaceId?: string;
    }
  }
}
