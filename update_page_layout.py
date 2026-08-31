import codecs

def update_planner_page(filepath):
    with codecs.open(filepath, 'r', 'utf-8') as f:
        content = f.read()

    # 1. Fix the container layout and dark mode
    content = content.replace(
        '<div className="p-4 md:p-6 bg-[#f7f8fb] min-h-screen pb-20">',
        '<div className="absolute inset-0 bg-white dark:bg-[#0F172A] flex flex-col min-w-0 overflow-hidden z-10">'
    )

    # 2. Fix the inner container layout
    content = content.replace(
        '<div className="mt-6 flex flex-col">',
        '<div className="flex-1 flex flex-col min-h-0 mt-4">'
    )

    # 3. Add isBacklogOpen state
    if 'const [isBacklogOpen' not in content:
        content = content.replace(
            "const [mode, setMode] = useState<'plan' | 'calendar'>('plan');",
            "const [mode, setMode] = useState<'plan' | 'calendar'>('plan');\n  const [isBacklogOpen, setIsBacklogOpen] = useState(false);"
        )

    # 4. Add rightSlot to PlannerHeader
    if 'rightSlot={' not in content:
        content = content.replace(
            "countryRegion={countryRegionStr}\n      />",
            """countryRegion={countryRegionStr}
        rightSlot={
          <button
            onClick={() => setIsBacklogOpen(!isBacklogOpen)}
            className={"px-3 py-1.5 rounded-md text-[11px] font-bold border transition-all " + (isBacklogOpen ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white dark:bg-[#0F172A] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-[#1E293B] shadow-sm")}
          >
            {isBacklogOpen ? 'Close Backlog' : 'Open Backlog'}
          </button>
        }
      />"""
        )

    with codecs.open(filepath, 'w', 'utf-8') as f:
        f.write(content)

update_planner_page('apps/web/src/components/planner/PlannerPage.tsx')
