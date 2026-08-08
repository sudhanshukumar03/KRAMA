async function run() {
  const email = `test_${Date.now()}@krama.com`;
  const password = 'password123';
  let res = await fetch('http://localhost:3000/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Adversarial Tester', email, password })
  });
  
  const data = await res.json();
  const token = data.accessToken;
  const workspaceId = data.user.memberships[0].workspaceId;

  const createRes = await fetch('http://localhost:3000/api/v1/habits', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'x-workspace-id': workspaceId },
    body: JSON.stringify({
        name: "Test",
        cadence: "daily",
        category: "PRODUCTIVITY",
        difficulty: "MEDIUM",
        expectedDurationMinutes: 15,
        scheduledDays: [0, 1, 2, 3, 4, 5, 6],
        streak: 0
    })
  });
  
  console.log(await createRes.text());
}
run();
