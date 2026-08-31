const fs = require('fs');
let code = fs.readFileSync('apps/web/src/components/planner/PlannerPage.tsx', 'utf8');

// 1. Add state variable for backlog
if (!code.includes('const [isBacklogOpen, setIsBacklogOpen] = useState(false);')) {
  code = code.replace(
    'const [mode, setMode] = useState<\\'plan\\' | \\'calendar\\'>(\\'plan\\');',
    'const [mode, setMode] = useState<\\'plan\\' | \\'calendar\\'>(\\'plan\\');\n  const [isBacklogOpen, setIsBacklogOpen] = useState(false);'
  );
}

// 2. Change root div to prevent page scrolling and be fixed height
code = code.replace(
  '<div className="p-4 md:p-6 bg-[#f7f8fb] min-h-screen pb-20">',
  '<div className="p-4 md:p-6 bg-background h-[calc(100vh-140px)] flex gap-6 overflow-hidden box-border">'
);
code = code.replace(
  '<div className="p-4 md:p-6 bg-background min-h-screen pb-20 flex gap-6">',
  '<div className="p-4 md:p-6 bg-background h-[calc(100vh-140px)] flex gap-6 overflow-hidden box-border">'
);

// 3. Make inner wrappers flex to 100% height
code = code.replace(
  '<div className="flex-1 flex flex-col min-w-0">',
  '<div className="flex-1 flex flex-col min-w-0 h-full">'
);
code = code.replace(
  '<div className="mt-6 flex flex-col">',
  '<div className="mt-6 flex flex-col flex-1 min-h-0">'
);
code = code.replace(
  '<div className="flex flex-col gap-6">',
  '<div className="flex flex-col gap-6 flex-1 min-h-0">'
);

// 4. Inject Backlog Toggle Button
if (!code.includes('isBacklogOpen ?')) {
  code = code.replace(
    '<CapacitySummary capacity={data.capacity} />',
    \<CapacitySummary capacity={data.capacity} />
                <button
                  onClick={() => setIsBacklogOpen(!isBacklogOpen)}
                  className={\\\px-4 py-2 rounded-xl text-sm font-semibold border transition-all \\\\}
                >
                  {isBacklogOpen ? 'Close Backlog' : 'Open Backlog'}
                </button>\
  );
  code = code.replace(
    '<div className="flex items-center justify-between">',
    '<div className="flex items-center justify-between flex-shrink-0">'
  );
}

// 5. Center and bound the PlannerMatrix
code = code.replace(
  /<div>\s*<PlannerMatrix/,
  \<div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col items-center border border-border rounded-xl">
                <div className="w-full h-full max-w-7xl flex flex-col">
                  <PlannerMatrix\
);
code = code.replace(
  /onClickTimeBlock=\{handleEditTimeBlock\}\s*\/>\s*<\/div>/,
  \onClickTimeBlock={handleEditTimeBlock}
                  />
                </div>
              </div>\
);

// 6. Center and bound CalendarMode
code = code.replace(
  /<div>\s*<CalendarMode/,
  \<div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col items-center border border-border rounded-xl">
              <div className="w-full h-full max-w-6xl flex flex-col">
                <CalendarMode\
);
code = code.replace(
  /localOnly=\{localOnly\}\s*\/>\s*<\/div>/,
  \localOnly={localOnly}
                />
              </div>
            </div>\
);

// 7. Inject Backlog Drawer UI at the very end before the closing tags
if (!code.includes('Unscheduled Backlog')) {
  code = code.replace(
    /        \)\}\s*<\/div>\s*<\/div>\s*\);\s*}/,
    \        )}
      </div>

      {isBacklogOpen && mode === 'plan' && (
        <div className="w-80 flex-shrink-0 rounded-2xl border border-border bg-canvas shadow-sm flex flex-col self-start sticky top-0 max-h-full overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <h3 className="font-bold text-foreground">Unscheduled Backlog</h3>
            <p className="text-xs text-muted-foreground mt-1">Sprint tasks without a scheduled date.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {data.tasks.filter((t: any) => !t.scheduledDate && !t.dueDate && t.status !== 'DONE').length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm italic">
                No unscheduled tasks found.
              </div>
            ) : (
              data.tasks.filter((t: any) => !t.scheduledDate && !t.dueDate && t.status !== 'DONE').map((task: any) => (
                <div key={task.id} className="p-3 rounded-xl border border-border bg-background shadow-sm hover:border-primary/50 transition-colors cursor-grab active:cursor-grabbing">
                  <div className="text-sm font-semibold text-foreground">{task.title}</div>
                  <div className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-wider">{task.priority || 'NORMAL'} Priority</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}\
  );
}

fs.writeFileSync('apps/web/src/components/planner/PlannerPage.tsx', code);
