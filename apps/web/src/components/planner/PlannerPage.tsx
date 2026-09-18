// =============================================================================
// PLANNER PAGE ?" KRAMA OS
// =============================================================================
// Top-level page component orchestrating the planner system

import { useState, useEffect, useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import { format, addMonths, subMonths, addDays } from 'date-fns';
import { usePlannerWeek } from '../../hooks/usePlannerWeek';
import { PlannerHeader } from './PlannerHeader';
import { CapacitySummary } from './CapacitySummary';
import { PlannerMatrix } from './PlannerMatrix';
import { CalendarMode } from './CalendarMode';
import { TodayView } from './TodayView';
import { PlannerSkeleton } from './PlannerSkeleton';
import { TimeBlockModal } from './TimeBlockModal';
import { RoutineModal } from './RoutineModal';
import { QuickCaptureModal } from '../ui/QuickCaptureModal';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IssueEditModal } from '../KanbanBoard';
import { LocationSettingsModal, COUNTRIES, INDIAN_STATES } from './LocationSettingsModal';
import { CapacitySettingsModal } from './CapacitySettingsModal';
import { useAuth } from '../../contexts/AuthContext';

export function PlannerPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlMode = searchParams.get('mode');
  const initialMode = (urlMode === 'day' || urlMode === 'schedule') ? 'day' : urlMode === 'calendar' ? 'calendar' : 'plan';
  const [mode, setMode] = useState<'plan' | 'calendar' | 'day'>(initialMode);
  const [previousMode, setPreviousMode] = useState<'plan' | 'calendar'>('plan');
  const [isDrilldown, setIsDrilldown] = useState(false);
  const dateParam = searchParams.get('date');
  const [viewDay, setViewDay] = useState<Date>(() => dateParam ? new Date(dateParam) : new Date());
  const [calendarDate, setCalendarDate] = useState(new Date());
  const queryClient = useQueryClient();



 const {
 data,
 isLoading,
 isError,
 refetch,
    days,
    weekRangeLabel,
    navigateWeek,
    navigateToDate,
    occurrenceFor,
    toggleRoutineMutation,
    createTimeBlockMutation,
    updateTimeBlockMutation,
    deleteTimeBlockMutation,
  } = usePlannerWeek();

  const [timeBlockModalOpen, setTimeBlockModalOpen] = useState(false);
  const [editingTimeBlock, setEditingTimeBlock] = useState<any | null>(null);
  const [routineModalOpen, setRoutineModalOpen] = useState(false);
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

  const { data: allIssues = [] } = useQuery({
    queryKey: ['issues'],
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
 },
 onError: (err: any) => {
 toast.error('Failed to update task: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
 }
 });

 const deleteTaskMutation = useMutation({
 mutationFn: (id: string) => api.tasks.delete(id),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['planner'] });
 queryClient.invalidateQueries({ queryKey: ['issues'] });
 toast.success('Task deleted');
 },
 onError: (err: any) => {
 toast.error('Failed to delete task: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
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
      toast.error('Failed to unpin routine: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
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

  const handleLinkTaskToBlock = (blockId: string, taskId: string) => {
    updateTimeBlockMutation.mutate({
      id: blockId,
      data: { taskId }
    }, {
      onSuccess: () => toast.success('Task linked to time block'),
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
  const headerSubtitle = mode === 'plan' ? "Week " : mode === 'calendar' ? 'Month' : 'Day Details';

  const handleNavigate = (dir: 'prev' | 'next' | 'today') => {
    if (mode === 'plan') {
      navigateWeek(dir);
    } else if (mode === 'calendar') {
      if (dir === 'today') setCalendarDate(new Date());
      else if (dir === 'prev') setCalendarDate(prev => subMonths(prev, 1));
      else setCalendarDate(prev => addMonths(prev, 1));
    } else {
      if (dir === 'today') {
        const today = new Date();
        setViewDay(today);
        navigateToDate(today);
      } else if (dir === 'prev') {
        const next = addDays(viewDay, -1);
        setViewDay(next);
        navigateToDate(next);
      } else {
        const next = addDays(viewDay, 1);
        setViewDay(next);
        navigateToDate(next);
      }
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

  const targetDayKey = format(viewDay, 'yyyy-MM-dd');
  const targetDayData = data?.days?.find((d: any) => d.dateKey === targetDayKey) || { dateKey: targetDayKey };

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
        <TimeBlockModal
          open={timeBlockModalOpen}
          onClose={() => {
            setTimeBlockModalOpen(false);
            setEditingTimeBlock(null);
          }}
          defaultDate={selectedDay}
          editingBlock={editingTimeBlock}
          tasks={data?.tasks || []}
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
            setSearchParams(m === 'plan' ? {} : { mode: m });
          }}
          title={headerTitle}
          subtitle={headerSubtitle}
          onNavigate={handleNavigate}
          syncStatus={data.syncStatus}
          localOnly={localOnly}
          onLocalOnlyChange={setLocalOnly}
          countryRegion={countryRegionStr}
          onLocationClick={() => setLocationModalOpen(true)}
        />

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {mode === 'plan' ? (
            <div className="flex-1 min-h-0 flex flex-col gap-2.5">
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
                />
              </div>
            </div>
          ) : mode === 'day' ? (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <TodayView
                day={viewDay}
                data={mergedData}
                dayData={targetDayData}
                onToggleTask={handleToggleTask}
                onClickTask={handleClickTask}
                onClickTimeBlock={handleEditTimeBlock}
                onAddTask={handleAddTask}
                onAddTimeBlock={handleAddTimeBlock}
                onDeleteTask={(task) => deleteTaskMutation.mutate(task.id)}
                onDeleteTimeBlock={(block) => deleteTimeBlockMutation.mutate(block.id)}
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
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
