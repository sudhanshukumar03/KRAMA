const fs = require('fs');
const glob = require('glob');

const routes = glob.sync('src/routes/*.ts');
for (const f of routes) {
  let c = fs.readFileSync(f, 'utf8');
  if (!c.includes('import { Router }')) {
    c = 'import { Router } from \'express\';\n' + c;
  }
  c = c.replace(/const router = Router\(\);/g, 'const router: Router = Router();');
  fs.writeFileSync(f, c);
}

let tc = fs.readFileSync('src/controllers/task.controller.ts', 'utf8');
tc = tc.replace(/const status = req\.query\.status;/g, 'const status = req.query.status as string | undefined;');
tc = tc.replace(/const projectId = req\.query\.projectId;/g, 'const projectId = req.query.projectId as string | undefined;');
tc = tc.replace(/const sprintId = req\.query\.sprintId;/g, 'const sprintId = req.query.sprintId as string | undefined;');
tc = tc.replace(/const assigneeId = req\.query\.assigneeId;/g, 'const assigneeId = req.query.assigneeId as string | undefined;');
tc = tc.replace(/const priority = req\.query\.priority;/g, 'const priority = req.query.priority as string | undefined;');
tc = tc.replace(/'done'/g, '"DONE"');
tc = tc.replace(/projectId: projectId,/g, 'projectId: projectId as string | undefined,');
tc = tc.replace(/sprintId: sprintId,/g, 'sprintId: sprintId as string | undefined,');
tc = tc.replace(/assigneeId: assigneeId,/g, 'assigneeId: assigneeId as string | undefined,');
tc = tc.replace(/priority: priority,/g, 'priority: priority as any,');
tc = tc.replace(/status: status,/g, 'status: status as any,');
fs.writeFileSync('src/controllers/task.controller.ts', tc);

let aw = fs.readFileSync('src/workers/analytics.worker.ts', 'utf8');
aw = aw.replace(/'done'/g, '"DONE"');
fs.writeFileSync('src/workers/analytics.worker.ts', aw);

let srw = fs.readFileSync('src/workers/sprintReport.worker.ts', 'utf8');
srw = srw.replace(/'done'/g, '"DONE"');
fs.writeFileSync('src/workers/sprintReport.worker.ts', srw);

let hsw = fs.readFileSync('src/workers/habitStreak.worker.ts', 'utf8');
hsw = hsw.replace(/logs/g, 'completions');
fs.writeFileSync('src/workers/habitStreak.worker.ts', hsw);

let ai = fs.readFileSync('src/services/ai.service.ts', 'utf8');
ai = ai.replace(/provider: [^,]+,/g, '');
fs.writeFileSync('src/services/ai.service.ts', ai);

let am = fs.readFileSync('src/middlewares/auth.middleware.ts', 'utf8');
am = am.replace(/Role\[req\.user\.role\]/g, '(Role as any)[req.user.role]');
am = am.replace(/req\.headers\.authorization\?.split\(' '\)\[1\];/g, 'req.headers.authorization?.split(\' \')[1] as string;');
fs.writeFileSync('src/middlewares/auth.middleware.ts', am);

let auth = fs.readFileSync('src/middleware/auth.ts', 'utf8');
auth = auth.replace(/user\?: RequestUser/g, 'user?: any');
fs.writeFileSync('src/middleware/auth.ts', auth);
