# -*- coding: utf-8 -*-
import codecs
import re

filepath = 'apps/server/src/index.ts'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

# Import
if "import focusRoutes" not in content:
    pattern = r"import pageRoutes from './routes/pages\.routes';\n?"
    replacement = "import pageRoutes from './routes/pages.routes';\nimport focusRoutes from './routes/focus.routes';\n"
    content = re.sub(pattern, replacement, content)

# Mount
if "app.use('/api/focus', focusRoutes)" not in content:
    pattern = r"app\.use\('/api/pages', pageRoutes\);\n?"
    replacement = "app.use('/api/pages', pageRoutes);\napp.use('/api/focus', focusRoutes);\n"
    content = re.sub(pattern, replacement, content)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
