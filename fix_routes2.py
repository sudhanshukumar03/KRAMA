with open('apps/server/src/routes/automation.routes.ts', 'r') as f:
    text = f.read()

text = text.replace("const router = Router();", "const router: import('express').Router = Router();")

with open('apps/server/src/routes/automation.routes.ts', 'w') as f:
    f.write(text)
