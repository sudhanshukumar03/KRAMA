with open('apps/web/src/components/KanbanBoard.tsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if i > 370 and i < 405:
        print(f"{i}: {line.rstrip()}")
