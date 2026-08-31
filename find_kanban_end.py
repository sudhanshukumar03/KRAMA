with open('apps/web/src/components/KanbanBoard.tsx', 'r') as f:
    text = f.read()

parts = text.split('{/* Comments Section */}')
print(parts[1][:100])
print("-----")
print(parts[1][-100:])
