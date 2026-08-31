const fs = require('fs');
let index = fs.readFileSync('apps/server/src/index.ts', 'utf8');
index = index.replace(/import \* as oauthRoutes from '\.\/routes\/oauth\.routes';[^\n]*\n[^\n]*/g, "import { oauthRoutes } from './routes/oauth.routes';");
fs.writeFileSync('apps/server/src/index.ts', index);
console.log('done');
