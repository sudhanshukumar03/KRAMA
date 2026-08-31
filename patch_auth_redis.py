import re
with open('apps/server/src/services/auth.service.ts', 'r') as f:
    text = f.read()

target1 = '''    await redisService.set(
      session:,
      JSON.stringify({ userId, expiresAt: expiresAt.toISOString(), sessionId: session.id }),
      REFRESH_TOKEN_EXPIRY_S
    );'''
replacement1 = '''    await redisService.set(
      session:,
      JSON.stringify({ userId, expiresAt: expiresAt.toISOString(), sessionId: session.id }),
      REFRESH_TOKEN_EXPIRY_S
    );
    // Also store by sessionId for the fast-path auth middleware
    await redisService.set(
      sessionById:,
      JSON.stringify({ valid: true }),
      REFRESH_TOKEN_EXPIRY_S
    );'''

if 'sessionById' not in text:
    text = text.replace(target1, replacement1)

target2 = '''    await redisService.del(session:);
    await sessionRepository.updateByHash(hash, { revokedAt: new Date() }).catch(() => {});'''
replacement2 = '''    await redisService.del(session:);
    const dbSession = await sessionRepository.findByHash(hash);
    if (dbSession) await redisService.del(sessionById:);
    await sessionRepository.updateByHash(hash, { revokedAt: new Date() }).catch(() => {});'''

if 'sessionById:' not in text:
    text = text.replace(target2, replacement2)

target3 = '''      for (const s of sessions) {
        await redisService.del(session:);
      }'''
replacement3 = '''      for (const s of sessions) {
        await redisService.del(session:);
        await redisService.del(sessionById:);
      }'''

if 'sessionById:' not in text:
    text = text.replace(target3, replacement3)

with open('apps/server/src/services/auth.service.ts', 'w') as f:
    f.write(text)
