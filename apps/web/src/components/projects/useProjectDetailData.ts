import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../../api/client';
import { projectMetadata, errorMessage } from '../../lib/utils';
import type { ProjectStatus, TaskCreateInput } from '../../types/schema';

interface ProjectDetailDataInput {
  id: string | undefined;
  onEdited: () => void;
  onDeleted: () => void;
  onTaskCreated: () => void;
}
/** Authoritative detail reads, versioned edits and recoverable writes shared by every tab. */
export function useProjectDetailData({ id, onEdited, onDeleted, onTaskCreated }: ProjectDetailDataInput) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: projects = [], isError: pError, refetch: retryProjects } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });
  const { data: issues = [], isLoading: iLoading, isError: iError, refetch: retryIssues } = useQuery({ queryKey: ['issues'], queryFn: api.tasks.list });
  const { data: pages = [], isLoading: docsLoading, isError: docsError, refetch: retryDocs } = useQuery({ queryKey: ['documents'], queryFn: () => api.documents.list() });
  const { data: goals = [], isLoading: goalsLoading, isError: goalsError, refetch: retryGoals } = useQuery({ queryKey: ['goals', 'lite'], queryFn: api.goals.listLite });

  // The workspace-scoped detail request is authoritative, including milestones.
  // Its loading, error and not-found states must not be masked by an older list.
  const { data: fetchedProject, isLoading: projectLoading, error: projectError, refetch: retryProject } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.projects.get(id!),
    enabled: !!id,
    retry: false,
  });

  const project = fetchedProject;

  const editProjectMutation = useMutation({
    mutationFn: (data: { name: string; problemStatement: string; status: ProjectStatus; targetDate: string; icon?: string | null; goalId?: string | null; tags?: string[]; version?: number }) => {
      if (!project) throw new Error('Project not loaded');
      return api.projects.update(project.id, {
        name: data.name,
        problemStatement: data.problemStatement,
        status: data.status,
        icon: data.icon ?? undefined,
        goalId: data.goalId || null,
        targetDate: data.targetDate ? new Date(data.targetDate).toISOString() : null,
        version: data.version ?? project.version,
        metadata: {
          ...projectMetadata(project.metadata),
          tags: data.tags !== undefined ? data.tags : (projectMetadata(project.metadata).tags || [])
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      onEdited();
      toast.success('Project updated successfully');
    },
    onError: (err) => {
      if ('status' in err && err.status === 409) {
        // Refresh the server version without resetting the open editor's draft.
        void queryClient.invalidateQueries({ queryKey: ['project', id] });
        void queryClient.invalidateQueries({ queryKey: ['projects'] });
      }
      toast.error(errorMessage(err, 'Failed to update project'));
    }
  });

  const deleteProjectMutation = useMutation({
    mutationFn: () => {
      if (!project) throw new Error('Project not loaded');
      return api.projects.delete(project.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      onDeleted();
      const deletedProjectId = project!.id;
      toast.success(`Deleted project "${project?.name}"`, {
        action: { label: 'Undo', onClick: async () => {
          try {
            await api.projects.restore(deletedProjectId);
            for (const queryKey of [['projects'], ['project', deletedProjectId], ['issues'], ['tasks'], ['planner'], ['goals']]) queryClient.invalidateQueries({ queryKey });
            toast.success('Project restored');
          } catch { toast.error('Could not restore project'); }
        } },
      });
      navigate('/app/projects');
    },
    onError: (err) => {
      toast.error(errorMessage(err, 'Failed to delete project'));
    }
  });

  const createDirectiveMutation = useMutation({
    mutationFn: (data: TaskCreateInput) =>
      api.tasks.create({
        ...data,
        projectId: project?.id,
      }),
    onSuccess: (newIssue) => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      onTaskCreated();
      toast.success(`Created "${newIssue?.title || 'Directive'}"`, {
        description: 'Directive added to project backlog.'
      });
    },
    onError: () => {
      toast.error('Failed to create directive');
    }
  });

  return { projects, pError, retryProjects, issues, iLoading, iError, retryIssues, pages, docsLoading, docsError, retryDocs,
    goals, goalsLoading, goalsError, retryGoals, project, projectLoading, projectError, retryProject,
    editProjectMutation, deleteProjectMutation, createDirectiveMutation };
}
