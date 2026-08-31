import re
with open('apps/web/src/components/KanbanBoard.tsx', 'r') as f:
    text = f.read()

# We only want to remove the first occurrence of the replacement string.
# Since it was a literal string, we can try to find the exact block and replace it back with the original tags.
# The block starts with {/* Comments Section */} and ends right before <div className="mt-8 flex justify-end gap-3">

idx1 = text.find('{/* Comments Section */}')

# Let's find the first <div className="mt-8 flex justify-end gap-3"> after idx1
end_idx = text.find('<div className="mt-8 flex justify-end gap-3">', idx1)

if end_idx != -1:
    new_text = text[:idx1] + '</div>\n</div>\n' + text[end_idx:]
    with open('apps/web/src/components/KanbanBoard.tsx', 'w') as f:
        f.write(new_text)
    print("Fixed first modal!")
else:
    print("Could not find end idx!")
