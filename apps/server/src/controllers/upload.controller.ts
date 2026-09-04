import type { Request, Response } from 'express';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '../config/r2';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

export const uploadFile = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const ext = path.extname(file.originalname);
    const fileName = `${uuidv4()}${ext}`;
    const userId = (req as any).user?.id || 'public';
    const key = `uploads/${userId}/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await r2Client.send(command);

    const fileUrl = `${R2_PUBLIC_URL}/${key}`;

    return res.status(200).json({
      success: true,
      url: fileUrl,
      fileName: file.originalname,
      key,
    });
  } catch (error: any) {
    console.error('Error uploading to R2:', error);
    return res.status(500).json({ success: false, message: 'Upload failed', error: error.message });
  }
};
