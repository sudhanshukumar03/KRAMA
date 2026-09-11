// UI-only refactor — no data/logic changes
import type { LucideIcon } from 'lucide-react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SelectorCardProps {
 icon: LucideIcon | string;
 title: string;
 description?: string;
 badge?: string;
 selected: boolean;
 onClick: () => void;
 className?: string;
}

export function SelectorCard({
 icon: IconOrString,
 title,
 description,
 badge,
 selected,
 onClick,
 className,
}: SelectorCardProps) {
 const isComponent = typeof IconOrString !== 'string';
 const IconComponent = isComponent ? (IconOrString as LucideIcon) : null;

 return (
 <button
 type="button"
 onClick={onClick}
 className={cn(
 "p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between h-full relative overflow-hidden group outline-none select-none",
 selected
 ? "border-accent bg-accent-tint text-primary shadow-2xs ring-1 ring-accent/30"
 : "border-border bg-surface text-secondary hover:text-primary hover:bg-surface-hover hover:border-border-strong shadow-2xs",
 className
 )}
 >
 <div className="flex items-center justify-between w-full mb-2.5">
 <div className={cn(
 "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors",
 selected
 ? "bg-surface border-accent/30 text-accent"
 : "bg-surface-hover border-border text-secondary group-hover:text-primary"
 )}>
 {IconComponent ? (
 <IconComponent className="w-4 h-4 stroke-[1.75]" />
 ) : typeof IconOrString === 'string' ? (
 <span className="text-body font-mono font-bold leading-none">{IconOrString}</span>
 ) : null}
 </div>

 <div className="flex items-center gap-1.5 shrink-0">
 {badge && (
 <span className={cn(
 "text-badge font-mono font-semibold px-2 py-0.5 rounded border uppercase transition-colors",
 selected
 ? "bg-surface text-accent border-accent/30"
 : "bg-surface-hover text-secondary border-border/80"
 )}>
 {badge}
 </span>
 )}
 {selected && (
 <div className="w-5 h-5 rounded-full bg-accent text-surface flex items-center justify-center shadow-2xs">
 <Check className="w-3 h-3 stroke-[2.5]" />
 </div>
 )}
 </div>
 </div>

 <div className="w-full">
 <div className={cn(
 "font-semibold text-caption leading-tight truncate mb-0.5 transition-colors",
 selected ? "text-primary" : "text-primary group-hover:text-primary"
 )}>
 {title}
 </div>
 {description && (
 <p className={cn(
 "text-badge font-mono leading-tight line-clamp-2 transition-colors",
 selected ? "text-secondary font-medium" : "text-muted"
 )}>
 {description}
 </p>
 )}
 </div>
 </button>
 );
}
