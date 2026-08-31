with open('apps/web/src/components/KanbanBoard.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    if i == 388:
        continue # skip the extra </div>
    new_lines.append(line)

with open('apps/web/src/components/KanbanBoard.tsx', 'w') as f:
    f.write(''.join(new_lines))
