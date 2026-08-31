with open('apps/web/src/components/KanbanBoard.tsx', 'r') as f:
    text = f.read()

idx1 = text.find('{/* Comments Section */}')
idx2 = text.find('{/* Comments Section */}', idx1 + 1)
print(text[idx1:idx2])
