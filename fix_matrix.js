const fs = require('fs');
let code = fs.readFileSync('apps/web/src/components/planner/PlannerMatrix.tsx', 'utf8');

code = code.replace(
  '<section className="overflow-visible rounded-2xl border border-border bg-canvas shadow-sm flex flex-col w-full relative">',
  '<section className="overflow-hidden bg-canvas flex flex-col w-full h-full relative">'
);

code = code.replace(
  '<div className="w-full flex flex-col">',
  '<div className="w-full flex flex-col flex-1 min-h-0 overflow-y-auto overflow-x-hidden">'
);

fs.writeFileSync('apps/web/src/components/planner/PlannerMatrix.tsx', code);
