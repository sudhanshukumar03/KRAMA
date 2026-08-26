// =============================================================================
// PLANNER PAGE — KRAMA OS
// =============================================================================
// Top-level page component orchestrating the planner system

import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { usePlannerWeek } from '../../hooks/usePlannerWeek';
import { PlannerHeader } from './PlannerHeader';
import { CapacitySummary } from './CapacitySummary';
import { PlannerMatrix } from './PlannerMatrix';
import { CalendarMode } from './CalendarMode';
import { CalendarSidebar } from './CalendarSidebar';
import { PlannerSkeleton } from './PlannerSkeleton';
import { TimeBlockModal } from './TimeBlockModal';
import { RoutineModal } from './RoutineModal';
import { QuickCaptureModal } from '../ui/QuickCaptureModal';
import { toast } from 'sonner';

export function PlannerPage() {
  const {
    data,
    isLoading,
    isError,
    refetch,
    days,
    weekRangeLabel,
    weekNumber,
    currentDate,
    mode,
    setMode,
    navigateWeek,
    navigateToDate,
    occurrenceFor,
    toggleRoutineMutation,
    createTimeBlockMutation,
  } = usePlannerWeek();

  // MUST BE BEFORE ANY CONDITIONAL RETURNS
  const [timeBlockModalOpen, setTimeBlockModalOpen] = useState(false);
  const [routineModalOpen, setRoutineModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [captureOpen, setCaptureOpen] = useState(false);

  // Loading
  if (isLoading) {
    return <PlannerSkeleton />;
  }

  // Error
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
    setSelectedDay(day);
    setCaptureOpen(true);
  };

  const handleAddRoutine = (day: Date) => {
    setSelectedDay(day);
    setRoutineModalOpen(true);
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-[#f7f8fb] overflow-y-auto pb-20">
      <QuickCaptureModal 
        open={captureOpen} 
        onClose={() => setCaptureOpen(false)} 
        defaultMode="task"
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
      {/* Header */}
      <PlannerHeader
        mode={mode}
        onModeChange={setMode}
        weekRangeLabel={weekRangeLabel}
        weekNumber={weekNumber}
        onNavigate={navigateWeek}
        syncStatus={data.syncStatus}
      />

      {/* Capacity Summary */}
      <div className="mt-4">
        <CapacitySummary capacity={data.capacity} />
      </div>

      {/* Main Content */}
      <div className="mt-4 flex gap-5 flex-1 min-h-0">
        {/* Matrix / Calendar */}
        <div className="flex-1 min-w-0">
          {mode === 'plan' ? (
            <PlannerMatrix
              data={data}
              days={days}
              occurrenceFor={occurrenceFor}
              onToggleRoutine={handleToggleRoutine}
              onAddTimeBlock={handleAddTimeBlock}
              onAddTask={handleAddTask}
              onAddRoutine={handleAddRoutine}
            />
          ) : (
            <CalendarMode data={data} days={days} />
          )}
        </div>

        {/* Right Sidebar — only in plan mode */}
        {mode === 'plan' && (
          <CalendarSidebar data={data} currentDate={currentDate} onNavigate={navigateToDate} />
        )}
      </div>
    </div>
  );
}
