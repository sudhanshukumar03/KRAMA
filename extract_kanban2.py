with open('apps/web/src/components/KanbanBoard.tsx', 'r') as f:
    lines = f.readlines()

for i in range(388, 0, -1):
    if 'function' in lines[i] or 'const ' in lines[i]:
        print(f"Line {i}: {lines[i].strip()}")
