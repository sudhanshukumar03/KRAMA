import dotenv from 'dotenv';
dotenv.config();
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';
// Enforce secure JWT_SECRET in production mode
const defaultSecret = 'krama-os-secret-jwt-key-2026';
const envSecret = process.env.JWT_SECRET;
if (isProduction && (!envSecret || envSecret === defaultSecret)) {
    throw new Error('FATAL SECURITY ERROR: JWT_SECRET must be set to a unique, secure random string in production mode.');
}
export const config = {
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3001,
    jwtSecret: envSecret || defaultSecret,
    isProduction,
    isTest,
    corsOrigins: (() => {
        const defaultOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];
        const customOrigins = (process.env.CORS_ORIGIN || process.env.CLIENT_URL || '')
            .split(',')
            .map(o => o.trim())
            .filter(Boolean);
        return Array.from(new Set([...defaultOrigins, ...customOrigins]));
    })(),
};
//# sourceMappingURL=config.js.map