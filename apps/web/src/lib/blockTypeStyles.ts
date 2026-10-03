import type { ElementType } from 'react';
import { Users, Briefcase, User, GraduationCap, HeartPulse, Shield, Clock } from 'lucide-react';
import type { TimeBlockType } from '../types/planner';

export interface BlockTypeStyle {
  label: string;
  /** lucide icon component — each consumer sizes it (size / className). */
  Icon: ElementType;
  /** text-* token for icon + label foreground. */
  color: string;
  /** border-l-* token for the accent bar. */
  border: string;
  /** bg-* token for the type pill background. */
  bg: string;
}

// Single source of truth for how a time-block type is presented, shared by the
// week matrix (PlannerMatrix) and the day view (TodayView) so a block reads the
// same everywhere and dark mode stays consistent. All values are semantic
// design tokens defined in theme.css / index.css — no raw Tailwind palette.
export const BLOCK_TYPE_STYLES: Record<TimeBlockType, BlockTypeStyle> = {
  MEETING:  { label: 'Meeting',  Icon: Users,         color: 'text-cat-timeblocks', border: 'border-l-cat-timeblocks', bg: 'bg-cat-timeblocks-bg' },
  WORK:     { label: 'Work',     Icon: Briefcase,     color: 'text-cat-tasks',      border: 'border-l-cat-tasks',      bg: 'bg-cat-tasks-bg' },
  PERSONAL: { label: 'Personal', Icon: User,          color: 'text-cat-projects',   border: 'border-l-cat-projects',   bg: 'bg-cat-projects-bg' },
  STUDY:    { label: 'Study',    Icon: GraduationCap, color: 'text-success-fg',     border: 'border-l-success-fg',     bg: 'bg-success-bg' },
  HEALTH:   { label: 'Health',   Icon: HeartPulse,    color: 'text-danger-fg',      border: 'border-l-danger-fg',      bg: 'bg-danger-bg' },
  ADMIN:    { label: 'Admin',    Icon: Shield,        color: 'text-secondary',      border: 'border-l-border-strong',  bg: 'bg-surface-2' },
  OTHER:    { label: 'Other',    Icon: Clock,         color: 'text-muted',          border: 'border-l-border-default', bg: 'bg-surface-2' },
};

export function blockTypeStyle(type: string | null | undefined): BlockTypeStyle {
  return BLOCK_TYPE_STYLES[type as TimeBlockType] ?? BLOCK_TYPE_STYLES.OTHER;
}
