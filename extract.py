import re
with open('apps/web/src/components/KanbanBoard.tsx', 'r') as f:
    text = f.read()

# Extract IssueEditModal
start = text.find('export function IssueEditModal({')
if start != -1:
    end = text.find('export function KanbanBoard() {')
    with open('issue_edit.txt', 'w') as f:
        f.write(text[start:end])
