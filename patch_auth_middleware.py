import re
with open('apps/server/src/middlewares/auth.middleware.ts', 'r') as f:
    text = f.read()

target = '''    // To implement this perfectly: we need to look up the session by ID in Postgres if we can't do it via Redis, because Redis keys are based on efreshTokenHash. 
    // Wait, if Redis keys are session:{refreshTokenHash}, we can't look up by sessionId easily in Redis unless we also store sessionById:{sessionId}!
    // Let's modify redis strategy to also set sessionById: OR just do a quick Postgres lookup for the session ID to ensure evokedAt is null.
    // Actually, Postgres lookup by PK id is extremely fast.
    const dbSession = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { revokedAt: true }
    });

    if (!dbSession || dbSession.revokedAt !== null) {
      return res.status(401).json({ message: 'Unauthorized' });
    }'''
    
replacement = '''    // FAST PATH: Check Redis
    let isSessionValid = false;
    const cachedSession = await redisService.get(sessionById:);
    
    if (cachedSession) {
      isSessionValid = true;
    } else {
      // SLOW PATH / FALLBACK: Check Postgres
      const dbSession = await prisma.session.findUnique({
        where: { id: sessionId },
        select: { revokedAt: true }
      });
      if (dbSession && dbSession.revokedAt === null) {
        isSessionValid = true;
        // Optionally re-hydrate Redis
        await redisService.set(sessionById:, JSON.stringify({ valid: true }), 7 * 24 * 60 * 60);
      }
    }

    if (!isSessionValid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }'''

if 'FAST PATH' not in text:
    text = text.replace(target, replacement)
    with open('apps/server/src/middlewares/auth.middleware.ts', 'w') as f:
        f.write(text)
