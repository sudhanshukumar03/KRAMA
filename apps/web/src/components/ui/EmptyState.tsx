import type { LucideIcon } from 'lucide-react';
import { BaseButton } from './BaseButton';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
 icon: LucideIcon;
 title?: string;
 description: string;
 actionLabel?: string;
 onAction?: () => void;
 secondaryActionLabel?: string;
 onSecondaryAction?: () => void;
 className?: string;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, secondaryActionLabel, onSecondaryAction, className }: EmptyStateProps) {
  return (
  <div className={cn("flex flex-col items-center justify-center p-12 text-center h-full w-full animate-in fade-in duration-300 group select-none", className)}>
    <div className="w-20 h-20 rounded-[22px] bg-surface border border-border shadow-sm flex items-center justify-center mb-6 group-hover:scale-105 group-hover:shadow-md transition-all duration-300 ease-spring">
      <Icon className="w-8 h-8 text-secondary group-hover:text-primary transition-colors stroke-[1.5]" />
    </div>
    {title && <h3 className="text-card-title text-primary mb-2">{title}</h3>}
    <p className="text-body text-secondary max-w-md mb-8">{description}</p>
    
    {(actionLabel || secondaryActionLabel) && (
      <div className="flex items-center gap-3">
        {actionLabel && onAction && (
          <BaseButton onClick={onAction} size="md" variant="primary">
            {actionLabel}
          </BaseButton>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <BaseButton onClick={onSecondaryAction} size="md" variant="secondary">
            {secondaryActionLabel}
          </BaseButton>
        )}
      </div>
    )}
  </div>
  );
}
