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
      bg: 'bg-accent-subtle',
      border: 'border-accent/30',
      glow: 'shadow-xs shadow-accent/10',
      text: 'text-accent-fg'
    },
    shipped: {
      bg: 'bg-success-bg',
      border: 'border-success-border',
      glow: 'shadow-xs shadow-success-border',
      text: 'text-success-fg'
    },
    idea: {
      bg: 'bg-cat-projects-bg',
      border: 'border-cat-projects/30',
      glow: 'shadow-xs shadow-cat-projects/10',
      text: 'text-cat-projects'
    },
    paused: {
      bg: 'bg-warning-bg',
      border: 'border-warning-border',
      glow: 'shadow-xs shadow-warning-border',
      text: 'text-warning-fg'
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
      <div className="absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/10 pointer-events-none" />

      {/* Dynamic Status Beacon Dot (top-right corner for larger sizes) */}
      {size === 'lg' && (
        <span className={cn(
          "absolute top-2 right-2 w-2 h-2 rounded-full",
          status === 'active' ? "bg-accent animate-pulse" :
          status === 'shipped' ? "bg-success-fg" :
          status === 'idea' ? "bg-cat-projects" : "bg-warning-fg"
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
