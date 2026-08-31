import codecs

def fix_matrix(filepath):
    with codecs.open(filepath, 'r', 'utf-8') as f:
        content = f.read()

    # Fix the hover bug I just introduced
    content = content.replace('hover:bg-slate-100 dark:bg-slate-800', 'hover:bg-slate-50 dark:hover:bg-[#1E293B]')
    
    with codecs.open(filepath, 'w', 'utf-8') as f:
        f.write(content)

fix_matrix('apps/web/src/components/planner/PlannerMatrix.tsx')
