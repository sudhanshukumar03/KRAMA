# -*- coding: utf-8 -*-
import codecs
import re

with codecs.open('apps/web/src/components/planner/PlannerPage.tsx', 'r', 'utf-8') as f:
    content = f.read()

content = re.sub(
    r"const \[mode, setMode\] = useState<'plan' \| 'calendar'>\('plan'\);",
    "const [mode, setMode] = useState<'plan' | 'calendar'>('plan');\n  const [isBacklogOpen, setIsBacklogOpen] = useState(false);",
    content
)

with codecs.open('apps/web/src/components/planner/PlannerPage.tsx', 'w', 'utf-8') as f:
    f.write(content)
