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
  const baseStyles = "krama-btn disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] cursor-pointer select-none";
  
  const variants = {
    primary: "krama-btn-primary shadow-sm hover:shadow-md",
    secondary: "krama-btn-secondary shadow-sm",
    ghost: "krama-btn-ghost",
    danger: "bg-red-50 text-[#DC2626] hover:bg-red-100 border border-[#DC2626]/20 shadow-2xs"
  };

  const sizes = {
    sm: "h-8 px-3 text-caption",
    md: "h-11 px-5 text-body",
    lg: "h-12 px-6 text-section"
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
