with open('apps/web/src/components/KanbanBoard.tsx', 'r') as f:
    text = f.read()

idx1 = text.find('{/* Comments Section */}')
end_idx = text.find('<div className="pt-4 mt-6 border-t border-border flex justify-end gap-3 shrink-0">', idx1)

if end_idx != -1:
    new_text = text[:idx1] + '\n </div>\n' + text[end_idx:]
    with open('apps/web/src/components/KanbanBoard.tsx', 'w') as f:
        f.write(new_text)
    print("Fixed KanbanBoard first modal!")
else:
    print("Could not find end index!")
