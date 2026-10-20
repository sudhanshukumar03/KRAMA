import type { GoalWithRelations, ProjectWithRelations } from '../../types/schema';

export interface GoalDetailDrawerProps {
  goal: GoalWithRelations;
  projects: ProjectWithRelations[];
  projectsAvailable?: boolean;
  onClose: () => void;
  onAddChild?: (parentGoal: GoalWithRelations) => void;
  onSelectGoal?: (goal: GoalWithRelations) => void;
}
