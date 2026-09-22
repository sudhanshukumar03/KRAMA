import { cn } from '../../lib/utils';

interface KramaLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  withText?: boolean;
  textClassName?: string;
}

export function KramaLogo({ size = 'sm', className, withText = false, textClassName }: KramaLogoProps) {
  const sizeMap = {
    xs: { box: 'w-5 h-5 rounded', svg: 14 },
    sm: { box: 'w-7 h-7 rounded-lg', svg: 18 },
    md: { box: 'w-9 h-9 rounded-xl', svg: 22 },
    lg: { box: 'w-11 h-11 rounded-2xl', svg: 28 },
    xl: { box: 'w-14 h-14 rounded-2xl', svg: 36 },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      {/* Precision Geometric Monogram */}
      <div className={cn(
        "relative flex items-center justify-center shrink-0 overflow-hidden",
        "bg-primary border border-border-subtle shadow-xs",
        currentSize.box
      )}>
        {/* Subtle interior glow */}
        <div className="absolute inset-0 bg-gradient-to-tr from-accent/20 via-transparent to-cat-routines/20 opacity-80" />
        
        <svg
          width={currentSize.svg}
          height={currentSize.svg}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 text-text-inverse transition-transform duration-200"
        >
          {/* Vertical Structural Pillar */}
          <rect x="3.5" y="3.5" width="4" height="17" rx="1.5" fill="currentColor" />
          
          {/* Upper Strategic Arm */}
          <path
            d="M9 13.5L16.2 4.8C16.8 4.1 17.8 4.3 18.2 5.1L19.2 6.8C19.6 7.5 19.4 8.4 18.7 8.9L12.5 14L9 13.5Z"
            fill="currentColor"
            fillOpacity="0.85"
          />
          
          {/* Lower Execution Vector */}
          <path
            d="M10.8 12.2L18.2 19.1C18.8 19.7 18.6 20.7 17.8 21.1L16 21.8C15.2 22.2 14.3 21.8 13.8 21.1L8.5 13.5L10.8 12.2Z"
            fill="currentColor"
          />
          
          {/* Central Convergence Node */}
          <circle cx="10" cy="13" r="1.5" fill="currentColor" fillOpacity="0.6" />
        </svg>
      </div>

      {withText && (
        <span className={cn(
          "font-bold tracking-tight text-primary font-sans leading-none",
          size === 'lg' || size === 'xl' ? "text-xl tracking-tighter" : "text-sm",
          textClassName
        )}>
          KRAMA
        </span>
      )}
    </div>
  );
}
