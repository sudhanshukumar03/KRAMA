import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Save, Brain, Zap, Smile, Play, Pause, RotateCcw, Plus, Sparkles, Check, Clock, Trophy, AlertTriangle, FileText, Activity, AlertCircle, Maximize2, Minimize2, Rocket, Target, Settings, ListTodo, CheckCircle2, ChevronDown, FolderKanban, Moon, Wand2, Sunset } from 'lucide-react';
import { BaseButton } from './ui/BaseButton';
import { LoadingState } from './ui/LoadingState';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

const MOOD_OPTIONS = [
 { label: 'Flow State', icon: Sparkles, desc: 'Peak execution velocity', color: 'text-primary ', bg: 'bg-surface-elevated/10 border-border' },
 { label: 'Deep Focus', icon: Brain, desc: 'Sustained cognitive immersion', color: 'text-blue-500 ', bg: 'bg-blue-500/10 border-blue-500/20' },
 { label: 'Calm & Steady', icon: Activity, desc: 'Nominal operational output', color: 'text-[#2563EB]', bg: 'bg-[#2563EB]/10 border-[#2563EB]/20' },
 { label: 'Fatigued', icon: Clock, desc: 'Low momentum / evening drift', color: 'text-[#2563EB]', bg: 'bg-[#2563EB]/10 border-[#2563EB]/20' },
 { label: 'Blocked / Risk', icon: AlertCircle, desc: 'System impediment detected', color: 'text-[#2563EB] ', bg: 'bg-[#2563EB]/10 border-[#2563EB]/20' }
];

const ENERGY_OPTIONS = [
 { label: 'High', bars: 3, desc: 'Ready for architecture & complex refactoring' },
 { label: 'Medium', bars: 2, desc: 'Standard operating throughput' },
 { label: 'Low', bars: 1, desc: 'Recommended for documentation & light reviews' }
];

