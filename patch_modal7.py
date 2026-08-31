import codecs

filepath = 'apps/web/src/components/planner/TimeBlockModal.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

content = content.replace(
'''interface TimeBlockModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTimeBlockInput) => void;
  defaultDate: Date;
  isSubmitting: boolean;
}''',
'''interface TimeBlockModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  defaultDate: Date;
  isSubmitting: boolean;
  tasks?: any[];
  projects?: any[];
}'''
)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
