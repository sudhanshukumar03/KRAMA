# -*- coding: utf-8 -*-
import codecs
import re

filepath = 'apps/web/src/components/HabitTracker.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

# Original padding:
pattern = r'className="flex-1 lg:h-full lg:overflow-y-auto p-4 sm:p-6 lg:p-12 relative border-b lg:border-b-0 lg:border-r border-border"'
replacement = 'className="flex-1 lg:h-full lg:overflow-y-auto p-6 sm:p-10 lg:p-20 relative border-b lg:border-b-0 lg:border-r border-border"'
content = re.sub(pattern, replacement, content)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
