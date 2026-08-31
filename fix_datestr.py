# -*- coding: utf-8 -*-
import codecs
import re

filepath = 'apps/web/src/components/TimelineView.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

content = content.replace("\\'0\\'", "'0'")

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
