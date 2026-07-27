import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { CalendarCheck, Save, Brain, Zap, Smile, Play, Pause, RotateCcw, Plus, Sparkles, Check, Clock, Trophy, AlertTriangle, FileText, Activity, AlertCircle, Maximize2, Minimize2, Rocket, Target, Settings, ListTodo, CheckCircle2, ChevronDown, FolderKanban, Moon, Wand2, Sunset } from 'lucide-react';
import { BaseButton } from './ui/BaseButton';
import { LoadingState } from './ui/LoadingState';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const MOOD_OPTIONS = [
  { label: 'Flow State', icon: Sparkles, desc: 'Peak execution velocity', color: 'text-[#F59E0B] dark:text-[#FBBF24]', bg: 'bg-[#F59E0B]/10 border-[#F59E0B]/20' },
  { label: 'Deep Focus', icon: Brain, desc: 'Sustained cognitive immersion', color: 'text-[#2563EB] dark:text-[#00E5FF]', bg: 'bg-[#2563EB]/10 border-[#2563EB]/20' },
  { label: 'Calm & Steady', icon: Activity, desc: 'Nominal operational output', color: 'text-[#109868]', bg: 'bg-[#109868]/10 border-[#109868]/20' },
  { label: 'Fatigued', icon: Clock, desc: 'Low momentum / evening drift', color: 'text-[#D97706]', bg: 'bg-[#D97706]/10 border-[#D97706]/20' },
  { label: 'Blocked / Risk', icon: AlertCircle, desc: 'System impediment detected', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10 border-red-500/20' }
];

const ENERGY_OPTIONS = [
  { label: 'High', bars: 3, desc: 'Ready for architecture & complex refactoring' },
  { label: 'Medium', bars: 2, desc: 'Standard operating throughput' },
  { label: 'Low', bars: 1, desc: 'Recommended for documentation & light reviews' }
];

const FOCUS_THEMES = [
  { id: 'sprint', label: '25m Focus Sprint', mins: 25, icon: Rocket, color: 'border-[#F59E0B]/30 hover:border-[#F59E0B] bg-[#F59E0B]/10 text-[#D97706] dark:text-[#FBBF24]', activeColor: 'bg-[#F59E0B] text-white dark:text-[#050811] border-[#F59E0B] ring-2 ring-[#F59E0B]/50 font-bold', badge: 'POMODORO SPRINT', desc: 'High-intensity Pomodoro sprint for rapid code execution' },
  { id: 'deep', label: '45m Deep Work', mins: 45, icon: Brain, color: 'border-[#4F46E5]/30 hover:border-[#4F46E5] bg-[#4F46E5]/10 text-[#4F46E5] dark:text-[#818CF8]', activeColor: 'bg-[#4F46E5] text-white border-[#4F46E5] ring-2 ring-[#4F46E5]/50 font-bold', badge: 'COGNITIVE IMMERSION', desc: 'Sustained focus for complex architecture & refactoring' },
  { id: 'quick', label: '15m Quick Pulse', mins: 15, icon: Zap, color: 'border-[#109868]/30 hover:border-[#109868] bg-[#109868]/10 text-[#109868]', activeColor: 'bg-[#109868] text-white border-[#109868] ring-2 ring-[#109868]/50 font-bold', badge: 'RAPID REFACTOR', desc: 'Short maintenance burst, PR reviews, and bug squashing' },
  { id: 'stopwatch', label: 'Open Stopwatch', mins: 0, icon: Clock, color: 'border-[#2563EB]/30 hover:border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB] dark:text-[#00E5FF]', activeColor: 'bg-[#2563EB] text-white border-[#2563EB] ring-2 ring-[#2563EB]/50 font-bold', badge: 'UNBOUNDED FLOW', desc: 'Count up indefinitely without time constraints' },
  { id: 'custom', label: 'Custom Timer', mins: -1, icon: Settings, color: 'border-[#7C3AED]/30 hover:border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED] dark:text-[#A78BFA]', activeColor: 'bg-[#7C3AED] text-white border-[#7C3AED] ring-2 ring-[#7C3AED]/50 font-bold', badge: 'CUSTOM TARGET', desc: 'Set your own custom minutes target for this session' }
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

  const [selectedMood, setSelectedMood] = useState<string>(todayLog?.mood || 'Flow State');
  const [selectedEnergy, setSelectedEnergy] = useState<string>(todayLog?.energy || 'High');
  const [wins, setWins] = useState<string[]>(todayLog?.wins || []);
  const [blockers, setBlockers] = useState<string[]>(todayLog?.blockers || []);
  const [newWin, setNewWin] = useState('');
  const [newBlocker, setNewBlocker] = useState('');
  const [notes, setNotes] = useState(todayLog?.notes || '');
  const [shutdownComplete, setShutdownComplete] = useState(false);

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
    return saved || 'System Architecture & Engineering Execution';
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
      toast.success('Daily review log & evening telemetry saved!');
    }
  });

  const handleEveningShutdown = () => {
    saveLogMutation.mutate();
    setShutdownComplete(true);
    toast.success(`🌙 Evening Shutdown Complete! Logged ${wins.length} wins and banked ${Math.floor(secondsElapsed / 60)}m of deep work. All systems archived for tomorrow.`);
  };

  if (isLoading) return <LoadingState variant="daily-review" title="Loading Evening Debrief..." description="Aggregating today's execution logs and Pomodoro timers..." />;

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
        <div className="fixed inset-0 z-[100] bg-[#050811] flex flex-col items-center justify-center text-white animate-in fade-in zoom-in-95 duration-200 p-6 select-none font-sans">
          <button
            onClick={() => setIsFullScreenFocus(false)}
            className="absolute top-8 right-8 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs flex items-center gap-2 transition-colors cursor-pointer border border-white/10 shadow-lg"
            title="Exit Full-Screen Focus Mode (Esc)"
          >
            <Minimize2 className="w-4 h-4 stroke-[1.5]" /> Exit Focus Mode (Esc)
          </button>

          <div className="flex flex-col items-center max-w-2xl w-full text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#F59E0B]/20 to-[#4F46E5]/20 border border-[#F59E0B]/30 flex items-center justify-center mb-6 shadow-2xl">
              <Brain className="w-10 h-10 text-[#FBBF24] animate-pulse stroke-[1.5]" />
            </div>
            
            <div className="flex items-center gap-3 mb-4 font-mono">
              <span className="px-3 py-1 rounded-full bg-[#F59E0B]/20 border border-[#F59E0B]/40 text-[#FBBF24] text-xs font-bold uppercase tracking-wider">
                {activeTheme.badge}
              </span>
              <span className="text-xs uppercase tracking-[0.2em] text-muted flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#109868] animate-ping inline-block" /> ACTIVE SESSION
              </span>
            </div>

            <div className="text-lg sm:text-2xl font-bold text-gray-200 mb-8 px-6 py-2.5 rounded-2xl bg-white/5 border border-white/10 max-w-xl truncate">
              🎯 {focusTask}
            </div>

            <h1 className="text-7xl sm:text-8xl md:text-9xl font-mono font-black tracking-tight text-white mb-12 drop-shadow-2xl">
              {displayTime}
            </h1>
            
            <p className="text-xs sm:text-sm text-muted mb-12 max-w-md font-mono leading-relaxed">
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
                  timerRunning ? "bg-[#D97706] hover:bg-[#F59E0B] text-white" : "bg-[#F59E0B] hover:bg-[#D97706] text-white shadow-[#F59E0B]/30"
                )}
              >
                {timerRunning ? (
                  <>
                    <Pause className="w-5 h-5 fill-white stroke-[1.5]" /> Pause Focus
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-white ml-0.5 stroke-[1.5]" /> Resume Focus
                  </>
                )}
              </button>

              {sessionSeconds > 0 && (
                <button
                  onClick={() => {
                    handleCompleteSessionEarly();
                    setIsFullScreenFocus(false);
                  }}
                  className="px-6 py-4 rounded-full bg-[#109868] hover:opacity-90 text-white font-mono text-sm font-bold flex items-center gap-2 transition-all cursor-pointer hover:scale-105 shadow-xl"
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
      
      {/* AMBER REFLECTION IDENTITY HEADER (#F59E0B / #FBBF24) */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6 bg-surface p-6 rounded-2xl shadow-2xs border-l-4 border-l-[#F59E0B]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F59E0B] dark:bg-[#FBBF24] text-white dark:text-[#050811] flex items-center justify-center shrink-0 shadow-sm border border-[#F59E0B]/20">
            <Sunset className="w-6 h-6 stroke-[1.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-h2 font-bold tracking-tight text-primary leading-none">Daily Review & Reflection</h1>
              <span className="bg-[#F59E0B]/10 text-[#D97706] dark:text-[#FBBF24] border border-[#F59E0B]/30 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#F59E0B] stroke-[1.5]" /> Evening Debrief
              </span>
            </div>
            <p className="text-xs text-secondary font-mono">Calibrated evening review, deep work Pomodoro logs, and 1-click shutdown.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <span className="text-xs font-mono font-bold text-primary bg-surface-hover px-3.5 py-2 rounded-xl border border-border shadow-2xs">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <BaseButton onClick={() => saveLogMutation.mutate()} disabled={saveLogMutation.isPending} className="cursor-pointer bg-[#F59E0B] hover:bg-[#D97706] text-white dark:text-[#050811] font-bold">
            <Save className="w-4 h-4 mr-1.5 stroke-[1.5]" />
            {saveLogMutation.isPending ? 'Saving...' : 'Save Review'}
          </BaseButton>
        </div>
      </div>

      {/* AI SUNSET SENTINEL BANNER (Amber Reflection Identity) */}
      <div className="mb-8 bg-gradient-to-r from-[#F59E0B]/15 via-surface to-transparent border border-[#F59E0B]/30 rounded-2xl p-5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/20 text-[#D97706] dark:text-[#FBBF24] flex items-center justify-center shrink-0 border border-[#F59E0B]/30">
            <Wand2 className="w-5 h-5 stroke-[1.5]" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-primary flex items-center gap-2">
              AI Sunset Sentinel <span className="bg-[#F59E0B]/20 text-[#D97706] dark:text-[#FBBF24] px-2 py-0.2 rounded text-[10px] font-mono font-bold uppercase">Evening Analysis</span>
            </h3>
            <p className="text-xs text-secondary font-mono mt-0.5 leading-relaxed">
              You logged <strong className="text-primary">{Math.floor(secondsElapsed / 60)}m</strong> of deep focus today across <strong className="text-primary">{wins.length} wins</strong>. 
              {wins.length >= 3 
                ? " Outstanding momentum! Calibrate your energy levels below before executing your evening shutdown."
                : " Review your open blockers and note carryover architecture tasks for tomorrow morning."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => toast.success("✨ AI Reflection Insight: Your highest velocity correlates with 45m Deep Work sprints in the morning.")}
          className="px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-hover text-primary font-mono text-xs font-bold border border-border shadow-2xs transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#F59E0B] stroke-[1.5]" /> Analyze Flow Telemetry
        </button>
      </div>

      {/* THEME-BASED FOCUS TIMER & POMODORO WIDGET */}
      <div className="mb-8 bg-surface rounded-2xl p-6 md:p-7 text-primary shadow-xs border border-border space-y-6">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#F59E0B]/15 flex items-center justify-center shrink-0 border border-[#F59E0B]/30 shadow-2xs">
              <Brain className="w-5 h-5 text-[#D97706] dark:text-[#FBBF24] stroke-[1.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-lg font-bold text-primary tracking-tight">Theme-Based Focus Timer</h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#F59E0B]/10 text-[#D97706] dark:text-[#FBBF24] border border-[#F59E0B]/30 uppercase">
                  {activeTheme.badge}
                </span>
              </div>
              <p className="text-xs text-secondary font-mono">Set timed Pomodoro sprints or open stopwatches to execute your tasks with precision.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <button 
              onClick={() => setIsFullScreenFocus(true)} 
              className="text-[#D97706] dark:text-[#FBBF24] hover:opacity-80 font-mono text-xs font-bold flex items-center gap-1.5 bg-[#F59E0B]/10 px-3.5 py-2 rounded-xl transition-colors cursor-pointer border border-[#F59E0B]/20 shadow-2xs"
              title="Enter Immersive Full-Screen Mode"
            >
              <Maximize2 className="w-3.5 h-3.5 stroke-[1.5]" /> Full Screen
            </button>
            <div className="bg-[#F59E0B]/15 border border-[#F59E0B]/30 px-3.5 py-2 rounded-xl flex items-center gap-2 text-[#D97706] dark:text-[#FBBF24] text-xs font-mono font-bold shadow-2xs">
              <Trophy className="w-3.5 h-3.5 text-[#F59E0B] stroke-[1.5]" /> Banked Today: {Math.floor(secondsElapsed / 3600)}h {Math.floor((secondsElapsed % 3600) / 60)}m
            </div>
          </div>
        </div>

        {/* Target Task Selection Bar */}
        <div className="bg-surface-hover/80 border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <Target className="w-4 h-4 text-[#F59E0B] shrink-0 animate-pulse stroke-[1.5]" />
            <span className="text-xs font-mono font-bold text-secondary uppercase tracking-wider shrink-0">Focusing On:</span>
            <input 
              type="text"
              value={focusTask}
              onChange={(e) => setFocusTask(e.target.value)}
              placeholder="What are you executing right now? e.g. System Refactor, Unit Tests..."
              className="flex-1 bg-transparent border-none text-sm text-primary font-bold focus:outline-none placeholder:text-muted min-w-0 font-sans"
            />
          </div>

          <div className="relative shrink-0">
            <button
              onClick={() => setShowTaskDropdown(!showTaskDropdown)}
              className="px-3.5 py-1.5 bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 text-[#D97706] dark:text-[#FBBF24] border border-[#F59E0B]/30 rounded-lg text-xs font-mono font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <ListTodo className="w-3.5 h-3.5 stroke-[1.5]" /> Pick Task <ChevronDown className="w-3 h-3 ml-0.5 stroke-[1.5]" />
            </button>

            {showTaskDropdown && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-surface border border-border rounded-xl shadow-2xl p-2 z-30 max-h-64 overflow-y-auto space-y-1 text-left animate-in fade-in zoom-in-95 duration-150 font-sans">
                <div className="text-[10px] font-mono uppercase font-bold text-secondary px-2 py-1 border-b border-border">Active Issues & Habits</div>
                {issues.map(issue => (
                  <button
                    key={issue.id}
                    onClick={() => {
                      setFocusTask(`[Issue] ${issue.title}`);
                      setShowTaskDropdown(false);
                      toast.info(`Target set: ${issue.title}`);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-primary hover:bg-[#F59E0B]/10 hover:text-[#D97706] dark:hover:text-[#FBBF24] truncate transition-colors flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] shrink-0" /> {issue.title}
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
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-primary hover:bg-[#109868]/10 hover:text-[#109868] truncate transition-colors flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#109868] shrink-0" /> {habit.name}
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
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-primary hover:bg-[#4F46E5]/10 hover:text-[#4F46E5] dark:hover:text-[#818CF8] truncate transition-colors flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <FolderKanban className="w-3 h-3 text-[#4F46E5] shrink-0 stroke-[1.5]" /> {proj.name}
                  </button>
                ))}
                {issues.length === 0 && habits.length === 0 && projects.length === 0 && (
                  <div className="text-xs text-muted px-2 py-2 italic text-center font-mono">No active tasks found. Type above!</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Theme Selection Grid */}
        <div className="space-y-2.5">
          <div className="text-xs font-mono font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#F59E0B] stroke-[1.5]" /> Select Timer Theme
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {FOCUS_THEMES.map(t => {
              const Icon = t.icon;
              const isSelected = activeThemeId === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelectTheme(t.id)}
                  className={cn(
                    "p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-full relative overflow-hidden group shadow-2xs",
                    isSelected ? t.activeColor : `${t.color} hover:bg-surface-hover`
                  )}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <Icon className={cn("w-4 h-4 stroke-[1.5]", isSelected ? "text-white dark:text-[#050811]" : "text-primary group-hover:scale-110 transition-transform")} />
                    <span className="text-[11px] font-mono font-bold opacity-90 uppercase">
                      {t.mins === -1 ? `${customMins}m` : t.mins === 0 ? '∞' : `${t.mins}m`}
                    </span>
                  </div>
                  <div>
                    <div className="font-bold text-xs leading-tight mb-0.5">{t.label}</div>
                    <div className={cn("text-[10px] line-clamp-1 leading-snug font-normal", isSelected ? "text-white/80 dark:text-[#050811]/80" : "text-secondary")}>
                      {t.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {activeThemeId === 'custom' && (
            <div className="flex items-center gap-3 pt-2 animate-in fade-in duration-150 font-mono text-xs">
              <span className="text-secondary font-bold">Custom Target Minutes:</span>
              <input
                type="number"
                min={1}
                max={480}
                value={customMins}
                onChange={(e) => handleCustomMinsChange(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-primary font-bold text-center focus:outline-none focus:border-[#F59E0B]"
              />
              <span className="text-secondary font-sans">minutes ({customMins * 60} seconds target)</span>
            </div>
          )}
        </div>

        {/* Active Display & Controls Strip */}
        <div className="bg-surface-hover/80 border border-border rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-xs">
          <div className="text-center sm:text-left z-10">
            <div className="text-xs font-mono uppercase tracking-widest text-[#D97706] dark:text-[#FBBF24] mb-1 flex items-center justify-center sm:justify-start gap-2 font-bold">
              <Clock className="w-3.5 h-3.5 text-[#F59E0B] animate-pulse stroke-[1.5]" />
              {activeThemeId === 'stopwatch' ? 'Open Elapsed Stopwatch' : `Remaining — ${activeTheme.label}`}
            </div>
            <div className="text-5xl sm:text-6xl font-mono font-black tracking-wider text-primary my-1">
              {displayTime}
            </div>
            <div className="text-xs font-mono text-secondary flex items-center justify-center sm:justify-start gap-2 mt-1.5 font-medium">
              <span>Logged: <strong className="text-primary font-bold">{Math.floor(sessionSeconds / 60)}m {sessionSeconds % 60}s</strong></span>
              <span>•</span>
              <span className="truncate max-w-[220px] text-primary font-bold">{focusTask}</span>
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
                timerRunning ? "bg-[#D97706] hover:bg-[#F59E0B] text-white" : "bg-[#F59E0B] hover:bg-[#D97706] text-white shadow-[#F59E0B]/25"
              )}
            >
              {timerRunning ? (
                <>
                  <Pause className="w-4 h-4 fill-white shrink-0 stroke-[1.5]" /> Pause Timer
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white ml-0.5 shrink-0 stroke-[1.5]" /> {sessionSeconds > 0 ? 'Resume' : 'Start Focus'}
                </>
              )}
            </button>

            {sessionSeconds > 0 && (
              <button
                onClick={handleCompleteSessionEarly}
                className="px-4 py-3.5 bg-[#109868] hover:opacity-90 text-white font-mono text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 shadow-md shrink-0"
                title="Complete session now and bank elapsed time"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[1.5]" /> Bank Session
              </button>
            )}

            <button
              onClick={handleResetTimer}
              className="w-12 h-12 rounded-xl bg-surface border border-border hover:bg-surface text-secondary hover:text-primary flex items-center justify-center transition-all cursor-pointer shrink-0 hover:scale-105 shadow-2xs"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4 stroke-[1.5]" />
            </button>
          </div>

          {/* Progress Bar for Countdown Themes */}
          {activeThemeId !== 'stopwatch' && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-border">
              <div 
                className="h-full bg-gradient-to-r from-[#F59E0B] via-[#4F46E5] to-[#109868] transition-all duration-300" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* INTERACTIVE CLICKABLE CARD SELECTORS FOR MOOD & ENERGY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* Mood Selector (Precision Lucide Icons, Never Emojis) */}
        <div className="space-y-3">
          <label className="text-xs font-mono font-bold text-primary uppercase tracking-wider flex items-center gap-2">
            <Smile className="w-4 h-4 text-[#F59E0B] stroke-[1.5]" /> Calibrate Today's Mood
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MOOD_OPTIONS.map((opt) => {
              const isSelected = selectedMood.toLowerCase() === opt.label.toLowerCase();
              const Icon = opt.icon;
              return (
                <div
                  key={opt.label}
                  onClick={() => setSelectedMood(opt.label)}
                  className={cn(
                    "p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3.5 group select-none shadow-2xs",
                    isSelected 
                      ? "bg-primary border-primary text-surface shadow-sm scale-[1.01]" 
                      : "bg-surface border-border hover:border-[#F59E0B]/60 text-primary"
                  )}
                >
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", isSelected ? "bg-surface/20" : opt.bg)}>
                    <Icon className={cn("w-5 h-5 stroke-[1.5]", isSelected ? "text-surface" : opt.color)} />
                  </div>
                  <div className="min-w-0">
                    <div className={cn("font-bold text-sm leading-tight", isSelected ? "text-surface" : "text-primary")}>
                      {opt.label}
                    </div>
                    <div className={cn("text-[11px] truncate font-mono mt-0.5", isSelected ? "text-surface/80" : "text-secondary")}>
                      {opt.desc}
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 ml-auto text-[#109868] shrink-0 stroke-[2.5]" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Energy Selector */}
        <div className="space-y-3">
          <label className="text-xs font-mono font-bold text-primary uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#2563EB] dark:text-[#00E5FF] stroke-[1.5]" /> Calibrate Energy Level
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
                      ? "bg-[#2563EB] dark:bg-[#00E5FF] border-[#2563EB] dark:border-[#00E5FF] text-white dark:text-[#050811] shadow-sm scale-[1.01]" 
                      : "bg-surface border-border hover:border-border text-primary"
                  )}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-colors",
                      isSelected ? "bg-white/20 dark:bg-black/20 text-white dark:text-[#050811]" : "bg-surface-hover border border-border text-[#2563EB] dark:text-[#00E5FF]"
                    )}>
                      {opt.label[0]}
                    </div>
                    <div>
                      <div className={cn("font-bold text-sm leading-tight", isSelected ? "text-white dark:text-[#050811]" : "text-primary")}>
                        {opt.label} Energy
                      </div>
                      <div className={cn("text-[11px] font-mono mt-0.5", isSelected ? "text-white/80 dark:text-[#050811]/80" : "text-secondary")}>
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
                            i <= opt.bars ? (isSelected ? "bg-white dark:bg-[#050811]" : "bg-[#2563EB] dark:bg-[#00E5FF]") : (isSelected ? "bg-white/20 dark:bg-black/20" : "bg-surface-hover border border-border")
                          )} 
                        />
                      ))}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-white dark:text-[#050811] shrink-0 stroke-[2.5]" />}
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
          <label className="text-xs font-mono font-bold text-primary uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-[#109868] stroke-[1.5]" /> Today's Recorded Wins</span>
            <span className="text-[#109868] font-bold">{wins.length} Logged</span>
          </label>
          <div className="bg-surface border border-border rounded-2xl p-5 min-h-[180px] shadow-xs flex flex-col justify-between gap-4">
            <div className="space-y-2">
              {wins.map((win, i) => (
                <div key={i} className="flex items-center justify-between gap-2 bg-surface-hover/80 px-3.5 py-2.5 rounded-xl border border-border/80 group">
                  <span className="text-sm font-medium text-primary flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-[#109868] shrink-0" /> {win}
                  </span>
                  <button 
                    onClick={() => setWins(wins.filter((_, idx) => idx !== i))}
                    className="text-muted hover:text-red-600 dark:hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 font-bold"
                  >
                    &times;
                  </button>
                </div>
              ))}
              {wins.length === 0 && <div className="text-secondary text-xs font-mono italic py-6 text-center">What went well today? Log your engineering wins!</div>}
            </div>

            <div className="flex gap-2 pt-3 border-t border-border/80">
              <input
                type="text"
                value={newWin}
                onChange={(e) => setNewWin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addWin()}
                placeholder="Add a new engineering win or PR milestone..."
                className="flex-1 px-3.5 py-2 text-xs bg-surface-hover border border-border rounded-xl focus:outline-none focus:border-[#109868] focus:bg-surface text-primary font-medium"
              />
              <button onClick={addWin} className="px-4 py-2 bg-[#109868] text-white rounded-xl text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs">
                <Plus className="w-3.5 h-3.5 stroke-[1.5]" /> Add
              </button>
            </div>
          </div>
        </div>

        {/* Blockers */}
        <div className="space-y-3">
          <label className="text-xs font-mono font-bold text-primary uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 stroke-[1.5]" /> Blockers & Technical Risks</span>
            <span className="text-red-600 dark:text-red-400 font-bold">{blockers.length} Logged</span>
          </label>
          <div className="bg-surface border border-border rounded-2xl p-5 min-h-[180px] shadow-xs flex flex-col justify-between gap-4">
            <div className="space-y-2">
              {blockers.map((blocker, i) => (
                <div key={i} className="flex items-center justify-between gap-2 bg-surface-hover/80 px-3.5 py-2.5 rounded-xl border border-border/80 group">
                  <span className="text-sm font-medium text-primary flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" /> {blocker}
                  </span>
                  <button 
                    onClick={() => setBlockers(blockers.filter((_, idx) => idx !== i))}
                    className="text-muted hover:text-red-600 dark:hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 font-bold"
                  >
                    &times;
                  </button>
                </div>
              ))}
              {blockers.length === 0 && <div className="text-secondary text-xs font-mono italic py-6 text-center">No technical blockers impeding your momentum!</div>}
            </div>

            <div className="flex gap-2 pt-3 border-t border-border/80">
              <input
                type="text"
                value={newBlocker}
                onChange={(e) => setNewBlocker(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addBlocker()}
                placeholder="Add a blocker, bug, or carryover risk..."
                className="flex-1 px-3.5 py-2 text-xs bg-surface-hover border border-border rounded-xl focus:outline-none focus:border-red-500 focus:bg-surface text-primary font-medium"
              />
              <button onClick={addBlocker} className="px-4 py-2 bg-primary text-canvas rounded-xl text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs">
                <Plus className="w-3.5 h-3.5 stroke-[1.5]" /> Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* NOTES & CARRYOVER ARCHITECTURE DUMP */}
      <div className="space-y-3 mb-10">
        <label className="text-xs font-mono font-bold text-primary uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-[#F59E0B] stroke-[1.5]" /> Evening Brain Dump & Architecture Carryover</span>
          <span className="text-secondary text-xs font-mono">Supports markdown & technical notes</span>
        </label>
        <textarea 
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-surface border border-border rounded-2xl p-5 min-h-[140px] text-sm text-primary focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] resize-none placeholder:text-muted transition-all shadow-xs font-sans leading-relaxed"
          placeholder="Record key architecture reflections, design notes, or carryover tasks for tomorrow morning's execution loop..."
        />
      </div>

      {/* HERO MOMENT: 1-CLICK EVENING SHUTDOWN & DAY-END CELEBRATION */}
      <div className="bg-gradient-to-r from-[#F59E0B]/20 via-surface to-[#109868]/15 border-2 border-[#F59E0B] rounded-2xl p-6 md:p-8 shadow-md flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-[#F59E0B]/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-4 text-center md:text-left">
          <div className="w-14 h-14 rounded-2xl bg-[#F59E0B] dark:bg-[#FBBF24] text-white dark:text-[#050811] flex items-center justify-center shrink-0 shadow-md border border-[#F59E0B]/30">
            <Moon className="w-7 h-7 stroke-[1.5] animate-bounce" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-primary mb-1">
              {shutdownComplete ? "🌙 Evening Shutdown Complete — All Systems nominal." : "Ready for 1-Click Evening Shutdown?"}
            </h3>
            <p className="text-xs text-secondary font-mono max-w-xl">
              {shutdownComplete 
                ? "Today's telemetry has been archived. Step away from the workstation and recharge for tomorrow's execution loop."
                : "Lock in today's Pomodoro logs, win metrics, and mood calibration. Disconnect with complete peace of mind."}
            </p>
          </div>
        </div>

        <button
          onClick={handleEveningShutdown}
          disabled={shutdownComplete || saveLogMutation.isPending}
          className={cn(
            "px-6 py-4 rounded-2xl font-mono text-sm font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg shrink-0 w-full md:w-auto",
            shutdownComplete ? "bg-[#109868] text-white cursor-default" : "bg-primary hover:bg-primary/90 text-surface hover:scale-105 active:scale-95"
          )}
        >
          {shutdownComplete ? (
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
