with open('apps/web/src/components/KanbanBoard.tsx', 'r') as f:
    text = f.read()

idx1 = text.find('<div className="pt-4 mt-6 border-t border-border flex justify-end gap-3 shrink-0">')
print(text[idx1-200:idx1+100])
