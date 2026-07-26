import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { CalendarCheck, Save, Brain, Zap, Smile, Play, Pause, RotateCcw, Plus, Sparkles, Check, Clock, Trophy, AlertTriangle, FileText, Activity, AlertCircle } from 'lucide-react';
import { BaseButton } from './ui/BaseButton';
import { LoadingState } from './ui/LoadingState';
import { cn } from '../lib/utils';

const MOOD_OPTIONS = [
  { label: 'Great', icon: Sparkles, desc: 'Peak flow & output', color: 'text-[#0D9488]' },
  { label: 'Good', icon: Zap, desc: 'Steady & productive', color: 'text-[#2563EB]' },
  { label: 'Neutral', icon: Activity, desc: 'Average execution', color: 'text-[#6B7280]' },
  { label: 'Tired', icon: Clock, desc: 'Low momentum', color: 'text-[#D97706]' },
  { label: 'Burned Out', icon: AlertCircle, desc: 'Need recovery', color: 'text-[#DC2626]' }
];

const ENERGY_OPTIONS = [
  { label: 'High', bars: 3, desc: 'Ready for deep architecture' },
  { label: 'Medium', bars: 2, desc: 'Standard operating level' },
  { label: 'Low', bars: 1, desc: 'Better for admin / light tasks' }
];

