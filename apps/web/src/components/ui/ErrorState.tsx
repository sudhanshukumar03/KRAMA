import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ErrorStateProps {
 title?: string;
 message?: string;
 onRetry?: () => void;
 className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
 title = 'Failed to load content',
 message = 'An error occurred while fetching data from the server. Please check your connection or try again.',
 onRetry,
 className,
}) => {
  return (
    <div
      className={cn(
        'w-full p-6 bg-danger-bg border border-danger-border rounded-xl flex flex-col items-center justify-center text-center space-y-3.5 my-4',
        className
      )}
      role="alert"
    >
      <div className="w-10 h-10 rounded-full bg-danger-bg border border-danger-border flex items-center justify-center text-danger-fg">
        <AlertTriangle className="w-5 h-5" aria-hidden="true" />
      </div>
      <div className="max-w-md space-y-1">
        <h3 className="text-sm font-semibold text-primary">{title}</h3>
        <p className="text-xs text-secondary leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 inline-flex items-center gap-1.5 px-4 py-2 bg-surface hover:bg-danger-bg text-danger-fg border border-danger-border rounded-lg text-sm font-medium shadow-xs transition-colors duration-150 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
};
