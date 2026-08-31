# -*- coding: utf-8 -*-
import codecs
import re

filepath = 'apps/web/src/components/TimelineView.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

# Fix the template literal backticks that got stripped
content = content.replace(
    "{issue.estimateMinutes ? ${issue.estimateMinutes}m : 'Task'}",
    "{issue.estimateMinutes ? `${issue.estimateMinutes}m` : 'Task'}"
)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
