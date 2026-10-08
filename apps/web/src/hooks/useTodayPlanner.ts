import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isSameDay } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { blockMinutesOfDay, formatBlockTime, parseLocalDate } from "../lib/utils";


export function useTodayPlanner({ day, data, onAddTimeBlock }: { day: Date; data: any; onAddTimeBlock?: (day: Date, initialData?: any) => void }) {
  const queryClient = useQueryClient();
  const { workspaceId } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTaskTab, setActiveTaskTab] = useState<'today' | 'backlog'>('today');
  const [backlogSearch, setBacklogSearch] = useState('');
  const [inlineTaskTitle, setInlineTaskTitle] = useState('');

  // Real-time ticking clock for Live Horizon
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isViewingToday = day.toDateString() === new Date().toDateString();
  const targetDateStr = format(day, 'yyyy-MM-dd');
  const targetDateIso = useMemo(() => new Date(`${targetDateStr}T12:00:00.000Z`).toISOString(), [targetDateStr]);
  const targetStart = useMemo(() => new Date(new Date(day).setHours(0, 0, 0, 0)), [day]);

  // Query all workspace tasks to guarantee full task and backlog visibility
  const { data: allIssues = [] } = useQuery({
    queryKey: ['issues', workspaceId],
    queryFn: api.tasks.list,
    staleTime: 10_000,
  });

  // Query specific day planner week/blocks if day is navigated outside current cached week
  const { data: dayPlannerData } = useQuery({
    queryKey: ['planner', 'day', targetDateStr, workspaceId],
    queryFn: () => api.planner.getWeek(targetDateStr, targetDateStr),
    staleTime: 15_000,
  });

  // Task Mutations
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.tasks.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['focus-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['goal'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
    },
    onError: (err: any) => {
      toast.error('Failed to update task: ' + (err?.message || 'Unknown error'));
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: (taskData: any) => api.tasks.create(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['focus-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['goal'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      toast.success(`Task added for ${isViewingToday ? 'today' : format(day, 'MMM d')}`);
      setInlineTaskTitle('');
    },
    onError: (err: any) => {
      toast.error('Failed to create task: ' + (err?.message || 'Unknown error'));
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => api.tasks.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['focus-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['goal'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      toast.success('Task deleted');
    },
    onError: (err: any) => {
      toast.error('Failed to delete task: ' + (err?.message || 'Unknown error'));
    }
  });

  const taskList = useMemo(() => {
    return allIssues.length > 0 ? allIssues : (data?.tasks || []);
  }, [allIssues, data?.tasks]);

  const rawBlocks = useMemo(() => {
    return dayPlannerData?.timeBlocks || data?.timeBlocks || [];
  }, [dayPlannerData?.timeBlocks, data?.timeBlocks]);

  // Filter and sort time blocks for this day
  const timeBlocks = useMemo(() => {
    return rawBlocks
      // Drop synthesized holiday pseudo-blocks (isExternal): they have ids like
      // "holiday-<name>" with no real row, so their Edit/Delete controls 404.
      // PlannerMatrix applies the same filter.
      .filter((b: any) => !b.isExternal)
      .filter((b: any) => {
        try {
          if (b.date) return isSameDay((parseLocalDate(b.date) ?? new Date(NaN)), day);
          if (b.startTime) return isSameDay((parseLocalDate(b.startTime) ?? new Date(NaN)), day);
          return false;
        } catch {
          return false;
        }
      })
      .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [rawBlocks, day]);

  // Tasks categorized for Today View:
  // 1. Today's Tasks
  // 2. Carried-over (past overdue)
  // 3. Unscheduled Backlog (available to schedule)
  const { todayTasks, carriedOverTasks, backlogTasks } = useMemo(() => {
    const todayList: any[] = [];
    const carriedList: any[] = [];
    const backlogList: any[] = [];

    taskList.forEach((t: any) => {
      const isCompleted = t.status === 'DONE' || t.status === 'CANCELED';
      const tDateStr = t.scheduledDate || t.dueDate;

      if (!tDateStr) {
        if (!isCompleted) backlogList.push(t);
        return;
      }

      try {
        const parsed = (parseLocalDate(tDateStr) ?? new Date(NaN));
        const isToday = isSameDay(parsed, day);
        const isPast = parsed.getTime() < targetStart.getTime() && !isToday;

        if (isToday) {
          todayList.push(t);
        } else if (isPast && !isCompleted) {
          carriedList.push(t);
        }
      } catch {
        if (!isCompleted) backlogList.push(t);
      }
    });

    return {
      todayTasks: todayList,
      carriedOverTasks: carriedList,
      backlogTasks: backlogList,
    };
  }, [taskList, day, targetStart]);

  // Filtered backlog tasks by search query
  const filteredBacklogTasks = useMemo(() => {
    if (!backlogSearch.trim()) return backlogTasks;
    const q = backlogSearch.toLowerCase();
    return backlogTasks.filter((t: any) => 
      t.title.toLowerCase().includes(q) || 
      (t.project?.name && t.project.name.toLowerCase().includes(q))
    );
  }, [backlogTasks, backlogSearch]);

  // Total Focus Minutes
  const totalFocusMinutes = useMemo(() => {
    return timeBlocks.reduce((acc: number, tb: any) => {
      const start = new Date(tb.startTime).getTime();
      const end = new Date(tb.endTime).getTime();
      const diffMins = Math.max(0, Math.round((end - start) / 60000));
      return acc + diffMins;
    }, 0);
  }, [timeBlocks]);

  const focusHours = Math.floor(totalFocusMinutes / 60);
  const focusMinutesRemainder = totalFocusMinutes % 60;
  const focusTimeString = focusHours > 0 
    ? `${focusHours}h ${focusMinutesRemainder > 0 ? `${focusMinutesRemainder}m` : ''}` 
    : `${focusMinutesRemainder}m`;

  const timeString = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // Time blocks are stored as UTC wall-clock; read/format them with UTC helpers.
  const formatTime = (iso: string) => formatBlockTime(iso);

  const getHHMM = (isoOrTime: string) => {
    const formatted = formatBlockTime(isoOrTime);
    return formatted || '09:00';
  };

  const getDurationString = (startIso: string, endIso: string) => {
    const sMin = blockMinutesOfDay(startIso);
    const eMin = blockMinutesOfDay(endIso);
    if (sMin === null || eMin === null) return '';
    const mins = Math.max(0, eMin - sMin);
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
  };

  const getNextAvailableSlot = (blocks: any[], forDay: Date) => {
    const intervals: { start: number; end: number }[] = [];
    for (const b of blocks) {
      const sMin = blockMinutesOfDay(b.startTime);
      const eMin = blockMinutesOfDay(b.endTime);
      if (sMin !== null && eMin !== null && eMin > sMin) {
        intervals.push({ start: sMin, end: eMin });
      }
    }

    const isToday = isSameDay(forDay, new Date());
    let startHour = 9;
    if (isToday) {
      const currentHour = new Date().getHours();
      if (currentHour >= 8 && currentHour < 21) {
        startHour = currentHour + 1;
      }
    }

    const checkSlot = (sh: number) => {
      const slotStart = sh * 60;
      const slotEnd = slotStart + 60;
      return !intervals.some(inv => slotStart < inv.end && slotEnd > inv.start);
    };

    for (let h = startHour; h <= 21; h++) {
      if (checkSlot(h)) {
        return {
          startTime: `${String(h).padStart(2, '0')}:00`,
          endTime: `${String(h + 1).padStart(2, '0')}:00`,
        };
      }
    }

    for (let h = 9; h < startHour; h++) {
      if (checkSlot(h)) {
        return {
          startTime: `${String(h).padStart(2, '0')}:00`,
          endTime: `${String(h + 1).padStart(2, '0')}:00`,
        };
      }
    }

    return { startTime: '09:00', endTime: '10:00' };
  };

  // Actions
  const handleScheduleForToday = (task: any) => {
    updateTaskMutation.mutate({
      id: task.id,
      data: { scheduledDate: targetDateIso }
    }, {
      onSuccess: () => toast.success(`Scheduled "${task.title}" for ${isViewingToday ? 'today' : format(day, 'MMM d')}`)
    });
  };

  const handleUnschedule = (task: any) => {
    updateTaskMutation.mutate({
      id: task.id,
      data: { scheduledDate: null }
    }, {
      onSuccess: () => toast.success(`Moved "${task.title}" to backlog`)
    });
  };

  const handleRescheduleAllOverdue = async () => {
    const whenLabel = isViewingToday ? 'today' : format(day, 'MMM d');
    const results = await Promise.allSettled(
      carriedOverTasks.map((t: any) =>
        updateTaskMutation.mutateAsync({
          id: t.id,
          data: { scheduledDate: targetDateIso }
        })
      )
    );
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - succeeded;
    if (succeeded > 0) {
      toast.success(`Rescheduled ${succeeded} task(s) to ${whenLabel}`);
    }
    if (failed > 0) {
      toast.error(`Failed to reschedule ${failed} task(s)`);
    }
  };

  const handleCreateInlineTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineTaskTitle.trim() || createTaskMutation.isPending) return;
    createTaskMutation.mutate({
      title: inlineTaskTitle.trim(),
      scheduledDate: targetDateIso,
      status: 'TODO'
    });
  };

  const handleTimeBlockFromTask = (task: any) => {
    if (onAddTimeBlock) {
      const slot = getNextAvailableSlot(timeBlocks, day);
      onAddTimeBlock(day, {
        title: task.title,
        taskId: task.id,
        projectId: task.projectId || task.project?.id,
        date: targetDateStr,
        startTime: slot.startTime,
        endTime: slot.endTime,
        type: 'WORK',
      });
    }
  };

  // Milestones for this day (C10). Prefer the day-scoped planner fetch, fall
  // back to the week payload passed in via `data`.
  const dayMilestones = useMemo(() => {
    const source = dayPlannerData?.milestones ?? data?.milestones ?? [];
    return source.filter((m: any) => {
      try {
        return m.date && isSameDay((parseLocalDate(m.date) ?? new Date(NaN)), day);
      } catch {
        return false;
      }
    });
  }, [dayPlannerData?.milestones, data?.milestones, day]);

  // Goals whose target date lands on this day — read-only deadline chips
  // (goals are edited from the Goals page, not the planner).
  const dayGoalDeadlines = useMemo(() => {
    const source = dayPlannerData?.goalDeadlines ?? data?.goalDeadlines ?? [];
    return source.filter((g: any) => {
      try {
        return g.targetDate && isSameDay((parseLocalDate(g.targetDate) ?? new Date(NaN)), day);
      } catch {
        return false;
      }
    });
  }, [dayPlannerData?.goalDeadlines, data?.goalDeadlines, day]);

  return { currentTime, navigate, isViewingToday, targetDateStr, updateTaskMutation, createTaskMutation, deleteTaskMutation, taskList, timeBlocks, filteredBacklogTasks, focusTimeString, timeString, formatTime, getHHMM, getDurationString, getNextAvailableSlot, handleScheduleForToday, handleUnschedule, handleRescheduleAllOverdue, handleCreateInlineTask, handleTimeBlockFromTask, dayMilestones, dayGoalDeadlines, todayTasks, carriedOverTasks, backlogTasks, activeTaskTab, setActiveTaskTab, backlogSearch, setBacklogSearch, inlineTaskTitle, setInlineTaskTitle };
}
