import codecs
import re

filepath = 'apps/web/src/components/planner/CalendarMode.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

# Remove px-6 pb-6 from grid container
content = content.replace(
    '<div className="flex-1 flex flex-col min-h-0 px-6 pb-6">',
    '<div className="flex-1 flex flex-col min-h-0 pb-6">'
)

# Remove pr-6 pb-6 from sidebar container
content = content.replace(
    '<div className="w-72 flex-shrink-0 flex flex-col gap-4 overflow-y-auto hide-scrollbar pr-6 pb-6">',
    '<div className="w-72 flex-shrink-0 flex flex-col gap-4 overflow-y-auto hide-scrollbar pb-6">'
)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
