import codecs

filepath = 'apps/web/src/components/planner/PlannerPage.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

content = content.replace(
    '<div className="absolute inset-0 bg-white dark:bg-[#0F172A] flex flex-col min-w-0 overflow-hidden z-10 p-4 md:p-6">',
    '<div className="absolute inset-0 bg-white dark:bg-[#0F172A] flex flex-col min-w-0 overflow-hidden z-10 px-6 py-6 md:px-10 md:py-8">'
)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
