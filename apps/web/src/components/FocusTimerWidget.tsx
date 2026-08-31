import { useState, useEffect } from 'react';
import { Play, Pause, Square, ChevronUp, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import { toast } from 'sonner';

export function FocusTimerWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [mode, setMode] = useState<'pomodoro' | 'short_break' | 'long_break'>('pomodoro');
  const [startTime, setStartTime] = useState<Date | null>(null);

  const completeMutation = useMutation({
    mutationFn: (data: any) => api.focusSessions.complete(data),
    onSuccess: () => {
      toast.success('Focus session logged successfully!');
    }
  });

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      setIsActive(false);
      handleComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleStart = () => {
    if (!startTime) setStartTime(new Date());
    setIsActive(true);
  };

  const handlePause = () => {
    setIsActive(false);
  };

  const handleStop = () => {
    setIsActive(false);
    if (startTime) {
      handleComplete();
    }
  };

  const handleComplete = () => {
    if (!startTime) return;
    const duration = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
    completeMutation.mutate({
      startTime: startTime.toISOString(),
      endTime: new Date().toISOString(),
      duration,
      type: mode
    });
    setStartTime(null);
    setTimeLeft(mode === 'pomodoro' ? 25 * 60 : mode === 'short_break' ? 5 * 60 : 15 * 60);
  };

  const changeMode = (m: 'pomodoro' | 'short_break' | 'long_break') => {
    setMode(m);
    setIsActive(false);
    setStartTime(null);
    if (m === 'pomodoro') setTimeLeft(25 * 60);
    if (m === 'short_break') setTimeLeft(5 * 60);
    if (m === 'long_break') setTimeLeft(15 * 60);
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-[#0D9488] text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-50 group"
      >
        <Play className="w-6 h-6 ml-1" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-6 w-80 bg-surface border border-border shadow-2xl rounded-2xl z-50 overflow-hidden animate-in slide-in-from-bottom-5">
      <div className="flex items-center justify-between p-3 border-b border-border bg-surface-hover/50">
        <span className="font-semibold text-primary text-sm">Focus Session</span>
        <button onClick={() => setIsOpen(false)} className="text-muted hover:text-primary transition-colors">
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>
      <div className="p-6 flex flex-col items-center">
        <div className="flex gap-2 mb-6 p-1 bg-surface-hover rounded-lg">
          <button onClick={() => changeMode('pomodoro')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${mode === 'pomodoro' ? 'bg-surface shadow-sm text-primary' : 'text-secondary hover:text-primary'}`}>Focus</button>
          <button onClick={() => changeMode('short_break')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${mode === 'short_break' ? 'bg-surface shadow-sm text-primary' : 'text-secondary hover:text-primary'}`}>Short Break</button>
          <button onClick={() => changeMode('long_break')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${mode === 'long_break' ? 'bg-surface shadow-sm text-primary' : 'text-secondary hover:text-primary'}`}>Long Break</button>
        </div>
        
        <div className="text-6xl font-black text-primary font-mono tracking-tight mb-8">
          {timeStr}
        </div>

        <div className="flex items-center gap-4">
          {!isActive ? (
            <button onClick={handleStart} className="w-16 h-16 bg-primary text-surface rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors shadow-lg">
              <Play className="w-7 h-7 ml-1" />
            </button>
          ) : (
            <button onClick={handlePause} className="w-16 h-16 bg-primary text-surface rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors shadow-lg">
              <Pause className="w-7 h-7" />
            </button>
          )}
          
          <button onClick={handleStop} className="w-12 h-12 bg-surface-hover text-secondary border border-border rounded-full flex items-center justify-center hover:text-primary hover:bg-surface transition-colors" title="Stop & Save">
            <Square className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
