import codecs

filepath = 'apps/web/src/components/planner/PlannerPage.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

replacement = """countryRegion={countryRegionStr}
        rightSlot={
          <button
            onClick={() => setIsBacklogOpen(!isBacklogOpen)}
            className={"px-3 py-1.5 rounded-md text-[11px] font-bold border transition-all " + (isBacklogOpen ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white dark:bg-[#0F172A] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-[#1E293B] shadow-sm")}
          >
            {isBacklogOpen ? 'Close Backlog' : 'Open Backlog'}
          </button>
        }
      />
      
      <PlannerBacklog isOpen={isBacklogOpen} onClose={() => setIsBacklogOpen(false)} />"""

if 'rightSlot={' not in content:
    content = content.replace("countryRegion={countryRegionStr}\n      />", replacement)
    
with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
