with open('apps/web/src/components/KanbanBoard.tsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '{/* Comments Section */}' in line:
        print(f"Line {i}: {line.strip()}")
        # print 10 lines before
        print("".join(lines[i-10:i]))
        break
