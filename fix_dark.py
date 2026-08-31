import codecs
import re

def add_dark_classes(filepath):
    with codecs.open(filepath, 'r', 'utf-8') as f:
        content = f.read()

    # Backgrounds
    content = content.replace('bg-white', 'bg-white dark:bg-[#0F172A]')
    content = content.replace('bg-slate-50', 'bg-slate-50 dark:bg-[#1E293B]')
    
    # Borders
    content = content.replace('border-slate-200', 'border-slate-200 dark:border-[#334155]')
    content = content.replace('border-slate-100', 'border-slate-100 dark:border-[#1E293B]')
    content = content.replace('border-slate-300', 'border-slate-300 dark:border-[#475569]')
    
    # Text colors
    content = content.replace('text-slate-800', 'text-slate-800 dark:text-slate-100')
    content = content.replace('text-slate-700', 'text-slate-700 dark:text-slate-200')
    content = content.replace('text-slate-600', 'text-slate-600 dark:text-slate-300')
    content = content.replace('text-slate-500', 'text-slate-500 dark:text-slate-400')
    content = content.replace('text-slate-400', 'text-slate-400 dark:text-slate-500')
    
    # Specific elements
    content = content.replace('bg-slate-50/50', 'bg-slate-50/50 dark:bg-[#1E293B]/50')
    content = content.replace('bg-slate-50/30', 'bg-slate-50/30 dark:bg-[#1E293B]/30')

    with codecs.open(filepath, 'w', 'utf-8') as f:
        f.write(content)

add_dark_classes('apps/web/src/components/planner/PlannerPage.tsx')
add_dark_classes('apps/web/src/components/planner/CalendarMode.tsx')
add_dark_classes('apps/web/src/components/planner/PlannerMatrix.tsx')
add_dark_classes('apps/web/src/components/planner/CapacitySummary.tsx')
add_dark_classes('apps/web/src/components/planner/PlannerHeader.tsx')