const getThemes = (prefs?: { sprint?: number, deep?: number, quick?: number }) => [
 { id: 'sprint', label: `${prefs?.sprint || 25}m Focus Sprint`, mins: prefs?.sprint || 25, icon: Rocket, color: 'border-border hover:border-border bg-surface-hover text-secondary ', activeColor: 'bg-surface-hover text-primary border-border ring-2 ring-[#2563EB]/50 font-bold', badge: 'POMODORO SPRINT', desc: 'High-intensity Pomodoro sprint for rapid code execution' },
 { id: 'deep', label: `${prefs?.deep || 45}m Deep Work`, mins: prefs?.deep || 45, icon: Brain, color: 'border-blue-500/30 hover:border-blue-500 bg-blue-500/10 text-blue-500 ', activeColor: 'bg-blue-500 text-white border-blue-500 ring-2 ring-blue-500/50 font-bold', badge: 'COGNITIVE IMMERSION', desc: 'Sustained focus for complex architecture & refactoring' },
 { id: 'quick', label: `${prefs?.quick || 15}m Quick Pulse`, mins: prefs?.quick || 15, icon: Zap, color: 'border-[#2563EB]/30 hover:border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB]', activeColor: 'bg-[#2563EB] text-white border-[#2563EB] ring-2 ring-[#2563EB]/50 font-bold', badge: 'RAPID REFACTOR', desc: 'Short maintenance burst, PR reviews, and bug squashing' },
 { id: 'stopwatch', label: 'Open Stopwatch', mins: 0, icon: Clock, color: 'border-blue-500/30 hover:border-blue-500 bg-blue-500/10 text-blue-500 ', activeColor: 'bg-blue-500 text-white border-blue-500 ring-2 ring-blue-500/50 font-bold', badge: 'UNBOUNDED FLOW', desc: 'Count up indefinitely without time constraints' },
 { id: 'custom', label: `Custom Timer`, mins: -1, icon: Settings, color: 'border-purple-500/30 hover:border-purple-500 bg-purple-500/10 text-purple-500 ', activeColor: 'bg-purple-500 text-white border-purple-500 ring-2 ring-purple-500/50 font-bold', badge: 'CUSTOM TARGET', desc: 'Ad-hoc configurable minute target' }
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
 return saved || 'System Architecture & Engineering Execution';
 });
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
 toast.success(`🎉 Completed Focus Session:"${focusTask}"! +${activeTheme.label} added to your daily score.`);
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
 toast.success(`✅ Completed"${focusTask}" early! Banked ${minsLogged}m of deep work to your score.`);
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

 return (
 <div className="p-6 md:p-8 max-w-5xl mx-auto w-full bg-canvas min-h-full animate-in fade-in duration-150 pb-24 font-sans text-primary">
 
 {/* Full-Screen Immersive Focus Mode overlay */}
 {isFullScreenFocus && (
 <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center text-white animate-in fade-in zoom-in-95 duration-200 p-6 select-none font-sans">
 <button
 onClick={() => setIsFullScreenFocus(false)}
 className="absolute top-8 right-8 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-caption flex items-center gap-2 transition-colors cursor-pointer border border-white/10 shadow-lg"
 title="Exit Full-Screen Focus Mode (Esc)"
 >
 <Minimize2 className="w-4 h-4 stroke-[1.5]" /> Exit Focus Mode (Esc)
 </button>

 <div className="flex flex-col items-center max-w-2xl w-full text-center">
 <div className="w-20 h-20 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6 shadow-2xl">
 <Brain className="w-10 h-10 text-zinc-400 animate-pulse stroke-[1.5]" />
 </div>
 
 <div className="flex items-center gap-3 mb-4 font-mono">
 <span className="px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-caption font-bold uppercase tracking-wider">
 {activeTheme.badge}
 </span>
 <span className="text-caption uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
 <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-ping inline-block" /> ACTIVE SESSION
 </span>
 </div>

 <div className="text-card sm:text-2xl font-bold text-gray-200 mb-8 px-6 py-2.5 rounded-2xl bg-white/5 border border-white/10 max-w-xl truncate">
 🎯 {focusTask}
 </div>

 <h1 className="text-title text-white mb-4 sm: md: drop-shadow-2xl">
 {displayTime}
 </h1>
 
 <p className="text-caption sm:text-body text-zinc-400 mb-12 max-w-md font-mono leading-relaxed">
 Uninterrupted execution. Press Esc at any time to return to your workspace while keeping the timer running.
 </p>

 <div className="flex items-center gap-6">
 <button
 onClick={() => {
 const nextRunning = !timerRunning;
 setTimerRunning(nextRunning);
 if (!nextRunning && sessionSeconds > 0) {
 autoSaveTimerMutation.mutate(Math.floor(secondsElapsed / 60));
 toast.info(`Paused focus session at ${displayTime}`);
 } else {
 toast.success('Resumed deep work focus!');
 }
 }}
 className={cn("px-8 py-4 rounded-full font-mono text-body font-bold flex items-center gap-3 transition-all cursor-pointer shadow-2xl hover:scale-105 active:scale-95",
 timerRunning ?"bg-zinc-800 hover:bg-zinc-700 text-white" :"bg-white hover:bg-zinc-200 text-zinc-950 shadow-sm"
 )}
 >
 {timerRunning ? (
 <>
 <Pause className="w-5 h-5 fill-white stroke-[1.5]" /> Pause Focus
 </>
 ) : (
 <>
 <Play className="w-5 h-5 fill-zinc-950 ml-0.5 stroke-[1.5]" /> Resume Focus
 </>
 )}
 </button>

 {sessionSeconds > 0 && (
 <button
 onClick={() => {
 handleCompleteSessionEarly();
 setIsFullScreenFocus(false);
 }}
 className="px-6 py-4 rounded-full bg-[#2563EB] hover:opacity-90 text-white font-mono text-body font-bold flex items-center gap-2 transition-all cursor-pointer hover:scale-105 shadow-xl"
 >
 <CheckCircle2 className="w-5 h-5 stroke-[1.5]" /> Bank & Finish
 </button>
 )}

 <button
 onClick={() => {
 handleResetTimer();
 setIsFullScreenFocus(false);
 }}
 className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 border border-white/10"
 title="Reset Timer and Exit"
 >
 <RotateCcw className="w-5 h-5 stroke-[1.5]" />
 </button>
 </div>
 </div>
 </div>
 )}
 
 <fieldset disabled={isShutdownComplete} className="contents">
 {/* AMBER REFLECTION IDENTITY HEADER (#F59E0B / #FBBF24) */}
 <div className="v4-card mb-8 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-2xl bg-surface-hover text-primary flex items-center justify-center shrink-0 shadow-sm border border-border">
 <Sunset className="w-6 h-6 stroke-[1.5]" />
 </div>
 <div>
 <div className="flex items-center gap-2.5 mb-1">
 <h1 className="text-title text-primary mb-4 ">Daily Review & Reflection</h1>
 <span className="bg-surface-hover text-secondary border border-border px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
 <Sparkles className="w-3 h-3 text-primary stroke-[1.5]" /> Evening Debrief
 </span>
 </div>
 <p className="text-caption text-secondary font-mono">Calibrated evening review, deep work Pomodoro logs, and 1-click shutdown.</p>
 </div>
 </div>
 <div className="flex items-center gap-3 self-end sm:self-auto">
 <span className="text-caption font-mono font-bold text-primary bg-surface-hover px-3.5 py-2 rounded-xl border border-border shadow-2xs">
 {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
 </span>
 <BaseButton onClick={() => saveLogMutation.mutate({})} disabled={saveLogMutation.isPending} className="cursor-pointer bg-primary hover:opacity-90 text-surface font-bold whitespace-nowrap">
 <Save className="w-4 h-4 mr-1.5 stroke-[1.5]" />
 {saveLogMutation.isPending ? 'Saving...' : 'Save Review'}
 </BaseButton>
 </div>
 </div>

 {/* AI SUNSET SENTINEL BANNER (Amber Reflection Identity) */}
 <div className="mb-8 v4-card p-5 flex flex-col md:flex-row items-start justify-between gap-4">
 <div className="flex items-start gap-3.5 flex-1">
 <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-border mt-1">
 <Wand2 className="w-5 h-5 stroke-[1.5]" />
 </div>
 <div>
 <h3 className="text-card text-primary mb-2 flex items-center gap-2">
 AI Sunset Sentinel <span className="bg-blue-500/10 text-blue-500 px-2 py-0.2 rounded text-[10px] font-mono font-bold uppercase">Evening Analysis</span>
 </h3>
 <p className="text-caption text-secondary font-mono mt-0.5 leading-relaxed">
 You logged <strong className="text-primary">{Math.floor(secondsElapsed / 60)}m</strong> of deep focus today.
 {wins.length > 0 && <span> You achieved <strong className="text-primary">{wins.length} win{wins.length !== 1 ? 's' : ''}</strong>.</span>}
 {wins.length >= 3 
 ?" Outstanding momentum! Calibrate your energy levels below before executing your evening shutdown."
 :" Review your open blockers and note carryover architecture tasks for tomorrow morning."}
 </p>
 {aiDebrief && (
 <div className="mt-4 p-4 bg-surface border border-border rounded-xl shadow-sm">
 <p className="text-body text-primary font-serif italic">"{aiDebrief}"</p>
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
 className="px-3.5 py-2 mt-1 md:mt-0 rounded-xl bg-surface hover:bg-surface-hover text-primary font-mono text-caption font-bold border border-border shadow-2xs transition-all shrink-0 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
 >
 {analyzeTelemetryMutation.isPending ? (
 <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
 ) : (
 <Sparkles className="w-3.5 h-3.5 text-primary stroke-[1.5]" /> 
 )}
 {analyzeTelemetryMutation.isPending ? "Analyzing..." : "Analyze Flow Telemetry"}
 </button>
 </div>

 {/* THEME-BASED FOCUS TIMER & POMODORO WIDGET */}
 <div className="mb-8 v4-card p-5 space-y-6">
 {/* Header Strip */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
 <div className="flex items-center gap-3.5">
 <div className="w-11 h-11 rounded-xl bg-surface-hover flex items-center justify-center shrink-0 border border-border shadow-2xs">
 <Brain className="w-5 h-5 text-[#2563EB] stroke-[1.5]" />
 </div>
 <div>
 <div className="flex items-center gap-2 mb-0.5">
 <h2 className="text-section text-primary mb-3 ">Theme-Based Focus Timer</h2>
 <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-surface-hover text-secondary border border-border uppercase">
 {activeTheme.badge}
 </span>
 </div>
 <p className="text-caption text-secondary font-mono">Set timed Pomodoro sprints or open stopwatches to execute your tasks with precision.</p>
 </div>
 </div>

 <div className="flex items-center gap-3 self-start sm:self-auto">
 <button 
 onClick={() => setIsFullScreenFocus(true)} 
 className="text-[#2563EB] hover:opacity-80 font-mono text-caption font-bold flex items-center gap-1.5 bg-surface-elevated/10 px-3.5 py-2 rounded-xl transition-colors cursor-pointer border border-border shadow-2xs"
 >
 <Maximize2 className="w-3.5 h-3.5 stroke-[1.5]" /> Full Screen
 </button>
 <div className="bg-surface-hover border border-border px-3.5 py-2 rounded-xl flex items-center gap-2 text-[#2563EB] text-caption font-mono font-bold shadow-2xs">
 <Trophy className="w-3.5 h-3.5 text-primary stroke-[1.5]" /> Banked Today: {Math.floor(secondsElapsed / 3600)}h {Math.floor((secondsElapsed % 3600) / 60)}m
 </div>
 </div>
 </div>

 {/* Target Task Selection Bar */}
 <div className="bg-surface-hover/80 border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative">
 <div className="flex items-center gap-2.5 flex-1 min-w-0">
 <Target className="w-4 h-4 text-primary shrink-0 animate-pulse stroke-[1.5]" />
 <span className="text-caption font-mono font-bold text-secondary uppercase tracking-wider shrink-0">Focusing On:</span>
 <input 
 type="text"
 value={focusTask}
 onChange={(e) => setFocusTask(e.target.value)}
 placeholder="What are you executing right now? e.g. System Refactor, Unit Tests..."
 className="flex-1 bg-transparent border-none text-body text-primary font-bold focus:outline-none placeholder:text-muted min-w-0 font-sans"
 />
 </div>

 <div className="relative shrink-0">
 <button
 onClick={() => setShowTaskDropdown(!showTaskDropdown)}
 className="px-3.5 py-1.5 bg-surface-elevated/10 hover:bg-blue-500/10 text-blue-500 border border-border rounded-lg text-caption font-mono font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
 >
 <ListTodo className="w-3.5 h-3.5 stroke-[1.5]" /> Pick Task <ChevronDown className="w-3 h-3 ml-0.5 stroke-[1.5]" />
 </button>

 {showTaskDropdown && (
 <div className="absolute right-0 top-full mt-2 w-72 v4-card shadow-2xl p-2 z-30 max-h-64 overflow-y-auto space-y-1 text-left animate-in fade-in zoom-in-95 duration-150 font-sans">
 <div className="text-[10px] font-mono uppercase font-bold text-secondary px-2 py-1 border-b border-border">Active Issues & Habits</div>
 {issues.map(issue => (
 <button
 key={issue.id}
 onClick={() => {
 setFocusTask(`[Issue] ${issue.title}`);
 setShowTaskDropdown(false);
 toast.info(`Target set: ${issue.title}`);
 }}
 className="w-full text-left px-2.5 py-1.5 rounded-lg text-caption text-primary hover:bg-surface-elevated/10 hover:text-[#2563EB] :text-primary truncate transition-colors flex items-center gap-2 cursor-pointer font-medium"
 >
 <span className="w-1.5 h-1.5 rounded-full bg-surface-elevated shrink-0" /> {issue.title}
 </button>
 ))}
 {habits.map(habit => (
 <button
 key={habit.id}
 onClick={() => {
 setFocusTask(`[Habit] ${habit.name}`);
 setShowTaskDropdown(false);
 toast.info(`Target set: ${habit.name}`);
 }}
 className="w-full text-left px-2.5 py-1.5 rounded-lg text-caption text-primary hover:bg-surface-hover hover:text-primary truncate transition-colors flex items-center gap-2 cursor-pointer font-medium"
 >
 <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] shrink-0" /> {habit.name}
 </button>
 ))}
 {projects.map(proj => (
 <button
 key={proj.id}
 onClick={() => {
 setFocusTask(`[Project] ${proj.name}`);
 setShowTaskDropdown(false);
 toast.info(`Target set: ${proj.name}`);
 }}
 className="w-full text-left px-2.5 py-1.5 rounded-lg text-caption text-primary hover:bg-surface-hover hover:text-primary truncate transition-colors flex items-center gap-2 cursor-pointer font-medium"
 >
 <FolderKanban className="w-3 h-3 text-blue-500 shrink-0 stroke-[1.5]" /> {proj.name}
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
              <div className="text-caption font-mono font-bold text-secondary uppercase tracking-wider flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary stroke-[1.5]" /> Select Timer Theme
                </div>
                <button
                  onClick={() => setShowTimerSettings(!showTimerSettings)}
                  className="p-1 rounded hover:bg-surface-hover text-muted hover:text-primary transition-colors cursor-pointer"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>

              {showTimerSettings && (
                <div className="v4-card p-4 mb-4 bg-surface-elevated flex flex-col gap-3">
                  <h4 className="text-body font-bold text-primary">Timer Preferences</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-caption text-secondary block mb-1">Sprint (m)</label>
                      <input 
                        type="number" 
                        value={localTimerPrefs.sprint} 
                        onChange={e => setLocalTimerPrefs(prev => ({...prev, sprint: parseInt(e.target.value) || 25}))}
                        className="w-full bg-background border border-border rounded px-2 py-1 text-primary text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-caption text-secondary block mb-1">Deep Work (m)</label>
                      <input 
                        type="number" 
                        value={localTimerPrefs.deep} 
                        onChange={e => setLocalTimerPrefs(prev => ({...prev, deep: parseInt(e.target.value) || 45}))}
                        className="w-full bg-background border border-border rounded px-2 py-1 text-primary text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-caption text-secondary block mb-1">Quick (m)</label>
                      <input 
                        type="number" 
                        value={localTimerPrefs.quick} 
                        onChange={e => setLocalTimerPrefs(prev => ({...prev, quick: parseInt(e.target.value) || 15}))}
                        className="w-full bg-background border border-border rounded px-2 py-1 text-primary text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end mt-2">
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

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
 {FOCUS_THEMES.map(t => {
 const Icon = t.icon;
 const isSelected = activeThemeId === t.id;
 return (
 <button
 key={t.id}
 onClick={() => handleSelectTheme(t.id)}
 className={cn("p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-full relative overflow-hidden group shadow-2xs",
 isSelected ? t.activeColor : `${t.color} hover:bg-surface-hover`
 )}
 >
 <div className="flex items-center justify-between mb-2.5">
 <Icon className={cn("w-4 h-4 stroke-[1.5]", isSelected ?"text-white" :"text-primary group-hover:scale-110 transition-transform")} />
 <span className="text-badge font-mono font-bold opacity-90 uppercase">
 {t.mins === -1 ? `${Math.max(1, customMins || 1)}m` : t.mins === 0 ? '∞' : `${t.mins}m`}
 </span>
 </div>
 <div>
 <div className="font-bold text-caption leading-tight mb-0.5">{t.label}</div>
 <div className={cn("text-[10px] line-clamp-1 leading-snug font-normal", isSelected ?"text-white/80" :"text-secondary")}>
 {t.desc}
 </div>
 </div>
 </button>
 );
 })}
 </div>
 {activeThemeId === 'custom' && (
 <div className="flex items-center gap-3 pt-2 animate-in fade-in duration-150 font-mono text-caption">
 <span className="text-secondary font-bold">Custom Target Minutes:</span>
 <input
 type="number"
 min={1}
 max={480}
 value={customMins || ''}
 onChange={(e) => {
 const val = e.target.value;
 if (val === '') {
 setCustomMins(0 as any); // allow empty string temporarily
 } else {
 handleCustomMinsChange(parseInt(val) || 1);
 }
 }}
 className="w-20 px-3 py-1.5 bg-surface border border-border rounded-lg text-body text-primary font-bold text-center focus:outline-none focus:border-border"
 />
 <span className="text-secondary font-sans">minutes ({Math.max(1, customMins || 1) * 60} seconds target)</span>
 </div>
 )}
 </div>

 {/* Active Display & Radial Timer Widget */}
 <div className="v4-card p-8 flex flex-col md:flex-row items-center justify-center md:justify-start gap-12 relative overflow-hidden mt-2">
 
 {/* Radial Timer Gauge & Controls */}
 <div className="relative flex flex-col items-center">
 <div className="relative w-[140px] h-[140px] flex items-center justify-center">
 {/* SVG Ring */}
 <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
 <circle
 cx="70"
 cy="70"
 r="60"
 stroke="var(--color-border)"
 strokeWidth="8"
 fill="none"
 />
 <circle
 cx="70"
 cy="70"
 r="60"
 stroke="#2563EB"
 strokeWidth="8"
 strokeLinecap="round"
 strokeDasharray="377"
 strokeDashoffset={377 - (progressPercent / 100) * 377}
 fill="none"
 className="transition-all duration-1000 ease-linear"
 />
 </svg>
 {/* Center Text */}
 <div className="absolute inset-0 flex flex-col items-center justify-center">
 <span className="text-3xl font-serif text-primary tracking-tight leading-none mb-1">{displayTime}</span>
 <span className="text-[10px] font-mono text-[#A39C8E] uppercase tracking-wider">Deep Work</span>
 </div>
 </div>

 {/* Controls Docked Below Ring */}
 <div className="mt-6 flex items-center gap-3">
 <button
 onClick={() => {
 const nextRunning = !timerRunning;
 setTimerRunning(nextRunning);
 if (nextRunning) {
 toast.success(`🚀 Started ${activeTheme.label} on"${focusTask}"!`);
 } else if (!nextRunning && sessionSeconds > 0) {
 autoSaveTimerMutation.mutate(Math.floor(secondsElapsed / 60));
 toast.info(`Paused focus timer at ${displayTime}`);
 }
 }}
 className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-sm hover:bg-blue-600 transition-colors cursor-pointer shrink-0"
 >
 {timerRunning ? <Pause className="w-5 h-5 fill-white stroke-none" /> : <Play className="w-5 h-5 fill-white ml-1 stroke-none" />}
 </button>

 <button
 onClick={handleResetTimer}
 className="w-10 h-10 rounded-full border border-border text-secondary flex items-center justify-center hover:bg-surface-hover hover:text-primary transition-colors cursor-pointer shrink-0"
 title="Reset Timer"
 >
 <RotateCcw className="w-4 h-4 stroke-[1.5]" />
 </button>

 {sessionSeconds > 0 && (
 <button
 onClick={handleCompleteSessionEarly}
 className="w-10 h-10 rounded-full border border-[#2563EB]/30 text-[#2563EB] flex items-center justify-center hover:bg-[#2563EB]/10 transition-colors cursor-pointer shrink-0"
 title="Bank Session"
 >
 <CheckCircle2 className="w-4 h-4 stroke-[2]" />
 </button>
 )}
 </div>
 </div>

 {/* Context Details */}
 <div className="text-center md:text-left flex flex-col justify-center">
 <div className="text-caption font-mono uppercase tracking-widest text-blue-500 mb-3 flex items-center justify-center md:justify-start gap-2 font-bold">
 <Clock className="w-3.5 h-3.5 text-blue-500 animate-pulse stroke-[1.5]" />
 {activeTheme.label}
 </div>
 <h3 className="text-card text-primary mb-2 md: max-w-sm">
 {focusTask}
 </h3>
 <div className="text-body text-secondary font-medium">
 Time logged: <strong className="text-primary">{Math.floor(sessionSeconds / 60)}m {sessionSeconds % 60}s</strong>
 </div>
 </div>
 
 </div>
 </div>

 {/* INTERACTIVE CLICKABLE CARD SELECTORS FOR MOOD & ENERGY */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
 
 {/* Mood Selector (Precision Lucide Icons, Never Emojis) */}
 <div className="space-y-3">
 <label className="text-caption font-mono font-bold text-primary uppercase tracking-wider flex items-center gap-2">
 <Smile className="w-4 h-4 text-primary stroke-[1.5]" /> Calibrate Today's Mood
 </label>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {MOOD_OPTIONS.map((opt) => {
 const isSelected = selectedMood.toLowerCase() === opt.label.toLowerCase();
 const Icon = opt.icon;
 return (
 <div
 key={opt.label}
 onClick={() => setSelectedMood(opt.label)}
 className={cn("p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3.5 group select-none shadow-2xs",
 isSelected 
 ?"bg-primary border-primary text-surface shadow-sm scale-[1.01]" 
 :"bg-surface border-border hover:border-border/60 text-primary"
 )}
 >
 <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", isSelected ?"bg-surface/20" : opt.bg)}>
 <Icon className={cn("w-5 h-5 stroke-[1.5]", isSelected ?"text-surface" : opt.color)} />
 </div>
 <div className="min-w-0">
 <div className={cn("font-bold text-body leading-tight", isSelected ? "text-surface" : "text-primary")}>
 {opt.label}
 </div>
 <div className={cn("text-badge font-mono mt-0.5", isSelected ? "text-surface/80" : "text-secondary")}>
 {opt.desc}
 </div>
 </div>
 {isSelected && <Check className="w-4 h-4 ml-auto text-[#2563EB] shrink-0 stroke-[2.5]" />}
 </div>
 );
 })}
 </div>
 </div>

 {/* Energy Selector */}
 <div className="space-y-3">
 <label className="text-caption font-mono font-bold text-primary uppercase tracking-wider flex items-center gap-2">
 <Zap className="w-4 h-4 text-blue-500 stroke-[1.5]" /> Calibrate Energy Level
 </label>
 <div className="grid grid-cols-1 gap-3">
 {ENERGY_OPTIONS.map((opt) => {
 const isSelected = selectedEnergy.toLowerCase() === opt.label.toLowerCase();
 return (
 <div
 key={opt.label}
 onClick={() => setSelectedEnergy(opt.label)}
 className={cn("p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group select-none shadow-2xs",
 isSelected 
 ?"bg-blue-500 border-blue-500 text-white shadow-sm scale-[1.01]" 
 :"bg-surface border-border hover:border-border text-primary"
 )}
 >
 <div className="flex items-center gap-3.5">
 <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-caption shrink-0 transition-colors",
 isSelected ?"bg-white/20 text-white" :"bg-surface-hover border border-border text-blue-500"
 )}>
 {opt.label[0]}
 </div>
 <div>
 <div className={cn("font-bold text-body leading-tight", isSelected ?"text-white" :"text-primary")}>
 {opt.label} Energy
 </div>
 <div className={cn("text-badge font-mono mt-0.5", isSelected ?"text-white/80" :"text-secondary")}>
 {opt.desc}
 </div>
 </div>
 </div>

 <div className="flex items-center gap-3">
 {/* Visual Bars */}
 <div className="flex gap-1">
 {[1, 2, 3].map(i => (
 <div 
 key={i} 
 className={cn("h-4 w-1.5 rounded-full transition-colors",
 i <= opt.bars ? (isSelected ?"bg-white" :"bg-blue-500") : (isSelected ?"bg-white/20" :"bg-surface-hover border border-border")
 )} 
 />
 ))}
 </div>
 {isSelected && <Check className="w-4 h-4 text-white shrink-0 stroke-[2.5]" />}
 </div>
 </div>
 );
 })}
 </div>
 </div>

 </div>

 {/* WINS & BLOCKERS UNBOXED INPUT STREAMS */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 items-start">
 {/* Wins */}
 <div className="space-y-3">
 <label className="text-caption font-mono font-bold text-primary uppercase tracking-wider flex items-center justify-between">
 <span className="flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-[#2563EB] stroke-[1.5]" /> Today's Recorded Wins</span>
 <span className="text-[#2563EB] font-bold">{wins.length} Logged</span>
 </label>
 <div className="v4-card p-5 min-h-[180px] flex flex-col justify-between gap-4">
 <div className="space-y-2">
 {wins.map((win, i) => (
 <div key={i} className="flex items-center justify-between gap-2 bg-surface-hover/80 px-3.5 py-2.5 rounded-xl border border-border/80 group">
 <span className="text-body font-medium text-primary flex items-center gap-2.5">
 <span className="w-2 h-2 rounded-full bg-[#2563EB] shrink-0" /> {win}
 </span>
 <button 
 onClick={() => setWins(wins.filter((_, idx) => idx !== i))}
 className="text-muted hover:text-[#2563EB] :text-blue-400 text-caption opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 font-bold"
 >
 &times;
 </button>
 </div>
 ))}
 </div>

 <div className="flex gap-2 pt-3 border-t border-border/80">
 <input
 type="text"
 value={newWin}
 onChange={(e) => setNewWin(e.target.value)}
 onKeyDown={(e) => e.key === 'Enter' && addWin()}
 placeholder="Add a new engineering win or PR milestone..."
 className="flex-1 px-3.5 py-2 text-caption bg-surface-hover border border-border rounded-xl focus:outline-none focus:border-[#2563EB] focus:bg-surface text-primary font-medium"
 />
 <button onClick={addWin} className="px-4 py-2 bg-[#2563EB] text-white rounded-xl text-caption font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs">
 <Plus className="w-3.5 h-3.5 stroke-[1.5]" /> Add
 </button>
 </div>
 </div>
 </div>

 {/* Blockers */}
 <div className="space-y-3">
 <label className="text-caption font-mono font-bold text-primary uppercase tracking-wider flex items-center justify-between">
 <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-[#2563EB] stroke-[1.5]" /> Blockers & Technical Risks</span>
 <span className="text-[#2563EB] font-bold">{blockers.length} Logged</span>
 </label>
 <div className="v4-card p-5 min-h-[180px] flex flex-col justify-between gap-4">
 <div className="space-y-2">
 {blockers.map((blocker, i) => (
 <div key={i} className="flex items-center justify-between gap-2 bg-surface-hover/80 px-3.5 py-2.5 rounded-xl border border-border/80 group">
 <span className="text-body font-medium text-primary flex items-center gap-2.5">
 <span className="w-2 h-2 rounded-full bg-[#2563EB] shrink-0" /> {blocker}
 </span>
 <button 
 onClick={() => setBlockers(blockers.filter((_, idx) => idx !== i))}
 className="text-muted hover:text-[#2563EB] :text-blue-400 text-caption opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 font-bold"
 >
 &times;
 </button>
 </div>
 ))}
 </div>

 <div className="flex gap-2 pt-3 border-t border-border/80">
 <input
 type="text"
 value={newBlocker}
 onChange={(e) => setNewBlocker(e.target.value)}
 onKeyDown={(e) => e.key === 'Enter' && addBlocker()}
 placeholder="Add a blocker, bug, or carryover risk..."
 className="flex-1 px-3.5 py-2 text-caption bg-surface-hover border border-border rounded-xl focus:outline-none focus:border-[#2563EB] focus:bg-surface text-primary font-medium"
 />
 <button onClick={addBlocker} className="px-4 py-2 bg-[#2563EB] text-white rounded-xl text-caption font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs">
 <Plus className="w-3.5 h-3.5 stroke-[1.5]" /> Add
 </button>
 </div>
 </div>
 </div>
 </div>

 {/* NOTES & CARRYOVER ARCHITECTURE DUMP */}
 <div className="space-y-3 mb-10">
 <label className="text-caption font-mono font-bold text-primary uppercase tracking-wider flex items-center justify-between">
 <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-primary stroke-[1.5]" /> Evening Brain Dump & Architecture Carryover</span>
 <span className="text-secondary text-caption font-mono">Supports markdown & technical notes</span>
 </label>
 <textarea 
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 className="w-full v4-card p-5 min-h-[140px] text-body text-primary focus:outline-none focus:border-border focus:ring-1 focus:ring-primary resize-none placeholder:text-muted transition-all shadow-xs font-sans leading-relaxed"
 placeholder="Record key architecture reflections, design notes, or carryover tasks for tomorrow morning's execution loop..."
 />
 </div>
 </fieldset>

 {/* TOMORROW'S PRIORITY (Only after shutdown) */}
 {isShutdownComplete && (
 <div className="space-y-3 mb-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
 <label className="text-caption font-mono font-bold text-primary uppercase tracking-wider flex items-center justify-between">
 <span className="flex items-center gap-1.5"><Target className="w-4 h-4 text-primary stroke-[1.5]" /> Tomorrow's Priority</span>
 <span className="text-secondary text-caption font-mono">Set your singular focus for tomorrow</span>
 </label>
 <div className="flex flex-col sm:flex-row gap-3">
   <input 
     value={tomorrowPriority}
     onChange={(e) => setTomorrowPriority(e.target.value)}
     className="w-full v4-card p-4 text-body text-primary focus:outline-none focus:border-border focus:ring-1 focus:ring-primary placeholder:text-muted transition-all shadow-sm flex-1"
     placeholder="What is your highest-leverage execution target for tomorrow?"
   />
   <button 
     onClick={() => saveLogMutation.mutate({})} 
     disabled={saveLogMutation.isPending}
     className="px-6 py-4 sm:py-2 bg-[#2563EB] text-white rounded-xl text-caption font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-md whitespace-nowrap"
   >
     <Save className="w-4 h-4 stroke-[1.5]" /> {saveLogMutation.isPending ? 'Saving...' : 'Save Target'}
   </button>
 </div>
 </div>
 )}

 {/* HERO MOMENT: 1-CLICK EVENING SHUTDOWN & DAY-END CELEBRATION */}
 <div className="v4-card p-6 md:p-8 shadow-md flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
 <div className="absolute -right-10 -bottom-10 w-40 h-40 hidden pointer-events-none" />
 <div className="flex items-center gap-4 text-center md:text-left">
 <div className="w-14 h-14 rounded-2xl bg-surface-hover text-primary flex items-center justify-center shrink-0 shadow-md border border-border">
 <Moon className="w-7 h-7 stroke-[1.5] animate-bounce" />
 </div>
 <div>
 <h3 className="text-card text-primary mb-2 ">
 {isShutdownComplete ?"🌙 Evening Shutdown Complete — All Systems nominal." :"Ready for 1-Click Evening Shutdown?"}
 </h3>
 <p className="text-caption text-secondary font-mono max-w-xl">
 {isShutdownComplete 
 ?"Today's telemetry has been archived. Step away from the workstation and recharge for tomorrow's execution loop."
 :"Lock in today's Pomodoro logs, win metrics, and mood calibration. Disconnect with complete peace of mind."}
 </p>
 </div>
 </div>

 <button
 onClick={handleEveningShutdown}
 disabled={isShutdownComplete || saveLogMutation.isPending}
 className={cn("px-6 py-4 rounded-2xl font-mono text-body font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg shrink-0 w-full md:w-auto",
 isShutdownComplete ?"bg-[#2563EB] text-white cursor-default" :"bg-primary hover:bg-primary/90 text-surface hover:scale-105 active:scale-95"
 )}
 >
 {isShutdownComplete ? (
 <>
 <CheckCircle2 className="w-5 h-5 stroke-[1.5]" /> Systems Archived for Today
 </>
 ) : (
 <>
 <Moon className="w-5 h-5 stroke-[1.5]" /> Execute 1-Click Shutdown
 </>
 )}
 </button>
 </div>

 </div>
 );
}

