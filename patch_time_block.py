import codecs

filepath = 'apps/web/src/components/planner/TimeBlockModal.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

# 1. Update Props
content = content.replace(
    '  editingBlock?: any;\n}',
    '  editingBlock?: any;\n  tasks?: any[];\n  projects?: any[];\n}'
)

# 2. Update Signature
content = content.replace(
    'export function TimeBlockModal({ open, onClose, onSubmit, onDelete, defaultDate, isSubmitting, editingBlock }: TimeBlockModalProps) {',
    'export function TimeBlockModal({ open, onClose, onSubmit, onDelete, defaultDate, isSubmitting, editingBlock, tasks = [], projects = [] }: TimeBlockModalProps) {'
)

# 3. Add state
content = content.replace(
    '  const [type, setType] = useState<TimeBlockType>(''WORK'');',
    '  const [type, setType] = useState<TimeBlockType>(''WORK'');\n  const [taskId, setTaskId] = useState('''');\n  const [projectId, setProjectId] = useState('''');'
)

# 4. Update useEffect
useEffect_old = '''        setType(editingBlock.type || 'WORK');
        setNotes(editingBlock.notes || '');
      } else {
        setTitle('');
        setDateStr(defaultDate.toISOString().split('T')[0]);
        setStartTime('09:00');
        setEndTime('10:00');
        setType('WORK');
        setNotes('');
      }'''

useEffect_new = '''        setType(editingBlock.type || 'WORK');
        setTaskId(editingBlock.taskId || '');
        setProjectId(editingBlock.projectId || '');
        setNotes(editingBlock.notes || '');
      } else {
        setTitle('');
        setDateStr(defaultDate.toISOString().split('T')[0]);
        setStartTime('09:00');
        setEndTime('10:00');
        setType('WORK');
        setTaskId('');
        setProjectId('');
        setNotes('');
      }'''
content = content.replace(useEffect_old, useEffect_new)

# 5. Update onSubmit
onSubmit_old = '''      startTime,
      endTime,
      type,
      notes: notes.trim() || undefined,
    });'''

onSubmit_new = '''      startTime,
      endTime,
      type,
      taskId: taskId || null,
      projectId: projectId || null,
      notes: notes.trim() || undefined,
    });'''
content = content.replace(onSubmit_old, onSubmit_new)

# 6. Add UI fields
ui_old = '''            </div>
          </div>

          <div className="pt-4 flex items-center gap-3">'''

ui_new = '''            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">Task</label>
              <select
                value={taskId}
                onChange={e => setTaskId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:border-primary text-sm"
              >
                <option value="">None</option>
                {tasks?.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">Project</label>
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:border-primary text-sm"
              >
                <option value="">None</option>
                {projects?.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 flex items-center gap-3">'''
content = content.replace(ui_old, ui_new)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)

# Update PlannerPage.tsx
filepath = 'apps/web/src/components/planner/PlannerPage.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

content = content.replace(
    '''      <TimeBlockModal
        open={timeBlockModalOpen}
        onClose={() => setTimeBlockModalOpen(false)}
        defaultDate={selectedDay}
        isSubmitting={createTimeBlockMutation.isPending}''',
    '''      <TimeBlockModal
        open={timeBlockModalOpen}
        onClose={() => setTimeBlockModalOpen(false)}
        defaultDate={selectedDay}
        isSubmitting={createTimeBlockMutation.isPending}
        tasks={data.tasks}
        projects={data.projects}'''
)

content = content.replace(
    '''      {editingTask && (
        <TimeBlockModal
          open={!!editingTask}
          onClose={() => setEditingTask(null)}
          editingBlock={editingTask}
          defaultDate={new Date(editingTask.date)}
          isSubmitting={updateTaskMutation.isPending}''',
    '''      {editingTask && (
        <TimeBlockModal
          open={!!editingTask}
          onClose={() => setEditingTask(null)}
          editingBlock={editingTask}
          defaultDate={new Date(editingTask.date)}
          isSubmitting={updateTaskMutation.isPending}
          tasks={data.tasks}
          projects={data.projects}'''
)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)

