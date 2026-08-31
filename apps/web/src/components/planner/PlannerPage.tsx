// =============================================================================
// PLANNER PAGE ?" KRAMA OS
// =============================================================================
// Top-level page component orchestrating the planner system

import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { usePlannerWeek } from '../../hooks/usePlannerWeek';
import { PlannerHeader } from './PlannerHeader';
import { CapacitySummary } from './CapacitySummary';
import { PlannerMatrix } from './PlannerMatrix';
import { CalendarMode } from './CalendarMode';
import { PlannerSkeleton } from './PlannerSkeleton';
import { TimeBlockModal } from './TimeBlockModal';
import { RoutineModal } from './RoutineModal';
import { QuickCaptureModal } from '../ui/QuickCaptureModal';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { IssueEditModal } from '../KanbanBoard';
import { COUNTRIES, INDIAN_STATES } from './LocationSettingsModal';

export function PlannerPage() {
  const [mode, setMode] = useState<'plan' | 'calendar'>('plan');
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
    occurrenceFor,
    toggleRoutineMutation,
    createTimeBlockMutation,
  } = usePlannerWeek();

  const [timeBlockModalOpen, setTimeBlockModalOpen] = useState(false);
  const [routineModalOpen, setRoutineModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [captureOpen, setCaptureOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [captureDate, setCaptureDate] = useState<Date | undefined>(undefined);
  const [editingTask, setEditingTask] = useState<any | null>(null);

  // Calendar lifted states
  const [calendarView, setCalendarView] = useState<'month'|'week'|'list'>('month');
  const [localOnly, setLocalOnly] = useState(false);
  const activeTab: 'india' | 'world' = data?.config?.countryCode === 'IN' ? 'india' : 'world';
  const indiaRegion = data?.config?.countryCode === 'IN' ? (data?.config?.regionCode || '') : '';
  const worldCountry = data?.config?.countryCode !== 'IN' ? data?.config?.countryCode : 'US';

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.tasks.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['issues'] });
    }
  });

  if (isLoading) {
    return <PlannerSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <CalendarDays size={48} className="text-slate-300" />
        <h2 className="text-lg font-semibold text-slate-700">Unable to load Planner</h2>
        <p className="text-sm text-slate-500">Something went wrong loading your weekly plan.</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
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

  const handleAddTimeBlock = (day: Date) => {
    setSelectedDay(day);
    setTimeBlockModalOpen(true);
  };

  const handleAddTask = (day: Date) => {
    setCaptureDate(day);
    setCaptureOpen(true);
  };

  const handleAddRoutine = (_day: Date) => {
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

  const headerTitle = mode === 'plan' ? weekRangeLabel : format(calendarDate, 'MMMM yyyy');
  const headerSubtitle = mode === 'plan' ? "Week " : 'Month';

  const handleNavigate = (dir: 'prev' | 'next' | 'today') => {
    if (mode === 'plan') {
      navigateWeek(dir);
    } else {
      if (dir === 'today') setCalendarDate(new Date());
      else if (dir === 'prev') setCalendarDate(prev => subMonths(prev, 1));
      else setCalendarDate(prev => addMonths(prev, 1));
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
    <div className="p-4 md:p-6 bg-[#f7f8fb] min-h-screen pb-20">
      <LocationSettingsModal 
        open={locationModalOpen} 
        onClose={() => setLocationModalOpen(false)} 
        currentCountry={data?.config?.countryCode || 'IN'} 
        currentRegion={data?.config?.regionCode || ''} 
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
        onModeChange={setMode}
        title={headerTitle}
        subtitle={headerSubtitle}
        onNavigate={handleNavigate}
        syncStatus={data.syncStatus}

        calendarView={calendarView}
        onCalendarViewChange={setCalendarView}
        localOnly={localOnly}
        onLocalOnlyChange={setLocalOnly}
        countryRegion={countryRegionStr}
          isGoogleConnected={isGoogleConnected}
          onDisconnectGoogle={handleDisconnectGoogle}
          onSyncGoogle={handleSyncGoogleNow}
          isSyncingGoogle={isSyncingGoogle}
      />

      <div className="mt-6 flex flex-col">
        {mode === 'plan' ? (
          <div className="flex flex-col gap-6">
            <CapacitySummary capacity={data.capacity} />
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
              />
            </div>
          </div>
        ) : (
          <div>
            <CalendarMode
              calendarDate={calendarDate}
              currentCountry={currentCountryCode}
              currentRegion={currentRegionCode}
              localOnly={localOnly}
            />
          </div>
        )}
      </div>
    </div>
  );
}

