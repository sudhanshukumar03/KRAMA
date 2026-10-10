import { after, before, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';

process.env.NODE_ENV = 'test';

describe('SEC-005: Redis rate-store failure blocks sensitive handlers', () => {
  let redisService: typeof import('../services/redis.service').redisService;
  let server: Server;
  let baseUrl: string;
  let handled = 0;
  let originalConnected: boolean;
  let originalStatus: string;
  before(async () => {
    ({ redisService } = await import('../services/redis.service'));
    originalConnected = redisService.isConnected;
    originalStatus = redisService.client.status;
    redisService.isConnected = true;
    redisService.client.status = 'ready';
    mock.method(redisService.client, 'call', async (...args: any[]) => {
      if (String(args[0]).toUpperCase() === 'SCRIPT') return 'test-script-sha';
      throw new Error('Injected Redis connection failure');
    });
    process.env.NODE_ENV = 'production';
    const { strictAuthLimiter, refreshLimiter, aiLimiter } = await import('../middlewares/rateLimit.middleware');
    process.env.NODE_ENV = 'test';
    const app = express();
    const handler = (_req: express.Request, res: express.Response) => { handled++; res.sendStatus(200); };
    app.get('/auth', strictAuthLimiter, handler);
    app.get('/refresh', refreshLimiter, handler);
    app.get('/ai', (req, _res, next) => { (req as any).workspaceId = 'workspace'; next(); }, aiLimiter, handler);
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(err.status || 500).json({ message: err.message });
    });
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });
  after(async () => {
    process.env.NODE_ENV = 'test';
    if (server) await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
    mock.restoreAll();
    if (redisService) {
      redisService.isConnected = originalConnected;
      redisService.client.status = originalStatus as any;
      redisService.client.disconnect();
    }
  });
  for (const path of ['/auth', '/refresh', '/ai']) {
    it(`${path} returns a controlled 503 without reaching its handler`, async () => {
      const response = await fetch(baseUrl + path);
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), { message: 'Service temporarily unavailable. Please try again later.' });
      assert.equal(handled, 0);
    });
  }
});
