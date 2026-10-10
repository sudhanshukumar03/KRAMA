import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { toast } from 'sonner';
import { 
  Home, BookOpen, Target,
  Calendar, KanbanSquare, BarChart2,
  Search, LogOut, Moon, Sun, Download, X, 
  Settings, User, Briefcase,
  PanelLeftClose, Timer, ExternalLink,
  TrendingUp, KeyRound, Eye, EyeOff
} from 'lucide-react';
import { useTheme } from '../lib/theme';
import { useModalA11y } from '../hooks/useModalA11y';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { KramaLogo } from './ui/KramaLogo';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { NotificationCenter } from './NotificationCenter';

interface NavItem {
  name: string;
  path: string;
  icon: any;
  shortcut?: string;
  badgeKey: string | null;
  external?: boolean;
}

// 5 Rule-of-5-7 Groups per KRAMA UI Design Direction
const overviewItems: NavItem[] = [
  { name: 'Dashboard', path: '/app/', icon: Home, shortcut: 'G D', badgeKey: null },
  { name: 'Analytics', path: '/app/analytics', icon: TrendingUp, shortcut: 'G A', badgeKey: null },
];

const planAndExecuteItems: NavItem[] = [
  { name: 'Execution Board', path: '/app/board', icon: KanbanSquare, shortcut: 'E K', badgeKey: 'openIssues' },
  { name: 'Planner', path: '/app/planner', icon: Calendar, shortcut: 'E W', badgeKey: null },
  { name: 'Focus Timer', path: '/focus', icon: Timer, shortcut: '⌃⇧Q', badgeKey: null, external: true },
];

const strategyItems: NavItem[] = [
  { name: 'Goals', path: '/app/goals', icon: Target, shortcut: 'G G', badgeKey: 'goals' },
  { name: 'Habits', path: '/app/habits', icon: BarChart2, shortcut: 'E H', badgeKey: 'habits' },
  { name: 'Projects', path: '/app/projects', icon: Briefcase, shortcut: 'G P', badgeKey: 'projects' },
];

const knowledgeItems: NavItem[] = [
  { name: 'Brain Workspace', path: '/app/brain', icon: BookOpen, shortcut: 'G B', badgeKey: 'documents' },
];

