// UI-only refactor — no data/logic changes
import type { LucideIcon } from 'lucide-react';
import { BaseButton } from './BaseButton';
import { cn } from '../../lib/utils';

export interface EmptyStateInlineProps {
 icon: LucideIcon;
 title?: string;
 description: string;
 actionLabel?: string;
 onAction?: () => void;
 action?: {
 label: string;
 icon?: LucideIcon;
 onClick: () => void;
 };
 className?: string;
}

export function EmptyStateInline({
 icon: Icon,
 title,
 description,
 actionLabel,
 onAction,
 action,
 className
}: EmptyStateInlineProps) {
 const finalActionLabel = action?.label || actionLabel;
 const finalOnAction = action?.onClick || onAction;
 const ActionIcon = action?.icon;

 return (
 <div className={cn("flex flex-col items-center justify-center p-6 sm:p-8 text-center w-full animate-in fade-in duration-200 select-none", className)}>
 <div className="w-10 h-10 rounded-xl bg-surface-hover border border-border flex items-center justify-center mb-3 shadow-2xs">
 <Icon className="w-5 h-5 text-secondary stroke-[1.5]" />
 </div>
 {title && <h3 className="text-body font-semibold text-primary mb-1">{title}</h3>}
 <p className="text-caption text-secondary font-mono max-w-sm mb-4 leading-relaxed">{description}</p>
 {finalActionLabel && finalOnAction && (
 <BaseButton onClick={finalOnAction} size="sm" variant="secondary">
 {ActionIcon && <ActionIcon className="w-3.5 h-3.5 mr-1.5" />}
 {finalActionLabel}
 </BaseButton>
 )}
 </div>
 );
}
