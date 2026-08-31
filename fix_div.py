with open('apps/web/src/components/KanbanBoard.tsx', 'r') as f:
    text = f.read()

idx1 = text.find('<div className="pt-4 mt-6 border-t border-border flex justify-end gap-3 shrink-0">')
new_text = text[:idx1] + '</div>\n' + text[idx1:]
with open('apps/web/src/components/KanbanBoard.tsx', 'w') as f:
    f.write(new_text)
