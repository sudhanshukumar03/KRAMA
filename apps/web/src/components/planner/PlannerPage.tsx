// =============================================================================
// PLANNER PAGE ?" KRAMA OS
// =============================================================================
// Top-level page component orchestrating the planner system

import { useState, useMemo, useRef } from 'react';
import { CalendarDays } from 'lucide-react';
import { format, subMonths, addMonths, addDays } from 'date-fns';
import { INDIAN_STATES, COUNTRIES } from './locationConstants';
import { usePlannerWeek } from '../../hooks/usePlannerWeek';
import { PlannerHeader } from './PlannerHeader';
import { CapacitySummary } from './CapacitySummary';
import { PlannerMatrix } from './PlannerMatrix';
import { CalendarMode } from './CalendarMode';
import { TodayView } from './TodayView';
import { PlannerSkeleton } from './PlannerSkeleton';
import { TimeBlockModal } from './TimeBlockModal';
import { RoutineModal } from './RoutineModal';
import { MilestoneModal } from './MilestoneModal';
import { QuickCaptureModal } from '../ui/QuickCaptureModal';
import { toast } from 'sonner';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LocationSettingsModal } from './LocationSettingsModal';
import { CapacitySettingsModal } from './CapacitySettingsModal';
import { IssueEditModal } from '../KanbanBoard';
import { useAuth } from '../../contexts/AuthContext';
import type { PlannerTask, TimeBlock, TimeBlockDraft, Milestone, RoutineOccurrence } from '../../types/planner';
import type { IssueWithRelations, TaskUpdateInput } from '../../types/schema';
import { parseLocalDate, errorMessage } from '../../lib/utils';
import { openFocusTab } from '../../lib/focusNavigation';
import { scheduleTaskPatch } from '../../lib/plannerTaskActions';
import { useTaskDeletion } from '../../hooks/useTaskDeletion';
import '../../styles/planner.css';

