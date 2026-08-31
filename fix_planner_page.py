import os
import re

file_path = 'apps/web/src/components/planner/PlannerPage.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

# Find the start of the return statement
start_idx = code.find('  return (')
if start_idx == -1:
    print('Could not find return statement')
    exit(1)

# We want to replace everything from '  return (' to the end of the file.
# But let's verify what goes into the modals.

# We will just generate the correct JSX structure.

new_return = '''  return (
    <div className="p-4 md:p-6 bg-background h-[calc(100vh-140px)] flex gap-6 overflow-hidden box-border">
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

      <div className="flex-1 flex flex-col min-w-0 h-full">
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
        />

        <div className="mt-6 flex flex-col flex-1 min-h-0">
          {mode === 'plan' ? (
            <div className="flex flex-col gap-6 flex-1 min-h-0">
              <div className="flex items-center justify-between shrink-0">
                <CapacitySummary capacity={data.capacity} />
                <button
                  onClick={() => setIsBacklogOpen(!isBacklogOpen)}
                  className={\px-4 py-2 rounded-xl text-sm font-semibold border transition-all \\}
                >
                  {isBacklogOpen ? 'Close Backlog' : 'Open Backlog'}
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden border border-border rounded-xl">
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
                  onClickTimeBlock={handleEditTimeBlock}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden border border-border rounded-xl">
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

      {isBacklogOpen && mode === 'plan' && (
        <div className="w-80 flex-shrink-0 rounded-2xl border border-border bg-canvas shadow-sm flex flex-col self-start h-full overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <h3 className="font-bold text-foreground">Unscheduled Backlog</h3>
            <p className="text-xs text-muted-foreground mt-1">Sprint tasks without a scheduled date.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {data.tasks.filter((t: any) => !t.scheduledDate && !t.dueDate && t.status !== 'DONE').length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm italic">
                No unscheduled tasks found.
              </div>
            ) : (
              data.tasks.filter((t: any) => !t.scheduledDate && !t.dueDate && t.status !== 'DONE').map((task: any) => (
                <div key={task.id} className="p-3 rounded-xl border border-border bg-background shadow-sm hover:border-primary/50 transition-colors cursor-grab active:cursor-grabbing">
                  <div className="text-sm font-semibold text-foreground">{task.title}</div>
                  <div className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-wider">{task.priority || 'NORMAL'} Priority</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
}
'''

new_code = code[:start_idx] + new_return

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_code)
