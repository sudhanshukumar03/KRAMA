import codecs

filepath = 'apps/web/src/components/planner/TimeBlockModal.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

content = content.replace(
    'className="fixed inset-0 z-[100]',
    'className="absolute inset-0 z-[100]'
)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
