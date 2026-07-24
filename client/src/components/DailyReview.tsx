import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { CalendarCheck, Save, Brain, Zap, Smile } from 'lucide-react';

export function DailyReview() {
  const { data: logs = [], isLoading } = useQuery({ queryKey: ['dailyLogs'], queryFn: api.dailyLogs.list });

  if (isLoading) return <div className="p-8 text-zinc-500">Loading daily logs...</div>;

  const todayLog = logs.find(
    l => new Date(l.date).toLocaleDateString() === new Date().toLocaleDateString()
  );

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <div className="mb-8 flex justify-between items-center border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <CalendarCheck className="w-8 h-8 text-accent" />
            Daily Review
          </h1>
          <p className="text-zinc-400 mt-2">Reflect on today's execution and plan for tomorrow.</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-zinc-200">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Wins */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            🏆 Today's Wins
          </label>
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 min-h-[120px]">
            {todayLog?.wins?.map((win, i) => (
              <div key={i} className="flex items-center gap-2 mb-2 text-zinc-200">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" /> {win}
              </div>
            )) || <div className="text-zinc-500 text-sm italic">What went well today?</div>}
          </div>
        </div>

        {/* Blockers */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            🚧 Blockers & Issues
          </label>
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 min-h-[120px]">
            {todayLog?.blockers?.map((blocker, i) => (
              <div key={i} className="flex items-center gap-2 mb-2 text-zinc-200">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {blocker}
              </div>
            )) || <div className="text-zinc-500 text-sm italic">What slowed you down?</div>}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3 text-zinc-400 font-medium text-sm">
            <Brain className="w-4 h-4 text-purple-500" /> Deep Work
          </div>
          <div className="text-3xl font-bold text-zinc-100">
            {todayLog?.deepWorkMinutes || 0} <span className="text-lg font-normal text-zinc-500">mins</span>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3 text-zinc-400 font-medium text-sm">
            <Zap className="w-4 h-4 text-amber-500" /> Energy Level
          </div>
          <div className="text-2xl font-bold text-zinc-100">
            {todayLog?.energy || "Not set"}
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3 text-zinc-400 font-medium text-sm">
            <Smile className="w-4 h-4 text-green-500" /> Mood
          </div>
          <div className="text-2xl font-bold text-zinc-100">
            {todayLog?.mood || "Not set"}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-3 mb-8">
        <label className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
          📝 Brain Dump / Notes
        </label>
        <textarea 
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 min-h-[150px] text-zinc-200 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none placeholder:text-zinc-600"
          placeholder="Any other thoughts?"
          defaultValue={todayLog?.notes || ""}
        />
      </div>

      <div className="flex justify-end">
        <button className="bg-accent text-white px-6 py-2.5 rounded-md font-medium hover:bg-accent/90 transition-colors flex items-center gap-2 shadow-lg shadow-accent/20">
          <Save className="w-4 h-4" />
          Save Log
        </button>
      </div>

    </div>
  );
}
