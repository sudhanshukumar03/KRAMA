import re
with open('apps/server/src/routes/oauth.routes.ts', 'r') as f:
    text = f.read()

target = "    res.redirect(http://localhost:5173/app/planner?sync=error&message=);"
replacement = "    res.redirect(http://localhost:5173/app/planner?sync=error&message=);"
text = text.replace(target, replacement)

with open('apps/server/src/routes/oauth.routes.ts', 'w') as f:
    f.write(text)