export function Sidebar({ 
  mobileOpen = false, 
  onMobileClose,
  isCollapsed = false,
  onToggleCollapse
}: { 
  mobileOpen?: boolean; 
  onMobileClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
 const location = useLocation();
 const mobileDialogRef = useModalA11y(mobileOpen, () => onMobileClose?.());
 const { toggleTheme, resolvedTheme } = useTheme();
  const { user, logout, workspaceId } = useAuth();
  const canExport = user?.memberships.some(member => member.workspaceId === workspaceId && member.role === 'OWNER');
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };
    if (settingsOpen) {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        setSettingsOpen(false);
        settingsRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
      };
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [settingsOpen]);

  // Fetch live counts for badges
  const { data: issues = [] } = useQuery({ queryKey: ['issues'], queryFn: api.tasks.list });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });
  const { data: goals = [] } = useQuery({ queryKey: ['goals', 'lite'], queryFn: api.goals.listLite });
  const { data: habits = [] } = useQuery({ queryKey: ['habits'], queryFn: api.habits.list });
  const { data: documents = [] } = useQuery({ queryKey: ['documents'], queryFn: () => api.documents.list() });

  const openIssuesCount = issues.filter(i => i.status !== "DONE" && i.status !== "CANCELED").length;
  const activeProjectsCount = projects.filter(p => p.status === 'active').length;

  const getBadgeValue = (key: string | null) => {
    if (key === 'openIssues') return openIssuesCount;
    if (key === 'projects') return activeProjectsCount;
    if (key === 'goals') return goals.filter((g: any) => !g.parentGoalId && g.progress < 100 && (g.metadata?.status !== 'COMPLETED' && g.metadata?.status !== 'CANCELED')).length;
    if (key === 'habits') return habits.length;
    if (key === 'documents') return documents.length;
    return null;
  };

 const handleExport = async () => {
 const toastId = toast.loading('Exporting workspace backup...');
 try {

 const data = await api.workspaces.export();
 const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `krama-backup-${new Date().toISOString().split('T')[0]}.json`;
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 URL.revokeObjectURL(url);

 toast.success('Workspace backup exported successfully');
 } catch (err: any) {
 toast.error('Failed to export backup: ' + err.message);
 } finally { toast.dismiss(toastId); }
 };

  const renderLink = (item: NavItem) => {
    const isActive = location.pathname === item.path || (item.path !== '/app/' && location.pathname.startsWith(item.path));
    const Icon = item.icon;
    const badgeVal = getBadgeValue(item.badgeKey);

    if (item.external) {
      return (
        <button
          key={item.path}
          type="button"
          onClick={() => {
            onMobileClose?.();
            window.open(item.path, '_blank');
          }}
          className="w-full group flex items-center justify-between px-2.5 py-1.5 rounded-md text-caption transition-colors duration-150 outline-none select-none relative text-secondary hover:text-primary hover:bg-surface-hover border border-transparent cursor-pointer text-left"
          title={`${item.name} (Opens in new full-screen tab)`}
        >
          <div className="flex items-center gap-2.5 min-w-0 z-10 pl-1">
            <Icon className="w-4 h-4 shrink-0 stroke-[1.75] transition-colors text-muted group-hover:text-primary" />
            <span className="truncate">{item.name}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {item.shortcut && (
              <kbd className="opacity-0 group-hover:opacity-100 font-mono text-[10px] text-muted transition-opacity">
                {item.shortcut}
              </kbd>
            )}
            <ExternalLink className="w-3 h-3 text-muted/60 group-hover:text-muted transition-colors" />
          </div>
        </button>
      );
    }

    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={onMobileClose}
        className={cn(
          "group flex items-center justify-between px-2.5 py-1.5 rounded-md text-caption transition-colors duration-150 outline-none select-none relative",
          isActive 
            ? "text-primary font-medium bg-surface-hover border border-border" 
            : "text-secondary hover:text-primary hover:bg-surface-hover border border-transparent"
        )}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-4 bg-accent rounded-r" />
        )}
        <div className="flex items-center gap-2.5 min-w-0 z-10 pl-1">
          <Icon className={cn(
            "w-4 h-4 shrink-0 stroke-[1.75] transition-colors",
            isActive ? "text-accent" : "text-muted group-hover:text-primary"
          )} />
          <span className="truncate">{item.name}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {badgeVal !== null && badgeVal > 0 && (
            <span className={cn(
              "px-1.5 py-0.2 rounded font-mono text-badge leading-tight border transition-colors",
              isActive 
                ? "bg-accent-tint text-accent border-accent/20 font-semibold" 
                : "bg-surface-hover text-muted border-border/80 group-hover:text-secondary"
            )}>
              {badgeVal}
            </span>
          )}
          {item.shortcut && (
            <kbd className="opacity-0 group-hover:opacity-100 transition-opacity">
              {item.shortcut}
            </kbd>
          )}
        </div>
      </Link>
    );
  };

 const sidebarContent = (
 <div className="w-[260px] lg:w-[280px] border-r border-border bg-surface flex flex-col h-full flex-shrink-0 select-none shadow-level-1 z-10">
 {/* Header / Brand */}
 <div className="h-13 flex items-center justify-between px-4 border-b border-border bg-surface">
      <Link to="/app/" className="hover:opacity-90 transition-opacity">
        <KramaLogo size="sm" withText textClassName="font-semibold tracking-tight text-primary text-body leading-none block" />
      </Link>
      <div className="flex items-center gap-1">
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden md:inline-flex p-1.5 rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-colors outline-none cursor-pointer border border-transparent"
            title="Collapse sidebar (Ctrl+\)"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
        <NotificationCenter />
        <div className="relative" ref={settingsRef}>
        <button
          onClick={() => setSettingsOpen((prev) => !prev)}
          className={cn(
            "min-h-11 min-w-11 flex items-center justify-center rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent cursor-pointer border border-transparent",
            settingsOpen && "text-primary bg-surface-hover border-border"
          )}
          title="Settings & Preferences"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {settingsOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-border rounded-lg shadow-level-2 z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
            {/* Profile Details */}
            <div className="p-2.5 rounded-md bg-surface-hover/70 border border-border/80 mb-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <User className="w-3 h-3 text-accent" />
                  <span>Profile Details</span>
                </span>
                <span className="text-badge font-mono text-muted bg-surface px-1.5 py-0.2 rounded border border-border">
                  PRO
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-accent-tint border border-accent/20 flex items-center justify-center text-accent font-mono font-semibold text-caption shrink-0">
                  {user?.name ? user.name.substring(0, 2).toUpperCase() : 'ME'}
                </div>
                <div className="min-w-0">
                  <div className="text-caption font-semibold text-primary truncate leading-tight">
                    {user?.name || 'User'}
                  </div>
                  <div className="text-badge text-muted font-mono truncate leading-tight mt-0.5">
                    {user?.email || 'user@krama.os'}
                  </div>
                  <div className="text-badge text-muted font-mono flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                    <span>Focused</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-caption text-secondary hover:text-primary hover:bg-surface-hover transition-colors group cursor-pointer"
              title="Toggle Theme"
            >
              <span className="flex items-center gap-2">
                {resolvedTheme === 'dark' ? (
                  <Sun className="w-3.5 h-3.5 text-warning" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-muted group-hover:text-primary" />
                )}
                <span>{resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </span>
              <span className="text-badge font-mono text-muted uppercase">
                {resolvedTheme === 'dark' ? 'Light' : 'Dark'}
              </span>
            </button>

            <button
              onClick={() => {
                setSettingsOpen(false);
                handleExport();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-caption text-secondary hover:text-primary hover:bg-surface-hover transition-colors group cursor-pointer"
              disabled={!canExport}
              title={canExport ? "Export all workspace data as JSON" : "Workspace owner access is required for a full backup"}
            >
              <span className="flex items-center gap-2">
                <Download className="w-3.5 h-3.5 text-muted group-hover:text-primary transition-colors" />
                <span>Export Data</span>
              </span>
              <span className="text-badge font-mono text-muted">JSON</span>
            </button>

            <button type="button" onClick={() => { setSettingsOpen(false); onMobileClose?.(); setPasswordOpen(true); }}
              className="w-full flex items-center gap-2 px-2.5 min-h-11 rounded-md text-caption text-secondary hover:text-primary hover:bg-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
              <KeyRound aria-hidden="true" className="w-3.5 h-3.5" /> Change password
            </button>
            <div className="my-1 border-t border-border/80" />

            <button
              onClick={() => {
                setSettingsOpen(false);
                logout();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-caption text-secondary hover:text-error hover:bg-error-tint transition-colors group cursor-pointer"
              title="Sign out"
            >
              <span className="flex items-center gap-2">
                <LogOut className="w-3.5 h-3.5 text-muted group-hover:text-error transition-colors" />
                <span>Sign Out</span>
              </span>
            </button>
          </div>
        )}
      </div>
      {mobileOpen && <button type="button" onClick={onMobileClose} aria-label="Close navigation" className="md:hidden min-h-11 min-w-11 flex items-center justify-center rounded-md text-secondary hover:text-primary hover:bg-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"><X aria-hidden="true" className="w-4 h-4" /></button>}
      </div>
  </div>

  {/* Workspace Switcher */}
  <div className="px-3 py-2 border-b border-border bg-surface/50">
    <WorkspaceSwitcher />
  </div>

  {/* Search / Command Palette Trigger */}
 <div className="p-3 border-b border-border bg-surface">
 <button 
 onClick={() => {
 onMobileClose?.();
 window.dispatchEvent(new CustomEvent('open-cmdk'));
 }}
 className="w-full flex items-center justify-between px-2.5 py-1.5 text-caption text-secondary bg-surface border border-border rounded-md hover:border-border-strong hover:text-primary transition-colors outline-none cursor-pointer group"
 >
 <div className="flex items-center gap-2">
 <Search className="w-3.5 h-3.5 text-muted group-hover:text-primary transition-colors" />
 <span className="font-normal">Search or jump to...</span>
 </div>
 <kbd>⌘K</kbd>
 </button>
 </div>

 {/* Navigation Sections */}
 <div className="flex-1 overflow-y-auto p-3 space-y-5">
 {/* 1. Overview */}
 <div>
 <div className="text-badge font-mono font-semibold text-muted uppercase tracking-wider mb-1 px-2.5">
 Overview
 </div>
 <div className="space-y-0.5">
 {overviewItems.map(renderLink)}
 </div>
 </div>

 {/* 2. Plan & Execute */}
 <div>
 <div className="text-badge font-mono font-semibold text-muted uppercase tracking-wider mb-1 px-2.5">
 Plan & Execute
 </div>
 <div className="space-y-0.5">
 {planAndExecuteItems.map(renderLink)}
 </div>
 </div>

 {/* 3. Strategy */}
 <div>
 <div className="text-badge font-mono font-semibold text-muted uppercase tracking-wider mb-1 px-2.5">
 Strategy
 </div>
 <div className="space-y-0.5">
 {strategyItems.map(renderLink)}
 </div>
 </div>

 {/* 4. Knowledge */}
 <div>
 <div className="text-badge font-mono font-semibold text-muted uppercase tracking-wider mb-1 px-2.5">
 Knowledge
 </div>
 <div className="space-y-0.5">
 {knowledgeItems.map(renderLink)}
 </div>
 </div>
 </div>
 </div>
 );

 return (
 <>
      <div className={cn(
        "hidden md:block h-full shrink-0 transition-[width,opacity] duration-200 ease-in-out relative overflow-hidden",
        isCollapsed ? "w-0 opacity-0 pointer-events-none" : "w-[260px] lg:w-[280px] opacity-100"
      )}>
        {sidebarContent}
      </div>

 {mobileOpen && (
 <div ref={mobileDialogRef} role="dialog" aria-modal="true" aria-label="Workspace navigation" className="fixed inset-0 z-[60] md:hidden flex animate-in fade-in duration-150">
 <div onClick={onMobileClose} className="fixed inset-0 bg-black/50 backdrop-blur-2xs" />
 <div className="relative h-full z-10 animate-in slide-in-from-left duration-200">
 {sidebarContent}
 </div>
 </div>
 )}
 {passwordOpen && <PasswordChangeDialog onClose={() => {
   setPasswordOpen(false);
   const trigger = settingsRef.current?.querySelector<HTMLButtonElement>('button');
   if (trigger?.offsetParent !== null && trigger) trigger.focus();
   else document.querySelector<HTMLButtonElement>('button[aria-label="Open navigation"]')?.focus();
 }} />}
 </>
 );
}


function PasswordChangeDialog({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submitting = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const close = () => { if (!submitting.current) onClose(); };
  const dialogRef = useModalA11y(true, close);
  useEffect(() => { if (Object.keys(errors).length) errorRef.current?.focus(); }, [errors]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    const issues: Record<string, string> = {};
    if (!currentPassword) issues.current = 'Enter your current password.';
    if (newPassword.length < 8) issues.new = 'Use at least 8 characters.';
    else if (new TextEncoder().encode(newPassword).length > 72) issues.new = 'Use a shorter password (up to 72 bytes).';
    if (confirmation !== newPassword) issues.confirm = 'New passwords do not match.';
    if (Object.keys(issues).length) { setErrors(issues); return; }
    submitting.current = true; setSaving(true); setErrors({});
    try {
      await api.auth.changePassword({ currentPassword, newPassword });
      setCurrentPassword(''); setNewPassword(''); setConfirmation('');
      toast.success('Password changed. Sign in with your new password.');
      window.dispatchEvent(new Event('krama:logout'));
    } catch (error: any) {
      if (error.status === 401) { toast.error('Session expired. Sign in again.'); window.dispatchEvent(new Event('krama:logout')); }
      else setErrors({ server: error.message || 'Unable to change password. Try again.' });
    } finally { submitting.current = false; setSaving(false); }
  }
  const inputClass = 'w-full min-h-11 rounded-md border border-border bg-surface px-3 text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60';
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="password-title" aria-describedby="password-description"
      className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-xl motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200 motion-reduce:animate-none">
      <h2 id="password-title" className="text-lg font-semibold text-primary">Change password</h2>
      <p id="password-description" className="mt-2 text-sm text-secondary">Choose a new password for your personal account. Changing it signs you out on all devices.</p>
      <form onSubmit={submit} noValidate className="mt-5 space-y-4" aria-busy={saving} data-state={saving ? 'pending' : Object.keys(errors).length ? 'error' : 'idle'}>
        {Object.keys(errors).length > 0 && <div ref={errorRef} tabIndex={-1} role="alert" className="rounded-md bg-error-tint p-3 text-sm text-error">{Object.entries(errors).map(([key, message]) => <p key={key}>{message}</p>)}</div>}
        <div><label htmlFor="current-password" className="mb-1 block text-sm text-primary">Current password</label>
          <input id="current-password" name="currentPassword" type={visible ? 'text' : 'password'} autoComplete="current-password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} disabled={saving} aria-invalid={Boolean(errors.current)} aria-describedby={errors.current ? 'current-password-error' : undefined} className={inputClass} />
          {errors.current && <p id="current-password-error" className="mt-1 text-sm text-error">{errors.current}</p>}</div>
        <div><label htmlFor="new-password" className="mb-1 block text-sm text-primary">New password</label>
          <input id="new-password" name="newPassword" type={visible ? 'text' : 'password'} autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} disabled={saving} aria-invalid={Boolean(errors.new)} aria-describedby="new-password-help new-password-error" className={inputClass} />
          <p id="new-password-help" className="mt-1 text-sm text-secondary">At least 8 characters. Long passphrases and password managers are welcome.</p>
          <p id="new-password-error" className="text-sm text-error">{errors.new}</p></div>
        <div><label htmlFor="confirm-password" className="mb-1 block text-sm text-primary">Confirm new password</label>
          <input id="confirm-password" name="confirmation" type={visible ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={saving} aria-invalid={Boolean(errors.confirm)} aria-describedby={errors.confirm ? 'confirm-password-error' : undefined} className={inputClass} />
          {errors.confirm && <p id="confirm-password-error" className="mt-1 text-sm text-error">{errors.confirm}</p>}</div>
        <button type="button" onClick={() => setVisible(v => !v)} aria-pressed={visible} disabled={saving} className="flex min-h-11 items-center gap-2 text-sm text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">{visible ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}{visible ? 'Hide passwords' : 'Show passwords'}</button>
        <div className="flex flex-wrap justify-end gap-3"><button type="button" disabled={saving} onClick={close} className="min-h-11 rounded-md border border-border px-4 text-sm text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60">Cancel</button>
          <button type="submit" disabled={saving} className="min-h-11 rounded-md bg-accent px-4 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60">{saving ? 'Changing password...' : 'Change password'}</button></div>
      </form>
    </div>
  </div>;
}
