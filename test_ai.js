const http = require('http');
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/v1/ai/dashboard-insight?force=true',
  method: 'GET',
  headers: { 'x-workspace-id': '00000000-0000-4000-8000-000000000002' }
};
function hit() {
  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.end();
  });
}
async function run() {
  console.log(await hit());
  console.log(await hit());
  console.log(await hit());
  console.log(await hit());
}
run();
