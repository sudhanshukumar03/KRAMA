const fs = require('fs');
let code = fs.readFileSync('apps/web/src/components/planner/PlannerPage.tsx', 'utf8');

code = code.replace(
  'h-screen flex gap-6 overflow-hidden max-h-screen box-border pb-6',
  'h-[calc(100vh-160px)] flex gap-6 overflow-hidden box-border'
);

fs.writeFileSync('apps/web/src/components/planner/PlannerPage.tsx', code);
