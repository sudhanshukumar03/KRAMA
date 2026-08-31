import codecs

filepath = 'apps/web/src/components/planner/TimeBlockModal.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

# Remove duplicate state declarations if they exist
content = content.replace(
'''  const [taskId, setTaskId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [projectId, setProjectId] = useState('');''',
'''  const [taskId, setTaskId] = useState('');
  const [projectId, setProjectId] = useState('');'''
)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
