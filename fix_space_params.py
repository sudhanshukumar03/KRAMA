import os

def fix_file(path):
    with open(path, 'r') as f:
        text = f.read()
    
    text = text.replace("const { id } = req.params;", "const id = req.params.id as string;")
    
    with open(path, 'w') as f:
        f.write(text)

fix_file('apps/server/src/controllers/space.controller.ts')
fix_file('apps/server/src/controllers/task.controller.ts')
