import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface BaseButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const BaseButton = forwardRef<HTMLButtonElement, BaseButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-medium tracking-tight transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] cursor-pointer select-none";
    
    const variants = {
      primary: "bg-accent-primary text-white hover:bg-accent-primary-hover hover:shadow-hover border border-transparent",
      secondary: "bg-transparent text-primary hover:bg-surface-hover border border-border hover:shadow-hover",
      ghost: "bg-transparent text-secondary hover:text-primary hover:bg-surface-hover",
      danger: "bg-status-danger text-white hover:bg-status-danger/90 border border-transparent hover:shadow-hover"
    };

    const sizes = {
      sm: "h-10 px-4 text-[14px] rounded-[12px]",
      md: "h-12 px-6 text-[16px] rounded-[12px]",
      lg: "h-14 px-8 text-[18px] rounded-[12px]"
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

BaseButton.displayName = 'BaseButton';
