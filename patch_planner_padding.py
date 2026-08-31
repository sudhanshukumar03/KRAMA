# -*- coding: utf-8 -*-
import codecs
import re

filepath = 'apps/web/src/components/planner/PlannerPage.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

# Replace the absolute wrapper's padding
pattern = r'className="absolute inset-0 bg-white dark:bg-\[\#0F172A\] flex flex-col min-w-0 overflow-hidden z-10 px-6 py-6 \n?md:px-10 md:py-8"'
replacement = 'className="absolute inset-0 bg-white dark:bg-[#0F172A] flex flex-col min-w-0 overflow-hidden z-10 px-8 py-10 md:px-16 md:py-12"'
content = re.sub(pattern, replacement, content)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
