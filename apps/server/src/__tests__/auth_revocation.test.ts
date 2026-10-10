import { after, afterEach, before, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

// Configure before importing services so this suite never connects to Redis.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'revocation-regression-test-secret-at-least-forty-eight-characters-long';

describe('Session revocation rejects cached access tokens', () => {
  let authService: typeof import('../services/auth.service').authService;
  let redisService: typeof import('../services/redis.service').redisService;
  let sessionRepository: typeof import('../repositories/session.repository').sessionRepository;
  let requireAuth: typeof import('../middlewares/auth.middleware').requireAuth;
  let prisma: typeof import('../prisma').prisma;
  let originalSessionModel: any;
  const cache = new Map<string, string>();
  const session = {
    id: 'test-session', userId: 'test-user', familyId: 'test-family',
    refreshTokenHash: '', revokedAt: null,
  };

  before(async () => {
    ({ authService } = await import('../services/auth.service'));
    ({ redisService } = await import('../services/redis.service'));
    ({ sessionRepository } = await import('../repositories/session.repository'));
    ({ requireAuth } = await import('../middlewares/auth.middleware'));
    ({ prisma } = await import('../prisma'));
    originalSessionModel = prisma.session;
    (prisma as any).session = { findUnique: async () => ({ ...session }) };
    session.refreshTokenHash = authService.hashRefreshToken('refresh-token');
  });

  afterEach(() => { mock.restoreAll(); cache.clear(); });
  after(async () => {
    (prisma as any).session = originalSessionModel;
    redisService.client.disconnect();
    await prisma.$disconnect();
    await (globalThis as any).pool?.end();
  });

  async function authorize() {
    const token = authService.generateAccessToken(session.userId, session.id, 'test@example.com', null);
    let status = 200;
    let accepted = false;
    const response: any = {
      status(code: number) { status = code; return response; },
      json() { return response; },
    };
    await requireAuth(
      { headers: { authorization: `Bearer ${token}` } } as any,
      response,
      () => { accepted = true; },
    );
    return { status, accepted };
  }

  for (const action of ['logout', 'logout-all', 'family'] as const) {
    it(`${action} immediately rejects a token with a warm authorization cache`, async () => {
      cache.set(`session_revoked:${session.id}`, `active:${session.userId}`);
      cache.set(`session:${session.refreshTokenHash}`, 'refresh-data');
      cache.set(`grace:${session.refreshTokenHash}`, 'grace-data');
      mock.method(redisService, 'getShared', async (key: string) => cache.get(key) ?? null);
      mock.method(redisService, 'set', async (key: string, value: string) => { cache.set(key, value); });
      mock.method(redisService, 'del', async (key: string) => Number(cache.delete(key)));
      mock.method(sessionRepository, 'findByHash', async () => session as any);
      mock.method(sessionRepository, 'findActiveByUserId', async () => [session] as any);
      mock.method(sessionRepository, 'findActiveByFamilyId', async () => [session] as any);
      mock.method(sessionRepository, 'updateByHash', async () => ({ ...session, revokedAt: new Date() }) as any);
      mock.method(sessionRepository, 'updateManyActiveByUserId', async () => {});
      mock.method(sessionRepository, 'updateManyActiveByFamilyId', async () => {});

      assert.deepEqual(await authorize(), { status: 200, accepted: true });
      if (action === 'logout') await authService.revokeSession('refresh-token');
      else if (action === 'logout-all') await authService.revokeAllSessions(session.userId);
      else await authService.revokeFamily(session.familyId);
      assert.deepEqual(await authorize(), { status: 401, accepted: false });
      assert.equal(cache.has(`session:${session.refreshTokenHash}`), false);
      assert.equal(cache.has(`grace:${session.refreshTokenHash}`), false);
    });
  }

  it('does not report successful logout when database revocation fails', async () => {
    mock.method(sessionRepository, 'findByHash', async () => session as any);
    mock.method(sessionRepository, 'updateByHash', async () => { throw new Error('Database unavailable'); });
    await assert.rejects(authService.revokeSession('refresh-token'), /Database unavailable/);
  });

  it('does not trust a cached session marker for a different JWT subject', async () => {
    mock.method(redisService, 'getShared', async () => `active:${session.userId}`);
    const originalModel = prisma.session;
    let queried = false;
    (prisma as any).session = {
      findUnique: async () => { queried = true; return { ...session, revokedAt: null }; },
    };
    try {
      const token = authService.generateAccessToken('attacker', session.id, 'attacker@example.com', null);
      let status = 200;
      const response: any = { status(code: number) { status = code; return response; }, json() { return response; } };
      await requireAuth({ headers: { authorization: `Bearer ${token}` } } as any, response, () => {});
      assert.equal(queried, true);
      assert.equal(status, 401);
    } finally {
      (prisma as any).session = originalModel;
    }
  });

  it('rejects cached authorization when shared Redis is unavailable', async () => {
    mock.method(redisService, 'getShared', async () => { throw new Error('Redis unavailable'); });
    assert.deepEqual(await authorize(), { status: 401, accepted: false });
  });

  it('never treats a process-local session marker as shared Redis state', async () => {
    await redisService.set(`session_revoked:${session.id}`, 'false', 300);
    await assert.rejects(redisService.getShared(`session_revoked:${session.id}`), /Redis is unavailable for shared state/);
  });

  it('does not accept the legacy unbound false cache marker without checking session ownership', async () => {
    mock.method(redisService, 'getShared', async () => 'false');
    const originalModel = prisma.session;
    let queried = false;
    (prisma as any).session = {
      findUnique: async () => { queried = true; return { ...session, userId: 'another-user', revokedAt: null }; },
    };
    try {
      assert.deepEqual(await authorize(), { status: 401, accepted: false });
      assert.equal(queried, true);
    } finally {
      (prisma as any).session = originalModel;
    }
  });
});
