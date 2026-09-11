// UI-only refactor — no data/logic changes
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Save, Brain, Zap, Smile, Play, Pause, RotateCcw, Plus, Sparkles, Clock, Trophy, AlertTriangle, FileText, Activity, AlertCircle, Maximize2, Minimize2, Rocket, Target, Settings, ListTodo, CheckCircle2, Check, ChevronDown, FolderKanban, Moon, Wand2, Sunset, X } from 'lucide-react';
import { BaseButton } from './ui/BaseButton';
import { PageHeader } from './ui/PageHeader';
import { SelectorCard } from './ui/SelectorCard';
import { EmptyStateInline } from './ui/EmptyStateInline';
import { LoadingState } from './ui/LoadingState';
import { DailyNarrativeAssistant } from './ui/DailyNarrativeAssistant';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

const MOOD_OPTIONS = [
 { label: 'Flow State', icon: Sparkles, desc: 'Peak execution velocity' },
 { label: 'Deep Focus', icon: Brain, desc: 'Sustained cognitive immersion' },
 { label: 'Calm & Steady', icon: Activity, desc: 'Nominal operational output' },
 { label: 'Fatigued', icon: Clock, desc: 'Low momentum / evening drift' },
 { label: 'Blocked / Risk', icon: AlertCircle, desc: 'System impediment detected' }
];

const ENERGY_OPTIONS = [
 { label: 'High', bars: 3, desc: 'Ready for architecture & complex refactoring' },
 { label: 'Medium', bars: 2, desc: 'Standard operating throughput' },
 { label: 'Low', bars: 1, desc: 'Recommended for documentation & light reviews' }
];

const getThemes = (prefs?: { sprint?: number, deep?: number, quick?: number }) => [
 { id: 'sprint', label: `${prefs?.sprint || 25}m Focus Sprint`, mins: prefs?.sprint || 25, icon: Rocket, badge: 'Sprint', desc: 'High-intensity Pomodoro sprint for rapid code execution' },
 { id: 'deep', label: `${prefs?.deep || 45}m Deep Work`, mins: prefs?.deep || 45, icon: Brain, badge: 'Deep', desc: 'Sustained focus for complex architecture & refactoring' },
 { id: 'quick', label: `${prefs?.quick || 15}m Quick Pulse`, mins: prefs?.quick || 15, icon: Zap, badge: 'Quick', desc: 'Short maintenance burst, PR reviews, and bug squashing' },
 { id: 'stopwatch', label: 'Open Stopwatch', mins: 0, icon: Clock, badge: 'Open', desc: 'Count up indefinitely without time constraints' },
 { id: 'custom', label: 'Custom Timer', mins: -1, icon: Settings, badge: 'Custom', desc: 'Ad-hoc configurable minute target' }
];

