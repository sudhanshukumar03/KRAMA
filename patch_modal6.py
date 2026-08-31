import codecs

filepath = 'apps/web/src/components/planner/TimeBlockModal.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

content = content.replace(
    'export function TimeBlockModal({ open, onClose, onSubmit, defaultDate, isSubmitting }: TimeBlockModalProps) {',
    'export function TimeBlockModal({ open, onClose, onSubmit, defaultDate, isSubmitting, tasks = [], projects = [] }: TimeBlockModalProps) {'
)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
