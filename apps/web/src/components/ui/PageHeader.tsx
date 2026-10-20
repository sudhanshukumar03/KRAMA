import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface PageHeaderProps {
  icon: LucideIcon;
  iconColorClass?: string;
  title: string;
  statPill?: { label: string; colorClass?: string };
  description: string;
  primaryAction?: { label: string; icon?: LucideIcon; onClick: () => void; disabled?: boolean };
  children?: ReactNode;
  className?: string;
}

export function PageHeader({ icon: Icon, iconColorClass, title, statPill, description, primaryAction, children, className }: PageHeaderProps) {
  const ActionIcon = primaryAction?.icon;
  return (
    <header className={cn('workspace-page-header', className)}>
      <div className="workspace-page-heading">
        <span className={cn('workspace-page-icon', iconColorClass)} aria-hidden="true"><Icon size={20} strokeWidth={1.75} /></span>
        <div className="min-w-0">
          <div className="workspace-page-title-row">
            <h1>{title}</h1>
            {statPill && <span className={cn('workspace-page-count', statPill.colorClass)}>{statPill.label}</span>}
          </div>
          <p>{description}</p>
        </div>
      </div>
      {(children || primaryAction) && <div className="workspace-page-actions">
        {children}
        {primaryAction && <button type="button" disabled={primaryAction.disabled}
          onClick={event => { event.currentTarget.focus(); primaryAction.onClick(); }}
          className="krama-btn krama-btn-primary workspace-primary-action">
          {ActionIcon && <ActionIcon size={17} strokeWidth={2} aria-hidden="true" />}
          <span>{primaryAction.label}</span>
        </button>}
      </div>}
    </header>
  );
}
