# -*- coding: utf-8 -*-
import codecs

filepath = 'apps/web/src/components/planner/PlannerMatrix.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

old_tb = """function DroppableTimeBlock({ block, onClickTimeBlock }: { block: any, onClickTimeBlock?: (block: any) => void }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `timeblock-${block.id}`,
    data: { type: 'TimeBlock', block }
  });"""

new_tb = """function DroppableTimeBlock({ block, tasks, onClickTimeBlock }: { block: any, tasks: any[], onClickTimeBlock?: (block: any) => void }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `timeblock-${block.id}`,
    data: { type: 'TimeBlock', block }
  });
  
  const linkedTask = tasks.find((t: any) => t.id === block.taskId);
"""

content = content.replace(old_tb, new_tb)

old_ui = """      {block.taskId && (
        <div className="mt-1 bg-white/60 dark:bg-slate-900/40 rounded px-1.5 py-0.5 text-[8.5px] font-medium truncate flex items-center gap-1">
          <CheckCircle2 size={8} className="text-blue-500" />
          {block.task?.title || "Linked Task"}
        </div>
      )}"""

new_ui = """      {block.taskId && (
        <div className="mt-1 bg-white/60 dark:bg-slate-900/40 rounded px-1.5 py-0.5 text-[8.5px] font-medium truncate flex items-center gap-1">
          <CheckCircle2 size={8} className="text-blue-500" />
          {linkedTask ? linkedTask.title : "Linked Task"}
        </div>
      )}"""

content = content.replace(old_ui, new_ui)

old_map = """                        {dayBlocks.map((block) => (
                          <DroppableTimeBlock key={block.id} block={block} onClickTimeBlock={onClickTimeBlock} />
                        ))}"""

new_map = """                        {dayBlocks.map((block) => (
                          <DroppableTimeBlock key={block.id} block={block} tasks={data.tasks || []} onClickTimeBlock={onClickTimeBlock} />
                        ))}"""

content = content.replace(old_map, new_map)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
