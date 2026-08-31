import codecs

filepath = 'apps/web/src/components/planner/RoutineModal.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

content = content.replace(
    'className="fixed inset-0 z-50',
    'className="absolute inset-0 z-50'
)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
