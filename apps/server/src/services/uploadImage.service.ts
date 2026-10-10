import sharp from 'sharp';

const INPUT_PIXEL_LIMIT = 40_000_000;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const FORMATS = new Set(['jpeg', 'png', 'gif', 'webp']);

function hasRasterSignature(input: Buffer) {
  return input.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
    || input.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    || ['GIF87a', 'GIF89a'].includes(input.subarray(0, 6).toString('ascii'))
    || (input.subarray(0, 4).toString('ascii') === 'RIFF' && input.subarray(8, 12).toString('ascii') === 'WEBP');
}

export class InvalidUploadImageError extends Error {
  constructor() {
    super('Upload a valid JPEG, PNG, GIF or WEBP image within the image size limit.');
    this.name = 'InvalidUploadImageError';
  }
}

// Validate decoded content and write fresh raster bytes. Client filenames,
// declared MIME types, metadata and appended payloads never reach storage.
export async function sanitizeUploadImage(input: Buffer) {
  try {
    if (!input.length || input.length > MAX_UPLOAD_BYTES || !hasRasterSignature(input)) throw new InvalidUploadImageError();
    const image = sharp(input, { animated: true, limitInputPixels: INPUT_PIXEL_LIMIT, failOn: 'warning' });
    const metadata = await image.metadata();
    if (!metadata.format || !FORMATS.has(metadata.format) || !metadata.width || !metadata.height
      || metadata.width * metadata.height > INPUT_PIXEL_LIMIT) throw new InvalidUploadImageError();
    const buffer = await image.rotate().webp({ quality: 90 }).timeout({ seconds: 10 }).toBuffer();
    if (buffer.length > MAX_UPLOAD_BYTES) throw new InvalidUploadImageError();
    return { buffer, extension: '.webp', contentType: 'image/webp' } as const;
  } catch {
    throw new InvalidUploadImageError();
  }
}
