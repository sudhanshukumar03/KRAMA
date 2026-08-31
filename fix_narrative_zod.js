const fs = require('fs');
let narrative = fs.readFileSync('apps/server/src/services/narrative.service.ts', 'utf8');
narrative = narrative.replace(/z\.record\(z\.any\(\)\)/g, "z.record(z.string(), z.any())");
fs.writeFileSync('apps/server/src/services/narrative.service.ts', narrative);
console.log('done');
