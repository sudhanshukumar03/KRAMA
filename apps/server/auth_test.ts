import crypto from 'crypto';

async function run() {
  const email = `test_${Date.now()}@krama.com`;
  const password = 'password123';
  
  // 1. Signup / Login
  console.log('--- 1. Signup ---');
  let res = await fetch('http://localhost:3000/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Adversarial Tester', email, password })
  });
  
  if (res.status !== 201) {
    console.error('Signup failed', await res.text());
    process.exit(1);
  }
  
  const setCookieHeader = res.headers.get('set-cookie');
  let data = await res.json();
  const token = data.token || data.accessToken || (data.data && data.data.token);
  const cookieStr = setCookieHeader?.split(';')[0];
  console.log('Token received:', typeof token === 'string' ? token.substring(0, 20) + '...' : String(token));
  console.log('Refresh cookie:', cookieStr?.substring(0, 30) + '...');

  // 2. Cross-workspace RBAC checking
  console.log('\n--- 2. RBAC Cross-workspace ---');
  // Attempt to hit the /export route of a workspace we don't own to test requireWorkspaceRole
  res = await fetch('http://localhost:3000/api/v1/workspaces/export?workspaceId=00000000-0000-4000-8000-000000000002', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Cross-workspace read status on /export (Expected 403):', res.status);
  if (res.status === 403) {
    console.log('RBAC correctly blocks cross-workspace access with 403.');
  }

  // 3. Refresh rotation security (prove old token is rejected)
  console.log('\n--- 3. Refresh Rotation Security ---');
  res = await fetch('http://localhost:3000/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Cookie': cookieStr || '' }
  });
  console.log('First refresh status (Expected 200):', res.status);
  
  let newCookieStr = res.headers.get('set-cookie')?.split(';')[0];
  let refreshData = await res.json();
  let newToken = refreshData.accessToken || refreshData.token;
  console.log('New access token received:', newToken ? String(newToken).substring(0, 20) + '...' : undefined);
  console.log('New refresh cookie:', newCookieStr?.substring(0, 30) + '...');
  
  // Prove old refresh token is rejected
  res = await fetch('http://localhost:3000/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Cookie': cookieStr || '' }
  });
  console.log('Attempt to use original, pre-refresh cookie (Expected 401 or 403):', res.status);
  console.log('Response body:', await res.text());

  // 4. Concurrent-refresh race handling
  console.log('\n--- 4. Concurrent Refresh Race ---');
  // Fire two simultaneous refresh requests with the *same* new refresh token
  const req1 = fetch('http://localhost:3000/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Cookie': newCookieStr || '' }
  });
  const req2 = fetch('http://localhost:3000/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Cookie': newCookieStr || '' }
  });

  const [res1, res2] = await Promise.all([req1, req2]);
  console.log('Req 1 status:', res1.status);
  console.log('Req 2 status:', res2.status);
  
  const body1 = await res1.json().catch(e => ({ error: 'failed to parse' }));
  const body2 = await res2.json().catch(e => ({ error: 'failed to parse' }));

  if (res1.status === 200 && res2.status === 200) {
    console.log('Both succeeded! Wait, did they get the SAME token or different ones?');
    console.log('Token 1 (last 20 chars):', String(body1.accessToken).slice(-20));
    console.log('Token 2 (last 20 chars):', String(body2.accessToken).slice(-20));
  } else {
    console.log('One succeeded, one failed (or both failed if race handled strictly).');
  }
  
  // The token we will use going forward is the one that succeeded
  let validToken = body1.accessToken || body2.accessToken;
  let validCookieStr = res1.headers.get('set-cookie')?.split(';')[0] || res2.headers.get('set-cookie')?.split(';')[0] || newCookieStr;

  // 5. Logout-all (Revoking every session)
  console.log('\n--- 5. Logout-all ---');
  // Create a second session by logging in again
  let resLogin = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  let loginCookieStr = resLogin.headers.get('set-cookie')?.split(';')[0];
  console.log('Created second session for the same user. Session 2 Cookie:', loginCookieStr?.substring(0, 30) + '...');
  
  // Verify both refresh tokens are currently working
  console.log('Checking both sessions before logout-all...');
  const ref1 = await fetch('http://localhost:3000/api/v1/auth/refresh', { method: 'POST', headers: { 'Cookie': validCookieStr || '' } });
  const ref2 = await fetch('http://localhost:3000/api/v1/auth/refresh', { method: 'POST', headers: { 'Cookie': loginCookieStr || '' } });
  console.log('Session 1 Refresh check status:', ref1.status);
  console.log('Session 2 Refresh check status:', ref2.status);
  
  let validCookieStrAfter = ref1.headers.get('set-cookie')?.split(';')[0] || validCookieStr;
  let loginCookieStrAfter = ref2.headers.get('set-cookie')?.split(';')[0] || loginCookieStr;
  
  // Now call logout-all using Session 1's access token
  let tokenAfterRef1 = await ref1.json().then(b => b.accessToken);
  console.log('Calling logout-all with Session 1...');
  res = await fetch('http://localhost:3000/api/v1/auth/logout-all', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenAfterRef1}`, 'Cookie': validCookieStrAfter || '' }
  });
  console.log('Logout-all status:', res.status);
  
  // Attempt refresh on BOTH sessions
  console.log('Attempting refresh with Session 1 refresh token (Expected 401 or 403):');
  const afterLogout1 = await fetch('http://localhost:3000/api/v1/auth/refresh', { method: 'POST', headers: { 'Cookie': validCookieStrAfter || '' } });
  console.log('Session 1 refresh status:', afterLogout1.status);
  
  console.log('Attempting refresh with Session 2 refresh token (Expected 401 or 403):');
  const afterLogout2 = await fetch('http://localhost:3000/api/v1/auth/refresh', { method: 'POST', headers: { 'Cookie': loginCookieStrAfter || '' } });
  console.log('Session 2 refresh status:', afterLogout2.status);
  
  console.log('\nDone!');
}

run();
