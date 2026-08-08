async function testAuth() {
  try {
    const email = `test-${Date.now()}@test.com`;
    console.log(`Signing up with ${email}...`);
    const signupRes = await fetch('http://localhost:3000/api/v1/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email,
        password: 'password123'
      })
    });
    const signupData = await signupRes.json();
    if (!signupRes.ok) throw new Error(JSON.stringify(signupData));
    
    console.log('Signup success:', signupData.user?.email);
    
    const token = signupData.accessToken;
    console.log('Access token:', token ? 'exists' : 'missing');

    console.log('Testing /api/v1/auth/me...');
    const meRes = await fetch('http://localhost:3000/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const meData = await meRes.json();
    if (!meRes.ok) throw new Error(JSON.stringify(meData));
    
    console.log('Me success:', meData.user?.email);

  } catch (error: any) {
    console.error('Auth error:', error.message);
  }
}

testAuth();
