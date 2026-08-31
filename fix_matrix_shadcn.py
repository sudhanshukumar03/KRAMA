import codecs
import re

def fix_matrix(filepath):
    with codecs.open(filepath, 'r', 'utf-8') as f:
        content = f.read()

    # Replace pseudo-shadcn classes with explicit tailwind classes
    content = content.replace('text-foreground', 'text-slate-800 dark:text-slate-100')
    content = content.replace('text-muted-foreground', 'text-slate-500 dark:text-slate-400')
    content = content.replace('bg-muted/10', 'bg-slate-100 dark:bg-slate-800')
    content = content.replace('border-border/50', 'border-slate-100 dark:border-slate-800')
    content = content.replace('border-border', 'border-slate-200 dark:border-slate-700')
    
    # Ensure empty cells have min-height or height
    content = content.replace('className="border-r border-slate-200 dark:border-slate-700 last:border-r-0"', 'className="border-r border-slate-200 dark:border-slate-700 last:border-r-0 h-full min-h-[36px]"')
    
    with codecs.open(filepath, 'w', 'utf-8') as f:
        f.write(content)

fix_matrix('apps/web/src/components/planner/PlannerMatrix.tsx')
