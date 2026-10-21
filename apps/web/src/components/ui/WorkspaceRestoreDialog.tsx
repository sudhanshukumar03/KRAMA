import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useModalA11y } from '../../hooks/useModalA11y';
import { personalButton } from '../../lib/personalTasks';
import { errorMessage } from '../../lib/utils';
import type { WorkspaceExport, Workspace } from '../../types/schema';

export function WorkspaceRestoreDialog({ onClose }: { onClose: () => void }) {
  const { switchWorkspace, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [backup, setBackup] = useState<WorkspaceExport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [restored, setRestored] = useState<Workspace | null>(null);
  const working = useRef(false);
  const close = () => { if (!working.current) onClose(); };
  const dialog = useModalA11y(true, close);
  async function readFile(file?: File) {
    if (!file || working.current) return;
    setBackup(null); setError('');
    if (file.size > 25 * 1024 * 1024) { setError('Choose a backup smaller than 25 MB.'); return; }
    working.current = true; setBusy(true);
    try {
      const data = JSON.parse(await file.text());
      if (data?.format !== 'krama-workspace-backup' || data.formatVersion !== 2 || typeof data.workspace?.name !== 'string') throw new Error('Choose a Krama version 2 workspace backup JSON file.');
      if (!Array.isArray(data.workspace.members) || data.workspace.members.length !== 1) throw new Error('This restore supports personal workspace backups with one member.');
      for (const key of ['tasks', 'goals', 'projects', 'habits', 'spaces']) if (!Array.isArray(data.workspace[key])) throw new Error('This backup is incomplete. Choose an original Krama export.');
      setBackup(data);
    } catch (error) { setError(errorMessage(error, 'Could not read this backup.')); }
    finally { working.current = false; setBusy(false); }
  }
  async function restore() {
    if (!backup || working.current || restored) return;
    working.current = true; setBusy(true); setError('');
    try {
      const result = await api.workspaces.restore(backup);
      setRestored(result);
      await queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      try { updateUser((await api.auth.me()).user); } catch { /* Opening the workspace refreshes the account session. */ }
    } catch (error) { setError(errorMessage(error, 'Could not restore the backup. Please try again.')); }
    finally { working.current = false; setBusy(false); }
  }
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="restore-title" aria-busy={busy} className="w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-border bg-surface p-6 space-y-4">
      <h2 id="restore-title" className="text-lg font-semibold text-primary">Restore personal workspace</h2>
      {restored ? <><p role="status" className="text-sm text-success-fg">Restored as “{restored.name}”. Your original workspace is unchanged.</p><button className={personalButton} disabled={busy} onClick={() => switchWorkspace(restored.id)}>Open restored workspace</button></> : <>
        <p className="text-sm text-secondary">Choose an exported Krama JSON backup. Restore creates a separate workspace owned by you, including its saved work and history.</p>
        <p className="text-sm text-secondary">Personal backups with one member, up to 25 MB. Linked images and attachments still use their original URLs.</p>
        <div><label htmlFor="workspace-backup" className="block text-sm text-primary mb-2">Backup file</label><input id="workspace-backup" type="file" accept=".json,application/json" disabled={busy} onChange={event => readFile(event.target.files?.[0])} className="block min-h-11 max-w-full text-sm text-primary" /></div>
        {backup && <div className="rounded-lg border border-border p-3 text-sm text-secondary"><p className="font-medium text-primary">{backup.workspace.name}</p><p>{backup.workspace.tasks.length} tasks · {backup.workspace.projects.length} projects · {backup.workspace.goals.length} goals · {backup.workspace.habits.length} habits</p><p>{backup.workspace.spaces.reduce((count, space) => count + (space.documents?.length || 0), 0)} documents, including trash</p></div>}
        {error && <p role="alert" className="text-sm text-danger-fg">{error}</p>}
        <button className={personalButton} disabled={!backup || busy} onClick={restore}>{busy ? 'Working...' : 'Restore as new workspace'}</button>
      </>}
      <button className={personalButton} disabled={busy} onClick={close}>Close</button>
    </div>
  </div>;
}
