export declare class AuthService {
    hashPassword(password: string): Promise<string>;
    verifyPassword(password: string, hash: string): Promise<boolean>;
    generateAccessToken(userId: string, sessionId: string, email: string, name: string | null): string;
    generateRefreshToken(): string;
    hashRefreshToken(token: string): string;
    signup(data: any, ip?: string, userAgent?: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            name: string | null;
            memberships: {
                workspaceId: string;
                role: string;
            }[];
        };
    }>;
    login(data: any, ip?: string, userAgent?: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            name: string | null;
            id: string;
            email: string;
            emailVerifiedAt: Date | null;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            version: number;
        };
    }>;
    createSession(userId: string, ip?: string, userAgent?: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    revokeSession(refreshToken: string): Promise<void>;
    revokeAllSessions(userId: string): Promise<void>;
    refresh(refreshToken: string, ip?: string, userAgent?: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
}
export declare const authService: AuthService;
//# sourceMappingURL=auth.service.d.ts.map
