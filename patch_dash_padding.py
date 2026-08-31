# -*- coding: utf-8 -*-
import codecs
import re

filepath = 'apps/web/src/components/Dashboard.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

# Original padding: p-8 lg:p-12
pattern = r'className="h-full flex flex-col p-8 lg:p-12 max-w-7xl mx-auto space-y-8 overflow-y-auto custom-scrollbar \n?animate-in fade-in duration-500"'
replacement = 'className="h-full flex flex-col p-10 lg:p-16 max-w-[1400px] mx-auto space-y-12 overflow-y-auto custom-scrollbar animate-in fade-in duration-500"'
content = re.sub(pattern, replacement, content)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
