import React, { Component, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-primary p-4">
          <AlertCircle className="w-16 h-16 text-danger-fg mb-4" />
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-secondary max-w-md text-center mb-6">
            An unexpected error occurred. Please try refreshing the page or contact support if the issue persists.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-on-accent font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-[0.98]"
          >
            Reload Cockpit
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
