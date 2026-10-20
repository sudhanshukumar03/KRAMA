export interface GoalDraft {
  schema: 1;
  draftVersion: number;
  activeTab: 'cockpit' | 'edit';
  note: string;
  progressInput: number;
  measurableInput: string;
  editTitle: string;
  editIcon: string;
  editWhy: string;
  editCategory: string;
  editTargetDate: string;
  editProgressMode: 'manual' | 'auto';
  settingsDirty?: boolean;
  checkInDirty?: boolean;
}

export function goalDraftKey(userId: string | undefined, workspaceId: string | null, goalId: string) {
  return `krama.goal.draft.v1.${userId}.${workspaceId}.${goalId}`;
}

export function readGoalDraft(key: string): GoalDraft | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (!value || value.schema !== 1 || !Number.isInteger(value.draftVersion) || value.draftVersion < 1 || !Number.isFinite(value.progressInput)) return null;
    if (!['cockpit', 'edit'].includes(value.activeTab) || !['manual', 'auto'].includes(value.editProgressMode)) return null;
    if (['settingsDirty', 'checkInDirty'].some(field => value[field] !== undefined && typeof value[field] !== 'boolean')) return null;
    if (['note', 'measurableInput', 'editTitle', 'editIcon', 'editWhy', 'editCategory', 'editTargetDate'].some(field => typeof value[field] !== 'string')) return null;
    return value;
  } catch { return null; }
}
