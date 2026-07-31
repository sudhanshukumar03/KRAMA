import { z } from 'zod';
import { SignupSchema, LoginSchema, AuthResponseSchema } from '@krama/validation';

export type SignupDto = z.infer<typeof SignupSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type AuthResponseDto = z.infer<typeof AuthResponseSchema>;

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
    }
  }
}
