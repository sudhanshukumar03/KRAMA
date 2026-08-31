import codecs
import re

filepath = 'apps/web/src/components/planner/PlannerPage.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

# Replace all imports of api
content = re.sub(r"import \{ api \} from '\.\./\.\./api/client';\r?\n", "", content)

# Add exactly one back at the top
content = content.replace("import { useState } from 'react';", "import { useState } from 'react';\nimport { api } from '../../api/client';")

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
