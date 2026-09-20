import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, Circle, ChevronRight, ArrowRight,
  FolderKanban, Target, Layers, CheckSquare, 
  BookOpen, TrendingUp, Timer, Sparkles, ChevronUp, ChevronDown, X
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface StepMeta {
  subtitle: string;
  icon: any;
  action: (navigate: any, onQuickCapture: (t: string) => void) => void;
}

const STEP_METADATA: Record<string, StepMeta> = {
  workspace: {
    subtitle: 'Set up your personal workspace',
    icon: FolderKanban,
    action: (navigate) => navigate('/app/'),
  },
  goal: {
    subtitle: 'Define what you want to achieve',
    icon: Target,
    action: (navigate) => navigate('/app/goals'),
  },
  project: {
    subtitle: 'Organize your ideas into projects',
    icon: Layers,
    action: (navigate) => navigate('/app/projects'),
  },
  task: {
    subtitle: 'Turn ideas into action',
    icon: CheckSquare,
    action: (_, onQuickCapture) => onQuickCapture('task'),
  },
  note: {
    subtitle: 'Capture your thoughts',
    icon: BookOpen,
    action: (navigate) => navigate('/app/brain'),
  },
  habit: {
    subtitle: 'Build a better you',
    icon: TrendingUp,
    action: (navigate) => navigate('/app/habits'),
  },
  focus_session: {
    subtitle: 'Improve your concentration',
    icon: Timer,
    action: () => window.open('/focus', '_blank'),
  },
  complete_pomodoro: {
    subtitle: 'Experience deep work',
    icon: Sparkles,
    action: () => window.open('/focus', '_blank'),
  },
};

interface WelcomeDashboardProps {
  dashboardData: any;
  onQuickCapture: (type: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onDismiss?: () => void;
}

export function WelcomeDashboard({
  dashboardData,
  onQuickCapture,
  isCollapsed = false,
  onToggleCollapse,
  onDismiss
}: WelcomeDashboardProps) {
  const navigate = useNavigate();
  const { onboarding } = dashboardData;
  if (!onboarding || !onboarding.steps) return null;

  const completedCount = onboarding.completed ?? 0;
  const totalCount = onboarding.total ?? onboarding.steps.length;
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  // If collapsed, display a sleek, non-intrusive top banner
  if (isCollapsed) {
    return (
      <div className="w-full bg-surface/80 backdrop-blur-md border border-border/80 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4 animate-in fade-in duration-200">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-primary">Getting Started</span>
              <span className="text-xs font-mono text-secondary">({completedCount}/{totalCount} complete)</span>
            </div>
            <div className="w-40 sm:w-56 h-1.5 bg-surface-hover rounded-full overflow-hidden mt-1.5">
              <div 
                className="h-full bg-gradient-to-r from-accent to-[#10B981] transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleCollapse}
            className="text-xs font-medium text-accent hover:text-accent/90 px-3 py-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>Resume Setup</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1.5 text-muted hover:text-primary rounded-md hover:bg-surface-hover transition-colors cursor-pointer"
              title="Dismiss Getting Started"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-surface/90 backdrop-blur-xl border border-border/90 rounded-2xl p-5 sm:p-7 lg:p-8 shadow-sm relative animate-in fade-in slide-in-from-top-2 duration-300">
      
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-primary tracking-tight">Getting Started</h2>
          <p className="text-secondary text-xs sm:text-sm mt-0.5">
            Complete these steps to set up your workspace and start your journey.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-surface-hover/60 px-3 py-1.5 rounded-xl border border-border/60">
            <div className="h-2 w-24 sm:w-32 bg-surface rounded-full overflow-hidden border border-border/50">
              <div 
                className="h-full bg-gradient-to-r from-accent to-[#10B981] transition-all duration-700 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-mono font-medium text-secondary">
              {completedCount} / {totalCount}
            </span>
          </div>

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-2 rounded-lg text-muted hover:text-primary hover:bg-surface-hover transition-colors cursor-pointer border border-border/50"
              title="Minimize setup checklist"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-2 rounded-lg text-muted hover:text-primary hover:bg-surface-hover transition-colors cursor-pointer border border-border/50"
              title="Dismiss checklist"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2-Column Checklist Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {onboarding.steps.map((step: any) => {
          const meta = STEP_METADATA[step.id] || {
            subtitle: 'Get organized with KRAMA',
            icon: Sparkles,
            action: () => {}
          };
          const IconComponent = meta.icon;

          return (
            <div
              key={step.id}
              onClick={() => meta.action(navigate, onQuickCapture)}
              className={cn(
                "flex items-center justify-between p-3.5 sm:p-4 rounded-xl border transition-all duration-200 cursor-pointer group select-none",
                step.completed
                  ? "bg-surface-hover/40 border-border/50 text-secondary"
                  : "bg-surface hover:bg-surface-hover/80 border-border hover:border-accent/40 hover:shadow-2xs"
              )}
            >
              <div className="flex items-center gap-3.5 min-w-0 pr-2">
                {/* Status Indicator */}
                <div className="shrink-0">
                  {step.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted group-hover:text-accent transition-colors" />
                  )}
                </div>

                {/* Step Icon Badge */}
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                  step.completed 
                    ? "bg-[#10B981]/10 text-[#10B981]" 
                    : "bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white"
                )}>
                  <IconComponent className="w-4 h-4" />
                </div>

                {/* Text Labels */}
                <div className="min-w-0">
                  <h3 className={cn(
                    "text-sm font-medium leading-tight truncate",
                    step.completed ? "text-secondary line-through opacity-75" : "text-primary group-hover:text-accent transition-colors"
                  )}>
                    {step.title}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-muted truncate mt-0.5">
                    {meta.subtitle}
                  </p>
                </div>
              </div>

              {/* Action Chevron */}
              <ChevronRight className={cn(
                "w-4 h-4 shrink-0 transition-transform",
                step.completed ? "text-muted/40" : "text-muted group-hover:text-accent group-hover:translate-x-0.5"
              )} />
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 pt-5 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onQuickCapture('task')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent/90 transition-all font-medium text-xs sm:text-sm shadow-sm hover:shadow cursor-pointer"
          >
            <span>Create First Task</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onQuickCapture('note')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface hover:bg-surface-hover text-primary border border-border transition-colors font-medium text-xs sm:text-sm cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-secondary" />
            <span>Add a Note</span>
          </button>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-xs text-muted hover:text-secondary transition-colors cursor-pointer"
          >
            Skip to Dashboard
          </button>
        )}
      </div>

    </div>
  );
}
