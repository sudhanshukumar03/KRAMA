import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { InvalidUploadImageError, sanitizeUploadImage } from '../services/uploadImage.service';

test('uploads reject arbitrary content, SVG, unsupported rasters and truncated images', async () => {
  for (const input of [Buffer.from('<html>not an image</html>'), Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>'), Buffer.alloc(0)]) {
    await assert.rejects(sanitizeUploadImage(input), InvalidUploadImageError);
  }
  const source = sharp({ create: { width: 4, height: 4, channels: 3, background: 'red' } });
  await assert.rejects(sanitizeUploadImage(await source.clone().tiff().toBuffer()), InvalidUploadImageError);
  const png = await source.png().toBuffer();
  await assert.rejects(sanitizeUploadImage(png.subarray(0, 40)), InvalidUploadImageError);
});

test('all allowed formats decode and become metadata-free WEBP with no appended payload', async () => {
  for (const format of ['jpeg', 'png', 'gif', 'webp'] as const) {
    const input = await sharp({ create: { width: 4, height: 4, channels: 3, background: 'red' } }).toFormat(format).toBuffer();
    const payload = Buffer.from('UNTRUSTED_APPENDED_PAYLOAD');
    const result = await sanitizeUploadImage(Buffer.concat([input, payload]));
    assert.equal(result.extension, '.webp');
    assert.equal(result.contentType, 'image/webp');
    assert.equal(result.buffer.includes(payload), false);
    const metadata = await sharp(result.buffer).metadata();
    assert.equal(metadata.format, 'webp');
    assert.equal(metadata.width, 4);
    assert.equal(metadata.exif, undefined);
  }
});

test('oversized decoded images are rejected before raster output', async () => {
  const oversized = await sharp({ create: { width: 6500, height: 6500, channels: 3, background: 'white' } }).png().toBuffer();
  await assert.rejects(sanitizeUploadImage(oversized), InvalidUploadImageError);
});

test('animated raster uploads retain their frames after sanitization', async () => {
  const raw = Buffer.concat([Buffer.from(Array(4).fill([255, 0, 0]).flat()), Buffer.from(Array(4).fill([0, 0, 255]).flat())]);
  const input = await sharp(raw, { raw: { width: 2, height: 4, channels: 3, pageHeight: 2 } }).gif({ delay: [100, 100], loop: 0 }).toBuffer();
  const result = await sanitizeUploadImage(input);
  const metadata = await sharp(result.buffer, { animated: true }).metadata();
  assert.equal(metadata.pages, 2);
  assert.deepEqual(metadata.delay, [100, 100]);
});

test('production upload controller rejects disguised content and stores only verified bytes', async () => {
  const settings = { R2_ACCOUNT_ID: 'abcdef1234', R2_ACCESS_KEY_ID: 'test-key', R2_SECRET_ACCESS_KEY: 'test-secret', R2_BUCKET_NAME: 'test-bucket', R2_PUBLIC_URL: 'https://storage.example.invalid' };
  const previous = Object.fromEntries(Object.keys(settings).map(key => [key, process.env[key]]));
  Object.assign(process.env, settings);
  const { r2Client } = await import('../config/r2');
  const { uploadFile } = await import('../controllers/upload.controller');
  assert.ok(r2Client);
  const commands: any[] = [];
  mock.method(r2Client, 'send', async (command: any) => { commands.push(command.input); return {}; });
  const response = () => ({ code: 200, body: null as any, status(code: number) { this.code = code; return this; }, json(body: any) { this.body = body; return this; } });
  try {
    const rejected = response();
    await uploadFile({ user: { id: 'test-user' }, file: { originalname: 'image.png', mimetype: 'image/png', buffer: Buffer.from('<html>disguised content</html>') } } as any, rejected as any);
    assert.equal(rejected.code, 400);
    assert.equal(commands.length, 0);
    const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: 'red' } }).png().toBuffer();
    const accepted = response();
    await uploadFile({ user: { id: 'test-user' }, file: { originalname: 'untrusted.svg', mimetype: 'image/jpeg', buffer: png } } as any, accepted as any);
    assert.equal(accepted.code, 200);
    assert.equal(commands.length, 1);
    assert.match(commands[0].Key, /^uploads\/test-user\/[a-f0-9-]+\.webp$/);
    assert.equal(commands[0].ContentType, 'image/webp');
    assert.equal((await sharp(commands[0].Body).metadata()).format, 'webp');
  } finally {
    mock.restoreAll();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
