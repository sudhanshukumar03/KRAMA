import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { parseLocalDate } from '../lib/utils';

/** Resolve deep links from live workspace records, never URL-supplied durations. */
export function usePlannerFocus() {
  const [params] = useSearchParams();
  const { workspaceId } = useAuth();
  const taskId = params.get('task');
  const blockId = params.get('block');
  const date = params.get('date') || '';
  const requested = !!(taskId || blockId);
  const validDate = !!parseLocalDate(date);
  const week = useQuery({ queryKey: ['planner', 'focus-selection', workspaceId, date], queryFn: () => api.planner.getWeek(date, date), enabled: requested && validDate && !!workspaceId });
  const block = week.data?.timeBlocks?.find(item => !item.isExternal && (blockId ? item.id === blockId : item.taskId === taskId));
  const linkedTaskId = taskId || block?.taskId;
  const task = useQuery({ queryKey: ['focus-task', workspaceId, linkedTaskId], queryFn: () => api.tasks.get(linkedTaskId!), enabled: requested && !!linkedTaskId && !!workspaceId });
  const loading = week.isLoading || (!!linkedTaskId && task.isLoading);
  const invalid = requested && (!validDate || week.isError || task.isError || (!loading && ((blockId && !block) || (linkedTaskId && !task.data) || (block?.taskId && taskId && block.taskId !== taskId) || (block && ['MEETING', 'PERSONAL'].includes(block.type)))));
  const totalMinutes = block ? Math.round((new Date(block.endTime).getTime() - new Date(block.startTime).getTime()) / 60000) : task.data?.estimateMinutes || 25;
  return { requested, loading, invalid: invalid || !Number.isFinite(totalMinutes) || totalMinutes < 1 || totalMinutes > 1440, key: [workspaceId, date, blockId, taskId].join(':'), date, block, task: task.data, totalMinutes, blocks: week.data?.timeBlocks || [], refetch: week.refetch };
}
