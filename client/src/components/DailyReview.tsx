import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { CalendarCheck, Save, Brain, Zap, Smile, Play, Pause, RotateCcw, Plus, Sparkles, Check, Clock, Trophy, AlertTriangle, FileText, Activity, AlertCircle, Maximize2, Minimize2, Rocket, Target, Settings, ListTodo, CheckCircle2, ChevronDown, FolderKanban } from 'lucide-react';
import { BaseButton } from './ui/BaseButton';
import { LoadingState } from './ui/LoadingState';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const MOOD_OPTIONS = [
  { label: 'Great', icon: Sparkles, desc: 'Peak flow & output', color: 'text-[#0D9488]' },
  { label: 'Good', icon: Zap, desc: 'Steady & productive', color: 'text-[#2563EB]' },
  { label: 'Neutral', icon: Activity, desc: 'Average execution', color: 'text-secondary' },
  { label: 'Tired', icon: Clock, desc: 'Low momentum', color: 'text-[#D97706]' },
  { label: 'Burned Out', icon: AlertCircle, desc: 'Need recovery', color: 'text-[#DC2626]' }
];

const ENERGY_OPTIONS = [
  { label: 'High', bars: 3, desc: 'Ready for deep architecture' },
  { label: 'Medium', bars: 2, desc: 'Standard operating level' },
  { label: 'Low', bars: 1, desc: 'Better for admin / light tasks' }
];

