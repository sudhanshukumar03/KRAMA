import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
dotenv.config();

const accountId = process.env.R2_ACCOUNT_ID || 'dummy_account_id';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || 'dummy_key',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'dummy_secret',
  },
});

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'krama-os-storage';
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://pub-dummy.r2.dev';
