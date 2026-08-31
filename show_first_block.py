import re
with open('apps/web/src/components/KanbanBoard.tsx', 'r') as f:
    text = f.read()

idx1 = text.find('{/* Comments Section */}')
print(text[idx1+2000:idx1+3000])