export function PlannerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlMode = searchParams.get('mode');
  const mode = (urlMode === 'day' || urlMode === 'schedule') ? 'day' : urlMode === 'calendar' ? 'calendar' : 'plan';
  const [previousMode, setPreviousMode] = useState<'plan' | 'calendar'>('plan');
  const [isDrilldown, setIsDrilldown] = useState(false);
  const dateParam = searchParams.get('date');
  const viewDay = useMemo(() => parseLocalDate(dateParam) ?? new Date(), [dateParam]);
  const calendarDate = viewDay;
  const showDate = (date: Date, nextMode: 'plan' | 'calendar' | 'day' = mode) => {
    const params = new URLSearchParams(searchParams);
    params.set('mode', nextMode);
    params.set('date', format(date, 'yyyy-MM-dd'));
    setSearchParams(params);
  };
  const queryClient = useQueryClient();

  const { workspaceId } = useAuth();



 const {
 data,
 isLoading,
 isError,
 refetch,
    days,
    weekRangeLabel,
    weekNumber,
    occurrenceFor,
    toggleRoutineMutation,
    createTimeBlockMutation,
    updateTimeBlockMutation,
    deleteTimeBlockMutation,
    createMilestoneMutation,
    updateMilestoneMutation,
    deleteMilestoneMutation,
  } = usePlannerWeek(viewDay);

  const [timeBlockModalOpen, setTimeBlockModalOpen] = useState(false);
  const [editingTimeBlock, setEditingTimeBlock] = useState<TimeBlockDraft | null>(null);
  const [routineModalOpen, setRoutineModalOpen] = useState(false);
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [milestoneDefaultDate, setMilestoneDefaultDate] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [captureOpen, setCaptureOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [capacityModalOpen, setCapacityModalOpen] = useState(false);
  const [captureDate, setCaptureDate] = useState<Date | undefined>(undefined);
  const [editingTask, setEditingTask] = useState<IssueWithRelations | null>(null);
  const taskRequest = useRef(0);
  const activeWorkspace = useRef(workspaceId);
  activeWorkspace.current = workspaceId;

 // Calendar lifted states
  const [localOnly, setLocalOnly] = useState(false);
  const activeTab: 'india' | 'world' = data?.config?.countryCode === 'IN' ? 'india' : 'world';
  const indiaRegion = data?.config?.countryCode === 'IN' ? (data?.config?.regionCode || '') : '';
  const worldCountry = data?.config?.countryCode !== 'IN' ? data?.config?.countryCode : 'US';

  const { data: allIssues = [], isError: issuesError, refetch: refetchIssues } = useQuery({
    queryKey: ['issues', workspaceId],
    queryFn: api.tasks.list,
    staleTime: 10_000,
  });

  const mergedData = useMemo(() => {
    if (!data) return data;
    const taskMap = new Map<string, PlannerTask>();
    allIssues.forEach(task => taskMap.set(task.id, { ...task, completed: task.status === "DONE" }));
    (data.tasks || []).forEach((task: PlannerTask) => taskMap.set(task.id, { ...taskMap.get(task.id), ...task }));
    return {
      ...data,
      tasks: Array.from(taskMap.values()),
    };
  }, [data, allIssues]);

 const updateTaskMutation = useMutation({
 mutationFn: ({ id, data }: { id: string; data: TaskUpdateInput }) => api.tasks.update(id, data),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['focus-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
 queryClient.invalidateQueries({ queryKey: ['issues'] });
 queryClient.invalidateQueries({ queryKey: ['tasks'] });
 queryClient.invalidateQueries({ queryKey: ['projects'] });
 queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['goal'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
 },
 onError: (err) => {
 toast.error('Failed to update task: ' + errorMessage(err, 'Unknown error'));
 }
 });

 const deleteTaskMutation = useTaskDeletion();

  const deleteRoutineMutation = useMutation({
    mutationFn: (id: string) => api.habits.update(id, { pinnedToPlanner: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      toast.success('Routine unpinned from planner');
    },
    onError: (err) => {
      toast.error('Failed to unpin routine: ' + errorMessage(err, 'Unknown error'));
    }
  });

 if (isLoading) {
 return <PlannerSkeleton />;
 }

 if (isError || !data || !mergedData) {
 return (
 <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
 <CalendarDays size={48} className="text-muted" />
 <h2 className="text-lg font-semibold text-primary">Unable to load Planner</h2>
 <p className="text-sm text-muted">Something went wrong loading your weekly plan.</p>
 <button
 onClick={() => refetch()}
 className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors"
 >
 Retry
 </button>
 </div>
 );
 }

  const handleScheduleTask = (taskId: string, dateStr: string) => {
    const targetIso = new Date(`${dateStr}T12:00:00.000Z`).toISOString();
    updateTaskMutation.mutate({
      id: taskId,
      data: scheduleTaskPatch(allIssues.find(task => task.id === taskId) ?? {}, targetIso)
    }, {
      onSuccess: () => toast.success(`Task scheduled for ${dateStr}`),
      onError: () => toast.error('Failed to schedule task')
    });
  };

  const handleLinkTaskToBlock = (blockId: string, taskId: string) => {
    updateTimeBlockMutation.mutate({
      id: blockId,
      data: { taskId, projectId: allIssues.find(task => task.id === taskId)?.projectId ?? null }
    }, {
      onSuccess: () => {
        toast.success('Task linked to time block');
      },
      onError: (err) => toast.error(errorMessage(err, 'Failed to link task'))
    });
  };

 const handleToggleRoutine = (occ: RoutineOccurrence) => {
 toggleRoutineMutation.mutate(occ, {
 onError: () => toast.error('Failed to update routine'),
 });
 };

  const handleAddTimeBlock = (day?: Date, initialData?: TimeBlockDraft) => {
    setEditingTimeBlock(initialData || null);
    if (day) setSelectedDay(day);
    setTimeBlockModalOpen(true);
  };

  const handleEditTimeBlock = (block: TimeBlock) => {
    setEditingTimeBlock(block);
    if (block.date || block.startTime) {
      setSelectedDay(new Date(block.date || block.startTime));
    }
    setTimeBlockModalOpen(true);
  };

  const handleAddTask = (day?: Date) => {
    setCaptureDate(day || new Date());
    setCaptureOpen(true);
  };

  const handleAddRoutine = (_day?: Date) => {
    setRoutineModalOpen(true);
  };

  const handleToggleTask = (task: PlannerTask, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    updateTaskMutation.mutate({ id: task.id, data: { status: newStatus, version: task.version } }, {
      onSuccess: () => toast.success(newStatus === 'DONE' ? 'Task completed' : 'Task restored'),
      onError: () => toast.error('Failed to update task')
    });
  };

  const handleFocusTask = (task: PlannerTask, occurrenceDay?: Date) => {
    const taskDay = occurrenceDay ? format(occurrenceDay, 'yyyy-MM-dd') : (task.scheduledDate || task.dueDate || format(viewDay, 'yyyy-MM-dd')).slice(0, 10);
    const candidates = (mergedData?.timeBlocks || []).filter(item => item.taskId === task.id && !item.isExternal && !['MEETING', 'PERSONAL'].includes(item.type) && item.date.slice(0, 10) === taskDay).sort((a, b) => a.startTime.localeCompare(b.startTime));
    const now = new Date(), nowMinutes = now.getHours() * 60 + now.getMinutes();
    const block = (taskDay === format(now, 'yyyy-MM-dd') ? candidates.find(item => Number(item.endTime.slice(11, 13)) * 60 + Number(item.endTime.slice(14, 16)) > nowMinutes) : candidates[0]) || candidates[0];
    const date = (block?.date || taskDay).slice(0, 10);
    const params = new URLSearchParams({ task: task.id, date });
    if (block) params.set('block', block.id);
    openFocusTab(params);
  };
  const handleFocusBlock = (block: TimeBlock) => {
    if (block.isExternal || block.type === 'MEETING' || block.type === 'PERSONAL') return handleEditTimeBlock(block);
    const params = new URLSearchParams({ block: block.id, date: block.date.slice(0, 10) });
    if (block.taskId) params.set('task', block.taskId);
    openFocusTab(params);
  };

  const handleClickTask = async (task: PlannerTask) => {
    const request = ++taskRequest.current;
    try {
      const fullTask = await api.tasks.get(task.id);
      if (request === taskRequest.current && workspaceId === activeWorkspace.current) setEditingTask(fullTask);
    } catch {
      toast.error('Unable to load task details. Please try again.');
    }
  };

  const handleAddMilestone = (day?: Date) => {
    setEditingMilestone(null);
    setMilestoneDefaultDate(day || new Date());
    setMilestoneModalOpen(true);
  };

  const handleEditMilestone = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setMilestoneModalOpen(true);
  };

  const handleToggleMilestone = (milestone: Milestone) => {
    updateMilestoneMutation.mutate({ id: milestone.id, data: { completed: !milestone.completed } });
  };

  const handleDeleteMilestone = (milestone: Milestone) => {
    deleteMilestoneMutation.mutate(milestone.id, {
      onSuccess: () => {
        setMilestoneModalOpen(false);
        setEditingMilestone(null);
      },
    });
  };

  const handleOpenDayView = (day: Date) => {
    setPreviousMode(mode === 'calendar' ? 'calendar' : 'plan');
    setIsDrilldown(true);
    showDate(day, 'day');
  };

  const handleBackFromDayView = () => {
    setIsDrilldown(false);
    showDate(viewDay, previousMode);
  };

  const headerTitle = mode === 'plan' 
    ? weekRangeLabel 
    : mode === 'calendar' 
    ? format(calendarDate, 'MMMM yyyy') 
    : format(viewDay, 'EEEE, MMMM d, yyyy');
  const headerSubtitle = mode === 'plan' ? `Week ${weekNumber}` : mode === 'calendar' ? 'Month' : 'Day Details';

  const handleNavigate = (dir: 'prev' | 'next' | 'today') => {
    if (mode === 'plan') {
      showDate(dir === 'today' ? new Date() : addDays(viewDay, dir === 'prev' ? -7 : 7));
    } else if (mode === 'calendar') {
      showDate(dir === 'today' ? new Date() : dir === 'prev' ? subMonths(calendarDate, 1) : addMonths(calendarDate, 1));
    } else {
      const targetDate = dir === 'today' ? new Date() : dir === 'prev' ? addDays(viewDay, -1) : addDays(viewDay, 1);
      showDate(targetDate);
    }
  };

 const currentCountryCode = activeTab === 'india' ? 'IN' : (worldCountry || 'US');
 let currentRegionCode: string | null = null;
 if (activeTab === 'india' && indiaRegion) currentRegionCode = indiaRegion;

 let countryRegionStr = 'IN India';
 if (activeTab === 'india') {
 countryRegionStr = indiaRegion ? `IN ${INDIAN_STATES.find(s => s.code === indiaRegion)?.name || "India"}` : "IN India";
 } else {
 countryRegionStr = COUNTRIES.find(c => c.code === worldCountry)?.name || 'World';
 }

  return (
    <div className="planner-page flex flex-col h-full w-full min-h-0 overflow-hidden bg-canvas">
      <div className="planner-shell flex flex-col h-full w-full max-w-[1700px] mx-auto px-4 md:px-6 py-2.5 min-h-0 gap-2.5">
        {mode !== 'calendar' && ((data.holidayCoverage?.missingNationalYears?.length ?? 0) > 0 || (data.holidayCoverage?.missingRegionalYears?.length ?? 0) > 0) && (
          <p role="status" className="shrink-0 text-sm text-warning-fg">
            Holiday coverage is incomplete. Available capacity may exclude missing holidays.
          </p>
        )}
        <LocationSettingsModal 
          open={locationModalOpen} 
          onClose={() => setLocationModalOpen(false)} 
          currentCountry={data?.config?.countryCode || 'IN'} 
          currentRegion={data?.config?.regionCode || ''} 
        />
        <CapacitySettingsModal
          open={capacityModalOpen}
          onClose={() => setCapacityModalOpen(false)}
          currentCapacityMinutes={data?.capacity?.weeklyCapacityMinutes ?? 2400}
        />
        <QuickCaptureModal
          open={captureOpen}
          onClose={() => setCaptureOpen(false)}
          defaultMode="task"
          defaultScheduledDate={captureDate}
        />
        <RoutineModal
          open={routineModalOpen}
          onClose={() => setRoutineModalOpen(false)}
        />
        <MilestoneModal
          open={milestoneModalOpen}
          onClose={() => {
            setMilestoneModalOpen(false);
            setEditingMilestone(null);
          }}
          defaultDate={milestoneDefaultDate}
          editingMilestone={editingMilestone}
          projects={data?.projects || []}
          isSubmitting={createMilestoneMutation.isPending || updateMilestoneMutation.isPending}
          onDelete={editingMilestone ? () => handleDeleteMilestone(editingMilestone) : undefined}
          onSubmit={(milestoneData) => {
            if (editingMilestone && editingMilestone.id) {
              updateMilestoneMutation.mutate({ id: editingMilestone.id, data: milestoneData }, {
                onSuccess: () => {
                  setMilestoneModalOpen(false);
                  setEditingMilestone(null);
                },
              });
            } else {
              createMilestoneMutation.mutate(milestoneData, {
                onSuccess: () => {
                  setMilestoneModalOpen(false);
                },
              });
            }
          }}
        />
        <TimeBlockModal
          open={timeBlockModalOpen}
          onClose={() => {
            setTimeBlockModalOpen(false);
            setEditingTimeBlock(null);
          }}
          defaultDate={selectedDay}
          editingBlock={editingTimeBlock}
          tasks={mergedData?.tasks || []}
          projects={data?.projects || []}
          onDelete={editingTimeBlock?.id ? () => {
            deleteTimeBlockMutation.mutate(editingTimeBlock.id!, {
              onSuccess: () => {
                toast.success('Time block deleted');
                setTimeBlockModalOpen(false);
                setEditingTimeBlock(null);
              }
            });
          } : undefined}
          isSubmitting={createTimeBlockMutation.isPending || updateTimeBlockMutation.isPending}
          onSubmit={(blockData) => {
            if (editingTimeBlock && editingTimeBlock.id) {
              updateTimeBlockMutation.mutate({ id: editingTimeBlock.id, data: blockData }, {
                onSuccess: () => {
                  toast.success('Time block updated');
                  setTimeBlockModalOpen(false);
                  setEditingTimeBlock(null);
                },
                onError: (err) => {
                  toast.error(err?.message || 'Failed to update time block');
                }
              });
            } else {
              createTimeBlockMutation.mutate(blockData, {
                onSuccess: () => {
                  toast.success('Time block created');
                  setTimeBlockModalOpen(false);
                },
                onError: (err) => {
                  toast.error(err?.message || 'Failed to create time block');
                }
              });
            }
          }}
        />

        {editingTask && (
          <IssueEditModal
            open={!!editingTask}
            issue={editingTask}
            allIssues={allIssues}
            projects={data.projects}
            onClose={() => setEditingTask(null)}
            isSubmitting={updateTaskMutation.isPending}
            onSubmit={(id, updatedData) => {
              updateTaskMutation.mutate({ id, data: updatedData }, {
                onSuccess: () => {
                  toast.success('Task updated');
                  setEditingTask(null);
                },
                onError: () => toast.error('Failed to update task')
              });
            }}
          />
        )}

        <PlannerHeader
          mode={mode}
          onModeChange={(m) => {
            setIsDrilldown(false);
            if (m !== 'day') setPreviousMode(m);
            showDate(viewDay, m);
          }}
          title={headerTitle}
          subtitle={headerSubtitle}
          onNavigate={handleNavigate}
          localOnly={localOnly}
          onLocalOnlyChange={setLocalOnly}
          countryRegion={countryRegionStr}
          onLocationClick={() => setLocationModalOpen(true)}
        />

        <div className="planner-content flex-1 min-h-0 flex flex-col overflow-hidden">
          {mode === 'plan' ? (
            <div className="planner-week flex-1 min-h-0 flex flex-col gap-2.5">
              {issuesError && (
                <div className="shrink-0 rounded-lg border border-warning-border bg-warning-bg px-3 py-2 text-[11px] font-medium text-warning-fg">
                  Some tasks couldn’t be loaded. <button type="button" onClick={() => refetchIssues()} className="underline font-semibold">Retry tasks</button>
                </div>
              )}
              <CapacitySummary capacity={data.capacity} onEdit={() => setCapacityModalOpen(true)} />
              <div className="planner-week-grid flex-1 min-h-0 flex flex-col overflow-hidden">
                <PlannerMatrix
                  data={mergedData}
                  days={days}
                  occurrenceFor={occurrenceFor}
                  onToggleRoutine={handleToggleRoutine}
                  onAddTimeBlock={handleAddTimeBlock}
                  onAddTask={handleAddTask}
                  onAddRoutine={handleAddRoutine}
                  onToggleTask={handleToggleTask}
                  onClickTask={handleFocusTask}
                  onEditTask={handleClickTask}
                  onDeleteTask={(task) => deleteTaskMutation.mutate(task.id)}
                  onDeleteTimeBlock={(block) => deleteTimeBlockMutation.mutate(block.id)}
                  onDeleteRoutine={(routine) => deleteRoutineMutation.mutate(routine.id)}
                  onOpenDayView={handleOpenDayView}
                  onClickTimeBlock={handleEditTimeBlock}
                  onScheduleTask={handleScheduleTask}
                  onLinkTaskToBlock={handleLinkTaskToBlock}
                  onMoveTimeBlock={(blockId, dateStr) => updateTimeBlockMutation.mutate({ id: blockId, data: { date: `${dateStr}T12:00:00.000Z` } })}
                  onAddMilestone={handleAddMilestone}
                  onClickMilestone={handleEditMilestone}
                  onToggleMilestone={handleToggleMilestone}
                  onClickGoalDeadline={() => navigate('/app/goals')}
                />
              </div>
            </div>
          ) : mode === 'day' ? (
            <div className="planner-day flex-1 min-h-0 overflow-y-auto">
              <TodayView
                day={viewDay}
                data={mergedData}
                onToggleTask={handleToggleTask}
                onClickTask={task => handleFocusTask(task, viewDay)}
                onClickTimeBlock={handleEditTimeBlock}
                onFocusTimeBlock={handleFocusBlock}
                onEditTask={handleClickTask}
                onAddTask={handleAddTask}
                onAddTimeBlock={handleAddTimeBlock}
                onDeleteTimeBlock={(block) => deleteTimeBlockMutation.mutate(block.id)}
                onAddMilestone={handleAddMilestone}
                onClickMilestone={handleEditMilestone}
                onToggleMilestone={handleToggleMilestone}
                onBack={isDrilldown ? handleBackFromDayView : undefined}
                backLabel={previousMode === 'calendar' ? 'Month' : 'Week'}
              />
            </div>
          ) : (
            <div className="planner-month flex-1 min-h-0 flex flex-col overflow-hidden">
              <CalendarMode
                calendarDate={calendarDate}
                currentCountry={currentCountryCode}
                currentRegion={currentRegionCode}
                localOnly={localOnly}
                onOpenDayView={handleOpenDayView}
                tasks={mergedData?.tasks || []}
                onClickMilestone={handleEditMilestone}
                onToggleMilestone={handleToggleMilestone}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
