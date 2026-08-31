import codecs

filepath = 'apps/web/src/components/planner/PlannerBacklog.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

import re

# Fix ID
content = re.sub(r"id:\s*\\[\s\S]*?ask-\\\\,", "id: 	ask-,", content)

# Fix transform
content = re.sub(r"transform:\s*\\[\s\S]*?ranslate3d\(\\px, \\px, 0\\\,", "transform: 	ranslate3d(px, px, 0)", content)

# Fix className string literals that might be corrupted (if any)
# I will just write a hardcoded replacement for the whole DraggableTask component just to be safe.
