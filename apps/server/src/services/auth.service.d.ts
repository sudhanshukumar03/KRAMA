export declare class AuthService {
    hashPassword(password: string): Promise<string>;
    verifyPassword(password: string, hash: string): Promise<boolean>;
    generateAccessToken(userId: string, sessionId: string, email: string, name: string | null): string;
    generateRefreshToken(): string;
    hashRefreshToken(token: string): string;
    createSession(userId: string, ip?: string, userAgent?: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    revokeSession(refreshToken: string): Promise<void>;
    revokeAllSessions(userId: string): Promise<void>;
}
export declare const authService: AuthService;
//# sourceMappingURL=auth.service.d.ts.map