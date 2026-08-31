import codecs

def update_planner_page(filepath):
    with codecs.open(filepath, 'r', 'utf-8') as f:
        content = f.read()

    # Imports
    imports_to_add = '''import { DndContext, DragOverlay, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import { PlannerBacklog, DraggableTask } from './PlannerBacklog';
import { api } from '../../api/client';
'''
    if 'import { DndContext' not in content:
        content = content.replace("import { PlannerHeader } from './PlannerHeader';", "import { PlannerHeader } from './PlannerHeader';\n" + imports_to_add)

    # State variables in PlannerPage
    state_to_add = '''
  const [activeDragTask, setActiveDragTask] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: any) => {
    const { active } = event;
    if (active.data.current?.type === 'Task') {
      setActiveDragTask(active.data.current.task);
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveDragTask(null);

    if (!over) return;

    const taskId = active.id.replace('task-', '');
    const task = active.data.current?.task;
    if (!task) return;

    let newDate: string | null = null;
    
    if (over.id === 'droppable-backlog') {
      newDate = null;
    } else if (over.id.startsWith('task-drop-')) {
      newDate = over.id.replace('task-drop-', '');
    } else {
      return;
    }

    if (task.scheduledDate === newDate) return;

    // Optimistically update
    try {
      await api.tasks.update(taskId, { scheduledDate: newDate });
      queryClient.invalidateQueries({ queryKey: ['planner', 'week', weekStart] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'backlog'] });
    } catch (error) {
      console.error('Failed to update task schedule:', error);
    }
  };
'''
    if 'const [activeDragTask' not in content:
        content = content.replace('const [captureOpen, setCaptureOpen] = useState(false);', 'const [captureOpen, setCaptureOpen] = useState(false);' + state_to_add)

    # DndContext Wrapper
    if '<DndContext' not in content:
        content = content.replace('<div className="absolute inset-0', '<DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>\n      <div className="absolute inset-0')
        content = content.replace('</QuickCaptureModal>\n      </div>\n    );', '</QuickCaptureModal>\n\n        <DragOverlay dropAnimation={{\n          sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.4" } } })\n        }}>\n          {activeDragTask ? <DraggableTask task={activeDragTask} /> : null}\n        </DragOverlay>\n      </div>\n    </DndContext>\n  );')

    import re
    # Add PlannerBacklog properly
    if '<PlannerBacklog' not in content:
        pattern = r'/></div>\s*<div className="flex-1 flex flex-col min-h-0 mt-4">'
        replacement = r'/></div>\n\n        <PlannerBacklog isOpen={isBacklogOpen} onClose={() => setIsBacklogOpen(false)} />\n\n        <div className="flex-1 flex flex-col min-h-0 mt-4">'
        content = re.sub(pattern, replacement, content)

    with codecs.open(filepath, 'w', 'utf-8') as f:
        f.write(content)

update_planner_page('apps/web/src/components/planner/PlannerPage.tsx')
