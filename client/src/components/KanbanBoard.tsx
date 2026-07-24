import { useState } from 'react';
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
import { Circle, CircleDot, CircleDashed, CheckCircle, CheckCircle2, ListChecks } from 'lucide-react';
import { cn } from '../lib/utils';

const STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'testing', 'done', 'released'];

function getStatusIcon(status: string) {
  switch (status) {
    case 'backlog': return <Circle className="w-4 h-4 text-[#9CA3AF]" />;
    case 'todo': return <CircleDot className="w-4 h-4 text-[#6B7280]" />;
    case 'in_progress': return <CircleDashed className="w-4 h-4 text-amber-500" />;
    case 'review': return <CheckCircle className="w-4 h-4 text-blue-500" />;
    case 'testing': return <CheckCircle className="w-4 h-4 text-purple-500" />;
    case 'done': return <CheckCircle2 className="w-4 h-4 fill-current text-[#0A0A0A]" />;
    case 'released': return <CheckCircle2 className="w-4 h-4 fill-current text-[#0A0A0A]" />;
    default: return <Circle className="w-4 h-4" />;
  }
}

function IssueCard({ issue, isDragging }: { issue: IssueWithRelations, isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: issue.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 120ms ease-out', // sibling shift at 120ms
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className={cn(
        "px-2.5 py-2 rounded border border-[#E5E7EB] bg-white shadow-sm text-sm cursor-grab active:cursor-grabbing hover:border-[#D1D5DB] transition-all duration-100",
        isDragging && "scale-[1.03] shadow-md opacity-90 border-[#9CA3AF] ring-2 ring-[#0A0A0A] ring-offset-1 z-50 cursor-grabbing"
      )}
    >
      <div className="font-bold text-[#0A0A0A] mb-1">{issue.title}</div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
          <span className="font-medium">{issue.id}</span>
          <span className="px-1.5 py-0.5 rounded bg-[#F3F4F6] text-[9px] font-bold uppercase tracking-widest">{issue.priority}</span>
        </div>
        {issue.childIssues && issue.childIssues.length > 0 && (
          <div className="flex items-center gap-1.5 pt-1 border-t border-[#E5E7EB]">
            <span className="text-[9px] font-bold text-[#6B7280] bg-[#F3F4F6] px-1.5 py-0.5 rounded">
              {issue.childIssues.filter(c => c.status === 'done').length}/{issue.childIssues.length} sub-tasks
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function Column({ title, issues, isLast }: { id: string, title: string, issues: IssueWithRelations[], isLast: boolean }) {
  return (
    <div className={cn(
      "flex flex-col w-[300px] flex-shrink-0 bg-[#FAFAFA] h-full transition-colors duration-150",
      !isLast && "border-r border-[#E5E7EB]"
    )}>
      <div className="px-4 py-3 font-bold text-sm text-[#0A0A0A] flex justify-between items-center bg-[#FAFAFA] border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2">
          {getStatusIcon(title)}
          <span className="capitalize">{title.replace('_', ' ')}</span>
        </div>
        <span className="bg-[#E5E7EB] px-2 py-0.5 rounded text-xs text-[#6B7280]">{issues.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {issues.length === 0 ? (
          <div className="mt-8 text-center flex flex-col items-center">
            <ListChecks className="w-5 h-5 text-[#D1D5DB] mb-2" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF]">No issues</span>
          </div>
        ) : (
          <SortableContext items={issues.map(i => i.id)} strategy={verticalListSortingStrategy}>
            {issues.map(issue => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
}

export function KanbanBoard() {
  const queryClient = useQueryClient();
  const { data: issues = [], isLoading } = useQuery({ queryKey: ['issues'], queryFn: api.issues.list });
  const [activeIssue, setActiveIssue] = useState<IssueWithRelations | null>(null);

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

  if (isLoading) return <div className="p-8 text-[#6B7280]">Loading board...</div>;

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

    // Find what status column we dropped over
    let newStatus = activeIssueData.status;
    
    // If dropped directly over a column ID
    if (STATUSES.includes(overId)) {
      newStatus = overId;
    } else {
      // If dropped over another issue, inherit its status
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
    <div className="p-8 h-full flex flex-col bg-white animate-in fade-in duration-150">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A]">Execution Board</h1>
        <BaseButton>New Issue</BaseButton>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="min-w-max h-full border border-[#E5E7EB] rounded-xl bg-white shadow-sm flex overflow-hidden">
          <DndContext 
            sensors={sensors} 
            collisionDetection={closestCorners} 
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {STATUSES.map((status, index) => {
              const columnIssues = issues.filter(i => i.status === status);
              return (
                <Column key={status} id={status} title={status} issues={columnIssues} isLast={index === STATUSES.length - 1} />
              );
            })}
            
            <DragOverlay dropAnimation={{
              duration: 150,
              easing: 'ease-out'
            }}>
              {activeIssue ? <IssueCard issue={activeIssue} isDragging /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
