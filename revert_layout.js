const fs = require('fs');
let code = fs.readFileSync('apps/web/src/components/planner/PlannerPage.tsx', 'utf8');

code = code.replace(
  '<div className="p-4 md:p-6 bg-background h-[calc(100vh-140px)] flex flex-col gap-6 overflow-hidden">',
  '<div className="p-4 md:p-6 bg-background min-h-screen pb-20 flex gap-6">'
);

code = code.replace(
  '<div className="p-4 md:p-6 bg-background h-[calc(100vh-140px)] flex gap-6 overflow-hidden box-border">',
  '<div className="p-4 md:p-6 bg-background min-h-screen pb-20 flex gap-6">'
);

code = code.replace(
  '<div className="flex-1 flex flex-col min-w-0 h-full">',
  '<div className="flex-1 flex flex-col min-w-0">'
);

code = code.replace(
  '<div className="mt-6 flex flex-col flex-1 min-h-0">',
  '<div className="mt-6 flex flex-col">'
);

code = code.replace(
  '<div className="flex flex-col gap-6 flex-1 min-h-0">',
  '<div className="flex flex-col gap-6">'
);

code = code.replace(
  '<div className="flex items-center justify-between flex-shrink-0">',
  '<div className="flex items-center justify-between">'
);

code = code.replace(
  /<div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col items-center border border-border rounded-xl">\s*<div className="w-full h-full max-w-7xl flex flex-col">\s*<PlannerMatrix/,
  '<div>\n              <PlannerMatrix'
);

code = code.replace(
  /onClickTimeBlock=\{handleEditTimeBlock\}\s*\/>\s*<\/div>\s*<\/div>/,
  'onClickTimeBlock={handleEditTimeBlock}\n              />\n            </div>'
);

code = code.replace(
  /<div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col items-center border border-border rounded-xl">\s*<div className="w-full h-full max-w-6xl flex flex-col">\s*<CalendarMode/,
  '<div>\n            <CalendarMode'
);

code = code.replace(
  /localOnly=\{localOnly\}\s*\/>\s*<\/div>\s*<\/div>/,
  'localOnly={localOnly}\n            />\n          </div>'
);

fs.writeFileSync('apps/web/src/components/planner/PlannerPage.tsx', code);
