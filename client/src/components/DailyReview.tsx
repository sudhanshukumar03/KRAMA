import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { CalendarCheck, Save, Brain, Zap, Smile } from 'lucide-react';
import { BaseButton } from './ui/BaseButton';
import { cn } from '../lib/utils';

function getEnergyIndicator(energy?: string | null) {
  if (!energy) return null;
  const level = energy.toLowerCase();
  const segments = level === 'high' ? 3 : level === 'medium' ? 2 : level === 'low' ? 1 : 0;
  if (!segments) return null;
  return (
    <div className="flex gap-1 mt-2">
      {[1, 2, 3].map(i => (
        <div key={i} className={cn("h-1.5 w-6 rounded-full transition-colors", i <= segments ? "bg-[#0A0A0A]" : "bg-[#E5E7EB]")} />
      ))}
    </div>
  );
}

function getMoodEmoji(mood?: string | null) {
  if (!mood) return null;
  const m = mood.toLowerCase();
  if (m.includes('great') || m.includes('awesome')) return '🤩';
  if (m.includes('good') || m.includes('happy')) return '🙂';
  if (m.includes('ok') || m.includes('neutral')) return '😐';
  if (m.includes('bad') || m.includes('sad')) return '😕';
  if (m.includes('terrible') || m.includes('awful')) return '😫';
  return '💭';
}

export function DailyReview() {
  const { data: logs = [], isLoading } = useQuery({ queryKey: ['dailyLogs'], queryFn: api.dailyLogs.list });

  if (isLoading) return <div className="p-8 text-[#6B7280]">Loading daily logs...</div>;

  const todayLog = logs.find(
    l => new Date(l.date).toLocaleDateString() === new Date().toLocaleDateString()
  );

  return (
    <div className="p-8 max-w-4xl mx-auto w-full bg-white min-h-full animate-in fade-in duration-150">
      <div className="mb-8 flex justify-between items-center border-b border-[#E5E7EB] pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-[#0A0A0A]">
            <CalendarCheck className="w-8 h-8 text-[#0A0A0A]" />
            Daily Review
          </h1>
          <p className="text-[#6B7280] mt-2">Reflect on today's execution and plan for tomorrow.</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-[#0A0A0A]">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Wins */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-[#0A0A0A] uppercase tracking-wider flex items-center gap-2">
            🏆 Today's Wins
          </label>
          <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-4 min-h-[120px]">
            {todayLog?.wins?.map((win, i) => (
              <div key={i} className="flex items-center gap-2 mb-2 text-[#0A0A0A] font-medium text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A]" /> {win}
              </div>
            )) || <div className="text-[#9CA3AF] text-sm italic">What went well today?</div>}
          </div>
        </div>

        {/* Blockers */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-[#0A0A0A] uppercase tracking-wider flex items-center gap-2">
            🚧 Blockers & Issues
          </label>
          <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-4 min-h-[120px]">
            {todayLog?.blockers?.map((blocker, i) => (
              <div key={i} className="flex items-center gap-2 mb-2 text-[#0A0A0A] font-medium text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {blocker}
              </div>
            )) || <div className="text-[#9CA3AF] text-sm italic">What slowed you down?</div>}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-5 hover:bg-white hover:shadow-sm transition-all duration-150">
          <div className="flex items-center gap-2 mb-3 text-[#6B7280] font-bold text-[10px] uppercase tracking-wider">
            <Brain className="w-4 h-4 text-[#6B7280]" /> Deep Work
          </div>
          <div className="text-3xl font-bold text-[#0A0A0A]">
            {todayLog?.deepWorkMinutes || 0} <span className="text-lg font-bold text-[#9CA3AF]">mins</span>
          </div>
        </div>

        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-5 hover:bg-white hover:shadow-sm transition-all duration-150">
          <div className="flex items-center gap-2 mb-3 text-[#6B7280] font-bold text-[10px] uppercase tracking-wider">
            <Zap className="w-4 h-4 text-[#6B7280]" /> Energy Level
          </div>
          <div className="text-2xl font-bold text-[#0A0A0A] capitalize">
            {todayLog?.energy || "Not set"}
          </div>
          {getEnergyIndicator(todayLog?.energy)}
        </div>

        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-5 hover:bg-white hover:shadow-sm transition-all duration-150">
          <div className="flex items-center gap-2 mb-3 text-[#6B7280] font-bold text-[10px] uppercase tracking-wider">
            <Smile className="w-4 h-4 text-[#6B7280]" /> Mood
          </div>
          <div className="text-2xl font-bold text-[#0A0A0A] capitalize flex items-center gap-2">
            {todayLog?.mood || "Not set"}
            <span>{getMoodEmoji(todayLog?.mood)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-3 mb-8">
        <label className="text-[10px] font-bold text-[#0A0A0A] uppercase tracking-wider">
          📝 Brain Dump / Notes
        </label>
        <textarea 
          className="w-full bg-white border border-[#E5E7EB] rounded-xl p-4 min-h-[150px] text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] focus:ring-offset-1 resize-none placeholder:text-[#9CA3AF] transition-shadow duration-100"
          placeholder="Any other thoughts?"
          defaultValue={todayLog?.notes || ""}
        />
      </div>

      <div className="flex justify-end">
        <BaseButton>
          <Save className="w-4 h-4 mr-2" />
          Save Log
        </BaseButton>
      </div>

    </div>
  );
}
