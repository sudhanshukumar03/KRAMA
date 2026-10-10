import { Archive, CheckCircle2, CircleDashed, Inbox, ListChecks, Search } from 'lucide-react';
import type { TaskStatus } from '../../types/schema';

export function taskDay(value: unknown) { return value instanceof Date ? value.toISOString().slice(0, 10) : typeof value === 'string' ? value.slice(0, 10) : ''; }

// Status columns aligned with execution stages
export const STATUS_COLUMNS = [
  {
    id: "BACKLOG" as TaskStatus,
    title: "Backlog",
    subtitle: "Ideas and upcoming work",
    icon: Inbox,
    iconColor: "text-accent-fg",
    bgLight: "bg-surface border-border/80",
    topBorder: "border-t-[3px] border-t-accent",
    badgeBg: "bg-accent-subtle text-accent-fg border border-accent/20",
    addText: "text-accent-fg hover:bg-accent-subtle hover:border-accent/30",
  },
  {
    id: "TODO" as TaskStatus,
    title: "To Do",
    subtitle: "Ready for execution",
    icon: ListChecks,
    iconColor: "text-info-fg",
    bgLight: "bg-surface border-border/80",
    topBorder: "border-t-[3px] border-t-info-border",
    badgeBg: "bg-info-bg text-info-fg border border-info-border",
    addText: "text-info-fg hover:bg-info-bg hover:border-info-border",
  },
  {
    id: "IN_PROGRESS" as TaskStatus,
    title: "In Progress",
    subtitle: "Actively being worked on",
    icon: CircleDashed,
    iconColor: "text-warning-fg",
    bgLight: "bg-surface border-border/80",
    topBorder: "border-t-[3px] border-t-warning-border",
    badgeBg: "bg-warning-bg text-warning-fg border border-warning-border",
    addText: "text-warning-fg hover:bg-warning-bg hover:border-warning-border",
  },
  {
    id: "REVIEW" as TaskStatus, title: "Review", subtitle: "Ready for checking", icon: Search, iconColor: "text-info-fg", bgLight: "bg-surface border-border/80", topBorder: "border-t-[3px] border-t-info-border", badgeBg: "bg-info-bg text-info-fg border border-info-border", addText: "text-info-fg hover:bg-info-bg",
  },
  {
    id: "DONE" as TaskStatus,
    title: "Done",
    subtitle: "Completed and shipped",
    icon: CheckCircle2,
    iconColor: "text-success-fg",
    bgLight: "bg-surface border-border/80",
    topBorder: "border-t-[3px] border-t-success-border",
    badgeBg: "bg-success-bg text-success-fg border border-success-border",
    addText: "text-success-fg hover:bg-success-bg hover:border-success-border",
  },
];

export const CANCELED_COLUMN = {
  id: "CANCELED" as TaskStatus,
  title: "Canceled",
  subtitle: "Archived & abandoned directives",
  icon: Archive,
  iconColor: "text-muted",
  bgLight: "bg-surface/50 border-border/60",
  topBorder: "border-t-[3px] border-t-muted/40",
  badgeBg: "bg-surface-hover text-muted border border-border",
  addText: "text-muted hover:bg-surface-hover",
};

export const STATUS_IDS = ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE", "CANCELED"];

