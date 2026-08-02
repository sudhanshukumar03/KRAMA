import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { 
  TrendingUp, Clock, Calendar, Target, Activity, Zap 
} from 'lucide-react';
import { LoadingState } from './ui/LoadingState';
import { ErrorState } from './ui/ErrorState';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { cn } from '../lib/utils';

export function Analytics() {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('7d');
  
  const { data: overview, isLoading: loadingOverview, isError: errorOverview } = useQuery({
    queryKey: ['analytics', 'overview', range],
    queryFn: () => api.analytics.overview(range)
  });

  const { data: focusHistory, isLoading: loadingFocus, isError: errorFocus } = useQuery({
    queryKey: ['analytics', 'focus-history', range],
    queryFn: () => api.analytics.focusHistory(range)
  });

  if (loadingOverview || loadingFocus) return <LoadingState variant="dashboard" title="Loading Analytics..." />;
  if (errorOverview || errorFocus) return <ErrorState message="Failed to load analytics data" />;

  const formatChartDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="h-full flex flex-col p-8 lg:p-12 max-w-7xl mx-auto space-y-8 overflow-y-auto custom-scrollbar animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-primary mb-2 tracking-tight flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-[#EA580C]" />
            Workspace Analytics
          </h1>
          <p className="text-secondary text-lg">Velocity, Focus, and Streaks over time.</p>
        </div>
        
        {/* Range Selector */}
        <div className="flex bg-surface-hover p-1 rounded-lg border border-border">
          {(['7d', '30d', '90d'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                range === r ? "bg-primary text-white shadow-sm" : "text-secondary hover:text-primary hover:bg-surface"
              )}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Charts) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Velocity Trend Chart */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-card-title text-primary mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-secondary" />
              Velocity Trend (Tasks/Week)
            </h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={overview || []} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <Line type="monotone" dataKey="weeklyVelocity" stroke="#2563EB" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <CartesianGrid stroke="#374151" strokeDasharray="5 5" vertical={false} />
                  <XAxis dataKey="date" stroke="#6B7280" tickFormatter={formatChartDate} />
                  <YAxis stroke="#6B7280" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '8px' }}
                    itemStyle={{ color: '#F9FAFB' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Deep Work Trend Chart */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-card-title text-primary mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-secondary" />
              Deep Work Trend (Hours)
            </h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={overview || []} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <Line type="monotone" dataKey="deepWorkLogged" stroke="#7C3AED" strokeWidth={3} dot={{ r: 4 }} />
                  <CartesianGrid stroke="#374151" strokeDasharray="5 5" vertical={false} />
                  <XAxis dataKey="date" stroke="#6B7280" tickFormatter={formatChartDate} />
                  <YAxis stroke="#6B7280" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '8px' }}
                    itemStyle={{ color: '#F9FAFB' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Right Column (Focus History Log) */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm min-h-[600px] flex flex-col">
            <h2 className="text-card-title text-primary mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-secondary" />
              Focus History
            </h2>
            
            {(!focusHistory || focusHistory.length === 0) ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-xl">
                <Clock className="w-8 h-8 text-muted mb-3" />
                <h3 className="text-body font-medium text-primary mb-1">No Focus Sessions</h3>
                <p className="text-sm text-secondary">Start a Pomodoro timer on the Dashboard to log focus sessions.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {focusHistory.map((session: any) => (
                  <div key={session.id} className="p-3 border border-border rounded-lg bg-surface-hover hover:border-primary/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-sm font-medium text-primary block">
                          {session.task?.title || 'General Focus Session'}
                        </span>
                        {session.project?.name && (
                          <span className="text-xs text-secondary flex items-center gap-1 mt-0.5">
                            <Target className="w-3 h-3" /> {session.project.name}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-[#0D9488] bg-[#0D9488]/10 px-2 py-0.5 rounded border border-[#0D9488]/20">
                        {Math.round(session.duration / 60)}m
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(session.startTime).toLocaleDateString()}</span>
                      <span className="uppercase font-mono text-[9px]">{session.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
