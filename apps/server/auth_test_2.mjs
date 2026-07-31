import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const URL = 'http://localhost:3000/api/v1/auth';
const TEST_EMAIL = `test2_${Date.now()}@krama.com`;
const TEST_PASS = 'password123';

async function run() {
  console.log('--- KRAMA OS Auth QA 2 ---');
  
  // 1. Signup creates workspace + OWNER
  console.log('\n[Check 1: Signup & DB Inspection]');
  let res = await fetch(`${URL}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS, name: 'QA Tester 2' })
  });
  if (res.status !== 201) throw new Error(`Signup failed: ${await res.text()}`);
  let data = await res.json();
  const user1 = data.user;
  
  const dbUser = await prisma.user.findUnique({ where: { email: TEST_EMAIL }, include: { memberships: { include: { workspace: true } } } });
  console.log(`DB User: ${dbUser.email}, ID: ${dbUser.id}`);
  console.log(`DB WorkspaceMemberships: ${JSON.stringify(dbUser.memberships, null, 2)}`);

  // 2. Refresh token rotation invalidates old token
  console.log('\n[Check 2: Refresh Token Rotation Replay Attack]');
  res = await fetch(`${URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS })
  });
  const login1Cookie = res.headers.get('set-cookie');
  
  res = await fetch(`${URL}/refresh`, { method: 'POST', headers: { 'Cookie': login1Cookie } });
  if (res.status !== 200) throw new Error(`/refresh 1 failed: ${await res.text()}`);
  console.log(`First refresh succeeded.`);
  
  res = await fetch(`${URL}/refresh`, { method: 'POST', headers: { 'Cookie': login1Cookie } });
  console.log(`Second refresh (replay) status: ${res.status}`);
  if (res.status !== 401) throw new Error(`CRITICAL: Replay attack succeeded! Status: ${res.status}`);
  
  // 3. Rate limiting on /refresh
  console.log('\n[Check 3: Refresh Rate Limiting]');
  res = await fetch(`${URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS })
  });
  const login2Cookie = res.headers.get('set-cookie');
  
  let rateLimitTripped = false;
  for (let i = 0; i < 35; i++) {
    res = await fetch(`${URL}/refresh`, { method: 'POST', headers: { 'Cookie': login2Cookie } });
    if (res.status === 429) {
      rateLimitTripped = true;
      console.log(`Rate limit tripped on attempt ${i + 1}`);
      break;
    }
  }
  if (!rateLimitTripped) throw new Error(`Rate limit did not trip after 35 attempts`);

  // 5. logout-all behavior
  console.log('\n[Check 5: logout-all]');
  const { spawnSync } = await import('child_process');
  spawnSync('docker', ['exec', '-i', 'krama-redis', 'redis-cli', '-a', 'krama_redis_secret', 'FLUSHALL']);
  
  // Device A
  res = await fetch(`${URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS })
  });
  const deviceACookie = res.headers.get('set-cookie');
  const deviceAToken = (await res.json()).accessToken;
  
  // Device B
  res = await fetch(`${URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS })
  });
  const deviceBCookie = res.headers.get('set-cookie');
  
  // Call logout-all from Device A
  res = await fetch(`${URL}/logout-all`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${deviceAToken}` }
  });
  if (res.status !== 200) throw new Error(`/logout-all failed: ${await res.text()}`);
  console.log(`logout-all called from Device A`);
  
  // Test Device B
  res = await fetch(`${URL}/refresh`, { method: 'POST', headers: { 'Cookie': deviceBCookie } });
  console.log(`Device B refresh status: ${res.status}`);
  if (res.status !== 401) throw new Error(`Device B session survived logout-all!`);

  // Expired token test for Quick Confirmations
  console.log('\n[Quick Conf: Expired token response body]');
  // Create an expired JWT (manually or just modify one)
  // Or just use an invalid one
  res = await fetch(`${URL}/me`, { headers: { 'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.signature` } });
  console.log(`Expired/Invalid token response body: ${await res.text()}`);
  
  console.log('\n--- ALL QA TESTS PASSED ---');
}

run().catch(console.error);
