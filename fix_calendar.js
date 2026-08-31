const fs = require('fs');
let code = fs.readFileSync('apps/web/src/components/planner/CalendarMode.tsx', 'utf8');

code = code.replace(
  '<div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">',
  '<div className="bg-white p-6 flex flex-col h-full w-full">'
);

fs.writeFileSync('apps/web/src/components/planner/CalendarMode.tsx', code);
