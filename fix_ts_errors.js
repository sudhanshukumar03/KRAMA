const fs = require('fs');

// 1. Fix oauth.routes.ts
let oauth = fs.readFileSync('apps/server/src/routes/oauth.routes.ts', 'utf8');
oauth = oauth.replace(
    /res\.redirect\(http:\/\/localhost:5173\/app\/planner\?sync=error&message=\\\);/,
    "res.redirect(http://localhost:5173/app/planner?sync=error&message=);"
);
fs.writeFileSync('apps/server/src/routes/oauth.routes.ts', oauth);

// 2. Fix task.service.ts
let task = fs.readFileSync('apps/server/src/services/task.service.ts', 'utf8');
task = task.replace('  },', '  }');
if (!task.includes('import { prisma }')) {
    task = "import { prisma } from '../prisma';\n" + task;
}
fs.writeFileSync('apps/server/src/services/task.service.ts', task);

console.log('Fixed TS errors');
