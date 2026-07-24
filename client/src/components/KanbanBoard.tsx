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
  DragOverEvent,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  SortableContext, 
  arrayMove, 
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { IssueWithRelations } from '../types/schema';

const STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'testing', 'done', 'released'];

function IssueCard({ issue, isDragging }: { issue: IssueWithRelations, isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: issue.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className={`p-3 rounded-md border border-zinc-800 bg-zinc-900 shadow-sm text-sm cursor-grab active:cursor-grabbing hover:border-zinc-700 transition-colors ${isDragging ? 'opacity-50 ring-2 ring-accent' : ''}`}
    >
      <div className="font-medium text-zinc-200 mb-1">{issue.title}</div>
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span>{issue.id}</span>
        <span className="px-1.5 py-0.5 rounded bg-zinc-800">{issue.priority}</span>
      </div>
    </div>
  );
}

function Column({ id, title, issues }: { id: string, title: string, issues: IssueWithRelations[] }) {
  return (
    <div className="flex flex-col flex-1 min-w-[280px] bg-zinc-950/50 p-2 rounded-lg border border-zinc-900 h-full overflow-hidden">
      <div className="px-3 py-2 font-medium text-sm text-zinc-400 mb-2 flex justify-between items-center">
        <span className="capitalize">{title.replace('_', ' ')}</span>
        <span className="bg-zinc-800 px-2 py-0.5 rounded text-xs">{issues.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-1 space-y-2">
        <SortableContext items={issues.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {issues.map(issue => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </SortableContext>
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
    onError: (err, variables, context) => {
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

  if (isLoading) return <div className="p-8 text-zinc-500">Loading board...</div>;

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
    <div className="p-8 h-full flex flex-col">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Execution Board</h1>
        <button className="bg-zinc-100 text-zinc-950 px-4 py-1.5 rounded-md text-sm font-medium hover:bg-white transition-colors">
          New Issue
        </button>
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCorners} 
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {STATUSES.map(status => {
            const columnIssues = issues.filter(i => i.status === status);
            return (
              <Column key={status} id={status} title={status} issues={columnIssues} />
            );
          })}
          
          <DragOverlay>
            {activeIssue ? <IssueCard issue={activeIssue} isDragging /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
