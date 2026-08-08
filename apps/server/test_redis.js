const Redis = require('ioredis'); const redis = new Redis('redis://localhost:6379'); async function run() { const keys = await redis.keys('*'); console.log(keys); process.exit(0); } run();