export function DailyReview() {
  const queryClient = useQueryClient();
  const { data: logs = [], isLoading } = useQuery({ queryKey: ['daily-logs'], queryFn: api.dailyLogs.list });

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

  // Live Deep Work Timer State
  const [timerRunning, setTimerRunning] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState<number>(todayLog ? todayLog.deepWorkMinutes * 60 : 0);

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
        setSecondsElapsed(prev => {
          const nextVal = prev + 1;
          if (nextVal % 60 === 0) {
            autoSaveTimerMutation.mutate(Math.floor(nextVal / 60));
          }
          return nextVal;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

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
      alert('Daily review log saved successfully!');
    }
  });

  if (isLoading) return <LoadingState title="Loading Daily Review..." description="Fetching today's execution logs and deep work timers..." />;

  const hours = Math.floor(secondsElapsed / 3600);
  const mins = Math.floor((secondsElapsed % 3600) / 60);
  const secs = secondsElapsed % 60;
  const timeFormatted = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

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
      
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E8EC] pb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[12px] bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-sm">
            <CalendarCheck className="w-5 h-5 stroke-[1.75]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-[28px] font-medium tracking-tight text-[#111827]">Daily Review</h1>
              <span className="bg-[#F8F9FB] text-[#6B7280] border border-[#E5E8EC] px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-[0.02em] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#111827] stroke-[2]" /> Daily Sync
              </span>
            </div>
            <p className="text-[13px] text-[#6B7280]">Reflect on today's execution, track live deep work sessions, and calibrate energy.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <span className="text-sm font-mono font-medium text-[#111827] bg-[#F8F9FB] px-3 py-1.5 rounded-lg border border-[#E5E8EC]">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <BaseButton onClick={() => saveLogMutation.mutate()} disabled={saveLogMutation.isPending}>
            <Save className="w-4 h-4 mr-1.5 stroke-[2]" />
            {saveLogMutation.isPending ? 'Saving...' : 'Save Log'}
          </BaseButton>
        </div>
      </div>

      {/* NEW: Live Deep Work Timer / Stopwatch Widget */}
      <div className="mb-8 bg-[#111827] rounded-xl p-6 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
            <Brain className="w-6 h-6 text-white stroke-[1.5]" />
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.02em] text-[#9CA3AF] mb-0.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Deep Work Stopwatch
            </div>
            <h2 className="text-xl font-medium">Focus Session Log</h2>
            <p className="text-xs text-[#9CA3AF]">Record uninterrupted engineering time directly to your daily score.</p>
          </div>
        </div>

        <div className="flex items-center gap-6 self-stretch md:self-auto justify-between md:justify-end bg-white/5 px-5 py-3 rounded-xl border border-white/10">
          <div className="text-center md:text-left">
            <div className="text-[10px] font-mono uppercase text-[#9CA3AF] mb-0.5">Elapsed Time</div>
            <div className="text-3xl font-mono font-bold tracking-wider text-white">
              {timeFormatted}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const nextRunning = !timerRunning;
                setTimerRunning(nextRunning);
                if (!nextRunning && secondsElapsed > 0) {
                  const mins = Math.max(1, Math.floor(secondsElapsed / 60));
                  autoSaveTimerMutation.mutate(mins);
                }
              }}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm",
                timerRunning ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-white hover:bg-[#F8F9FB] text-[#111827]"
              )}
              title={timerRunning ? "Pause Timer" : "Start Focus Timer"}
            >
              {timerRunning ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-[#111827] ml-0.5" />}
            </button>

            <button
              onClick={() => {
                setTimerRunning(false);
                setSecondsElapsed(0);
                autoSaveTimerMutation.mutate(0);
              }}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* NEW: Interactive Clickable Card Selectors for Mood & Energy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* Mood Selector */}
        <div className="space-y-3">
          <label className="text-xs font-mono font-medium text-[#111827] uppercase tracking-[0.02em] flex items-center gap-2">
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
                      ? "bg-[#111827] border-[#111827] text-white shadow-sm scale-[1.01]" 
                      : "bg-white border-[#E5E8EC] hover:border-[#D1D5DB] text-[#111827]"
                  )}
                >
                  <Icon className={cn("w-5 h-5 shrink-0 group-hover:scale-110 transition-transform stroke-[1.75]", isSelected ? "text-white" : opt.color)} />
                  <div className="min-w-0">
                    <div className={cn("font-medium text-sm leading-tight", isSelected ? "text-white" : "text-[#111827]")}>
                      {opt.label}
                    </div>
                    <div className={cn("text-[11px] truncate", isSelected ? "text-white/70" : "text-[#6B7280]")}>
                      {opt.desc}
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 ml-auto text-[#0D9488] shrink-0 stroke-[2.5]" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Energy Selector */}
        <div className="space-y-3">
          <label className="text-xs font-mono font-medium text-[#111827] uppercase tracking-[0.02em] flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#2563EB]" /> Calibrate Energy Level
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
                      ? "bg-[#2563EB] border-[#2563EB] text-white shadow-sm scale-[1.01]" 
                      : "bg-white border-[#E5E8EC] hover:border-[#D1D5DB] text-[#111827]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-colors",
                      isSelected ? "bg-white/20 text-white" : "bg-[#F8F9FB] border border-[#E5E8EC] text-[#2563EB]"
                    )}>
                      {opt.label[0]}
                    </div>
                    <div>
                      <div className={cn("font-medium text-sm leading-tight", isSelected ? "text-white" : "text-[#111827]")}>
                        {opt.label} Energy
                      </div>
                      <div className={cn("text-[11px]", isSelected ? "text-white/80" : "text-[#6B7280]")}>
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
                            i <= opt.bars ? (isSelected ? "bg-white" : "bg-[#2563EB]") : (isSelected ? "bg-white/20" : "bg-[#E5E8EC]")
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
          <label className="text-xs font-mono font-medium text-[#111827] uppercase tracking-[0.02em] flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-[#0D9488]" /> Today's Wins</span>
            <span className="text-[#0D9488] font-bold">{wins.length} recorded</span>
          </label>
          <div className="bg-white border border-[#E5E8EC] rounded-xl p-4 min-h-[160px] shadow-sm flex flex-col justify-between">
            <div className="space-y-2 mb-4">
              {wins.map((win, i) => (
                <div key={i} className="flex items-center justify-between gap-2 bg-[#F8F9FB] px-3 py-2 rounded-lg border border-[#E5E8EC]/60 group">
                  <span className="text-sm font-medium text-[#111827] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488] shrink-0" /> {win}
                  </span>
                  <button 
                    onClick={() => setWins(wins.filter((_, idx) => idx !== i))}
                    className="text-[#9CA3AF] hover:text-[#DC2626] text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    &times;
                  </button>
                </div>
              ))}
              {wins.length === 0 && <div className="text-[#9CA3AF] text-sm font-normal italic py-4 text-center">What went well today? Log your wins!</div>}
            </div>

            <div className="flex gap-2 pt-2 border-t border-[#E5E8EC]/60">
              <input
                type="text"
                value={newWin}
                onChange={(e) => setNewWin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addWin()}
                placeholder="Add a new win..."
                className="flex-1 px-3 py-1.5 text-xs bg-[#F8F9FB] border border-[#E5E8EC] rounded-lg focus:outline-none focus:border-[#0D9488] focus:bg-white text-[#111827]"
              />
              <button onClick={addWin} className="px-3 py-1.5 bg-[#0D9488] text-white rounded-lg text-xs font-medium hover:bg-[#0F766E] transition-colors flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>
        </div>

        {/* Blockers */}
        <div className="space-y-3">
          <label className="text-xs font-mono font-medium text-[#111827] uppercase tracking-[0.02em] flex items-center justify-between">
            <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-[#DC2626]" /> Blockers & Issues</span>
            <span className="text-[#DC2626] font-bold">{blockers.length} logged</span>
          </label>
          <div className="bg-white border border-[#E5E8EC] rounded-xl p-4 min-h-[160px] shadow-sm flex flex-col justify-between">
            <div className="space-y-2 mb-4">
              {blockers.map((blocker, i) => (
                <div key={i} className="flex items-center justify-between gap-2 bg-[#F8F9FB] px-3 py-2 rounded-lg border border-[#E5E8EC]/60 group">
                  <span className="text-sm font-medium text-[#111827] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] shrink-0" /> {blocker}
                  </span>
                  <button 
                    onClick={() => setBlockers(blockers.filter((_, idx) => idx !== i))}
                    className="text-[#9CA3AF] hover:text-[#DC2626] text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    &times;
                  </button>
                </div>
              ))}
              {blockers.length === 0 && <div className="text-[#9CA3AF] text-sm font-normal italic py-4 text-center">No blockers slowing down your momentum!</div>}
            </div>

            <div className="flex gap-2 pt-2 border-t border-[#E5E8EC]/60">
              <input
                type="text"
                value={newBlocker}
                onChange={(e) => setNewBlocker(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addBlocker()}
                placeholder="Add a blocker or risk..."
                className="flex-1 px-3 py-1.5 text-xs bg-[#F8F9FB] border border-[#E5E8EC] rounded-lg focus:outline-none focus:border-[#DC2626] focus:bg-white text-[#111827]"
              />
              <button onClick={addBlocker} className="px-3 py-1.5 bg-[#111827] text-white rounded-lg text-xs font-medium hover:bg-black transition-colors flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-3 mb-8">
        <label className="text-xs font-mono font-medium text-[#111827] uppercase tracking-[0.02em] flex items-center justify-between">
          <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-[#7C3AED]" /> Brain Dump / Architecture Notes</span>
          <span className="text-[#6B7280] text-[11px] font-normal font-sans">Supports markdown & reflections</span>
        </label>
        <textarea 
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-white border border-[#E5E8EC] rounded-xl p-4 min-h-[140px] text-sm text-[#111827] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] resize-none placeholder:text-[#9CA3AF] transition-all shadow-sm font-sans"
          placeholder="Record key architecture reflections, design notes, or carryover tasks for tomorrow..."
        />
      </div>

      {/* Footer Action */}
      <div className="flex justify-end pt-4 border-t border-[#E5E8EC]">
        <BaseButton onClick={() => saveLogMutation.mutate()} disabled={saveLogMutation.isPending}>
          <Save className="w-4 h-4 mr-1.5 stroke-[2]" />
          {saveLogMutation.isPending ? 'Saving...' : 'Save Complete Review'}
        </BaseButton>
      </div>

    </div>
  );
}
