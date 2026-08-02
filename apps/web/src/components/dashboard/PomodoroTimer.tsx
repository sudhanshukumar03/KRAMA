import { useState, useEffect } from 'react';
import { Play, Pause, Square, SkipForward } from 'lucide-react';
import { api } from '../../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function PomodoroTimer({ initialDuration = 25 * 60 }: { initialDuration?: number }) {
  const [timeLeft, setTimeLeft] = useState(initialDuration);
  const [isActive, setIsActive] = useState(false);
  const [type, setType] = useState<'pomodoro' | 'short_break'>('pomodoro');
  const queryClient = useQueryClient();

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (isActive && timeLeft === 0) {
      handleComplete();
    }
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, timeLeft]);

  const handleComplete = async () => {
    setIsActive(false);
    
    // Play sound notification
    try {
      const audio = new Audio('/notification.mp3'); // Assuming standard HTML5 audio
      audio.play().catch(() => {}); // ignore auto-play errors
    } catch {
      // ignore
    }

    if (type === 'pomodoro') {
      try {
        await api.focusSessions.complete({
          duration: initialDuration,
          startTime: new Date(Date.now() - initialDuration * 1000).toISOString(),
          endTime: new Date().toISOString(),
          type: 'pomodoro'
        });
        toast.success('Focus session completed! Logged 25 minutes of deep work.', {
          action: { label: 'Undo', onClick: () => console.log('undo') }
        });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        setType('short_break');
        setTimeLeft(5 * 60);
      } catch {
        toast.error('Failed to log focus session');
      }
    } else {
      setType('pomodoro');
      setTimeLeft(initialDuration);
      toast.success('Break finished. Back to work!');
    }
  };

  const toggle = () => setIsActive(!isActive);
  const reset = () => {
    setIsActive(false);
    setTimeLeft(type === 'pomodoro' ? initialDuration : 5 * 60);
  };
  const skip = () => {
    handleComplete();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const progress = ((type === 'pomodoro' ? initialDuration : 5 * 60) - timeLeft) / (type === 'pomodoro' ? initialDuration : 5 * 60);
  const strokeDasharray = 283;
  const strokeDashoffset = strokeDasharray - (strokeDasharray * progress);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-48 mb-6 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
          <circle 
            className="text-surface border-border stroke-current" 
            strokeWidth="4" 
            cx="50" cy="50" r="45" 
            fill="transparent" 
          />
          <circle 
            className={`${type === 'pomodoro' ? 'text-[#EA580C]' : 'text-blue-500'} stroke-current transition-all duration-1000 ease-linear`}
            strokeWidth="4" 
            strokeLinecap="round" 
            cx="50" cy="50" r="45" 
            fill="transparent"
            style={{ 
              strokeDasharray,
              strokeDashoffset
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-mono font-medium tracking-tight text-primary">
            {formatTime(timeLeft)}
          </span>
          <span className="text-sm font-medium text-secondary uppercase tracking-widest mt-1">
            {type === 'pomodoro' ? 'Focus' : 'Break'}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <button 
          onClick={toggle}
          className="w-12 h-12 rounded-full bg-surface-hover flex items-center justify-center text-primary hover:bg-[#EA580C]/10 hover:text-[#EA580C] transition-colors"
        >
          {isActive ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
        </button>
        <button 
          onClick={reset}
          className="w-12 h-12 rounded-full bg-surface-hover flex items-center justify-center text-secondary hover:text-primary transition-colors"
        >
          <Square className="w-4 h-4 fill-current" />
        </button>
        <button 
          onClick={skip}
          className="w-12 h-12 rounded-full bg-surface-hover flex items-center justify-center text-secondary hover:text-primary transition-colors"
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
