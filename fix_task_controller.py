with open('apps/server/src/controllers/task.controller.ts', 'r') as f:
    text = f.read()

text = text.replace("author: { select: { name: true, image: true } }", "author: { select: { name: true } }")

with open('apps/server/src/controllers/task.controller.ts', 'w') as f:
    f.write(text)
