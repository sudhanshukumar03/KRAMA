const fs = require('fs');
let code = fs.readFileSync('apps/web/src/components/planner/PlannerPage.tsx', 'utf8');

code = code.replace('<div className="p-4 md:p-6 bg-background min-h-screen pb-20 flex gap-6">', '<div className="p-4 md:p-6 bg-background h-screen flex gap-6 overflow-hidden max-h-screen box-border pb-6">');
code = code.replace('<div className="flex-1 flex flex-col min-w-0">', '<div className="flex-1 flex flex-col min-w-0 h-full">');
code = code.replace('<div className="mt-6 flex flex-col">', '<div className="mt-6 flex flex-col flex-1 min-h-0">');
code = code.replace('<div className="flex flex-col gap-6">', '<div className="flex flex-col gap-6 flex-1 min-h-0">');
code = code.replace('<div className="flex items-center justify-between">', '<div className="flex items-center justify-between flex-shrink-0">');

code = code.replace(
  /<div>\s*<PlannerMatrix/,
  '<div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col items-center border border-border rounded-xl">\n                <div className="w-full h-full max-w-7xl flex flex-col">\n                  <PlannerMatrix'
);

code = code.replace(
  /onClickTimeBlock=\{handleEditTimeBlock\}\s*\/>\s*<\/div>/,
  'onClickTimeBlock={handleEditTimeBlock}\n                  />\n                </div>\n              </div>'
);

code = code.replace(
  /<div>\s*<CalendarMode/,
  '<div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col items-center border border-border rounded-xl">\n              <div className="w-full h-full max-w-6xl flex flex-col">\n                <CalendarMode'
);

code = code.replace(
  /localOnly=\{localOnly\}\s*\/>\s*<\/div>/,
  'localOnly={localOnly}\n                />\n              </div>\n            </div>'
);

fs.writeFileSync('apps/web/src/components/planner/PlannerPage.tsx', code);