const FOCUS_THEMES = [
  { id: 'sprint', label: '25m Focus Sprint', mins: 25, icon: Rocket, color: 'border-indigo-500/30 hover:border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300', activeColor: 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-500/50', badge: 'POMODORO SPRINT', desc: 'High-intensity Pomodoro sprint for rapid code execution' },
  { id: 'deep', label: '45m Deep Work', mins: 45, icon: Brain, color: 'border-amber-500/30 hover:border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300', activeColor: 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-500/50', badge: 'COGNITIVE IMMERSION', desc: 'Sustained focus for complex architecture & refactoring' },
  { id: 'quick', label: '15m Quick Pulse', mins: 15, icon: Zap, color: 'border-emerald-500/30 hover:border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', activeColor: 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-500/50', badge: 'RAPID REFACTOR', desc: 'Short maintenance burst, PR reviews, and bug squashing' },
  { id: 'stopwatch', label: 'Open Stopwatch', mins: 0, icon: Clock, color: 'border-sky-500/30 hover:border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300', activeColor: 'bg-sky-600 text-white border-sky-600 ring-2 ring-sky-500/50', badge: 'UNBOUNDED FLOW', desc: 'Count up indefinitely without time constraints' },
  { id: 'custom', label: 'Custom Timer', mins: -1, icon: Settings, color: 'border-purple-500/30 hover:border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300', activeColor: 'bg-purple-600 text-white border-purple-600 ring-2 ring-purple-500/50', badge: 'CUSTOM TARGET', desc: 'Set your own custom minutes target for this session' }
];

export function DailyReview() {
  const queryClient = useQueryClient();
  const { data: logs = [], isLoading } = useQuery({ queryKey: ['daily-logs'], queryFn: api.dailyLogs.list });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: api.projects.list });
  const { data: issues = [] } = useQuery({ queryKey: ['issues'], queryFn: api.issues.list });
  const { data: habits = [] } = useQuery({ queryKey: ['habits'], queryFn: api.habits.list });

  const todayLog = logs.find(
    l => new Date(l.date).toLocaleDateString() === new Date().toLocaleDateString()
  );

  const [selectedMood, setSelectedMood] = useState<string>(todayLog?.mood || 'Good');
  const [selectedEnergy, setSelectedEnergy] = useState<string>(todayLog?.energy || 'High');
  const [wins, setWins] = useState<string[]>(todayLog?.wins || []);
  const [blockers, setBlockers] = useState<string[]>(todayLog?.blockers || []);
  const [newWin, setNewWin] = useState('');
  const [newBlocker, setNewBlocker] = useState('');
  const [notes, setNotes] = useState(todayLog?.notes || '');

  // Theme-Based Focus Timer State
  const [timerRunning, setTimerRunning] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState<number>(todayLog ? todayLog.deepWorkMinutes * 60 : 0);
  const [isFullScreenFocus, setIsFullScreenFocus] = useState(false);
  
  const [activeThemeId, setActiveThemeId] = useState<string>('sprint');
  const [customMins, setCustomMins] = useState<number>(30);
  const [focusTask, setFocusTask] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const paramTask = params.get('focusTask');
    if (paramTask) return paramTask;
    const saved = localStorage.getItem('krama_active_focus_task');
    return saved || 'Deep System Architecture & Code Execution';
  });
  const [showTaskDropdown, setShowTaskDropdown] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(25 * 60);
  const [sessionSeconds, setSessionSeconds] = useState<number>(0);

  const activeTheme = FOCUS_THEMES.find(t => t.id === activeThemeId) || FOCUS_THEMES[0];
  const totalThemeSeconds = activeTheme.mins === -1 ? customMins * 60 : activeTheme.mins * 60;

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
      if (todayLog.deepWorkMinutes !== undefined) setSecondsElapsed(todayLog.deepWorkMinutes * 60);
    }
  }, [todayLog]);

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
              toast.success(`🎉 Completed Focus Session: "${focusTask}"! +${activeTheme.label} added to your daily score.`);
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
  }, [timerRunning, activeThemeId, focusTask, activeTheme, totalThemeSeconds]);

  const handleSelectTheme = (themeId: string) => {
    setActiveThemeId(themeId);
    setTimerRunning(false);
    setSessionSeconds(0);
    const t = FOCUS_THEMES.find(th => th.id === themeId);
    if (t) {
      if (t.mins === -1) {
        setSecondsRemaining(customMins * 60);
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
    toast.success(`✅ Completed "${focusTask}" early! Banked ${minsLogged}m of deep work to your score.`);
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
    mutationFn: () => {
      const payload = {
        date: new Date(),
        mood: selectedMood,
        energy: selectedEnergy,
        deepWorkMinutes: Math.floor(secondsElapsed / 60),
        wins,
        blockers,
        notes
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
      toast.success('Daily review log saved successfully!');
    }
  });

  if (isLoading) return <LoadingState title="Loading Daily Review..." description="Fetching today's execution logs and deep work timers..." />;

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
    <div className="p-8 max-w-5xl mx-auto w-full bg-canvas min-h-full animate-in fade-in duration-150 pb-24">
      {/* Full-Screen Immersive Focus Mode overlay */}
      {isFullScreenFocus && (
        <div className="fixed inset-0 z-50 bg-[#0B0F19] flex flex-col items-center justify-center text-white animate-in fade-in zoom-in-95 duration-200 p-6 select-none">
          <button
            onClick={() => setIsFullScreenFocus(false)}
            className="absolute top-8 right-8 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs flex items-center gap-2 transition-colors cursor-pointer border border-white/10 shadow-lg"
            title="Exit Full-Screen Focus Mode (Esc)"
          >
            <Minimize2 className="w-4 h-4" /> Exit Focus Mode (Esc)
          </button>

          <div className="flex flex-col items-center max-w-2xl w-full text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center mb-6 shadow-2xl">
              <Brain className="w-10 h-10 text-indigo-400 animate-pulse stroke-[1.5]" />
            </div>
            
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-mono text-xs font-bold uppercase tracking-wider">
                {activeTheme.badge}
              </span>
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-muted flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" /> ACTIVE SESSION
              </span>
            </div>

            <div className="text-lg sm:text-2xl font-medium text-gray-200 mb-8 px-6 py-2.5 rounded-2xl bg-white/5 border border-white/10 max-w-xl truncate">
              🎯 {focusTask}
            </div>

            <h1 className="text-7xl sm:text-8xl md:text-9xl font-mono font-black tracking-tight text-white mb-12 drop-shadow-2xl">
              {displayTime}
            </h1>
            
            <p className="text-xs sm:text-sm text-muted mb-12 max-w-md font-mono">
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
                className={cn(
                  "px-8 py-4 rounded-full font-mono text-base font-bold flex items-center gap-3 transition-all cursor-pointer shadow-2xl hover:scale-105 active:scale-95",
                  timerRunning ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/30"
                )}
              >
                {timerRunning ? (
                  <>
                    <Pause className="w-5 h-5 fill-white" /> Pause Focus
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-white ml-0.5" /> Resume Focus
                  </>
                )}
              </button>

              {sessionSeconds > 0 && (
                <button
                  onClick={() => {
                    handleCompleteSessionEarly();
                    setIsFullScreenFocus(false);
                  }}
                  className="px-6 py-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-sm font-bold flex items-center gap-2 transition-all cursor-pointer hover:scale-105 shadow-xl"
                >
                  <CheckCircle2 className="w-5 h-5" /> Bank & Finish
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
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[12px] bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-sm">
            <CalendarCheck className="w-5 h-5 stroke-[1.75]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-[28px] font-medium tracking-tight text-primary">Daily Review</h1>
              <span className="bg-surface-hover text-secondary border border-border px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-[0.02em] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary stroke-[2]" /> Daily Sync
              </span>
            </div>
            <p className="text-[13px] text-secondary">Reflect on today's execution, track live deep work sessions, and calibrate energy.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <span className="text-sm font-mono font-medium text-primary bg-surface-hover px-3 py-1.5 rounded-lg border border-border">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <BaseButton onClick={() => saveLogMutation.mutate()} disabled={saveLogMutation.isPending}>
            <Save className="w-4 h-4 mr-1.5 stroke-[2]" />
            {saveLogMutation.isPending ? 'Saving...' : 'Save Log'}
          </BaseButton>
        </div>
      </div>

      {/* Theme-Based Focus Timer & Session Log Widget */}
      <div className="mb-8 bg-surface rounded-2xl p-6 md:p-7 text-primary shadow-sm border border-border space-y-6">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30 shadow-inner">
              <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400 stroke-[1.75]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-lg font-bold text-primary tracking-tight">Theme-Based Focus Timer</h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 uppercase">
                  {activeTheme.badge}
                </span>
              </div>
              <p className="text-xs text-secondary">Set timed sprints or open stopwatches to execute your tasks with precision.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <button 
              onClick={() => setIsFullScreenFocus(true)} 
              className="text-amber-600 dark:text-amber-400 hover:text-amber-500 font-mono text-xs flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer border border-amber-500/20 shadow-2xs"
              title="Enter Immersive Full-Screen Mode"
            >
              <Maximize2 className="w-3.5 h-3.5" /> Full Screen
            </button>
            <div className="bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg flex items-center gap-2 text-amber-700 dark:text-amber-300 text-xs font-mono font-bold shadow-2xs">
              <Trophy className="w-3.5 h-3.5 text-amber-500" /> Today's Total: {Math.floor(secondsElapsed / 3600)}h {Math.floor((secondsElapsed % 3600) / 60)}m
            </div>
          </div>
        </div>

        {/* Target Task Selection Bar ("Set time to do this thing") */}
        <div className="bg-surface-hover border border-border rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 animate-pulse" />
            <span className="text-xs font-mono font-bold text-secondary uppercase tracking-wider shrink-0">Focusing On:</span>
            <input 
              type="text"
              value={focusTask}
              onChange={(e) => setFocusTask(e.target.value)}
              placeholder="What are you executing right now? e.g. System Refactor, Unit Tests..."
              className="flex-1 bg-transparent border-none text-sm text-primary font-medium focus:outline-none placeholder:text-muted min-w-0 font-sans"
            />
          </div>

          <div className="relative shrink-0">
            <button
              onClick={() => setShowTaskDropdown(!showTaskDropdown)}
              className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <ListTodo className="w-3.5 h-3.5" /> Pick Workspace Task <ChevronDown className="w-3 h-3 ml-0.5" />
            </button>

            {showTaskDropdown && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-surface border border-border rounded-xl shadow-2xl p-2 z-30 max-h-64 overflow-y-auto space-y-1 text-left animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[10px] font-mono uppercase font-bold text-secondary px-2 py-1 border-b border-border">Active Issues & Habits</div>
                {issues.map(issue => (
                  <button
                    key={issue.id}
                    onClick={() => {
                      setFocusTask(`[Issue] ${issue.title}`);
                      setShowTaskDropdown(false);
                      toast.info(`Target set: ${issue.title}`);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-primary hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-300 truncate transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" /> {issue.title}
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
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-primary hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-300 truncate transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" /> {habit.name}
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
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-primary hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-300 truncate transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <FolderKanban className="w-3 h-3 text-purple-500 shrink-0" /> {proj.name}
                  </button>
                ))}
                {issues.length === 0 && habits.length === 0 && projects.length === 0 && (
                  <div className="text-xs text-muted px-2 py-2 italic text-center">No active tasks found. Type above!</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Theme Selection Grid */}
        <div className="space-y-2">
          <div className="text-xs font-mono font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Select Timer Theme
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {FOCUS_THEMES.map(t => {
              const Icon = t.icon;
              const isSelected = activeThemeId === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelectTheme(t.id)}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-full relative overflow-hidden group shadow-2xs",
                    isSelected ? t.activeColor : `${t.color} hover:bg-surface-hover`
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={cn("w-4 h-4", isSelected ? "text-white" : "text-primary group-hover:scale-110 transition-transform")} />
                    <span className="text-[10px] font-mono font-bold opacity-80 uppercase">
                      {t.mins === -1 ? `${customMins}m` : t.mins === 0 ? '∞' : `${t.mins}m`}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-xs leading-tight mb-0.5">{t.label}</div>
                    <div className={cn("text-[10px] line-clamp-1 leading-snug", isSelected ? "text-white/80" : "text-secondary")}>
                      {t.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {activeThemeId === 'custom' && (
            <div className="flex items-center gap-3 pt-1 animate-in fade-in duration-150">
              <span className="text-xs font-mono text-secondary">Custom Target Minutes:</span>
              <input
                type="number"
                min={1}
                max={480}
                value={customMins}
                onChange={(e) => handleCustomMinsChange(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 px-3 py-1 bg-surface border border-border rounded-lg text-sm text-primary font-mono font-bold text-center focus:outline-none focus:border-indigo-500"
              />
              <span className="text-xs text-secondary font-sans">minutes ({customMins * 60} seconds target)</span>
            </div>
          )}
        </div>

        {/* Active Display & Controls Strip */}
        <div className="bg-surface-hover border border-border rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-sm">
          <div className="text-center sm:text-left z-10">
            <div className="text-[11px] font-mono uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1 flex items-center justify-center sm:justify-start gap-2 font-bold">
              <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              {activeThemeId === 'stopwatch' ? 'Open Elapsed Stopwatch' : `Remaining — ${activeTheme.label}`}
            </div>
            <div className="text-5xl sm:text-6xl font-mono font-black tracking-wider text-primary my-1">
              {displayTime}
            </div>
            <div className="text-xs font-mono text-secondary flex items-center justify-center sm:justify-start gap-2 mt-1">
              <span>Session Logged: <strong className="text-primary">{Math.floor(sessionSeconds / 60)}m {sessionSeconds % 60}s</strong></span>
              <span>•</span>
              <span className="truncate max-w-[200px] text-primary">{focusTask}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 z-10 w-full sm:w-auto justify-center">
            <button
              onClick={() => {
                const nextRunning = !timerRunning;
                setTimerRunning(nextRunning);
                if (nextRunning) {
                  toast.success(`🚀 Started ${activeTheme.label} on "${focusTask}"!`);
                } else if (!nextRunning && sessionSeconds > 0) {
                  autoSaveTimerMutation.mutate(Math.floor(secondsElapsed / 60));
                  toast.info(`Paused focus timer at ${displayTime}`);
                }
              }}
              className={cn(
                "flex-1 sm:flex-none px-6 py-3.5 rounded-xl font-mono text-sm font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95",
                timerRunning ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25"
              )}
            >
              {timerRunning ? (
                <>
                  <Pause className="w-4 h-4 fill-white shrink-0" /> Pause Timer
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white ml-0.5 shrink-0" /> {sessionSeconds > 0 ? 'Resume' : 'Start Focus'}
                </>
              )}
            </button>

            {sessionSeconds > 0 && (
              <button
                onClick={handleCompleteSessionEarly}
                className="px-4 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 shadow-md shrink-0"
                title="Complete session now and bank elapsed time"
              >
                <CheckCircle2 className="w-4 h-4" /> Bank Session
              </button>
            )}

            <button
              onClick={handleResetTimer}
              className="w-12 h-12 rounded-xl bg-surface border border-border hover:bg-surface text-secondary hover:text-primary flex items-center justify-center transition-all cursor-pointer shrink-0 hover:scale-105 shadow-2xs"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Progress Bar for Countdown Themes */}
          {activeThemeId !== 'stopwatch' && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-border">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400 transition-all duration-300" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* NEW: Interactive Clickable Card Selectors for Mood & Energy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* Mood Selector */}
        <div className="space-y-3">
          <label className="text-xs font-mono font-medium text-primary uppercase tracking-[0.02em] flex items-center gap-2">
            <Smile className="w-4 h-4 text-[#EA580C]" /> Select Today's Mood
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {MOOD_OPTIONS.map((opt) => {
              const isSelected = selectedMood.toLowerCase() === opt.label.toLowerCase();
              const Icon = opt.icon;
              return (
                <div
                  key={opt.label}
                  onClick={() => setSelectedMood(opt.label)}
                  className={cn(
                    "p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 group select-none shadow-2xs",
                    isSelected 
                      ? "bg-primary border-primary text-canvas shadow-sm scale-[1.01]" 
                      : "bg-surface border-border hover:border-border text-primary"
                  )}
                >
                  <Icon className={cn("w-5 h-5 shrink-0 group-hover:scale-110 transition-transform stroke-[1.75]", isSelected ? "text-canvas" : opt.color)} />
                  <div className="min-w-0">
                    <div className={cn("font-medium text-sm leading-tight", isSelected ? "text-canvas" : "text-primary")}>
                      {opt.label}
                    </div>
                    <div className={cn("text-[11px] truncate", isSelected ? "text-canvas/80" : "text-secondary")}>
                      {opt.desc}
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 ml-auto text-emerald-500 shrink-0 stroke-[2.5]" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Energy Selector */}
        <div className="space-y-3">
          <label className="text-xs font-mono font-medium text-primary uppercase tracking-[0.02em] flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Calibrate Energy Level
          </label>
          <div className="grid grid-cols-1 gap-3">
            {ENERGY_OPTIONS.map((opt) => {
              const isSelected = selectedEnergy.toLowerCase() === opt.label.toLowerCase();
              return (
                <div
                  key={opt.label}
                  onClick={() => setSelectedEnergy(opt.label)}
                  className={cn(
                    "p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group select-none shadow-2xs",
                    isSelected 
                      ? "bg-blue-600 border-blue-600 text-white shadow-sm scale-[1.01]" 
                      : "bg-surface border-border hover:border-border text-primary"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-colors",
                      isSelected ? "bg-white/20 text-white" : "bg-surface-hover border border-border text-blue-600 dark:text-blue-400"
                    )}>
                      {opt.label[0]}
                    </div>
                    <div>
                      <div className={cn("font-medium text-sm leading-tight", isSelected ? "text-white" : "text-primary")}>
                        {opt.label} Energy
                      </div>
                      <div className={cn("text-[11px]", isSelected ? "text-white/80" : "text-secondary")}>
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
                          className={cn(
                            "h-4 w-1.5 rounded-full transition-colors",
                            i <= opt.bars ? (isSelected ? "bg-white" : "bg-blue-600 dark:bg-blue-500") : (isSelected ? "bg-white/20" : "bg-surface-hover border border-border")
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

      {/* Wins & Blockers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 items-start">
        {/* Wins */}
        <div className="space-y-3">
          <label className="text-xs font-mono font-medium text-primary uppercase tracking-[0.02em] flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Today's Wins</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{wins.length} recorded</span>
          </label>
          <div className="bg-surface border border-border rounded-xl p-4 min-h-[160px] shadow-sm flex flex-col justify-between">
            <div className="space-y-2 mb-4">
              {wins.map((win, i) => (
                <div key={i} className="flex items-center justify-between gap-2 bg-surface-hover px-3 py-2 rounded-lg border border-border/60 group">
                  <span className="text-sm font-medium text-primary flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" /> {win}
                  </span>
                  <button 
                    onClick={() => setWins(wins.filter((_, idx) => idx !== i))}
                    className="text-muted hover:text-red-600 dark:hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    &times;
                  </button>
                </div>
              ))}
              {wins.length === 0 && <div className="text-muted text-sm font-normal italic py-4 text-center">What went well today? Log your wins!</div>}
            </div>

            <div className="flex gap-2 pt-2 border-t border-border/60">
              <input
                type="text"
                value={newWin}
                onChange={(e) => setNewWin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addWin()}
                placeholder="Add a new win..."
                className="flex-1 px-3 py-1.5 text-xs bg-surface-hover border border-border rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-surface text-primary"
              />
              <button onClick={addWin} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors flex items-center gap-1 cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>
        </div>

        {/* Blockers */}
        <div className="space-y-3">
          <label className="text-xs font-mono font-medium text-primary uppercase tracking-[0.02em] flex items-center justify-between">
            <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" /> Blockers & Issues</span>
            <span className="text-red-600 dark:text-red-400 font-bold">{blockers.length} logged</span>
          </label>
          <div className="bg-surface border border-border rounded-xl p-4 min-h-[160px] shadow-sm flex flex-col justify-between">
            <div className="space-y-2 mb-4">
              {blockers.map((blocker, i) => (
                <div key={i} className="flex items-center justify-between gap-2 bg-surface-hover px-3 py-2 rounded-lg border border-border/60 group">
                  <span className="text-sm font-medium text-primary flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" /> {blocker}
                  </span>
                  <button 
                    onClick={() => setBlockers(blockers.filter((_, idx) => idx !== i))}
                    className="text-muted hover:text-red-600 dark:hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    &times;
                  </button>
                </div>
              ))}
              {blockers.length === 0 && <div className="text-muted text-sm font-normal italic py-4 text-center">No blockers slowing down your momentum!</div>}
            </div>

            <div className="flex gap-2 pt-2 border-t border-border/60">
              <input
                type="text"
                value={newBlocker}
                onChange={(e) => setNewBlocker(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addBlocker()}
                placeholder="Add a blocker or risk..."
                className="flex-1 px-3 py-1.5 text-xs bg-surface-hover border border-border rounded-lg focus:outline-none focus:border-red-500 focus:bg-surface text-primary"
              />
              <button onClick={addBlocker} className="px-3 py-1.5 bg-primary text-canvas rounded-lg text-xs font-medium hover:opacity-90 transition-opacity flex items-center gap-1 cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-3 mb-8">
        <label className="text-xs font-mono font-medium text-primary uppercase tracking-[0.02em] flex items-center justify-between">
          <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Brain Dump / Architecture Notes</span>
          <span className="text-secondary text-[11px] font-normal font-sans">Supports markdown & reflections</span>
        </label>
        <textarea 
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-surface border border-border rounded-xl p-4 min-h-[140px] text-sm text-primary focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none placeholder:text-muted transition-all shadow-sm font-sans"
          placeholder="Record key architecture reflections, design notes, or carryover tasks for tomorrow..."
        />
      </div>

      {/* Footer Action */}
      <div className="flex justify-end pt-4 border-t border-border">
        <BaseButton onClick={() => saveLogMutation.mutate()} disabled={saveLogMutation.isPending}>
          <Save className="w-4 h-4 mr-1.5 stroke-[2]" />
          {saveLogMutation.isPending ? 'Saving...' : 'Save Complete Review'}
        </BaseButton>
      </div>

    </div>
  );
}
