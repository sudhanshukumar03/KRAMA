import codecs
import re

filepath = 'apps/web/src/components/planner/PlannerBacklog.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

# Fix className string literals
content = re.sub(
    r"className=\{\\\x0clex items-start gap-3.*?\\\}", 
    'className={lex items-start gap-3 p-3 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-300 dark:hover:border-blue-700 transition-all }', 
    content
)

content = re.sub(
    r"className=\{\\\t?ext-xs font-bold leading-tight.*?\\\}", 
    'className={	ext-xs font-bold leading-tight }', 
    content
)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
