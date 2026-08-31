import codecs

filepath = 'apps/web/src/components/planner/PlannerBacklog.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

content = content.replace(
    'className="fixed inset-0 z-40 bg-slate-900/20 dark:bg-slate-900/50 backdrop-blur-sm transition-opacity"',
    'className="absolute inset-0 z-40 bg-slate-900/20 dark:bg-slate-900/50 backdrop-blur-sm transition-opacity"'
)

content = content.replace(
    'className="fixed right-0 top-0 bottom-0 w-80 bg-white dark:bg-[#1E293B] border-l border-slate-200 dark:border-slate-800 z-50 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out"',
    'className="absolute right-0 top-0 bottom-0 w-80 bg-white dark:bg-[#1E293B] border-l border-slate-200 dark:border-slate-800 z-50 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out"'
)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
