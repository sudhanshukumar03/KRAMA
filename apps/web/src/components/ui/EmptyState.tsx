import type { LucideIcon } from 'lucide-react';
import { BaseButton } from './BaseButton';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
 icon: LucideIcon;
 title?: string;
 description: string;
 actionLabel?: string;
 onAction?: () => void;
 className?: string;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, className }: EmptyStateProps) {
 return (
 <div className={cn("flex flex-col items-center justify-center p-8 text-center h-full w-full animate-in fade-in duration-300 group select-none", className)}>
 <div className="w-16 h-16 rounded-2xl bg-surface-hover border border-border shadow-2xs flex items-center justify-center mb-4 group-hover:scale-105 group-hover:border-[#2563EB]/40 transition-all duration-200">
 <Icon className="w-7 h-7 text-secondary group-hover:text-[#2563EB] transition-colors stroke-[1.75]" />
 </div>
 {title && <h3 className="text-base font-semibold text-primary mb-1 tracking-tight">{title}</h3>}
 <p className="text-xs text-secondary max-w-sm mb-5 leading-relaxed font-normal">{description}</p>
 
 {actionLabel && onAction && (
 <BaseButton onClick={onAction} size="sm" className="shadow-2xs">
 {actionLabel}
 </BaseButton>
 )}
 </div>
 );
}
