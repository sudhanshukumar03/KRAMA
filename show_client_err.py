with open('apps/web/src/api/client.ts', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if i > 210 and i < 225:
        print(f"{i+1}: {line.rstrip()}")
