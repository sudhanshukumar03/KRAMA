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
 case 'TASK_RESTORED':
 return { icon: Plus, color: 'text-accent-fg', bg: 'bg-accent-subtle', label: 'restored a task' };
 case 'POMODORO_COMPLETED':
 return { icon: Zap, color: 'text-warning-fg', bg: 'bg-warning-bg', label: 'completed a focus session' };
 case 'TASK_UPDATED':
 return { icon: CheckCircle2, color: 'text-accent-fg', bg: 'bg-accent-subtle', label: 'updated a task' };
 case 'TASK_CREATED':
 return { icon: Plus, color: 'text-accent', bg: 'bg-accent/10', label: 'created a task' };
 case 'TASK_COMPLETED':
 return { icon: CheckCircle2, color: 'text-success-fg', bg: 'bg-success-bg', label: 'completed a task' };
 case 'NOTE_CREATED':
 return { icon: FileText, color: 'text-[var(--cat-routines)]', bg: 'bg-[var(--cat-routines-bg)]', label: 'added a note' };
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
 You <span className="text-secondary">{activity.action === 'POMODORO_COMPLETED' && ['short_break', 'long_break'].includes(activity.metadata?.type) ? 'finished a break' : details.label}</span>
 {activity.metadata?.title && <span className="block text-xs text-secondary mt-1 break-words">{activity.metadata.title}</span>}
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
