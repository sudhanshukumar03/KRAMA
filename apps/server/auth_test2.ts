import crypto from 'crypto';

async function run() {
  const email = 'test_1@krama.com';
  const password = 'password123';
  
  // 1. Signup / Login
  let res = await fetch('http://localhost:3000/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Adversarial Tester', email, password })
  });
  
  const setCookieHeader = res.headers.get('set-cookie');
  let data = await res.json();
  const cookieStr = setCookieHeader?.split(';')[0];

  // 4. Concurrent-refresh race handling
  console.log('\n--- 4. Concurrent Refresh Race ---');
  const req1 = fetch('http://localhost:3000/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Cookie': cookieStr || '' }
  });
  const req2 = fetch('http://localhost:3000/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Cookie': cookieStr || '' }
  });

  const [res1, res2] = await Promise.all([req1, req2]);
  console.log('Req 1 status:', res1.status);
  console.log('Req 2 status:', res2.status);
  
  const body1 = await res1.json().catch(e => ({ error: 'failed to parse' }));
  const body2 = await res2.json().catch(e => ({ error: 'failed to parse' }));

  if (res1.status === 200 && res2.status === 200) {
    console.log('Both succeeded! Wait, did they get the SAME token or different ones?');
    console.log('Token 1 (last 20):', String(body1.accessToken).slice(-20));
    console.log('Token 2 (last 20):', String(body2.accessToken).slice(-20));
  } else {
    console.log('One succeeded, one failed (or both failed if race handled strictly).');
  }
}

run();
