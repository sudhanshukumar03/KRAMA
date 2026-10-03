// =============================================================================
// PLANNER PAGE ?" KRAMA OS
// =============================================================================
// Top-level page component orchestrating the planner system

import { useState, useMemo, useEffect } from 'react';
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
import { parseLocalDate } from '../../lib/utils';

export function PlannerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlMode = searchParams.get('mode');
  const initialMode = (urlMode === 'day' || urlMode === 'schedule') ? 'day' : urlMode === 'calendar' ? 'calendar' : 'plan';
  const [mode, setMode] = useState<'plan' | 'calendar' | 'day'>(initialMode);
  const [previousMode, setPreviousMode] = useState<'plan' | 'calendar'>('plan');
  const [isDrilldown, setIsDrilldown] = useState(false);
  const dateParam = searchParams.get('date');
  const [viewDay, setViewDay] = useState<Date>(() => parseLocalDate(dateParam) ?? new Date());
  const [calendarDate, setCalendarDate] = useState(new Date());
  const queryClient = useQueryClient();

  // Sync mode and viewDay on browser back / forward navigation
  useEffect(() => {
    const currentUrlMode = searchParams.get('mode');
    const targetMode = (currentUrlMode === 'day' || currentUrlMode === 'schedule') 
      ? 'day' 
      : currentUrlMode === 'calendar' 
      ? 'calendar' 
      : 'plan';
    setMode(targetMode);

    const currentDateParam = searchParams.get('date');
    if (currentDateParam) {
      const parsed = parseLocalDate(currentDateParam);
      if (parsed) setViewDay(parsed);
    }
  }, [searchParams]);
  const { workspaceId } = useAuth();



 const {
 data,
 isLoading,
 isError,
 refetch,
    days,
    weekRangeLabel,
    weekNumber,
    navigateWeek,
    navigateToDate,
    occurrenceFor,
    toggleRoutineMutation,
    createTimeBlockMutation,
    updateTimeBlockMutation,
    deleteTimeBlockMutation,
    createMilestoneMutation,
    updateMilestoneMutation,
    deleteMilestoneMutation,
  } = usePlannerWeek();

  const [timeBlockModalOpen, setTimeBlockModalOpen] = useState(false);
  const [editingTimeBlock, setEditingTimeBlock] = useState<any | null>(null);
  const [routineModalOpen, setRoutineModalOpen] = useState(false);
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<any | null>(null);
  const [milestoneDefaultDate, setMilestoneDefaultDate] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [captureOpen, setCaptureOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [capacityModalOpen, setCapacityModalOpen] = useState(false);
  const [captureDate, setCaptureDate] = useState<Date | undefined>(undefined);
  const [editingTask, setEditingTask] = useState<any | null>(null);

 // Calendar lifted states
  const [localOnly, setLocalOnly] = useState(false);
  const activeTab: 'india' | 'world' = data?.config?.countryCode === 'IN' ? 'india' : 'world';
  const indiaRegion = data?.config?.countryCode === 'IN' ? (data?.config?.regionCode || '') : '';
  const worldCountry = data?.config?.countryCode !== 'IN' ? data?.config?.countryCode : 'US';

  const { data: allIssues = [], isError: issuesError } = useQuery({
    queryKey: ['issues', workspaceId],
    queryFn: api.tasks.list,
    staleTime: 10_000,
  });

  const mergedData = useMemo(() => {
    if (!data) return data;
    const taskMap = new Map<string, any>();
    allIssues.forEach((task: any) => taskMap.set(task.id, task));
    (data.tasks || []).forEach((task: any) => taskMap.set(task.id, task));
    return {
      ...data,
      tasks: Array.from(taskMap.values()),
    };
  }, [data, allIssues]);

 const updateTaskMutation = useMutation({
 mutationFn: ({ id, data }: { id: string; data: any }) => api.tasks.update(id, data),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['planner'] });
 queryClient.invalidateQueries({ queryKey: ['issues'] });
 queryClient.invalidateQueries({ queryKey: ['tasks'] });
 queryClient.invalidateQueries({ queryKey: ['projects'] });
 queryClient.invalidateQueries({ queryKey: ['dashboard'] });
 },
 onError: (err: any) => {
 toast.error('Failed to update task: ' + (err?.message || 'Unknown error'));
 }
 });

 const deleteTaskMutation = useMutation({
 mutationFn: (id: string) => api.tasks.delete(id),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['planner'] });
 queryClient.invalidateQueries({ queryKey: ['issues'] });
 queryClient.invalidateQueries({ queryKey: ['tasks'] });
 queryClient.invalidateQueries({ queryKey: ['projects'] });
 queryClient.invalidateQueries({ queryKey: ['dashboard'] });
 toast.success('Task deleted');
 },
 onError: (err: any) => {
 toast.error('Failed to delete task: ' + (err?.message || 'Unknown error'));
 }
 });

  const deleteRoutineMutation = useMutation({
    mutationFn: (id: string) => api.habits.update(id, { pinnedToPlanner: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      toast.success('Routine unpinned from planner');
    },
    onError: (err: any) => {
      toast.error('Failed to unpin routine: ' + (err?.message || 'Unknown error'));
    }
  });

 if (isLoading) {
 return <PlannerSkeleton />;
 }

 if (isError || !data) {
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
      data: { scheduledDate: targetIso }
    }, {
      onSuccess: () => toast.success(`Task scheduled for ${dateStr}`),
      onError: () => toast.error('Failed to schedule task')
    });
  };

  const handleLinkTaskToBlock = (blockId: string, taskId: string, blockDate?: string) => {
    updateTimeBlockMutation.mutate({
      id: blockId,
      data: { taskId }
    }, {
      onSuccess: () => {
        toast.success('Task linked to time block');
        if (blockDate) {
          const dateOnly = blockDate.includes('T') ? blockDate.split('T')[0] : blockDate;
          const targetIso = new Date(`${dateOnly}T12:00:00.000Z`).toISOString();
          updateTaskMutation.mutate({
            id: taskId,
            data: { scheduledDate: targetIso }
          });
        }
      },
      onError: (err: any) => toast.error(err?.message || 'Failed to link task')
    });
  };

 const handleToggleRoutine = (occ: any) => {
 toggleRoutineMutation.mutate(occ, {
 onError: () => toast.error('Failed to update routine'),
 });
 };

  const handleAddTimeBlock = (day?: Date, initialData?: any) => {
    setEditingTimeBlock(initialData || null);
    if (day) setSelectedDay(day);
    setTimeBlockModalOpen(true);
  };

  const handleEditTimeBlock = (block: any) => {
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

  const handleToggleTask = (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    updateTaskMutation.mutate({ id: task.id, data: { status: newStatus } }, {
      onSuccess: () => toast.success(newStatus === 'DONE' ? 'Task completed' : 'Task restored'),
      onError: () => toast.error('Failed to update task')
    });
  };

  const handleClickTask = (task: any) => {
    setEditingTask(task);
  };

  const handleAddMilestone = (day?: Date) => {
    setEditingMilestone(null);
    setMilestoneDefaultDate(day || new Date());
    setMilestoneModalOpen(true);
  };

  const handleEditMilestone = (milestone: any) => {
    setEditingMilestone(milestone);
    setMilestoneModalOpen(true);
  };

  const handleToggleMilestone = (milestone: any) => {
    updateMilestoneMutation.mutate({ id: milestone.id, data: { completed: !milestone.completed } });
  };

  const handleDeleteMilestone = (milestone: any) => {
    deleteMilestoneMutation.mutate(milestone.id, {
      onSuccess: () => {
        setMilestoneModalOpen(false);
        setEditingMilestone(null);
      },
    });
  };

  const handleOpenDayView = (day: Date) => {
    setViewDay(day);
    navigateToDate(day);
    setPreviousMode(mode === 'calendar' ? 'calendar' : 'plan');
    setIsDrilldown(true);
    setMode('day');
    setSearchParams({ mode: 'day', date: format(day, 'yyyy-MM-dd') });
  };

  const handleBackFromDayView = () => {
    setIsDrilldown(false);
    setMode(previousMode);
    setSearchParams(previousMode === 'plan' ? {} : { mode: previousMode });
  };

  const headerTitle = mode === 'plan' 
    ? weekRangeLabel 
    : mode === 'calendar' 
    ? format(calendarDate, 'MMMM yyyy') 
    : format(viewDay, 'EEEE, MMMM d, yyyy');
  const headerSubtitle = mode === 'plan' ? `Week ${weekNumber}` : mode === 'calendar' ? 'Month' : 'Day Details';

  const handleNavigate = (dir: 'prev' | 'next' | 'today') => {
    if (mode === 'plan') {
      navigateWeek(dir);
    } else if (mode === 'calendar') {
      if (dir === 'today') setCalendarDate(new Date());
      else if (dir === 'prev') setCalendarDate(prev => subMonths(prev, 1));
      else setCalendarDate(prev => addMonths(prev, 1));
    } else {
      const targetDate = dir === 'today' ? new Date() : dir === 'prev' ? addDays(viewDay, -1) : addDays(viewDay, 1);
      setViewDay(targetDate);
      navigateToDate(targetDate);
      setSearchParams({ mode: 'day', date: format(targetDate, 'yyyy-MM-dd') });
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
    <div className="flex flex-col h-full w-full min-h-0 overflow-hidden bg-canvas">
      <div className="flex flex-col h-full w-full max-w-[1700px] mx-auto px-4 md:px-6 py-2.5 min-h-0 gap-2.5">
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
          tasks={data?.tasks || []}
          projects={data?.projects || []}
          onDelete={editingTimeBlock ? () => {
            deleteTimeBlockMutation.mutate(editingTimeBlock.id, {
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
                onError: (err: any) => {
                  toast.error(err?.message || 'Failed to update time block');
                }
              });
            } else {
              createTimeBlockMutation.mutate(blockData, {
                onSuccess: () => {
                  toast.success('Time block created');
                  setTimeBlockModalOpen(false);
                },
                onError: (err: any) => {
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
            allIssues={data.tasks}
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
            setMode(m);
            if (m !== 'day') setPreviousMode(m);
            setSearchParams(m === 'plan' ? {} : m === 'day' ? { mode: 'day', date: format(viewDay, 'yyyy-MM-dd') } : { mode: m });
          }}
          title={headerTitle}
          subtitle={headerSubtitle}
          onNavigate={handleNavigate}
          localOnly={localOnly}
          onLocalOnlyChange={setLocalOnly}
          countryRegion={countryRegionStr}
          onLocationClick={() => setLocationModalOpen(true)}
        />

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {mode === 'plan' ? (
            <div className="flex-1 min-h-0 flex flex-col gap-2.5">
              {issuesError && (
                <div className="shrink-0 rounded-lg border border-warning-border bg-warning-bg px-3 py-2 text-[11px] font-medium text-warning-fg">
                  Some tasks couldn't be loaded. Scheduling reflects the last known data — retry from the header to refresh.
                </div>
              )}
              <CapacitySummary capacity={data.capacity} onEdit={() => setCapacityModalOpen(true)} />
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <PlannerMatrix
                  data={mergedData}
                  days={days}
                  occurrenceFor={occurrenceFor}
                  onToggleRoutine={handleToggleRoutine}
                  onAddTimeBlock={handleAddTimeBlock}
                  onAddTask={handleAddTask}
                  onAddRoutine={handleAddRoutine}
                  onToggleTask={handleToggleTask}
                  onClickTask={handleClickTask}
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
            <div className="flex-1 min-h-0 overflow-y-auto">
              <TodayView
                day={viewDay}
                data={mergedData}
                onToggleTask={handleToggleTask}
                onClickTask={handleClickTask}
                onClickTimeBlock={handleEditTimeBlock}
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
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
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
