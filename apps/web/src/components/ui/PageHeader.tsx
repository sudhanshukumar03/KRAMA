// UI-only refactor — no data/logic changes
import type { LucideIcon } from 'lucide-react';
import { BaseButton } from './BaseButton';
import { cn } from '../../lib/utils';

export interface PageHeaderProps {
 icon: LucideIcon;
 iconColorClass?: string;
 title: string;
 statPill?: { icon?: LucideIcon; label: string; colorClass?: string };
 description: string;
 primaryAction?: {
 label: string;
 icon?: LucideIcon;
 onClick: () => void;
 disabled?: boolean;
 badge?: string;
 };
 className?: string;
 children?: React.ReactNode;
}

export function PageHeader({
 icon: Icon,
 iconColorClass = "bg-primary text-surface",
 title,
 statPill,
 description,
 primaryAction,
 className,
 children,
}: PageHeaderProps) {
 const StatIcon = statPill?.icon;
 const ActionIcon = primaryAction?.icon;

 return (
 <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4 krama-card p-5 mb-6", className)}>
 <div className="flex items-center gap-4 min-w-0 flex-1">
 <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-border", iconColorClass)}>
 <Icon className="w-6 h-6 stroke-[1.5]" />
 </div>
 <div className="min-w-0 flex-1">
 <div className="flex flex-wrap items-center gap-2.5 mb-1">
 <h1 className="text-xl font-bold tracking-tight text-primary leading-tight truncate">{title}</h1>
 {statPill && (
 <span className={cn(
 "px-2.5 py-0.5 rounded-md text-badge font-mono font-medium flex items-center gap-1.5 shrink-0 border",
 statPill.colorClass || "bg-surface-hover text-secondary border-border"
 )}>
 {StatIcon && <StatIcon className="w-3 h-3 text-accent stroke-[1.75]" />}
 {statPill.label}
 </span>
 )}
 </div>
 <p className="text-caption text-secondary font-mono leading-relaxed line-clamp-2">{description}</p>
 </div>
 </div>

 <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
 {children}
 {primaryAction && (
 <BaseButton
 onClick={primaryAction.onClick}
 disabled={primaryAction.disabled}
 className={cn(
 "shrink-0 cursor-pointer",
 primaryAction.disabled && "opacity-60 cursor-not-allowed pointer-events-none"
 )}
 >
 {ActionIcon && <ActionIcon className="w-4 h-4 mr-1.5 stroke-[1.75]" />}
 <span>{primaryAction.label}</span>
 {primaryAction.badge && (
 <span className="ml-2 text-badge font-mono font-bold bg-surface/20 px-1.5 py-0.2 rounded">
 {primaryAction.badge}
 </span>
 )}
 </BaseButton>
 )}
 </div>
 </div>
 );
}
