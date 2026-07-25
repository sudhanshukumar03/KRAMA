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
    const baseStyles = "inline-flex items-center justify-center font-semibold tracking-tight transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] cursor-pointer select-none";
    
    const variants = {
      primary: "bg-[#2563EB] text-white hover:bg-[#1D4ED8] shadow-sm hover:shadow-md border border-transparent",
      secondary: "bg-[#F8F9FB] text-[#111827] hover:bg-[#E5E8EC]/80 hover:text-[#000000] border border-[#E5E8EC] shadow-2xs",
      ghost: "bg-transparent text-[#6B7280] hover:text-[#111827] hover:bg-[#F8F9FB]",
      danger: "bg-red-50 text-[#DC2626] hover:bg-red-100 border border-[#DC2626]/20 shadow-2xs"
    };

    const sizes = {
      sm: "h-8 px-3 text-xs rounded-md",
      md: "h-10 px-4 text-sm rounded-lg",
      lg: "h-12 px-6 text-base rounded-xl"
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
