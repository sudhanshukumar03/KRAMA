import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../../../api/client';
import { errorMessage } from '../../../lib/utils';
import { buildScheduledSessions, plannerResumeTime } from '../runtime';
import type { SessionSlot } from '../types';
import type { FocusTimer, FocusCompletionQueue, PlannerFocus } from './types';

interface SelectionInput {
  timer: FocusTimer;
  recovery: FocusCompletionQueue;
  plannerFocus: PlannerFocus;
  selectedPlanKey: string;
  workspaceId: string | null;
}
/** Selected task/block setup, extension intents and task completion keep one identity. */
export function usePlannerFocusSession({ timer, recovery, plannerFocus, selectedPlanKey, workspaceId }: SelectionInput) {
  const queryClient = useQueryClient();
  const {
    setOperatingMode, setMode, timeLeft, setTimeLeft, setDuration, isActive, setIsActive,
    setStartTime, sessionRef, targetEndTimeRef, timeLeftRef, modeRef
  } = timer;
  const {
    pendingCompletion, pendingCompletionRef
  } = recovery;
  const selectedSlotRef = useRef<SessionSlot | null>(null);
  const selectedBlockEndRef = useRef<string | undefined>(undefined);
  const appliedSelection = useRef('');
  const [selectedSessions, setSelectedSessions] = useState<Pick<SessionSlot, 'type' | 'durationMin'>[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedDialog, setSelectedDialog] = useState<'setup' | 'decision' | null>(null);
  const [selectedFinished, setSelectedFinished] = useState(false);
  const [selectedBusy, setSelectedBusy] = useState(false);
  const selectedWrite = useRef(false);
  const selectedExtensionIntent = useRef<import('../../../types/planner').TimeBlockExtensionInput | null>(null);
  const [selectedError, setSelectedError] = useState('');
  useEffect(() => {
    if (!plannerFocus.requested || plannerFocus.loading || plannerFocus.invalid || plannerFocus.blocker || appliedSelection.current === plannerFocus.key) return;
    if (plannerFocus.task?.status === 'DONE' || plannerFocus.task?.status === 'CANCELED') { setSelectedFinished(true); return; }
    appliedSelection.current = plannerFocus.key;
    const task = plannerFocus.task, block = plannerFocus.block;
    selectedBlockEndRef.current = block?.endTime;
    selectedSlotRef.current = { index: 0, type: 'custom', durationMin: plannerFocus.totalMinutes, taskId: task?.id || null, taskTitle: task?.title || block?.title || 'Scheduled focus', projectId: block?.projectId || task?.projectId || null, projectName: task?.project?.name || null, label: task?.title || block?.title || 'Scheduled focus', timeBlockId: block?.id || null };
    let sessions = buildScheduledSessions(plannerFocus.totalMinutes, plannerFocus.totalMinutes <= 60 ? plannerFocus.totalMinutes : 45, plannerFocus.totalMinutes <= 60 ? 0 : 5);
    let index = 0, finished = false;
    let restoredSession = false;
    try {
      const extension = JSON.parse(localStorage.getItem(selectedPlanKey + '.extension') || 'null');
      if (extension?.extensionId && Number.isInteger(extension.minutes) && extension.minutes > 0 && extension.expectedEndTime) selectedExtensionIntent.current = extension;
      const saved = JSON.parse(localStorage.getItem(selectedPlanKey) || 'null');
      if (saved && (saved.blockEndTime === block?.endTime || saved.blockEndTime === selectedExtensionIntent.current?.expectedEndTime) && Array.isArray(saved.sessions) && saved.sessions.length && saved.sessions.every((item: Pick<SessionSlot, 'type' | 'durationMin'>) => ['custom', 'short_break'].includes(item.type) && Number.isInteger(item.durationMin) && item.durationMin > 0 && item.durationMin <= 1440) && Number.isInteger(saved.index) && saved.index >= 0 && saved.index < saved.sessions.length) { sessions = saved.sessions; index = saved.index; finished = saved.finished === true;
        const active = saved.session;
        if (!pendingCompletionRef.current && active?.id && active.slot?.taskId === selectedSlotRef.current.taskId && active.slot?.timeBlockId === selectedSlotRef.current.timeBlockId && typeof active.elapsedMs === 'number' && active.elapsedMs >= 0 && Number.isInteger(active.targetSeconds) && active.targetSeconds > 0 && active.targetSeconds <= 86400 && Number.isFinite(new Date(active.startTime).getTime()) && ['custom', 'short_break'].includes(active.type) && (active.runningSince === null || (Number.isFinite(active.runningSince) && Number.isFinite(saved.deadline))) && typeof saved.remaining === 'number' && saved.remaining >= 0 && saved.remaining <= active.targetSeconds) {
          sessionRef.current = { ...active, startTime: new Date(active.startTime) };
          const running = typeof active.runningSince === 'number' && Number.isFinite(active.runningSince);
          const remaining = running ? Math.max(0, Math.ceil((saved.deadline - Date.now()) / 1000)) : saved.remaining;
          timeLeftRef.current = remaining; modeRef.current = active.type;
          setMode(active.type); setDuration(active.targetSeconds); setTimeLeft(remaining); setStartTime(new Date(active.startTime));
          targetEndTimeRef.current = running ? saved.deadline : null; setIsActive(running);
          restoredSession = true;
        }
      }
    } catch { /* A new bounded plan remains available when storage is unavailable. */ }
    setSelectedSessions(sessions); setSelectedIndex(index);
    setSelectedDialog(restoredSession ? null : finished ? 'decision' : 'setup');
    setOperatingMode('manual');
    if (!restoredSession) { setMode(sessions[index].type); setDuration(sessions[index].durationMin * 60); setTimeLeft(finished ? 0 : sessions[index].durationMin * 60); }
  }, [plannerFocus.key, plannerFocus.requested, plannerFocus.loading, plannerFocus.invalid, plannerFocus.blocker, plannerFocus.task, plannerFocus.block, plannerFocus.totalMinutes, selectedPlanKey, setDuration, setOperatingMode, modeRef, setIsActive, sessionRef, pendingCompletionRef, setTimeLeft, timeLeftRef, setMode, setStartTime, targetEndTimeRef]);

  useEffect(() => {
    if (selectedSessions.length && appliedSelection.current === plannerFocus.key) {
      const ownPending = pendingCompletion?.plannerSelectionKey === plannerFocus.key;
      try { localStorage.setItem(selectedPlanKey, JSON.stringify({ sessions: selectedSessions, index: selectedIndex, blockEndTime: selectedBlockEndRef.current, finished: ownPending || timeLeft === 0, session: ownPending ? null : sessionRef.current, remaining: ownPending ? 0 : timeLeft, deadline: ownPending ? null : targetEndTimeRef.current })); } catch { /* In-memory choices still work. */ }
    }
  }, [selectedSessions, selectedIndex, selectedPlanKey, plannerFocus.key, timeLeft, pendingCompletion, isActive, targetEndTimeRef, sessionRef]);

  const prepareSelectedSession = (next: Pick<SessionSlot, 'type' | 'durationMin'>) => {
    targetEndTimeRef.current = null; sessionRef.current = null; setStartTime(null); setIsActive(false);
    const seconds = next.durationMin * 60;
    timeLeftRef.current = seconds; modeRef.current = next.type;
    setMode(next.type); setTimeLeft(seconds); setDuration(seconds);
    setSelectedDialog(null); setSelectedError('');
  };
  const configureSelected = (work: number, rest: number) => {
    if (sessionRef.current || pendingCompletionRef.current || selectedWrite.current) return;
    try { const sessions = buildScheduledSessions(plannerFocus.totalMinutes, work, rest); setSelectedSessions(sessions); setSelectedIndex(0); prepareSelectedSession(sessions[0]); } catch (error) { setSelectedError(errorMessage(error, 'Could not configure sessions')); }
  };
  const finishSelectedTask = async () => {
    if (selectedWrite.current) return;
    selectedWrite.current = true; setSelectedBusy(true); setSelectedError('');
    try {
      if (plannerFocus.task) {
        const fresh = await api.tasks.get(plannerFocus.task.id);
        await api.tasks.update(fresh.id, { status: 'DONE', version: fresh.version });
      }
      setSelectedFinished(true); setSelectedDialog(null); selectedSlotRef.current = null;
      localStorage.removeItem(selectedPlanKey);
      await Promise.all(['planner', 'focus-schedule', 'issues', 'dashboard'].map(key => queryClient.invalidateQueries({ queryKey: [key] })));
      toast.success('Task completed');
    } catch (error) { setSelectedError(errorMessage(error, 'Could not complete task')); }
    finally { selectedWrite.current = false; setSelectedBusy(false); }
  };
  const extendSelected = async (minutes: number, rescheduleBlockId?: string) => {
    if (selectedWrite.current || !plannerFocus.block) return;
    selectedWrite.current = true; setSelectedBusy(true); setSelectedError('');
    try {
      const previousIntent = selectedExtensionIntent.current;
      const input = previousIntent && previousIntent.minutes === minutes && previousIntent.rescheduleBlockId === rescheduleBlockId ? previousIntent : { extensionId: crypto.randomUUID(), minutes, expectedEndTime: plannerFocus.block.endTime, resumeAt: plannerResumeTime(plannerFocus.date), rescheduleBlockId };
      selectedExtensionIntent.current = input;
      try { localStorage.setItem(selectedPlanKey + '.extension', JSON.stringify(input)); } catch { /* Keep the same intent in memory for retry. */ }
      const result = await api.planner.extendTimeBlock(plannerFocus.block.id, input);
      selectedExtensionIntent.current = null;
      try { localStorage.removeItem(selectedPlanKey + '.extension'); } catch { }
      selectedBlockEndRef.current = result.block.endTime;
      queryClient.setQueryData(['planner', 'focus-selection', workspaceId, plannerFocus.date], (previous: import('../../../types/planner').PlannerData | undefined) => previous ? { ...previous, timeBlocks: previous.timeBlocks.map(block => block.id === result.block.id ? result.block : block.id === result.rescheduledBlock?.id ? result.rescheduledBlock : block) } : previous);
      const next = { type: 'custom' as const, durationMin: minutes };
      setSelectedSessions(previous => [...previous, next]); setSelectedIndex(selectedSessions.length);
      prepareSelectedSession(next);
      await queryClient.invalidateQueries({ queryKey: ['planner'] });
      toast.success(rescheduleBlockId ? 'Next block rescheduled. Extra focus time is ready.' : 'Extra focus time is ready.');
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 409) { selectedExtensionIntent.current = null; try { localStorage.removeItem(selectedPlanKey + '.extension'); } catch { } }
      setSelectedError(errorMessage(error, 'Could not extend focus time')); void plannerFocus.refetch();
    }
    finally { selectedWrite.current = false; setSelectedBusy(false); }
  };

  return { selectedSlotRef,selectedBlockEndRef,appliedSelection,selectedSessions,setSelectedSessions,selectedIndex,setSelectedIndex,selectedDialog,setSelectedDialog,selectedFinished,setSelectedFinished,selectedBusy,setSelectedBusy,selectedWrite,selectedExtensionIntent,selectedError,setSelectedError,prepareSelectedSession,configureSelected,finishSelectedTask,extendSelected };
}
