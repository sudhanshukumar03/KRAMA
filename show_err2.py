with open('apps/server/src/controllers/task.controller.ts', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if i > 150 and i < 175:
        print(f"{i+1}: {line.rstrip()}")
