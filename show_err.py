with open('apps/server/src/controllers/space.controller.ts', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if i > 40 and i < 65:
        print(f"{i+1}: {line.rstrip()}")
