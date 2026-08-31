# -*- coding: utf-8 -*-
import codecs
import re

filepath = 'apps/server/src/index.ts'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

content = content.replace("import focusRoutes from './routes/focus.routes';\n", "")
content = content.replace("app.use('/api/focus', focusRoutes);\n", "")

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
