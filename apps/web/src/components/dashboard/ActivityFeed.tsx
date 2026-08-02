import { 
  CheckCircle2, Plus, Clock, FileText, Zap, MapPin
} from 'lucide-react';

export function ActivityFeed({ activities }: { activities: any[] }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-secondary border border-border border-dashed rounded-xl bg-surface-hover/30">
        <Clock className="w-6 h-6 mb-2 text-muted" />
        <p className="text-sm">No recent activity.</p>
      </div>
    );
  }

  const getActionDetails = (action: string) => {
    switch (action) {
      case 'POMODORO_COMPLETED':
        return { icon: Zap, color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'completed a focus session' };
      case 'TASK_CREATED':
        return { icon: Plus, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'created a task' };
      case 'TASK_COMPLETED':
        return { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'completed a task' };
      case 'NOTE_CREATED':
        return { icon: FileText, color: 'text-purple-500', bg: 'bg-purple-500/10', label: 'added a note' };
      default:
        return { icon: MapPin, color: 'text-secondary', bg: 'bg-surface-hover', label: 'performed an action' };
    }
  };

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const details = getActionDetails(activity.action);
        const Icon = details.icon;
        
        return (
          <div key={activity.id} className="flex items-start gap-3">
            <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${details.bg} ${details.color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-primary leading-tight">
                You <span className="text-secondary">{details.label}</span>
              </p>
              <span className="text-xs text-muted block mt-0.5">
                {new Date(activity.createdAt).toLocaleDateString()} at {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
