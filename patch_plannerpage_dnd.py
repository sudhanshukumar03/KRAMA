# -*- coding: utf-8 -*-
import codecs

filepath = 'apps/web/src/components/planner/PlannerPage.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

old_logic = """    let newDate: string | null = null;
    
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
    }"""

new_logic = """    let newDate: string | null = null;
    let targetTimeBlockId: string | null = null;
    
    if (over.id === 'droppable-backlog') {
      newDate = null;
    } else if (over.id.startsWith('task-drop-')) {
      newDate = over.id.replace('task-drop-', '');
    } else if (over.id.startsWith('timeblock-')) {
      targetTimeBlockId = over.id.replace('timeblock-', '');
      // When dropping on a timeblock, keep the task's date as the timeblock's date
      const blockDate = over.data?.current?.block?.date;
      if (blockDate) {
        newDate = blockDate.split('T')[0];
      } else {
        newDate = task.scheduledDate; // fallback
      }
    } else {
      return;
    }

    if (task.scheduledDate === newDate && !targetTimeBlockId) return;

    try {
      // 1. Update the task date if it changed (or if it's moving from backlog to matrix)
      if (task.scheduledDate !== newDate) {
        await api.tasks.update(taskId, { scheduledDate: newDate });
      }
      
      // 2. If dropped on a TimeBlock, update the TimeBlock to link to this Task
      if (targetTimeBlockId) {
        await api.planner.updateTimeBlock(targetTimeBlockId, { taskId });
      }

      queryClient.invalidateQueries({ queryKey: ['planner', 'week', weekStart] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'backlog'] });
    } catch (error) {
      console.error('Failed to update task or link timeblock:', error);
    }"""

content = content.replace(old_logic, new_logic)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
