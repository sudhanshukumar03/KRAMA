import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Plus, Check, ChevronLeft, ChevronRight, Clock, Clock4, CalendarPlus, Sparkles, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn, parseLocalDate, formatLocalDate } from '../lib/utils';
import { getIconForString } from '../lib/iconMap';
import { LoadingState } from './ui/LoadingState';
import { BaseButton } from './ui/BaseButton';


function ScheduleTaskModal({
 open,
 onClose,
 onSubmit,
 defaultDate,
 isSubmitting,
}: {
 open: boolean;
 onClose: () => void;
 onSubmit: (data: { title: string; priority: string; estimateMinutes: number; dueDate: string }) => void;
 defaultDate: string;
 isSubmitting: boolean;
}) {
 const [title, setTitle] = useState('');
 const [priority, setPriority] = useState('MEDIUM');
 const [estimateHours, setEstimateHours] = useState(1);
 const [dueDate, setDueDate] = useState(defaultDate);

 useEffect(() => {
 if (open) setDueDate(defaultDate);
 }, [open, defaultDate]);

 if (!open) return null;

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!title.trim()) return;
 onSubmit({ title: title.trim(), priority, estimateMinutes: Math.round(Number(estimateHours) * 60), dueDate });
 };

 return (
 <div
 onClick={onClose}
 className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
 >
 <div
 onClick={e => e.stopPropagation()}
 className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden text-left"
 >
 <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover/50">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
 <CalendarPlus className="w-4 h-4 stroke-[2]" />
 </div>
 <h3 className="text-card text-primary mb-2 ">Schedule Agenda Task</h3>
 </div>
 <button
 onClick={onClose}
 type="button"
 className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-hover hover:text-primary transition-colors"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 <form onSubmit={handleSubmit} className="p-6 space-y-4">
 <div>
 <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
 Task / Event Title <span className="text-danger-fg">*</span>
 </label>
 <input
 type="text"
 value={title}
 onChange={e => setTitle(e.target.value)}
 placeholder="e.g., Q3 System Architecture Review"
 required
 autoFocus
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <label className="text-caption font-semibold text-secondary">
 Date
 </label>
 <input
 type="date"
 value={dueDate}
 onChange={e => setDueDate(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
 />
 </div>

 <div>
 <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
 Estimated Hours
 </label>
 <input
 type="number"
 min="0.5"
 max="12"
 step="0.5"
 value={estimateHours}
 onChange={e => setEstimateHours(Number(e.target.value))}
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
 />
 </div>
 </div>

 <div>
 <label className="block text-caption font-mono font-medium text-secondary uppercase mb-1.5">
 Priority
 </label>
 <select
 value={priority}
 onChange={e => setPriority(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-lg text-body text-primary bg-surface focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
 >
 <option value="MEDIUM">Normal</option>
 <option value="HIGH">High Priority</option>
 <option value="URGENT">Urgent / Blocker</option>
 </select>
 </div>

 <div className="pt-4 border-t border-border flex justify-end gap-3">
 <BaseButton type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
 Cancel
 </BaseButton>
 <BaseButton type="submit" disabled={isSubmitting || !title.trim()}>
 {isSubmitting ? 'Scheduling...' : 'Schedule Task'}
 </BaseButton>
 </div>
 </form>
 </div>
 </div>
 );
}

export function TimelineView() {
 const { data: issues = [], isLoading } = useQuery({ queryKey: ['issues'], queryFn: api.tasks.list });

 const queryClient = useQueryClient();
 const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

 const deleteIssueMutation = useMutation({
 mutationFn: (id: string) => api.tasks.delete(id),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['issues'] });
 toast.success("Task permanently deleted");
 },
 onError: (err: any) => {
 toast.error('Failed to delete task: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
 }
 });

 const scheduleTaskMutation = useMutation({
 mutationFn: (data: { title: string; priority: string; estimateMinutes: number; dueDate: string }) => 
 api.tasks.create({
 title: data.title,
 priority: data.priority,
 estimateMinutes: data.estimateMinutes,
 dueDate: data.dueDate ? parseLocalDate(data.dueDate)?.toISOString() : undefined,
 status: "TODO"
 }),
 onSuccess: (newTask) => {
 queryClient.invalidateQueries({ queryKey: ['issues'] });
 setScheduleModalOpen(false);
 toast.success(`Scheduled"${newTask?.title || 'Task'}"`);
 },
 onError: () => {
 toast.error('Failed to schedule task');
 }
 });

 const [currentTime, setCurrentTime] = useState(new Date());
 const [searchParams, setSearchParams] = useSearchParams();
 const paramDate = searchParams.get('date');

 useEffect(() => {
 const timer = setInterval(() => setCurrentTime(new Date()), 1000);
 return () => clearInterval(timer);
 }, []);

 const targetDate = useMemo(() => {
 if (paramDate) {
 const parts = paramDate.split('-').map(Number);
 if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
 return new Date(parts[0], parts[1] - 1, parts[2]);
 }
 }
 return new Date();
 }, [paramDate]);

 const navigateDay = (offsetDays: number) => {
 const nextDate = new Date(targetDate);
 nextDate.setDate(targetDate.getDate() + offsetDays);
 const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
 setSearchParams({ date: dateStr });
 };

 const targetDateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
 const { data: plannerData } = useQuery({ 
 queryKey: ['plannerWeek', targetDateStr], 
 queryFn: () => api.planner.getWeek(targetDateStr, targetDateStr) 
 });
 if (isLoading) return <LoadingState title="Loading Schedule..." description="Loading scheduled time-blocks and agenda..." />;

 const targetStart = new Date(new Date(targetDate).setHours(0, 0, 0, 0));
 const targetEnd = new Date(new Date(targetDate).setHours(23, 59, 59, 999));
 const isViewingToday = targetDate.toDateString() === new Date().toDateString();


 
 const timeBlocks = plannerData?.timeBlocks || [];

 const todayIssues = issues.filter(i => {
 const date = i.scheduledDate ? new Date(i.scheduledDate) : i.dueDate ? new Date(i.dueDate) : null;
 if (!date) return false;
 if (date.getTime() >= targetStart.getTime() && date.getTime() <= targetEnd.getTime()) return true;
 // Carry over incomplete tasks from the past
 if (date.getTime() < targetStart.getTime() && i.status !== "DONE") return true;
 return false;
 });

 const linkedTaskIds = new Set(timeBlocks.map((tb: any) => tb.taskId).filter(Boolean));
 const unlinkedIssues = todayIssues.filter(i => !linkedTaskIds.has(i.id));

 const agendaItems = [
 ...unlinkedIssues.map(issue => {
 const issueDate = issue.scheduledDate ? new Date(issue.scheduledDate) : issue.dueDate ? new Date(issue.dueDate) : null;
 const isCarriedOver = issueDate && issueDate.getTime() < targetStart.getTime();
 return {
 type: 'task' as const,
 id: issue.id,
 sortTime: 0,
 data: issue,
 isCarriedOver
 };
 }),
 ...timeBlocks.map((tb: any) => ({
 type: 'timeblock' as const,
 id: tb.id,
 sortTime: new Date(tb.startTime).getTime(),
 data: tb,
 linkedTask: issues.find(i => i.id === tb.taskId)
 }))
 ].sort((a, b) => a.sortTime - b.sortTime);


 const timeString = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

 return (
    <div className="p-6 md:p-8 flex flex-col h-full bg-canvas overflow-y-auto min-w-0 select-none animate-in fade-in duration-150">
      {/* Top Page Header with Logo, Title, and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
            <Clock4 className="w-5 h-5 stroke-[1.75]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary tracking-tight">Schedule</h1>
            <p className="text-xs text-secondary mt-0.5">
              Daily time-blocked execution timeline and focus agenda.
            </p>
          </div>
        </div>

        {/* Right side controls: Day navigation + Live Horizon clock */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-surface border border-border/80 rounded-xl shadow-2xs">
            <button
              onClick={() => navigateDay(-1)}
              title="Previous Day"
              className="p-1 rounded-lg hover:bg-surface-hover text-secondary hover:text-primary transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2]" />
            </button>
            <span className="text-xs font-semibold px-2 text-primary">
              {targetDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <button
              onClick={() => navigateDay(1)}
              title="Next Day"
              className="p-1 rounded-lg hover:bg-surface-hover text-secondary hover:text-primary transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 stroke-[2]" />
            </button>
          </div>

          {!isViewingToday && (
            <button 
              onClick={() => setSearchParams({})} 
              className="text-xs font-medium text-accent bg-accent/10 border border-accent/20 px-3 py-1.5 rounded-xl hover:bg-accent hover:text-white transition-all shadow-2xs cursor-pointer"
            >
              Today
            </button>
          )}

          <div className="px-3 py-1.5 bg-surface border border-border/80 rounded-xl flex items-center gap-2.5 shadow-2xs">
            <div className="text-[11px] font-medium text-accent flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 fill-accent text-accent" /> Live Horizon
            </div>
            <div className="text-xs font-mono font-bold text-primary">
              {timeString}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Columns: Schedule (Left/Center) + Daily Routines (Right) */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* CENTER COLUMN: Main Schedule (70%) */}
        <div className="w-full h-full bg-surface border border-border rounded-xl p-6 md:p-8 shadow-sm flex flex-col relative">
          {/* Card Header Row */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-primary m-0">Daily Schedule</h2>
              <p className="text-badge font-medium text-secondary uppercase tracking-[0.02em] mt-0.5">
                {targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setScheduleModalOpen(true)}
                className="w-9 h-9 rounded-full bg-accent text-accent-fg flex items-center justify-center hover:bg-accent-hover transition-colors shadow-sm cursor-pointer"
                title="Add Time Block"
              >
                <Plus className="w-4 h-4 stroke-[2]" />
              </button>
            </div>
          </div>

 

 {/* Vertical Agenda */}
 <div className="relative flex-1">
 {agendaItems.length === 0 ? (
 <div className="py-12 text-center flex flex-col items-center justify-center">
 <Clock className="w-6 h-6 text-muted mb-2 stroke-[1.5]" />
 <p className="text-body font-medium text-primary mb-1">No events scheduled for today</p>
 <p className="text-caption text-secondary mb-4">Your agenda is completely clear. Enjoy your focus time!</p>
 <button onClick={() => setScheduleModalOpen(true)} className="px-3.5 py-1.5 rounded-full bg-accent/10 text-accent hover:bg-accent hover:text-white text-caption font-medium transition-colors shadow-sm cursor-pointer">
 + Schedule a task
 </button>
 </div>
 ) : (
 <div className="space-y-4">
 {agendaItems.map((item) => {
 
 if (item.type === 'task') {
 const issue = item.data;
 const isDone = issue.status === "DONE" || issue.status === "REVIEW";
 const Icon = getIconForString(issue.title);
 
 return (
 <div key={'task-'+issue.id} className="relative group/timeline">
 <div className="absolute left-[39px] -top-2 -bottom-6 w-[2px] border-l-2 border-dashed border-border group-last/timeline:hidden" />
 
 <div className="flex items-start gap-4 relative">
 <div className="w-[80px] shrink-0 text-right pt-2.5">
 <div className="text-[11px] font-medium text-primary">
 {item.isCarriedOver ? 'Overdue' : 'Unscheduled'}
 </div>
 </div>
 
 <div className={cn("w-8 h-8 rounded-full ring-4 ring-white flex items-center justify-center transition-colors z-10",
 isDone ? "bg-primary" : "bg-surface border-2 border-dashed border-border"
 )}>
 {isDone && <Check className="w-2.5 h-2.5 text-muted stroke-[2]" />}
 </div>
 
 <div className={cn("flex-1 rounded-xl p-3.5 transition-all flex items-center justify-between border border-dashed cursor-pointer group/card",
 isDone ? "bg-surface border-border/50 opacity-60" : "bg-surface border-border hover:border-primary shadow-sm"
 )}>
 <div className="flex items-center gap-3.5">
 <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors",
 isDone ? "bg-surface border border-border" : "bg-surface border border-dashed border-border"
 )}>
 <Icon className={cn("w-4 h-4 stroke-[1.75]", isDone ? "text-muted" : "text-primary")} />
 </div>
 <div>
 <div className="flex items-center gap-2">
 <h3 className={cn("font-medium text-body mb-0.5",
 isDone ? "text-muted line-through decoration-muted" : "text-primary"
 )}>
 {issue.title}
 </h3>
 {item.isCarriedOver && (
 <span className="px-1.5 py-0.2 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[9px] font-mono font-bold uppercase tracking-widest border border-orange-500/20">
 Carried Over
 </span>
 )}
 </div>
 <div className="text-badge text-secondary font-mono">
 {issue.estimateMinutes ? `${issue.estimateMinutes}m` : 'Task'}
 </div>
 </div>
 </div>
 <button onClick={(e) => { e.stopPropagation(); deleteIssueMutation.mutate(issue.id); }} className="w-8 h-8 rounded-lg text-muted hover:text-error hover:bg-red-50 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all shrink-0">
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </div>
 </div>
 );
 }

 const tb = item.data;
 const hasLinkedTask = !!item.linkedTask;
 const issueTitle = hasLinkedTask ? item.linkedTask.title : tb.title;
 const issueObj = hasLinkedTask ? item.linkedTask : tb;
 const isDone = hasLinkedTask ? (issueObj.status === "DONE" || issueObj.status === "REVIEW") : false;
 const Icon = getIconForString(issueTitle);
 
 const now = currentTime.getTime();
 const tbStart = new Date(tb.startTime).getTime();
 const tbEnd = new Date(tb.endTime).getTime();
 const isCurrent = now >= tbStart && now <= tbEnd;
 const isPast = now > tbEnd;

 const formatTime = (iso: string) => {
 return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
 };

 return (
 <div key={'tb-'+tb.id} className="relative group/timeline">
 <div className="absolute left-[39px] -top-2 -bottom-6 w-[2px] bg-border group-last/timeline:hidden" />
 
 <div className="flex items-start gap-4 relative">
 <div className="w-[80px] shrink-0 text-right pt-2.5 flex flex-col gap-0.5">
 <div className="text-[12px] font-bold text-primary">
 {formatTime(tb.startTime)}
 </div>
 <div className="text-[10px] font-medium text-secondary">
 {formatTime(tb.endTime)}
 </div>
 </div>
 
 <div className={cn("w-8 h-8 rounded-full ring-4 ring-canvas flex items-center justify-center transition-colors z-10",
 isDone ? "bg-primary" : isCurrent ? "bg-accent ring-2 ring-accent/20" : isPast ? "bg-surface border-2 border-border" : "bg-surface border-2 border-accent"
 )}>
 {isDone && <Check className="w-2.5 h-2.5 text-white stroke-[2]" />}
 {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-surface animate-pulse" />}
 </div>
 
 <div className={cn("flex-1 rounded-xl p-3.5 transition-all flex items-center justify-between border cursor-pointer group/card",
 isDone ? "bg-surface border-border/50 opacity-60" : isCurrent ? "bg-surface border-accent ring-1 ring-accent/20 shadow-md" : "bg-surface border-border hover:border-primary shadow-sm"
 )}>
 <div className="flex items-center gap-3.5">
 <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors",
 isDone ? "bg-surface border border-border" : isCurrent ? "bg-accent text-white shadow-xs" : "bg-accent/10 border border-accent/20"
 )}>
 <Icon className={cn("w-4 h-4 stroke-[1.75]", isDone ? "text-muted" : isCurrent ? "text-white" : "text-accent")} />
 </div>
 <div>
 <div className="flex items-center gap-2">
 <h3 className={cn("font-medium text-body mb-0.5",
 isDone ? "text-muted line-through decoration-muted" : "text-primary"
 )}>
 {issueTitle}
 </h3>
 {isCurrent && (
 <span className="px-1.5 py-0.2 rounded bg-accent/10 text-accent text-[9px] font-mono font-bold uppercase tracking-widest border border-accent/20">
 In Progress Now
 </span>
 )}
 {hasLinkedTask && (
 <span className="px-1.5 py-0.2 rounded bg-[var(--cat-routines-bg)] text-[var(--cat-routines)] text-[9px] font-mono font-bold uppercase tracking-widest border border-[var(--cat-routines)]/20">
 Linked Task
 </span>
 )}
 </div>
 <div className="text-badge text-secondary font-mono flex items-center gap-1.5">
 <span className="px-1.5 py-0.5 bg-surface-hover rounded border border-border">{tb.type} Block</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
 })}
 </div>
        )}
      </div>
    </div>
  </div>

    <ScheduleTaskModal
 open={scheduleModalOpen}
 onClose={() => setScheduleModalOpen(false)}
 onSubmit={(data) => scheduleTaskMutation.mutate(data)}
 defaultDate={formatLocalDate(targetDate) || ''}
 isSubmitting={scheduleTaskMutation.isPending}
 />
 </div>
 );
}
