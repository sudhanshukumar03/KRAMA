import { useEffect, useRef, useState } from 'react';
import { Check, RefreshCw } from 'lucide-react';

type RefreshState = 'idle' | 'pending' | 'success' | 'error';

export function DashboardRefreshButton({
  onRefresh,
  isFetching,
}: {
  onRefresh: () => Promise<unknown>;
  isFetching: boolean;
}) {
  const [state, setState] = useState<RefreshState>('idle');
  const intent = useRef(0);
  const pending = useRef(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => {
    intent.current += 1;
    clearTimeout(resetTimer.current);
  }, []);

  const refresh = async () => {
    if (pending.current || isFetching) return;
    pending.current = true;
    const currentIntent = ++intent.current;
    clearTimeout(resetTimer.current);
    setState('pending');
    try {
      await onRefresh();
      if (intent.current !== currentIntent) return;
      setState('success');
      resetTimer.current = setTimeout(() => setState('idle'), 3000);
    } catch {
      if (intent.current === currentIntent) setState('error');
    } finally {
      if (intent.current === currentIntent) pending.current = false;
    }
  };

  const busy = state === 'pending' || isFetching;
  // Background polling stays quiet; the refresh gesture belongs to the user's action.
  const visualState = state;
  const label = state === 'pending' ? 'Refreshing…' : state === 'success' ? 'Up to date' : state === 'error' ? 'Try again' : 'Refresh dashboard';

  return (
    <div className="dashboard-refresh-wrap">
      <button
        type="button"
        onClick={refresh}
        aria-label="Refresh dashboard metrics"
        aria-busy={busy}
        aria-disabled={busy}
        data-state={visualState}
        className="dashboard-refresh"
      >
        <span className="dashboard-refresh-sweep" aria-hidden="true" />
        <span className="dashboard-refresh-icon" aria-hidden="true">
          {visualState === 'success' ? <Check size={17} strokeWidth={2.2} /> : <RefreshCw size={17} strokeWidth={1.9} />}
        </span>
        <span className="dashboard-refresh-label">{label}</span>
      </button>
      <span role="status" className="sr-only">
        {state === 'pending' ? 'Refreshing dashboard.' : state === 'success' ? 'Dashboard is up to date.' : state === 'error' ? 'Could not refresh. Your previous dashboard is still visible. Try again.' : ''}
      </span>
    </div>
  );
}
