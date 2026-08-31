const http = require('http');

const data = JSON.stringify({
  title: 'Morning Deep Work',
  date: '2026-08-31T00:00:00.000Z',
  startTime: '2026-08-31T09:00:00.000Z',
  endTime: '2026-08-31T11:00:00.000Z',
  type: 'WORK',
  workspaceId: 'clx0z5abc000108l41abc1234'
});

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/planner/time-blocks',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', (d) => process.stdout.write(d));
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
