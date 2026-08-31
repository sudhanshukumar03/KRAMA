# -*- coding: utf-8 -*-
import codecs
import re

filepath = 'apps/web/src/components/TimelineView.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

# Fix navigateDay
content = content.replace(
    'const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, \'0\')}-${String(targetDate.getDate()).padStart(2, \'0\')}`;\n setSearchParams({ date: dateStr });',
    'const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, \'0\')}-${String(nextDate.getDate()).padStart(2, \'0\')}`;\n setSearchParams({ date: dateStr });'
)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
