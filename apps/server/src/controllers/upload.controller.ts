import type { Request, Response } from 'express';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '../config/r2';
import { v4 as uuidv4 } from 'uuid';
import { InvalidUploadImageError, sanitizeUploadImage } from '../services/uploadImage.service';

export const getUploadCapabilities = (_req: Request, res: Response) => res.json({
  uploadAvailable: Boolean(r2Client),
  unsplashAvailable: Boolean(process.env.UNSPLASH_ACCESS_KEY),
});

export const uploadFile = async (req: Request, res: Response) => {
  try {
    if (!r2Client) return res.status(503).json({ success: false, code: 'UPLOAD_NOT_CONFIGURED', message: 'Wallpaper uploads are unavailable. Storage has not been configured.' });
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const image = await sanitizeUploadImage(file.buffer);
    const fileName = `${uuidv4()}${image.extension}`;
    const userId = (req as any).user?.id || 'public';
    const key = `uploads/${userId}/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: image.buffer,
      ContentType: image.contentType,
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
    if (error instanceof InvalidUploadImageError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Error uploading to R2:', error);
    return res.status(500).json({ success: false, message: 'Upload failed', error: error.message });
  }
};
