import codecs

filepath = 'apps/web/src/components/planner/PlannerBacklog.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

# Replace the form-feed broken line
content = content.replace(
    'className={\x0clex items-start gap-3 p-3 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-300 dark:hover:border-blue-700 transition-all }',
    'className={lex items-start gap-3 p-3 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-300 dark:hover:border-blue-700 transition-all }'
)

# Replace the tab broken line
content = content.replace(
    'className={\text-xs font-bold leading-tight }',
    'className={	ext-xs font-bold leading-tight }'
)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
