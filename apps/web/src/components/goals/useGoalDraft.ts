import { useState, useEffect, useRef } from 'react';
import { goalDraftKey, readGoalDraft } from '../../lib/goalDraftStorage';
import { goalMetadata } from '../../lib/goalUtils';
import type { GoalWithRelations } from '../../types/schema';

/** Own section revisions and recovery independently of network mutations and views. */
export function useGoalDraft(goal: GoalWithRelations, current: GoalWithRelations, userId: string | undefined, workspaceId: string | null) {
  const goalId = goal.id;
  const metadata = goalMetadata(current.metadata);
  const draftKey = goalDraftKey(userId, workspaceId, goalId);
  const [recoveredDraft] = useState(() => readGoalDraft(draftKey));
  const draftRevision = useRef({ settings: 0, checkIn: 0 });
  // Older recovery records have no section flags; conservatively retain both.
  const [settingsDirty, setSettingsDirty] = useState(!!recoveredDraft && (recoveredDraft.settingsDirty ?? true));
  const [checkInDirty, setCheckInDirty] = useState(!!recoveredDraft && (recoveredDraft.checkInDirty ?? true));
  const draftDirty = settingsDirty || checkInDirty;
  const markDraftDirty = (section: 'settings' | 'checkIn') => {
    draftRevision.current[section]++;
    if (section === 'settings') setSettingsDirty(true);
    else setCheckInDirty(true);
  };

  const [draftVersion, setDraftVersion] = useState(recoveredDraft?.draftVersion ?? goal.version);
  const [activeTab, setActiveTab] = useState<'cockpit' | 'edit'>(recoveredDraft?.activeTab ?? 'cockpit');
  const [note, setNote] = useState(recoveredDraft?.note ?? '');
  const [progressInput, setProgressInput] = useState<number>(recoveredDraft?.progressInput ?? goal.progress ?? 0);

  useEffect(() => {
    if (!draftDirty) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [draftDirty]);


  // Inline edit state
  const [editTitle, setEditTitle] = useState(recoveredDraft?.editTitle ?? goal.title);
  const [editIcon, setEditIcon] = useState<string>(recoveredDraft?.editIcon ?? goal.icon ?? 'Goal');
  const [editWhy, setEditWhy] = useState(
    recoveredDraft?.editWhy ?? (goalMetadata(goal.metadata)?.whyStatement || goalMetadata(goal.metadata)?.description || '')
  );
  const [editCategory, setEditCategory] = useState(recoveredDraft?.editCategory ?? goalMetadata(goal.metadata)?.category ?? 'health');
  const [editTargetDate, setEditTargetDate] = useState(() =>
    recoveredDraft?.editTargetDate ?? (goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : '')
  );
  const [editProgressMode, setEditProgressMode] = useState<'manual' | 'auto'>(recoveredDraft?.editProgressMode ?? 'manual');


  const [measurableInput, setMeasurableInput] = useState(
    recoveredDraft?.measurableInput ?? (metadata.currentValue != null ? String(metadata.currentValue) : '')
  );

  useEffect(() => {
    try {
      if (!draftDirty) { sessionStorage.removeItem(draftKey); return; }
      sessionStorage.setItem(draftKey, JSON.stringify({ schema: 1, draftVersion, activeTab, note, progressInput, measurableInput, editTitle, editIcon, editWhy, editCategory, editTargetDate, editProgressMode, settingsDirty, checkInDirty }));
    } catch { /* Keep editing even if this browser has no draft storage. */ }
  }, [draftKey, draftDirty, draftVersion, activeTab, note, progressInput, measurableInput, editTitle, editIcon, editWhy, editCategory, editTargetDate, editProgressMode, settingsDirty, checkInDirty]);

  useEffect(() => {
    // Keep the user's edits and original version when a background query updates.
    // The server can then detect a stale save rather than silently overwriting it.
    if (!draftDirty) setDraftVersion(current.version);
    if (!checkInDirty) {
      setProgressInput(current.progress ?? 0);
      setMeasurableInput(metadata.currentValue != null ? String(metadata.currentValue) : '');
    }
    if (settingsDirty) return;
    setEditTitle(current.title);
    setEditIcon(current.icon || 'Goal');
    setEditWhy(metadata.whyStatement || metadata.description || '');
    setEditCategory(metadata.category || 'health');
    setEditProgressMode(metadata.progressMode === 'auto' ? 'auto' : 'manual');
    setEditTargetDate(current.targetDate ? new Date(current.targetDate).toISOString().split('T')[0] : '');
  }, [
    draftDirty, settingsDirty, checkInDirty, current.version,
    current.progress,
    metadata.currentValue,
    metadata.progressMode,
    current.title,
    current.icon,
    current.targetDate,
    metadata.whyStatement,
    metadata.description,
    metadata.category,
  ]);

  return {
    draftKey,
    draftRevision,
    setSettingsDirty,
    setCheckInDirty,
    draftDirty,
    markDraftDirty,
    draftVersion,
    setDraftVersion,
    activeTab,
    setActiveTab,
    note,
    setNote,
    progressInput,
    setProgressInput,
    editTitle,
    setEditTitle,
    editIcon,
    setEditIcon,
    editWhy,
    setEditWhy,
    editCategory,
    setEditCategory,
    editTargetDate,
    setEditTargetDate,
    editProgressMode,
    setEditProgressMode,
    measurableInput,
    setMeasurableInput
  };
}
