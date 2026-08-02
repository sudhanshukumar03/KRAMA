import { CheckCircle2, Circle } from 'lucide-react';
import { BaseButton } from '../ui/BaseButton';

export function WelcomeDashboard({ dashboardData, onQuickCapture }: { dashboardData: any, onQuickCapture: (type: string) => void }) {
  const { greeting, onboarding } = dashboardData;

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#8B5CF6] to-[#EC4899] flex items-center justify-center shadow-lg shadow-purple-500/20 mb-8">
        <span className="text-3xl text-white">👋</span>
      </div>
      
      <h1 className="text-3xl font-semibold text-primary mb-3 text-center">{greeting}</h1>
      <p className="text-secondary text-lg mb-10 text-center">Let's build your second brain and get you up to speed.</p>

      <div className="w-full bg-surface border border-border rounded-2xl p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-primary">Getting Started</h2>
          <div className="flex items-center gap-3">
            <div className="h-2 w-32 bg-surface-hover rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#10B981] transition-all duration-1000"
                style={{ width: `${(onboarding.completed / onboarding.total) * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium text-secondary">{onboarding.completed} / {onboarding.total}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {onboarding.steps.map((step: any) => (
            <div key={step.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-hover transition-colors group cursor-default">
              {step.completed ? (
                <CheckCircle2 className="w-5 h-5 text-[#10B981] flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted group-hover:text-secondary transition-colors flex-shrink-0" />
              )}
              <span className={`text-body ${step.completed ? 'text-secondary line-through opacity-70' : 'text-primary'}`}>
                {step.title}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-center gap-4">
          <BaseButton onClick={() => onQuickCapture('task')} variant="primary" size="lg">
            Create First Task
          </BaseButton>
          <BaseButton onClick={() => onQuickCapture('note')} variant="secondary" size="lg">
            Add a Note
          </BaseButton>
        </div>
      </div>
    </div>
  );
}
