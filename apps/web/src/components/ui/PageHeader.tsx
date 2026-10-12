// Unified KRAMA OS page header — matches the "Habits & Daily Architecture" reference design.
// Impeccable Craft rules applied:
//   - Title: text-section (18px) font-bold tracking-tight (DESIGN.md Title scale)
//   - Description: text-caption (13px) text-secondary (body copy)
//   - Stat pill: font-mono text-badge uppercase tracking-wide (Telemetry Label rule)
//   - Icon chip: w-10 h-10 rounded-xl accent-subtle (matches Habits, Goals, Projects, Kanban)
//   - Card: krama-card p-4 (Specular Rim Rule via .krama-card box-shadow)
//   - Primary CTA: krama-btn krama-btn-primary (hardware tactile spring)

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface PageHeaderProps {
  /** Lucide icon for the left chip */
  icon: LucideIcon;
  /** Tailwind classes for the icon chip background/color. Defaults to accent-subtle. */
  iconColorClass?: string;
  /** Page title — rendered at Title scale (18px/700) */
  title: string;
  /** Telemetry stat pill displayed beside the title (e.g. "12 tasks", "3 new") */
  statPill?: {
    label: string;
    colorClass?: string;
  };
  /** One-line description at Caption scale (13px/400) */
  description: string;
  /** Primary CTA button in the right slot */
  primaryAction?: {
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
    disabled?: boolean;
  };
  /** Extra content injected into the right slot (before primaryAction) */
  children?: ReactNode;
  className?: string;
}

export function PageHeader({
  icon: Icon,
  iconColorClass = 'bg-accent-subtle border border-accent/20 text-accent-fg',
  title,
  statPill,
  description,
  primaryAction,
  children,
  className,
}: PageHeaderProps) {
  const ActionIcon = primaryAction?.icon;

  return (
    <div
      className={cn(
        // krama-card gives specular rim + alpha border + surface-1 bg + 14px radius
        'krama-card p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shrink-0',
        className,
      )}
    >
      {/* Left: icon + title + stat pill + description */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Icon chip — matches Habits/Goals/Projects pattern exactly */}
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs',
            iconColorClass,
          )}
        >
          <Icon className="w-5 h-5 stroke-[1.75]" />
        </div>

        <div className="min-w-0">
          {/* Title row */}
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            {/* DESIGN: Title scale — 18px/700, tracking-tight */}
            <h1 className="text-section font-bold text-primary tracking-tight leading-snug">
              {title}
            </h1>

            {/* DESIGN: Telemetry Label — mono 12px/600 uppercase tracking-wide */}
            {statPill && (
              <span
                className={cn(
                  'text-badge font-mono font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide border shrink-0',
                  statPill.colorClass ||
                    'bg-accent-subtle text-accent-fg border-accent/20',
                )}
              >
                {statPill.label}
              </span>
            )}
          </div>

          {/* Description — Caption scale (13px/400) */}
          <p className="text-caption text-secondary leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {/* Right: extra children + primary CTA */}
      {(children || primaryAction) && (
        <div className="flex flex-wrap items-center gap-2.5 self-start xl:self-auto min-w-0 max-w-full">
          {children}

          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
              className={cn(
                'krama-btn krama-btn-primary px-3.5 py-2 text-caption font-semibold flex items-center gap-1.5 shadow-sm hover:shadow transition-shadow',
                primaryAction.disabled && 'opacity-60 cursor-not-allowed pointer-events-none',
              )}
            >
              {ActionIcon && <ActionIcon className="w-4 h-4 stroke-[2.5]" />}
              <span>{primaryAction.label}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
