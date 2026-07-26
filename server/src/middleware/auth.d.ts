import type { Request, Response, NextFunction } from 'express';
export interface AuthenticatedRequest extends Request<Record<string, string>> {
    user?: {
        id: string;
        username: string;
        role: string;
    };
}
export declare const requireAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map