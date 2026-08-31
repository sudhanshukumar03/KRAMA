# -*- coding: utf-8 -*-
import codecs
import re

filepath = 'apps/server/src/index.ts'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

if "import oauthRoutes" not in content:
    pattern = r"import pageRoutes from './routes/pages\.routes';\n?"
    replacement = "import pageRoutes from './routes/pages.routes';\nimport oauthRoutes from './routes/oauth.routes';\n"
    content = re.sub(pattern, replacement, content)

if "app.use('/api/v1/oauth', oauthRoutes)" not in content:
    pattern = r"app\.use\('/api/v1/pages', pageRoutes\);\n?"
    replacement = "app.use('/api/v1/pages', pageRoutes);\napp.use('/api/v1/oauth', oauthRoutes);\n"
    content = re.sub(pattern, replacement, content)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
