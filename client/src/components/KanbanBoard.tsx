import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors
} from '@dnd-kit/core';
import type {
  DragStartEvent,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  SortableContext, 
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { IssueWithRelations } from '../types/schema';
import { BaseButton } from './ui/BaseButton';
import { LoadingState } from './ui/LoadingState';
import { ErrorState } from './ui/ErrorState';
import { Circle, CircleDot, CircleDashed, CheckCircle, CheckCircle2, ListChecks, Search, Filter, Plus, User, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'testing', 'done', 'released'];

function getStatusIcon(status: string) {
  switch (status) {
    case 'backlog': return <Circle className="w-4 h-4 text-[#9CA3AF] stroke-[1.75]" />;
    case 'todo': return <CircleDot className="w-4 h-4 text-[#6B7280] stroke-[1.75]" />;
    case 'in_progress': return <CircleDashed className="w-4 h-4 text-[#2563EB] stroke-[1.75]" />;
    case 'review': return <CheckCircle className="w-4 h-4 text-[#4F46E5] stroke-[1.75]" />;
    case 'testing': return <CheckCircle className="w-4 h-4 text-[#6B7280] stroke-[1.75]" />;
    case 'done': return <CheckCircle2 className="w-4 h-4 text-[#0D9488] stroke-[2]" />;
    case 'released': return <CheckCircle2 className="w-4 h-4 text-[#0D9488] stroke-[2]" />;
    default: return <Circle className="w-4 h-4 stroke-[1.75]" />;
  }
}

function IssueCard({ issue, isDragging, onDelete }: { issue: IssueWithRelations, isDragging?: boolean, onDelete?: (issue: IssueWithRelations) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: issue.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 120ms ease-out',
  };

  const isUrgent = issue.priority === 'urgent';
  const isHigh = issue.priority === 'high';

  const completedSubtasks = issue.childIssues?.filter((c: { status: string }) => c.status === 'done').length || 0;
  const totalSubtasks = issue.childIssues?.length || 0;
  const subtaskPct = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className={cn(
        "p-3 rounded-lg border border-[#E5E8EC] bg-white shadow-sm text-sm cursor-grab active:cursor-grabbing hover:border-[#111827] transition-all duration-150 group",
        isDragging && "scale-[1.03] shadow-md opacity-90 border-[#111827] ring-2 ring-[#111827] ring-offset-1 z-50 cursor-grabbing"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="font-mono text-[10px] text-[#9CA3AF] font-medium">{issue.id}</span>
        <div className="flex items-center gap-1">
          <span className={cn(
            "px-1.5 py-0.2 rounded font-mono text-[9px] font-bold uppercase tracking-widest border",
            isUrgent ? "bg-red-50 text-[#DC2626] border-[#DC2626]/20" 
            : isHigh ? "bg-amber-50 text-amber-700 border-amber-200" 
            : "bg-[#F8F9FB] text-[#6B7280] border-[#E5E8EC]"
          )}>
            {issue.priority}
          </span>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(issue);
              }}
              title="Delete Issue"
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-50 rounded text-[#9CA3AF] hover:text-[#DC2626] transition-all"
            >
              <Trash2 className="w-3 h-3 stroke-[1.75]" />
            </button>
          )}
        </div>
      </div>

      <div className="font-medium text-[#111827] mb-2.5 line-clamp-2 group-hover:text-[#2563EB] transition-colors">
        {issue.title}
      </div>

      {/* Real Dependency Badges (#4 Dependency Labels: text-caption / 11px with color coding) */}
      {((issue.blockedBy && issue.blockedBy.length > 0) || (issue.blocking && issue.blocking.length > 0)) && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {issue.blockedBy && issue.blockedBy.length > 0 && (
            <span 
              title={`Blocked by: ${issue.blockedBy.map((b: any) => b.title).join(', ')}`}
              className="px-2 py-0.5 rounded bg-red-50 text-[#DC2626] border border-[#DC2626]/20 font-mono text-caption font-bold uppercase tracking-wider flex items-center gap-1 truncate max-w-full shadow-2xs"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Blocked by: {issue.blockedBy.map((b: any) => b.id.slice(0, 6).toUpperCase()).join(', ')}
            </span>
          )}
          {issue.blocking && issue.blocking.length > 0 && (
            <span 
              title={`Blocking: ${issue.blocking.map((b: any) => b.title).join(', ')}`}
              className="px-2 py-0.5 rounded bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20 font-mono text-caption font-bold uppercase tracking-wider flex items-center gap-1 truncate max-w-full shadow-2xs"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Blocking: {issue.blocking.length} {issue.blocking.length === 1 ? 'ticket' : 'tickets'}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 pt-2 border-t border-[#E5E8EC]/60">
        {totalSubtasks > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-[#6B7280] font-mono">
              <span>Sub-tasks</span>
              <span>{completedSubtasks}/{totalSubtasks}</span>
            </div>
            <div className="h-1 w-full bg-[#F8F9FB] rounded-full overflow-hidden border border-[#E5E8EC]/40">
              <div className="h-full bg-[#2563EB] transition-all duration-400 ease-out" style={{ width: `${subtaskPct}%` }} />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-[#F8F9FB] border border-[#E5E8EC] flex items-center justify-center text-[9px] font-medium text-[#111827]">
              <User className="w-2.5 h-2.5 stroke-[2]" />
            </div>
            <span className="text-[11px] font-normal truncate max-w-[120px]">{issue.assignee ? 'Assignee' : 'Unassigned'}</span>
          </div>
          {issue.estimate && (
            <span className="font-mono text-[10px] bg-[#F8F9FB] px-1.5 py-0.2 rounded border border-[#E5E8EC]/60">{issue.estimate}h</span>
          )}
        </div>
      </div>
    </div>
  );
}

function Column({ title, issues, isLast, onDelete, onCreate }: { id: string, title: string, issues: IssueWithRelations[], isLast: boolean, onDelete?: (issue: IssueWithRelations) => void, onCreate?: (status: string) => void }) {
  return (
    <div className={cn(
      "flex flex-col w-[300px] flex-shrink-0 bg-white h-full",
      !isLast && "border-r border-[#E5E8EC]"
    )}>
      <div className={cn(
        "px-4 py-3 font-medium text-sm text-[#111827] flex justify-between items-center bg-[#F8F9FB] border-b border-[#E5E8EC] relative shadow-2xs",
        title === 'todo' && "border-t-2 border-t-[#6B7280]",
        title === 'in_progress' && "border-t-2 border-t-[#2563EB]",
        title === 'blocked' && "border-t-2 border-t-[#DC2626]",
        title === 'review' && "border-t-2 border-t-[#7C3AED]",
        title === 'done' && "border-t-2 border-t-[#0D9488]"
      )}>
        <div className="flex items-center gap-2">
          {getStatusIcon(title)}
          <span className="capitalize font-medium text-xs tracking-tight">{title.replace('_', ' ')}</span>
        </div>
        <span className="bg-white border border-[#E5E8EC] px-2 py-0.2 rounded font-mono text-[11px] text-[#6B7280] font-medium shadow-2xs">{issues.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 flex flex-col justify-between">
        <div className="space-y-2.5">
          {issues.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center justify-center">
              <ListChecks className="w-5 h-5 text-[#9CA3AF] mb-1.5 stroke-[1.5]" />
              <span className="text-xs text-[#9CA3AF] font-normal">No issues in {title.replace('_', ' ')}</span>
            </div>
          ) : (
            <SortableContext items={issues.map(i => i.id)} strategy={verticalListSortingStrategy}>
              {issues.map(issue => (
                <IssueCard key={issue.id} issue={issue} onDelete={onDelete} />
              ))}
            </SortableContext>
          )}
        </div>

        {/* Inline + Quick Add Button */}
        <button 
          onClick={() => onCreate ? onCreate(title) : toast.info(`Quick add task to ${title.replace('_', ' ')}`)}
          className="w-full mt-2 py-2 border border-dashed border-[#E5E8EC] hover:border-[#111827] hover:bg-[#F8F9FB] rounded-lg text-xs font-medium text-[#9CA3AF] hover:text-[#111827] transition-all flex items-center justify-center gap-1.5 opacity-80 hover:opacity-100"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2]" /> Quick Add
        </button>
      </div>
    </div>
  );
}

export function KanbanBoard() {
  const queryClient = useQueryClient();
  const { data: issues = [], isLoading, isError } = useQuery({ queryKey: ['issues'], queryFn: api.issues.list });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });
  
  const [activeIssue, setActiveIssue] = useState<IssueWithRelations | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'urgent' | 'high' | 'medium' | 'low'>('all');

  const handleCreateIssue = async (status: string = 'todo') => {
    if (projects.length === 0) {
      toast.error('No project found. Create a project first!');
      return;
    }
    const title = `New Task (${status.replace('_', ' ')})`;
    await api.issues.create({
      title,
      status: status as any,
      priority: 'medium',
      assignee: 'me',
      projectId: projects[0].id,
      estimate: 2,
      labels: []
    });
    queryClient.invalidateQueries({ queryKey: ['issues'] });
    toast.success(`Created "${title}"`, {
      description: `Added to ${status.replace('_', ' ')}. Click card to edit.`
    });
  };

  const handleDeleteIssue = async (issue: IssueWithRelations) => {
    const deletedIssue = { ...issue };
    await api.issues.delete(issue.id);
    queryClient.setQueryData<IssueWithRelations[]>(['issues'], old => old?.filter(i => i.id !== issue.id));
    toast.success(`Deleted "${issue.title}"`, {
      description: `Issue #${issue.id.slice(-4)} removed from sprint board.`,
      action: {
        label: 'Undo',
        onClick: async () => {
          await api.issues.create({
            title: deletedIssue.title,
            description: deletedIssue.description,
            status: deletedIssue.status as any,
            priority: deletedIssue.priority as any,
            estimate: deletedIssue.estimate,
            assignee: deletedIssue.assignee,
            projectId: deletedIssue.projectId,
            sprintId: deletedIssue.sprintId,
            parentIssueId: deletedIssue.parentIssueId,
            labels: deletedIssue.labels,
            dueDate: deletedIssue.dueDate ? new Date(deletedIssue.dueDate) : undefined,
            scheduledDate: deletedIssue.scheduledDate ? new Date(deletedIssue.scheduledDate) : undefined,
            blockedByIds: (deletedIssue as any).blockedBy?.map((b: any) => b.id),
          });
          queryClient.invalidateQueries({ queryKey: ['issues'] });
          toast.success(`Restored "${issue.title}"`);
        }
      },
      duration: 5000,
    });
  };

  const updateIssueMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<IssueWithRelations> }) => api.issues.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['issues'] });
      const previousIssues = queryClient.getQueryData<IssueWithRelations[]>(['issues']);
      queryClient.setQueryData<IssueWithRelations[]>(['issues'], old => 
        old?.map(issue => issue.id === id ? { ...issue, ...data } : issue)
      );
      return { previousIssues };
    },
    onError: (_err, _variables, context) => {
      queryClient.setQueryData(['issues'], context?.previousIssues);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
    }
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      const matchesSearch = searchQuery === '' || issue.title.toLowerCase().includes(searchQuery.toLowerCase()) || issue.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority = priorityFilter === 'all' || issue.priority === priorityFilter;
      return matchesSearch && matchesPriority;
    });
  }, [issues, searchQuery, priorityFilter]);

  if (isLoading) return <LoadingState variant="kanban" title="Loading Kanban Board..." description="Organizing sprint tasks and dependencies..." />;
  if (isError) {
    return (
      <div className="p-8">
        <ErrorState
          title="Failed to load Kanban board"
          message="Could not fetch sprint tasks from the server. Please verify your connection."
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['issues'] })}
        />
      </div>
    );
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveIssue(issues.find(i => i.id === active.id) || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveIssue(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeIssueData = issues.find(i => i.id === activeId);
    if (!activeIssueData) return;

    let newStatus = activeIssueData.status;
    
    if (STATUSES.includes(overId)) {
      newStatus = overId;
    } else {
      const overIssueData = issues.find(i => i.id === overId);
      if (overIssueData) {
        newStatus = overIssueData.status;
      }
    }

    if (activeIssueData.status !== newStatus) {
      updateIssueMutation.mutate({ id: activeId, data: { status: newStatus } });
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 h-full flex flex-col bg-canvas animate-in fade-in duration-150 gap-6">
      
      {/* Top Bar with Title and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-medium tracking-tight text-[#111827]">Execution Board</h1>
          <p className="text-[13px] text-[#6B7280]">Drag and drop issues across sprint statuses. Single bounded board view.</p>
        </div>
        <BaseButton onClick={() => handleCreateIssue('todo')}>
          <Plus className="w-4 h-4 mr-1.5 stroke-[2]" /> New Issue
        </BaseButton>
      </div>

      {/* NEW: Interactive Filter & Search Bar */}
      <div className="bg-white border border-[#E5E8EC] rounded-xl p-3 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2 stroke-[1.75]" />
          <input
            type="text"
            placeholder="Search issues by title or ID (e.g. KRA-101)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#F8F9FB] border border-[#E5E8EC] rounded-lg focus:outline-none focus:border-[#2563EB] focus:bg-white transition-all placeholder:text-[#9CA3AF] text-[#111827]"
          />
        </div>

        {/* Priority Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-[11px] font-medium text-[#6B7280] flex items-center gap-1 mr-1 shrink-0">
            <Filter className="w-3.5 h-3.5 stroke-[1.75]" /> Priority:
          </span>
          {(['all', 'urgent', 'high', 'medium', 'low'] as const).map((pri) => (
            <button
              key={pri}
              onClick={() => setPriorityFilter(pri)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-all shrink-0",
                priorityFilter === pri 
                  ? "bg-[#111827] text-white shadow-2xs" 
                  : "bg-[#F8F9FB] text-[#6B7280] hover:text-[#111827] border border-[#E5E8EC]"
              )}
            >
              {pri}
            </button>
          ))}
        </div>

      </div>

      {/* Single Bounded Board Grid */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="min-w-max h-full border border-[#E5E8EC] rounded-xl bg-white shadow-sm flex overflow-hidden">
          <DndContext 
            sensors={sensors} 
            collisionDetection={closestCorners} 
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {STATUSES.map((status, index) => {
              const columnIssues = filteredIssues.filter(i => i.status === status);
              return (
                <Column key={status} id={status} title={status} issues={columnIssues} isLast={index === STATUSES.length - 1} onDelete={handleDeleteIssue} onCreate={handleCreateIssue} />
              );
            })}
            
            <DragOverlay dropAnimation={{
              duration: 150,
              easing: 'ease-out'
            }}>
              {activeIssue ? <IssueCard issue={activeIssue} isDragging onDelete={handleDeleteIssue} /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
