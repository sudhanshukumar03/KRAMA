with open('apps/web/src/components/Sidebar.tsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if i < 40:
        print(f"{i+1}: {line.rstrip()}")
