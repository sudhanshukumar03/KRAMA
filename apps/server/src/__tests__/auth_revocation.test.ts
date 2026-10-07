import { after, afterEach, before, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

// Configure before importing services so this suite never connects to Redis.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'revocation-regression-test-secret';

describe('Session revocation rejects cached access tokens', () => {
  let authService: typeof import('../services/auth.service').authService;
  let redisService: typeof import('../services/redis.service').redisService;
  let sessionRepository: typeof import('../repositories/session.repository').sessionRepository;
  let requireAuth: typeof import('../middlewares/auth.middleware').requireAuth;
  let prisma: typeof import('../prisma').prisma;
  let originalFindUnique: typeof prisma.session.findUnique;
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
    originalFindUnique = prisma.session.findUnique;
    prisma.session.findUnique = (() => { throw new Error('Unexpected database access'); }) as any;
    session.refreshTokenHash = authService.hashRefreshToken('refresh-token');
  });

  afterEach(() => { mock.restoreAll(); cache.clear(); });
  after(async () => {
    prisma.session.findUnique = originalFindUnique;
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
      cache.set(`session_revoked:${session.id}`, 'false');
      cache.set(`session:${session.refreshTokenHash}`, 'refresh-data');
      cache.set(`grace:${session.refreshTokenHash}`, 'grace-data');
      mock.method(redisService, 'get', async (key: string) => cache.get(key) ?? null);
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
});
