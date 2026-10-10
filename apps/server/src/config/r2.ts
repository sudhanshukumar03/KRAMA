import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
dotenv.config();

export function isR2Configured() {
  const keys = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL'];
  if (!keys.every(key => process.env[key]?.trim() && !/dummy|your_|change_me/i.test(process.env[key]!))) return false;
  if (!/^[a-z0-9]+$/i.test(process.env.R2_ACCOUNT_ID!)) return false;
  try { return new URL(process.env.R2_PUBLIC_URL!).protocol === 'https:'; } catch { return false; }
}

export const r2Client = isR2Configured() ? new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
}) : null;

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL?.replace(/\/$/, '');