export function DailyReview() {
 const { user, updateUser } = useAuth();
 const FOCUS_THEMES = getThemes(user?.metadata?.timerPreferences);
 const queryClient = useQueryClient();
 const { data: logs = [], isLoading } = useQuery({ queryKey: ['daily-logs'], queryFn: api.dailyLogs.list });
 const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });
 const { data: issues = [] } = useQuery({ queryKey: ['issues'], queryFn: api.tasks.list });
 const { data: habits = [] } = useQuery({ queryKey: ['habits'], queryFn: api.habits.list });

 const todayLog = logs.find(
 l => new Date(l.date).toLocaleDateString() === new Date().toLocaleDateString()
 );

 const [selectedMood, setSelectedMood] = useState<string>(todayLog?.mood || 'Flow State');
 const [selectedEnergy, setSelectedEnergy] = useState<string>(todayLog?.energy || 'High');
 const [wins, setWins] = useState<string[]>(todayLog?.wins || []);
 const [blockers, setBlockers] = useState<string[]>(todayLog?.blockers || []);
 const [newWin, setNewWin] = useState('');
 const [newBlocker, setNewBlocker] = useState('');
 const [notes, setNotes] = useState(todayLog?.notes || '');
 const [localShutdownComplete, setLocalShutdownComplete] = useState(false);
 const isShutdownComplete = localShutdownComplete || (todayLog?.metadata as any)?.isShutdownComplete || false;
 const [tomorrowPriority, setTomorrowPriority] = useState<string>('');

 // Theme-Based Focus Timer State
 const [timerRunning, setTimerRunning] = useState(false);
 const [secondsElapsed, setSecondsElapsed] = useState<number>(todayLog ? (todayLog.deepWorkMinutes ?? 0) * 60 : 0);
 const [isFullScreenFocus, setIsFullScreenFocus] = useState(false);
 
 const [activeThemeId, setActiveThemeId] = useState<string>('sprint');
 const [customMins, setCustomMins] = useState<any>(30);
 const [showTimerSettings, setShowTimerSettings] = useState(false);
 const [localTimerPrefs, setLocalTimerPrefs] = useState({
 sprint: user?.metadata?.timerPreferences?.sprint || 25,
 deep: user?.metadata?.timerPreferences?.deep || 45,
 quick: user?.metadata?.timerPreferences?.quick || 15
 });

 const [aiDebrief, setAiDebrief] = useState<string | null>(null);

 const analyzeTelemetryMutation = useMutation({
 mutationFn: (data: { mood: string, energy: string, reflection: string, sessionSeconds: number, wins: number }) => api.ai.analyzeTelemetry(data),
 onSuccess: (res: { insight: string }) => {
 setAiDebrief(res.insight);
 setLocalShutdownComplete(true);
 toast.success("AI Sunset Sentinel analysis complete.");
 saveLogMutation.mutate({ aiDebrief: res.insight, isShutdownComplete: true });
 },
 onError: () => toast.error("Failed to generate telemetry insight.")
 });

 const savePrefsMutation = useMutation({
 mutationFn: (prefs: Record<string, number>) => api.auth.updatePreferences({ timerPreferences: prefs }),
 onSuccess: (data) => {
 updateUser(data.user);
 setShowTimerSettings(false);
 toast.success('Timer preferences saved');
 },
 onError: () => toast.error('Failed to save preferences')
 });

 const [focusTask, setFocusTask] = useState<string>(() => {
 const params = new URLSearchParams(window.location.search);
 const paramTask = params.get('focusTask');
 if (paramTask) return paramTask;
 const saved = localStorage.getItem('krama_active_focus_task');
 if (saved && saved !== 'System Architecture & Engineering Execution') return saved;
 return '';
 });

 useEffect(() => {
 if (focusTask && focusTask !== 'System Architecture & Engineering Execution') {
 localStorage.setItem('krama_active_focus_task', focusTask);
 } else {
 localStorage.removeItem('krama_active_focus_task');
 }
 }, [focusTask]);
 const [showTaskDropdown, setShowTaskDropdown] = useState(false);
 const [secondsRemaining, setSecondsRemaining] = useState<number>(25 * 60);
 const [sessionSeconds, setSessionSeconds] = useState<number>(0);

 const activeTheme = FOCUS_THEMES.find(t => t.id === activeThemeId) || FOCUS_THEMES[0];
 const totalThemeSeconds = activeTheme.mins === -1 ? Math.max(1, customMins || 1) * 60 : activeTheme.mins * 60;

 useEffect(() => {
 const handleKeyDown = (e: KeyboardEvent) => {
 if (e.key === 'Escape' && isFullScreenFocus) {
 setIsFullScreenFocus(false);
 }
 };
 window.addEventListener('keydown', handleKeyDown);
 return () => window.removeEventListener('keydown', handleKeyDown);
 }, [isFullScreenFocus]);

 useEffect(() => {
 if (todayLog) {
 if (todayLog.mood) setSelectedMood(todayLog.mood);
 if (todayLog.energy) setSelectedEnergy(todayLog.energy);
 if (todayLog.wins) setWins(todayLog.wins);
 if (todayLog.blockers) setBlockers(todayLog.blockers);
 if (todayLog.notes !== null && todayLog.notes !== undefined) setNotes(todayLog.notes);
 if (todayLog.deepWorkMinutes !== undefined) setSecondsElapsed((todayLog.deepWorkMinutes ?? 0) * 60);
 if ((todayLog.metadata as any)?.aiDebrief) setAiDebrief((todayLog.metadata as any).aiDebrief);
 if ((todayLog.metadata as any)?.tomorrowPriority) setTomorrowPriority((todayLog.metadata as any).tomorrowPriority);
 }
 }, [todayLog]);

 const autoSaveTimerMutation = useMutation({
 mutationFn: (mins: number) => {
 const payload = {
 date: new Date(),
 mood: selectedMood,
 energy: selectedEnergy,
 deepWorkMinutes: mins,
 wins,
 blockers,
 notes
 };
 if (todayLog) {
 return api.dailyLogs.update(todayLog.id, { deepWorkMinutes: mins });
 } else {
 return api.dailyLogs.create(payload);
 }
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['daily-logs'] });
 queryClient.invalidateQueries({ queryKey: ['dailyLogs'] });
 },
 onError: (err: any) => {
 toast.error('Failed to autosave focus timer: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
 }
 });

 const saveLogMutation = useMutation({
 mutationFn: (extraMetadata?: any) => {
 const payload = {
 date: new Date(),
 mood: selectedMood,
 energy: selectedEnergy,
 deepWorkMinutes: Math.floor(secondsElapsed / 60),
 wins,
 blockers,
 notes,
 metadata: {
 ...(todayLog?.metadata as object || {}),
 aiDebrief,
 tomorrowPriority,
 isShutdownComplete,
 ...extraMetadata
 }
 };
 if (todayLog) {
 return api.dailyLogs.update(todayLog.id, payload);
 } else {
 return api.dailyLogs.create(payload);
 }
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['daily-logs'] });
 queryClient.invalidateQueries({ queryKey: ['dailyLogs'] });
 toast.success('Daily review log & evening telemetry saved!');
 },
 onError: (err: any) => {
 toast.error('Failed to save daily review: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
 }
 });

 useEffect(() => {
 let interval: any = null;
 if (timerRunning) {
 interval = setInterval(() => {
 setSessionSeconds(prev => prev + 1);
 setSecondsElapsed(prevTotal => {
 const nextTotal = prevTotal + 1;
 if (nextTotal % 60 === 0) {
 autoSaveTimerMutation.mutate(Math.floor(nextTotal / 60));
 }
 return nextTotal;
 });

 if (activeThemeId !== 'stopwatch') {
 setSecondsRemaining(prevRem => {
 if (prevRem <= 1) {
 setTimerRunning(false);
 toast.success(`Completed Focus Session: "${focusTask}"! +${activeTheme.label} added to your daily score.`);
 return totalThemeSeconds;
 }
 return prevRem - 1;
 });
 }
 }, 1000);
 } else {
 clearInterval(interval);
 }
 return () => clearInterval(interval);
 }, [timerRunning, activeThemeId, focusTask, activeTheme, totalThemeSeconds, autoSaveTimerMutation]);

 useEffect(() => {
 if (!isFullScreenFocus) return;
 const handleKeyDown = (e: KeyboardEvent) => {
 if (e.key === 'Escape') {
 setIsFullScreenFocus(false);
 } else if (e.code === 'Space' && (e.target === document.body || (e.target as HTMLElement).tagName !== 'INPUT')) {
 e.preventDefault();
 setTimerRunning(prev => !prev);
 }
 };
 window.addEventListener('keydown', handleKeyDown);
 return () => window.removeEventListener('keydown', handleKeyDown);
 }, [isFullScreenFocus]);

 const handleSelectTheme = (themeId: string) => {
 setActiveThemeId(themeId);
 setTimerRunning(false);
 setSessionSeconds(0);
 const t = FOCUS_THEMES.find(th => th.id === themeId);
 if (t) {
 if (t.mins === -1) {
 setSecondsRemaining(Math.max(1, customMins || 1) * 60);
 } else if (t.mins === 0) {
 setSecondsRemaining(0);
 } else {
 setSecondsRemaining(t.mins * 60);
 }
 }
 };

 const handleCustomMinsChange = (val: number) => {
 setCustomMins(val);
 if (!timerRunning && activeThemeId === 'custom') {
 setSecondsRemaining(val * 60);
 }
 };

 const handleCompleteSessionEarly = () => {
 setTimerRunning(false);
 const minsLogged = Math.max(1, Math.floor(sessionSeconds / 60));
 toast.success(`Completed "${focusTask}" early! Banked ${minsLogged}m of deep work.`);
 setSessionSeconds(0);
 setSecondsRemaining(totalThemeSeconds);
 autoSaveTimerMutation.mutate(Math.floor(secondsElapsed / 60));
 };

 const handleResetTimer = () => {
 setTimerRunning(false);
 setSessionSeconds(0);
 setSecondsRemaining(totalThemeSeconds);
 toast.info('Session timer reset.');
 };

 const handleEveningShutdown = () => {
 if (!selectedMood || !selectedEnergy || !notes.trim()) {
 toast.error("Please log your mood, energy, and notes first!");
 return;
 }
 analyzeTelemetryMutation.mutate({ mood: selectedMood, energy: selectedEnergy, reflection: notes, sessionSeconds: secondsElapsed, wins: wins.length });
 };

 if (isLoading) return <LoadingState variant="default" title="Loading Daily Review" description="Syncing your habits and logs..." />;

 const formatTimer = (secs: number) => {
 const hrs = Math.floor(secs / 3600);
 const mins = Math.floor((secs % 3600) / 60);
 const s = secs % 60;
 if (hrs > 0) {
 return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
 }
 return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
 };

 const displayTime = activeThemeId === 'stopwatch' ? formatTimer(sessionSeconds) : formatTimer(secondsRemaining);
 const progressPercent = activeThemeId === 'stopwatch' ? 100 : Math.max(0, Math.min(100, ((totalThemeSeconds - secondsRemaining) / totalThemeSeconds) * 100));

 const addWin = () => {
 if (!newWin.trim()) return;
 setWins([...wins, newWin.trim()]);
 setNewWin('');
 };

 const addBlocker = () => {
 if (!newBlocker.trim()) return;
 setBlockers([...blockers, newBlocker.trim()]);
 setNewBlocker('');
 };

 const completedTodayDirectives = issues.filter(i => {
 if (i.status !== 'DONE') return false;
 const taskDate = new Date(i.updatedAt).toLocaleDateString();
 const todayDate = new Date().toLocaleDateString();
 return taskDate === todayDate;
 });

 return (
 <div className="p-6 md:p-8 max-w-5xl mx-auto w-full bg-canvas min-h-full animate-in fade-in duration-150 pb-24 font-sans text-primary">
 {/* Full-Screen Immersive Focus Mode overlay */}
 {isFullScreenFocus && (
 <div className="fixed inset-0 z-[100] flex flex-col justify-between bg-canvas text-primary animate-in fade-in duration-200 p-6 sm:p-10 select-none font-sans">
 {/* Top Bar */}
 <div className="flex items-center justify-between w-full max-w-5xl mx-auto">
 <div className="flex items-center gap-2.5 text-secondary font-mono text-caption">
 <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
 <span className="text-primary font-semibold tracking-wider uppercase">Krama</span>
 <span className="text-muted">/</span>
 <span className="text-secondary uppercase tracking-wider">Focus Immersion</span>
 </div>

 <button
 type="button"
 onClick={() => setIsFullScreenFocus(false)}
 className="px-3.5 py-1.5 rounded-lg bg-surface hover:bg-surface-hover text-secondary hover:text-primary text-caption font-mono flex items-center gap-2 border border-border transition-colors cursor-pointer shadow-2xs"
 title="Exit Full-Screen Focus Mode (Esc)"
 >
 <Minimize2 className="w-3.5 h-3.5 stroke-[1.75]" />
 <span>Exit Fullscreen</span>
 <kbd className="px-1.5 py-0.5 rounded bg-surface-hover text-badge text-secondary font-mono border border-border">Esc</kbd>
 </button>
 </div>

 {/* Center Stage */}
 <div className="flex flex-col items-center max-w-2xl w-full mx-auto text-center my-auto">
 {/* Theme Badge & Status */}
 <div className="flex items-center gap-2.5 mb-5 font-mono">
 <span className="px-3 py-1 rounded-md bg-surface border border-border text-secondary text-badge font-semibold uppercase tracking-wider shadow-2xs">
 {activeTheme.badge}
 </span>
 <span className={cn(
 "px-3 py-1 rounded-md text-badge font-semibold uppercase tracking-wider flex items-center gap-1.5 border font-mono shadow-2xs",
 timerRunning
 ? "bg-accent-tint text-accent border-accent/20"
 : "bg-surface text-secondary border-border"
 )}>
 <span className={cn("w-1.5 h-1.5 rounded-full", timerRunning ? "bg-accent animate-ping" : "bg-muted")} />
 {timerRunning ? "Active Session" : "Paused"}
 </span>
 </div>

 {/* Target Task Pill (only if set) */}
 {focusTask.trim() ? (
 <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-surface border border-border max-w-xl truncate mb-8 shadow-2xs">
 <Target className="w-4 h-4 text-accent shrink-0 stroke-[1.75]" />
 <span className="text-body font-medium text-primary truncate font-sans">{focusTask}</span>
 </div>
 ) : (
 <div className="mb-6" />
 )}

 {/* Monumental Display Timer */}
 <h1 className="text-7xl sm:text-8xl md:text-9xl font-mono font-bold tracking-tight text-primary mb-6 tabular-nums select-none leading-none">
 {displayTime}
 </h1>

 {/* Elapsed track */}
 <div className="w-72 max-w-full h-1.5 bg-surface-hover border border-border rounded-full overflow-hidden mb-8">
 <div
 className="h-full bg-accent transition-all duration-1000 ease-linear rounded-full"
 style={{ width: `${progressPercent}%` }}
 />
 </div>

 {/* Controls Bar */}
 <div className="flex items-center gap-3">
 <button
 type="button"
 onClick={handleResetTimer}
 className="w-11 h-11 rounded-xl bg-surface hover:bg-surface-hover text-secondary hover:text-primary border border-border flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
 title="Reset Session"
 >
 <RotateCcw className="w-4 h-4 stroke-[1.75]" />
 </button>

 <button
 type="button"
 onClick={() => {
 const nextRunning = !timerRunning;
 setTimerRunning(nextRunning);
 if (!nextRunning && sessionSeconds > 0) {
 autoSaveTimerMutation.mutate(Math.floor(secondsElapsed / 60));
 toast.info(`Paused focus session at ${displayTime}`);
 } else {
 toast.success('Resumed deep work focus');
 }
 }}
 className={cn(
 "px-8 py-3 rounded-xl font-mono text-body font-semibold flex items-center gap-2.5 transition-colors cursor-pointer shadow-2xs",
 timerRunning
 ? "bg-surface hover:bg-surface-hover text-primary border border-border"
 : "bg-accent hover:bg-accent-hover text-white"
 )}
 >
 {timerRunning ? (
 <>
 <Pause className="w-4 h-4 stroke-[2]" /> Pause Session
 </>
 ) : (
 <>
 <Play className="w-4 h-4 fill-current stroke-none ml-0.5" /> Resume Focus
 </>
 )}
 </button>

 {sessionSeconds > 0 && (
 <button
 type="button"
 onClick={() => {
 handleCompleteSessionEarly();
 setIsFullScreenFocus(false);
 }}
 className="px-5 py-3 rounded-xl bg-accent-tint hover:bg-accent/15 text-accent border border-accent/30 font-mono text-caption font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
 >
 <CheckCircle2 className="w-4 h-4 stroke-[2]" /> Bank & Finish
 </button>
 )}
 </div>
 </div>

 {/* Bottom Keyboard Shortcuts Bar */}
 <div className="flex items-center justify-center gap-3 text-caption font-mono text-secondary max-w-5xl mx-auto w-full pt-4">
 <span>Press <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-primary font-mono text-badge shadow-2xs">Space</kbd> to {timerRunning ? "pause" : "resume"}</span>
 <span>•</span>
 <span>Press <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-primary font-mono text-badge shadow-2xs">Esc</kbd> to exit fullscreen</span>
 </div>
 </div>
 )}
 
 {/* PageHeader with completion stat pill */}
 <PageHeader
 icon={Sunset}
 iconColorClass="bg-accent/10 text-accent border-accent/20"
 title="Daily Review"
 description="Calibrated evening review, deep work Pomodoro logs, and 1-click shutdown."
 statPill={{
 icon: Sparkles,
 label: `${[secondsElapsed > 0, !!selectedMood, !!selectedEnergy, wins.length > 0, notes.trim().length > 0].filter(Boolean).length} of 5 complete`,
 colorClass: "bg-accent-tint text-accent border-accent/20"
 }}
 primaryAction={{
 label: saveLogMutation.isPending ? 'Saving...' : 'Save Review',
 icon: Save,
 onClick: () => saveLogMutation.mutate({}),
 disabled: saveLogMutation.isPending
 }}
 className="mb-6"
 >
 <span className="text-caption font-mono font-medium text-secondary bg-surface px-3 py-1.5 rounded-lg border border-border shadow-2xs">
 {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
 </span>
 </PageHeader>

 {/* AI Narrative Assistant (Collapsible Copilot) */}
 <DailyNarrativeAssistant />

 <fieldset disabled={isShutdownComplete} className="contents">
 {/* THEME-BASED FOCUS TIMER & DEEP WORK DECK */}
 <div className="rounded-xl border border-border bg-surface p-5 sm:p-6 mb-8 shadow-2xs space-y-6">
 {/* Header Strip */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-lg bg-surface-hover border border-border flex items-center justify-center text-primary shrink-0">
 <Brain className="w-4 h-4 stroke-[1.75]" />
 </div>
 <div>
 <div className="flex items-center gap-2">
 <h2 className="text-body font-semibold text-primary">Focus Timer</h2>
 <span className="text-badge font-mono font-medium px-2 py-0.5 rounded bg-surface-hover text-secondary border border-border uppercase">
 {activeTheme.badge}
 </span>
 <span className={cn(
 "w-2 h-2 rounded-full transition-colors",
 timerRunning ? "bg-success-tint animate-pulse" : "bg-muted"
 )} />
 </div>
 <p className="text-caption text-secondary mt-0.5">
 Execute with timed sprints or open stopwatches. Time automatically banks into your daily telemetry.
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2.5 self-start sm:self-auto">
 <div className="bg-surface-hover border border-border px-3 py-1.5 rounded-lg flex items-center gap-2 text-primary text-caption font-mono font-medium shadow-2xs">
 <Trophy className="w-3.5 h-3.5 text-accent stroke-[1.75]" />
 <span>Banked Today: <strong className="font-semibold">{Math.floor(secondsElapsed / 3600)}h {Math.floor((secondsElapsed % 3600) / 60)}m</strong></span>
 </div>
 <button 
 type="button"
 onClick={() => setIsFullScreenFocus(true)} 
 className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-secondary hover:text-primary text-caption font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
 title="Open Fullscreen Focus Mode (Esc to exit)"
 >
 <Maximize2 className="w-3.5 h-3.5 stroke-[1.75]" />
 <span>Fullscreen</span>
 </button>
 </div>
 </div>

 {/* Target Task Selection Bar */}
 <div className="bg-surface-hover/70 border border-border rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative">
 <div className="flex items-center gap-2.5 flex-1 min-w-0">
 <Target className={cn(
 "w-4 h-4 shrink-0 stroke-[1.75]",
 focusTask ? "text-accent" : "text-secondary"
 )} />
 <span className="text-caption font-mono font-semibold text-secondary uppercase tracking-wider shrink-0">
 Focusing On:
 </span>
 <input 
 type="text"
 value={focusTask}
 onChange={(e) => setFocusTask(e.target.value)}
 placeholder="What are you executing right now? (e.g. Review PR, Write tests...)"
 className="flex-1 bg-transparent border-none text-body text-primary font-medium focus:outline-none placeholder:text-muted min-w-0 font-sans"
 />
 </div>

 <div className="relative shrink-0">
 <button
 type="button"
 onClick={() => setShowTaskDropdown(!showTaskDropdown)}
 className="px-3 py-1.5 bg-surface hover:bg-surface-hover text-secondary hover:text-primary border border-border rounded-lg text-caption font-mono font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
 >
 <ListTodo className="w-3.5 h-3.5 stroke-[1.75]" />
 <span>Select Task</span>
 <ChevronDown className="w-3 h-3 ml-0.5 stroke-[1.75]" />
 </button>

 {showTaskDropdown && (
 <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-border bg-surface shadow-level-3 p-2 z-30 max-h-64 overflow-y-auto space-y-1 text-left animate-in fade-in zoom-in-95 duration-150 font-sans">
 <div className="text-badge font-mono uppercase font-semibold text-secondary px-2 py-1 border-b border-border">Active Issues & Habits</div>
 {issues.map(issue => (
 <button
 key={issue.id}
 type="button"
 onClick={() => {
 setFocusTask(`[Issue] ${issue.title}`);
 setShowTaskDropdown(false);
 toast.info(`Target set: ${issue.title}`);
 }}
 className="w-full text-left px-2.5 py-1.5 rounded-lg text-caption text-primary hover:bg-surface-hover truncate transition-colors flex items-center gap-2 cursor-pointer font-medium"
 >
 <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" /> {issue.title}
 </button>
 ))}
 {habits.map(habit => (
 <button
 key={habit.id}
 type="button"
 onClick={() => {
 setFocusTask(`[Habit] ${habit.name}`);
 setShowTaskDropdown(false);
 toast.info(`Target set: ${habit.name}`);
 }}
 className="w-full text-left px-2.5 py-1.5 rounded-lg text-caption text-primary hover:bg-surface-hover truncate transition-colors flex items-center gap-2 cursor-pointer font-medium"
 >
 <span className="w-1.5 h-1.5 rounded-full bg-success-tint shrink-0" /> {habit.name}
 </button>
 ))}
 {projects.map(proj => (
 <button
 key={proj.id}
 type="button"
 onClick={() => {
 setFocusTask(`[Project] ${proj.name}`);
 setShowTaskDropdown(false);
 toast.info(`Target set: ${proj.name}`);
 }}
 className="w-full text-left px-2.5 py-1.5 rounded-lg text-caption text-primary hover:bg-surface-hover truncate transition-colors flex items-center gap-2 cursor-pointer font-medium"
 >
 <FolderKanban className="w-3.5 h-3.5 text-secondary shrink-0 stroke-[1.75]" /> {proj.name}
 </button>
 ))}
 {issues.length === 0 && habits.length === 0 && projects.length === 0 && (
 <div className="text-caption text-muted px-2 py-2 italic text-center font-mono">No active tasks found. Type above!</div>
 )}
 </div>
 )}
 </div>
 </div>

 {/* Theme Selection Grid */}
 <div className="space-y-2.5">
 <div className="flex items-center justify-between">
 <span className="text-badge font-mono font-bold text-secondary uppercase tracking-wider">
 Focus Mode
 </span>
 <button
 type="button"
 onClick={() => setShowTimerSettings(!showTimerSettings)}
 className="p-1 rounded-md hover:bg-surface-hover text-secondary hover:text-primary transition-colors cursor-pointer"
 title="Timer Preferences"
 >
 <Settings className="w-3.5 h-3.5 stroke-[1.75]" />
 </button>
 </div>

 {showTimerSettings && (
 <div className="p-4 rounded-xl border border-border bg-surface-hover/50 mb-4 flex flex-col gap-3">
 <h4 className="text-body font-semibold text-primary">Timer Preferences</h4>
 <div className="grid grid-cols-3 gap-4">
 <div>
 <label className="text-caption text-secondary block mb-1 font-mono">Sprint (m)</label>
 <input 
 type="number" 
 value={localTimerPrefs.sprint} 
 onChange={e => setLocalTimerPrefs(prev => ({...prev, sprint: parseInt(e.target.value) || 25}))}
 className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-primary text-caption font-mono"
 />
 </div>
 <div>
 <label className="text-caption text-secondary block mb-1 font-mono">Deep Work (m)</label>
 <input 
 type="number" 
 value={localTimerPrefs.deep} 
 onChange={e => setLocalTimerPrefs(prev => ({...prev, deep: parseInt(e.target.value) || 45}))}
 className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-primary text-caption font-mono"
 />
 </div>
 <div>
 <label className="text-caption text-secondary block mb-1 font-mono">Quick (m)</label>
 <input 
 type="number" 
 value={localTimerPrefs.quick} 
 onChange={e => setLocalTimerPrefs(prev => ({...prev, quick: parseInt(e.target.value) || 15}))}
 className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-primary text-caption font-mono"
 />
 </div>
 </div>
 <div className="flex justify-end mt-1">
 <BaseButton 
 variant="primary" 
 size="sm" 
 onClick={() => savePrefsMutation.mutate(localTimerPrefs)}
 isLoading={savePrefsMutation.isPending}
 >
 Save Preferences
 </BaseButton>
 </div>
 </div>
 )}

 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
 {FOCUS_THEMES.map((t) => {
 const isSelected = activeThemeId === t.id;
 return (
 <SelectorCard
 key={t.id}
 selected={isSelected}
 onClick={() => handleSelectTheme(t.id)}
 icon={t.icon}
 title={t.label}
 description={t.desc}
 badge={t.mins === -1 ? `${Math.max(1, customMins || 1)}m` : t.mins === 0 ? '∞' : `${t.mins}m`}
 />
 );
 })}
 </div>

 {activeThemeId === 'custom' && (
 <div className="flex items-center gap-3 pt-2 animate-in fade-in duration-150 font-mono text-caption">
 <span className="text-secondary font-medium">Custom Target Minutes:</span>
 <input
 type="number"
 min={1}
 max={480}
 value={customMins || ''}
 onChange={(e) => {
 const val = e.target.value;
 if (val === '') {
 setCustomMins(0 as any);
 } else {
 handleCustomMinsChange(parseInt(val) || 1);
 }
 }}
 className="w-20 px-2.5 py-1 bg-surface border border-border rounded-lg text-body text-primary font-bold text-center focus:outline-none focus:border-accent"
 />
 <span className="text-secondary font-sans">minutes ({Math.max(1, customMins || 1) * 60}s target)</span>
 </div>
 )}
 </div>

 {/* Timer Display & Playback Deck */}
 <div className="rounded-xl border border-border bg-surface-hover/40 p-6 sm:p-8 flex flex-col items-center justify-center text-center relative">
 <div className="text-badge font-mono uppercase tracking-widest text-accent font-semibold mb-2 flex items-center gap-1.5">
 <Clock className="w-3 h-3 stroke-[2]" />
 <span>{activeTheme.label}</span>
 {focusTask && <span className="text-secondary font-normal truncate max-w-xs">• {focusTask}</span>}
 </div>

 <div className="text-6xl sm:text-7xl font-mono font-bold tracking-tight text-primary tabular-nums select-none mb-3 leading-none">
 {displayTime}
 </div>

 {/* Minimal Progress Rail */}
 <div className="w-full max-w-md h-1.5 bg-surface-hover border border-border rounded-full overflow-hidden mb-6">
 <div
 className="h-full bg-accent transition-all duration-1000 ease-linear rounded-full"
 style={{ width: `${progressPercent}%` }}
 />
 </div>

 {/* Controls Bar */}
 <div className="flex items-center gap-3">
 <button
 type="button"
 onClick={handleResetTimer}
 className="w-10 h-10 rounded-lg border border-border bg-surface hover:bg-surface-hover text-secondary hover:text-primary flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
 title="Reset Session Timer"
 >
 <RotateCcw className="w-4 h-4 stroke-[1.75]" />
 </button>

 <button
 type="button"
 onClick={() => {
 const nextRunning = !timerRunning;
 setTimerRunning(nextRunning);
 if (nextRunning) {
 toast.success(`Started ${activeTheme.label}`);
 } else if (!nextRunning && sessionSeconds > 0) {
 autoSaveTimerMutation.mutate(Math.floor(secondsElapsed / 60));
 toast.info(`Paused focus session at ${displayTime}`);
 }
 }}
 className={cn(
 "px-6 py-2.5 rounded-lg font-medium text-body flex items-center gap-2 transition-colors cursor-pointer shadow-2xs font-mono",
 timerRunning
 ? "bg-surface hover:bg-surface-hover text-primary border border-border"
 : "bg-accent hover:bg-accent-hover text-white"
 )}
 >
 {timerRunning ? (
 <>
 <Pause className="w-4 h-4 stroke-[2]" /> Pause
 </>
 ) : (
 <>
 <Play className="w-4 h-4 fill-current stroke-none" /> Resume Focus
 </>
 )}
 </button>

 {sessionSeconds > 0 && (
 <button
 type="button"
 onClick={handleCompleteSessionEarly}
 className="px-4 py-2.5 rounded-lg border border-accent/30 bg-accent-tint hover:bg-accent/15 text-accent font-medium text-caption flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs font-mono"
 title="Bank deep work time and complete early"
 >
 <CheckCircle2 className="w-4 h-4 stroke-[2]" /> Bank & Finish
 </button>
 )}
 </div>

 <div className="text-caption font-mono text-muted mt-4">
 Session runtime: <strong className="text-primary font-semibold">{Math.floor(sessionSeconds / 60)}m {sessionSeconds % 60}s</strong>
 </div>
 </div>
 </div>

 {/* SYMMETRICAL MOOD & ENERGY CALIBRATION */}
 <div className="space-y-6 mb-8">
 {/* Mood Selector (5 items in 5 cols) */}
 <div className="space-y-3">
 <div>
 <h3 className="text-section font-semibold text-primary flex items-center gap-2">
 <Smile className="w-4 h-4 text-secondary stroke-[1.75]" /> Calibrate Mood
 </h3>
 <p className="text-caption text-secondary mt-0.5">Log cognitive flow state and momentum for today's review telemetry.</p>
 </div>
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
 {MOOD_OPTIONS.map((opt) => {
 const isSelected = selectedMood.toLowerCase() === opt.label.toLowerCase();
 return (
 <SelectorCard
 key={opt.label}
 selected={isSelected}
 onClick={() => setSelectedMood(opt.label)}
 icon={opt.icon}
 title={opt.label}
 description={opt.desc}
 />
 );
 })}
 </div>
 </div>

 {/* Energy Selector (3 items in 3 cols) */}
 <div className="space-y-3">
 <div>
 <h3 className="text-section font-semibold text-primary flex items-center gap-2">
 <Zap className="w-4 h-4 text-secondary stroke-[1.75]" /> Calibrate Energy Level
 </h3>
 <p className="text-caption text-secondary mt-0.5">Tune operational capacity and work allocation for tomorrow.</p>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 {ENERGY_OPTIONS.map((opt) => {
 const isSelected = selectedEnergy.toLowerCase() === opt.label.toLowerCase();
 return (
 <SelectorCard
 key={opt.label}
 selected={isSelected}
 onClick={() => setSelectedEnergy(opt.label)}
 icon={Zap}
 title={`${opt.label} Energy`}
 description={opt.desc}
 badge={`${opt.bars}/3`}
 />
 );
 })}
 </div>
 </div>
 </div>

      {/* AUTO-PULLED COMPLETED DIRECTIVES FOR TODAY */}
      {completedTodayDirectives.length > 0 && (
        <div className="mb-6 p-4 rounded-xl border border-border bg-surface shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#109868] stroke-[1.75]" />
              <h4 className="text-caption font-mono uppercase font-bold text-primary tracking-wider">
                Directives Delivered Today ({completedTodayDirectives.length})
              </h4>
            </div>
            <span className="text-[11px] font-mono text-secondary">
              Auto-synced from Execution Board & Operations
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {completedTodayDirectives.map((task) => {
              const taskProject = projects.find(p => p.id === task.projectId);
              const prefix = taskProject ? `[${taskProject.name}] ` : '[Operations] ';
              const isAlreadyInWins = wins.some(w => w.includes(task.title));

              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 bg-surface-hover/50 hover:bg-surface-hover transition-colors gap-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 uppercase border",
                      taskProject 
                        ? "bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20" 
                        : "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20"
                    )}>
                      {taskProject ? `📁 ${taskProject.name}` : '⚡ Operations'}
                    </span>
                    <span className="text-caption font-medium text-primary truncate">
                      {task.title}
                    </span>
                  </div>

                  {isAlreadyInWins ? (
                    <span className="text-[11px] font-mono text-[#109868] font-bold flex items-center gap-1 shrink-0">
                      <Check className="w-3 h-3 stroke-[2.5]" /> Logged
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const winText = `${prefix}${task.title}`;
                        setWins([...wins, winText]);
                        toast.success(`Logged "${task.title}" to wins!`);
                      }}
                      className="px-2 py-1 rounded bg-accent/10 hover:bg-accent/20 text-accent font-mono text-[11px] font-bold transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add to Wins
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

 {/* WINS & BLOCKERS SIDE-BY-SIDE */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 items-start">
 {/* Wins */}
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <h3 className="text-section font-semibold text-primary flex items-center gap-2">
 <Trophy className="w-4 h-4 text-secondary stroke-[1.75]" /> Today's Wins
 </h3>
 <span className="text-caption font-mono font-medium text-secondary bg-surface-hover px-2 py-0.5 rounded border border-border">
 {wins.length} logged
 </span>
 </div>
 <div className="rounded-xl border border-border bg-surface p-5 min-h-[190px] flex flex-col justify-between gap-4 shadow-2xs">
 {wins.length === 0 ? (
 <EmptyStateInline
 icon={Trophy}
 title="No wins recorded yet"
 description="Add key engineering milestones, shipped PRs, or problem breakthroughs."
 />
 ) : (
 <div className="space-y-2">
 {wins.map((win, i) => (
 <div key={i} className="flex items-center justify-between gap-2.5 p-2.5 rounded-lg bg-surface-hover/60 border border-border/70 group hover:border-border transition-colors">
 <span className="text-body font-medium text-primary flex items-center gap-2.5 min-w-0 truncate">
 <span className="w-2 h-2 rounded-full bg-success-tint shrink-0" />
 <span className="truncate">{win}</span>
 </span>
 <button 
 type="button"
 onClick={() => setWins(wins.filter((_, idx) => idx !== i))}
 className="w-6 h-6 rounded flex items-center justify-center text-muted hover:text-error hover:bg-error-tint opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
 title="Remove win"
 >
 <X className="w-3.5 h-3.5 stroke-[2]" />
 </button>
 </div>
 ))}
 </div>
 )}

 <div className="flex gap-2 pt-3 border-t border-border/70">
 <input
 type="text"
 value={newWin}
 onChange={(e) => setNewWin(e.target.value)}
 onKeyDown={(e) => e.key === 'Enter' && addWin()}
 placeholder="Add an engineering win or milestone..."
 className="flex-1 px-3 py-2 text-caption bg-surface-hover/60 border border-border rounded-lg focus:outline-none focus:border-accent focus:bg-surface focus:ring-1 focus:ring-accent/20 text-primary font-medium placeholder:text-muted font-sans"
 />
 <button 
 type="button"
 onClick={addWin} 
 className="px-3.5 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-caption font-medium transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
 >
 <Plus className="w-3.5 h-3.5 stroke-[2]" /> Add
 </button>
 </div>
 </div>
 </div>

 {/* Blockers */}
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <h3 className="text-section font-semibold text-primary flex items-center gap-2">
 <AlertTriangle className="w-4 h-4 text-secondary stroke-[1.75]" /> Blockers & Risks
 </h3>
 <span className="text-caption font-mono font-medium text-secondary bg-surface-hover px-2 py-0.5 rounded border border-border">
 {blockers.length} logged
 </span>
 </div>
 <div className="rounded-xl border border-border bg-surface p-5 min-h-[190px] flex flex-col justify-between gap-4 shadow-2xs">
 {blockers.length === 0 ? (
 <EmptyStateInline
 icon={AlertTriangle}
 title="No blockers logged"
 description="Note down obstacles, unexpected bugs, or technical debt."
 />
 ) : (
 <div className="space-y-2">
 {blockers.map((blocker, i) => (
 <div key={i} className="flex items-center justify-between gap-2.5 p-2.5 rounded-lg bg-surface-hover/60 border border-border/70 group hover:border-border transition-colors">
 <span className="text-body font-medium text-primary flex items-center gap-2.5 min-w-0 truncate">
 <span className="w-2 h-2 rounded-full bg-warning shrink-0" />
 <span className="truncate">{blocker}</span>
 </span>
 <button 
 type="button"
 onClick={() => setBlockers(blockers.filter((_, idx) => idx !== i))}
 className="w-6 h-6 rounded flex items-center justify-center text-muted hover:text-error hover:bg-error-tint opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
 title="Remove blocker"
 >
 <X className="w-3.5 h-3.5 stroke-[2]" />
 </button>
 </div>
 ))}
 </div>
 )}

 <div className="flex gap-2 pt-3 border-t border-border/70">
 <input
 type="text"
 value={newBlocker}
 onChange={(e) => setNewBlocker(e.target.value)}
 onKeyDown={(e) => e.key === 'Enter' && addBlocker()}
 placeholder="Add a blocker, bug, or carryover risk..."
 className="flex-1 px-3 py-2 text-caption bg-surface-hover/60 border border-border rounded-lg focus:outline-none focus:border-accent focus:bg-surface focus:ring-1 focus:ring-accent/20 text-primary font-medium placeholder:text-muted font-sans"
 />
 <button 
 type="button"
 onClick={addBlocker} 
 className="px-3.5 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-caption font-medium transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
 >
 <Plus className="w-3.5 h-3.5 stroke-[2]" /> Add
 </button>
 </div>
 </div>
 </div>
 </div>

 {/* EVENING REFLECTION & NOTES (Notion-grade surface) */}
 <div className="space-y-3 mb-8">
 <div className="flex items-center justify-between">
 <h3 className="text-section font-semibold text-primary flex items-center gap-2">
 <FileText className="w-4 h-4 text-secondary stroke-[1.75]" /> Evening Reflection & Notes
 </h3>
 <span className="text-secondary text-caption font-mono">Supports markdown & technical notes</span>
 </div>
 <div className="rounded-xl border border-border bg-surface p-5 shadow-2xs">
 <textarea 
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 className="w-full bg-transparent min-h-[130px] text-body text-primary focus:outline-none resize-y placeholder:text-muted font-sans leading-relaxed"
 placeholder="Record key reflections, design notes, or carryover architecture tasks for tomorrow morning's execution loop..."
 />
 </div>
 </div>

 {/* AI SUNSET SENTINEL TELEMETRY DEBRIEF */}
 <div className="rounded-xl border border-border bg-surface p-5 mb-8 shadow-2xs flex flex-col md:flex-row items-start justify-between gap-4">
 <div className="flex items-start gap-3.5 flex-1 min-w-0">
 <div className="w-9 h-9 rounded-lg bg-surface-hover border border-border flex items-center justify-center text-primary shrink-0 mt-0.5">
 <Wand2 className="w-4 h-4 stroke-[1.75]" />
 </div>
 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-2 mb-1">
 <h3 className="text-body font-semibold text-primary">AI Sunset Sentinel</h3>
 <span className="bg-surface-hover text-secondary border border-border px-2 py-0.5 rounded text-badge font-mono uppercase font-semibold">
 Evening Analysis
 </span>
 </div>
 <p className="text-caption text-secondary font-mono leading-relaxed">
 Logged <strong className="text-primary font-semibold">{Math.floor(secondsElapsed / 60)}m</strong> of deep focus today.
 {wins.length > 0 && <span> Achieved <strong className="text-primary font-semibold">{wins.length} win{wins.length !== 1 ? 's' : ''}</strong>.</span>}
 {wins.length >= 3 
 ? " Strong execution momentum. Calibrate energy before executing evening shutdown."
 : " Review open blockers and note architecture tasks for tomorrow morning."}
 </p>
 {aiDebrief && (
 <div className="mt-3 p-3.5 bg-surface-hover/70 border-l-2 border-accent rounded-r-lg">
 <p className="text-body text-primary font-sans italic">"{aiDebrief}"</p>
 </div>
 )}
 </div>
 </div>

 <button
 type="button"
 onClick={() => {
 if (!selectedMood || !selectedEnergy || !notes.trim()) {
 toast.error("Please log your mood, energy, and notes first!");
 return;
 }
 analyzeTelemetryMutation.mutate({
 mood: selectedMood,
 energy: selectedEnergy,
 reflection: notes,
 sessionSeconds: secondsElapsed,
 wins: wins.length
 });
 }}
 disabled={analyzeTelemetryMutation.isPending}
 className="px-3.5 py-2 rounded-lg bg-surface hover:bg-surface-hover text-primary font-mono text-caption font-medium border border-border shadow-2xs transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
 >
 {analyzeTelemetryMutation.isPending ? (
 <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
 ) : (
 <Sparkles className="w-3.5 h-3.5 text-accent stroke-[1.75]" /> 
 )}
 <span>{analyzeTelemetryMutation.isPending ? "Analyzing..." : "Analyze Flow Telemetry"}</span>
 </button>
 </div>
 </fieldset>

 {/* TOMORROW'S PRIORITY (Only after shutdown) */}
 {isShutdownComplete && (
 <div className="space-y-3 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-200">
 <label className="text-badge font-mono font-bold text-secondary uppercase tracking-wider flex items-center justify-between">
 <span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-accent stroke-[2]" /> Tomorrow's Priority</span>
 <span className="text-muted text-caption font-mono">Singular execution target</span>
 </label>
 <div className="flex flex-col sm:flex-row gap-3">
 <input 
 value={tomorrowPriority}
 onChange={(e) => setTomorrowPriority(e.target.value)}
 className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-surface text-body text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 placeholder:text-muted transition-colors shadow-2xs font-medium"
 placeholder="What is your highest-leverage execution target for tomorrow?"
 />
 <button 
 type="button"
 onClick={() => saveLogMutation.mutate({})} 
 disabled={saveLogMutation.isPending}
 className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-caption font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-2xs whitespace-nowrap"
 >
 <Save className="w-4 h-4 stroke-[1.75]" /> {saveLogMutation.isPending ? 'Saving...' : 'Save Target'}
 </button>
 </div>
 </div>
 )}

 {/* 1-CLICK EVENING SHUTDOWN */}
 <div className="rounded-xl border border-border bg-surface p-6 sm:p-7 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
 <div className="flex items-center gap-4 text-center sm:text-left">
 <div className="w-12 h-12 rounded-xl bg-surface-hover border border-border text-primary flex items-center justify-center shrink-0">
 <Moon className="w-6 h-6 stroke-[1.5]" />
 </div>
 <div>
 <h3 className="text-body font-semibold text-primary mb-1">
 {isShutdownComplete ? "Evening Shutdown Complete — All Systems Nominal." : "Ready for 1-Click Evening Shutdown?"}
 </h3>
 <p className="text-caption text-secondary font-mono max-w-lg">
 {isShutdownComplete 
 ? "Today's telemetry has been archived. Step away from the workstation and recharge for tomorrow's execution loop."
 : "Lock in today's Pomodoro logs, win metrics, and mood calibration. Disconnect with complete peace of mind."}
 </p>
 </div>
 </div>

 <button
 type="button"
 onClick={handleEveningShutdown}
 disabled={isShutdownComplete || saveLogMutation.isPending}
 className={cn(
 "px-6 py-2.5 rounded-lg font-mono text-caption font-semibold flex items-center justify-center gap-2 transition-colors shrink-0 w-full sm:w-auto shadow-2xs",
 isShutdownComplete
 ? "bg-success-tint border border-success-border text-success cursor-default"
 : "bg-accent hover:bg-accent-hover text-white cursor-pointer"
 )}
 >
 {isShutdownComplete ? (
 <>
 <CheckCircle2 className="w-4 h-4 stroke-[2]" /> Systems Archived for Today
 </>
 ) : (
 <>
 <Moon className="w-4 h-4 stroke-[1.75]" /> Execute 1-Click Shutdown
 </>
 )}
 </button>
 </div>

 </div>
 );
}



