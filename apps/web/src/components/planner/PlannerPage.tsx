// =============================================================================
// PLANNER PAGE ?" KRAMA OS
// =============================================================================
// Top-level page component orchestrating the planner system

import { useState, useEffect } from 'react';
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
import { } from 'react-router-dom';
import { api } from '../../api/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { IssueEditModal } from '../KanbanBoard';
import { LocationSettingsModal, COUNTRIES, INDIAN_STATES } from './LocationSettingsModal';
import { CapacitySettingsModal } from './CapacitySettingsModal';
import { useAuth } from '../../contexts/AuthContext';

export function PlannerPage() {
 const { user } = useAuth();
  const [mode, setMode] = useState<'plan' | 'calendar' | 'day'>('plan');
  const [previousMode, setPreviousMode] = useState<'plan' | 'calendar'>('plan');
  const [viewDay, setViewDay] = useState<Date>(new Date());
  const [calendarDate, setCalendarDate] = useState(new Date());
 const queryClient = useQueryClient();

 useEffect(() => {
    const handleGoogleSync = async () => {
      try {
        toast.loading('Syncing Google Calendar...', { id: 'google-sync' });
        await api.oauth.syncGoogle();
        toast.success('Calendar synced successfully', { id: 'google-sync' });
        queryClient.invalidateQueries({ queryKey: ['planner'] });
      } catch (err: any) {
        if (err.message && err.message.includes('not connected')) {
          toast.error('Google Calendar not connected. Redirecting...', { id: 'google-sync' });
          if (user?.id) {
            window.location.href = `/api/v1/oauth/google/connect?userId=${user.id}`;
          }
        } else {
          toast.error(`Failed to sync calendar: ${err.message}`, { id: 'google-sync' });
        }
      }
    };

    window.addEventListener('oauth-google-sync', handleGoogleSync);
    return () => window.removeEventListener('oauth-google-sync', handleGoogleSync);
  }, [user?.id, queryClient]);

 const {
 data,
 isLoading,
 isError,
 refetch,
 days,
 weekRangeLabel,
 navigateWeek,
 occurrenceFor,
 toggleRoutineMutation,
 createTimeBlockMutation,
 deleteTimeBlockMutation,
 } = usePlannerWeek();

 const [timeBlockModalOpen, setTimeBlockModalOpen] = useState(false);
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
 mutationFn: (id: string) => api.habits.delete(id),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['planner'] });
 queryClient.invalidateQueries({ queryKey: ['habits'] });
 toast.success('Routine deleted');
 },
 onError: (err: any) => {
 toast.error('Failed to delete routine: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
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

 const handleToggleRoutine = (occ: any) => {
 toggleRoutineMutation.mutate(occ, {
 onError: () => toast.error('Failed to update routine'),
 });
 };

 const handleAddTimeBlock = (day?: Date) => {
 if (day) setSelectedDay(day);
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
    setPreviousMode(mode === 'calendar' ? 'calendar' : 'plan');
    setMode('day');
  };

  const handleBackFromDayView = () => {
    setMode(previousMode);
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
      if (dir === 'today') setViewDay(new Date());
      else if (dir === 'prev') setViewDay(prev => addDays(prev, -1));
      else setViewDay(prev => addDays(prev, 1));
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
 <div className="p-4 md:p-6 bg-[#f7f8fb] min-h-screen pb-20">
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
 onClose={() => setTimeBlockModalOpen(false)}
 defaultDate={selectedDay}
 isSubmitting={createTimeBlockMutation.isPending}
 onSubmit={(data) => {
 createTimeBlockMutation.mutate(data, {
 onSuccess: () => {
 toast.success('Time block created');
 setTimeBlockModalOpen(false);
 },
 onError: (err) => {
 toast.error(err.message || 'Failed to create time block');
 }
 });
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
    setMode(m);
    setPreviousMode(m);
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

  <div className="mt-6 flex flex-col">
  {mode === 'plan' ? (
  <div className="flex flex-col gap-6">
  <CapacitySummary capacity={data.capacity} onEdit={() => setCapacityModalOpen(true)} />
  <div>
  <PlannerMatrix
  data={data}
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
  onClickTimeBlock={() => {
  // If we had a modal to view/edit time block, open it here.
  }}
  />
  </div>
  </div>
  ) : mode === 'day' ? (
  <div>
    <TodayView
      day={viewDay}
      data={data}
      dayData={targetDayData}
      occurrenceFor={occurrenceFor}
      onToggleRoutine={handleToggleRoutine}
      onToggleTask={handleToggleTask}
      onClickTask={handleClickTask}
      onAddTask={handleAddTask}
      onAddTimeBlock={handleAddTimeBlock}
      onDeleteTask={(task) => deleteTaskMutation.mutate(task.id)}
      onDeleteTimeBlock={(block) => deleteTimeBlockMutation.mutate(block.id)}
      onDeleteRoutine={(routine) => deleteRoutineMutation.mutate(routine.id)}
      onBack={handleBackFromDayView}
      backLabel={previousMode === 'calendar' ? 'Calendar' : 'Plan'}
    />
  </div>
  ) : (
  <div>
  <CalendarMode
  calendarDate={calendarDate}
  currentCountry={currentCountryCode}
  currentRegion={currentRegionCode}
  localOnly={localOnly}
  onOpenDayView={handleOpenDayView}
  />
  </div>
  )}
  </div>
 </div>
 );
}
