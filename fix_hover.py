import codecs

def fix_header(filepath):
    with codecs.open(filepath, 'r', 'utf-8') as f:
        content = f.read()

    # Fix hover bugs
    content = content.replace('hover:bg-slate-50 dark:bg-[#1E293B]', 'hover:bg-slate-50 dark:hover:bg-[#1E293B]')
    content = content.replace('dark:text-slate-400 dark:text-slate-500', 'dark:text-slate-400')
    
    # Fix active tabs
    content = content.replace('bg-blue-50/50 border-blue-100 text-blue-600', 'bg-blue-50/50 border-blue-100 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-400')

    with codecs.open(filepath, 'w', 'utf-8') as f:
        f.write(content)

fix_header('apps/web/src/components/planner/PlannerHeader.tsx')
fix_header('apps/web/src/components/planner/PlannerPage.tsx')
fix_header('apps/web/src/components/planner/CalendarMode.tsx')
fix_header('apps/web/src/components/planner/PlannerMatrix.tsx')
fix_header('apps/web/src/components/planner/CapacitySummary.tsx')
