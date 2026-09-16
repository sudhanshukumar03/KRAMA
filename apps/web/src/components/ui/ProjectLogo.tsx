import { cn } from '../../lib/utils';
import { resolveIcon } from '../../lib/iconResolver';

interface ProjectLogoProps {
  icon?: string | null;
  status?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  title?: string;
}

export function ProjectLogo({
  icon = 'FolderKanban',
  status = 'active',
  size = 'md',
  className,
  onClick,
  title
}: ProjectLogoProps) {
  const IconComponent = resolveIcon(icon || 'FolderKanban');

  const sizeStyles = {
    sm: {
      container: 'w-8 h-8 rounded-lg',
      icon: 'w-4 h-4 stroke-[1.75]',
    },
    md: {
      container: 'w-10 h-10 rounded-xl',
      icon: 'w-5 h-5 stroke-[1.75]',
    },
    lg: {
      container: 'w-14 h-14 rounded-2xl',
      icon: 'w-7 h-7 stroke-[1.75]',
    }
  };

  const statusStyles: Record<string, { bg: string; border: string; glow: string; text: string }> = {
    active: {
      bg: 'bg-gradient-to-br from-blue-500/15 via-blue-500/5 to-indigo-600/10 dark:from-blue-500/25 dark:via-surface dark:to-indigo-500/15',
      border: 'border-blue-500/30 dark:border-blue-500/40',
      glow: 'shadow-sm shadow-blue-500/10',
      text: 'text-blue-600 dark:text-blue-400'
    },
    shipped: {
      bg: 'bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-teal-600/10 dark:from-emerald-500/25 dark:via-surface dark:to-teal-500/15',
      border: 'border-emerald-500/30 dark:border-emerald-500/40',
      glow: 'shadow-sm shadow-emerald-500/10',
      text: 'text-emerald-600 dark:text-emerald-400'
    },
    idea: {
      bg: 'bg-gradient-to-br from-purple-500/15 via-purple-500/5 to-violet-600/10 dark:from-purple-500/25 dark:via-surface dark:to-violet-500/15',
      border: 'border-purple-500/30 dark:border-purple-500/40',
      glow: 'shadow-sm shadow-purple-500/10',
      text: 'text-purple-600 dark:text-purple-400'
    },
    paused: {
      bg: 'bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-orange-600/10 dark:from-amber-500/25 dark:via-surface dark:to-orange-500/15',
      border: 'border-amber-500/30 dark:border-amber-500/40',
      glow: 'shadow-sm shadow-amber-500/10',
      text: 'text-amber-600 dark:text-amber-400'
    }
  };

  const currentTheme = statusStyles[status?.toLowerCase()] || statusStyles.active;
  const currentSize = sizeStyles[size];

  return (
    <div
      onClick={onClick}
      title={title}
      className={cn(
        "relative flex items-center justify-center shrink-0 transition-all duration-300 select-none overflow-hidden",
        "border backdrop-blur-xs",
        currentSize.container,
        currentTheme.bg,
        currentTheme.border,
        currentTheme.glow,
        onClick && "cursor-pointer hover:scale-105 hover:shadow-md active:scale-95",
        className
      )}
    >
      {/* Precision inner highlight ring */}
      <div className="absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/20 dark:ring-white/10 pointer-events-none" />

      {/* Dynamic Status Beacon Dot (top-right corner for larger sizes) */}
      {size === 'lg' && (
        <span className={cn(
          "absolute top-2 right-2 w-2 h-2 rounded-full",
          status === 'active' ? "bg-blue-500 animate-pulse" :
          status === 'shipped' ? "bg-emerald-500" :
          status === 'idea' ? "bg-purple-500" : "bg-amber-500"
        )} />
      )}

      {/* Crisp Icon Glyph */}
      <IconComponent className={cn(
        "transition-transform duration-300 group-hover/card:scale-110",
        currentSize.icon,
        currentTheme.text
      )} />
    </div>
  );
}
