import codecs
import re

filepath = 'apps/web/src/components/planner/TimeBlockModal.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

# 1. Update Props
content = re.sub(
    r'  editingBlock\?: any;\r?\n\}',
    '  editingBlock?: any;\n  tasks?: any[];\n  projects?: any[];\n}',
    content
)

# 2. Update Signature
content = content.replace(
    'export function TimeBlockModal({ open, onClose, onSubmit, onDelete, defaultDate, isSubmitting, editingBlock }: TimeBlockModalProps) {',
    'export function TimeBlockModal({ open, onClose, onSubmit, onDelete, defaultDate, isSubmitting, editingBlock, tasks = [], projects = [] }: TimeBlockModalProps) {'
)

# 3. Add state
content = content.replace(
    '  const [type, setType] = useState<TimeBlockType>(\'WORK\');',
    '  const [type, setType] = useState<TimeBlockType>(\'WORK\');\n  const [taskId, setTaskId] = useState(\'\');\n  const [projectId, setProjectId] = useState(\'\');'
)

# 4. Update useEffect
content = content.replace(
    "setType(editingBlock.type || 'WORK');",
    "setType(editingBlock.type || 'WORK');\n        setTaskId(editingBlock.taskId || '');\n        setProjectId(editingBlock.projectId || '');"
)
content = content.replace(
    "setType('WORK');\n        setNotes('');",
    "setType('WORK');\n        setTaskId('');\n        setProjectId('');\n        setNotes('');"
)

# 5. Update onSubmit
content = content.replace(
    "type,\n      notes: notes.trim() || undefined,",
    "type,\n      taskId: taskId || null,\n      projectId: projectId || null,\n      notes: notes.trim() || undefined,"
)

# 6. Add UI fields
ui_new = '''            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">Task</label>
              <select
                value={taskId}
                onChange={e => setTaskId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="">None</option>
                {tasks?.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">Project</label>
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="">None</option>
                {projects?.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2">'''

content = content.replace('          <div className="pt-2">', ui_new, 1)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
