import { Loader2 } from 'lucide-react';

export type LoadingVariant = 'dashboard' | 'kanban' | 'brain' | 'goals' | 'project-detail' | 'habit-tracker' | 'default';

interface LoadingStateProps {
  title?: string;
  description?: string;
  variant?: LoadingVariant;
}

export function LoadingState({
  title = 'Loading...',
  description = 'Syncing distributed engineering workspace...',
  variant = 'default',
}: LoadingStateProps) {
  if (variant === 'dashboard') {
    return (
      <div className="p-6 space-y-6 w-full animate-in fade-in duration-200">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-surface-hover rounded-md animate-pulse" />
            <div className="h-4 w-72 bg-surface-hover rounded-md animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 bg-surface border border-border rounded-xl space-y-3 shadow-2xs">
              <div className="flex justify-between items-center">
                <div className="h-4 w-24 bg-surface-hover rounded animate-pulse" />
                <div className="w-8 h-8 rounded-lg bg-surface-hover animate-pulse" />
              </div>
              <div className="h-8 w-16 bg-surface-hover rounded animate-pulse" />
              <div className="h-3 w-32 bg-surface-hover rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 bg-surface border border-border rounded-xl space-y-4 shadow-2xs h-80">
            <div className="h-5 w-40 bg-surface-hover rounded animate-pulse" />
            <div className="space-y-3 pt-2">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="h-12 bg-surface-hover rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
          <div className="p-6 bg-surface border border-border rounded-xl space-y-4 shadow-2xs h-80">
            <div className="h-5 w-32 bg-surface-hover rounded animate-pulse" />
            <div className="space-y-3 pt-2">
              {[1, 2, 3].map((k) => (
                <div key={k} className="h-14 bg-surface-hover rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'kanban') {
    return (
      <div className="p-6 space-y-6 w-full h-full flex flex-col animate-in fade-in duration-200">
        <div className="flex items-center justify-between">
          <div className="h-6 w-36 bg-surface-hover rounded-md animate-pulse" />
          <div className="flex gap-2">
            <div className="h-9 w-24 bg-surface-hover border border-border rounded-lg animate-pulse" />
            <div className="h-9 w-28 bg-[#2563EB]/20 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
          {['Backlog', 'To Do', 'In Progress', 'Done'].map((col, i) => (
            <div key={col} className="bg-surface-hover border border-border rounded-xl p-4 space-y-3 flex flex-col">
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <div className="h-4 w-20 bg-[#E5E8EC] rounded animate-pulse" />
                <div className="w-5 h-5 rounded-full bg-[#E5E8EC] animate-pulse" />
              </div>
              <div className="space-y-3 flex-1">
                {Array.from({ length: 3 - (i % 2) }).map((_, j) => (
                  <div key={j} className="p-4 bg-surface border border-border rounded-lg space-y-2.5 shadow-2xs">
                    <div className="flex justify-between">
                      <div className="h-3 w-12 bg-surface-hover rounded animate-pulse" />
                      <div className="w-4 h-4 rounded bg-surface-hover animate-pulse" />
                    </div>
                    <div className="h-4 w-full bg-[#E5E8EC] rounded animate-pulse" />
                    <div className="h-4 w-2/3 bg-surface-hover rounded animate-pulse" />
                    <div className="flex justify-between pt-2">
                      <div className="h-5 w-16 bg-surface-hover rounded animate-pulse" />
                      <div className="w-6 h-6 rounded-full bg-surface-hover animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'brain') {
    return (
      <div className="flex h-full w-full animate-in fade-in duration-200">
        <div className="w-64 border-r border-border bg-surface-hover p-4 space-y-4 hidden md:block">
          <div className="h-8 w-full bg-[#E5E8EC] rounded-lg animate-pulse" />
          <div className="space-y-2 pt-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-7 bg-surface border border-border rounded-md animate-pulse" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-8 space-y-6 max-w-4xl mx-auto">
          <div className="space-y-3 pb-6 border-b border-border">
            <div className="h-8 w-3/4 bg-[#E5E8EC] rounded-lg animate-pulse" />
            <div className="h-4 w-1/3 bg-surface-hover rounded animate-pulse" />
          </div>
          <div className="space-y-4 pt-4">
            <div className="h-4 w-full bg-surface-hover rounded animate-pulse" />
            <div className="h-4 w-full bg-surface-hover rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-surface-hover rounded animate-pulse" />
            <div className="h-4 w-4/5 bg-surface-hover rounded animate-pulse" />
            <div className="h-32 w-full bg-surface-hover border border-border rounded-xl animate-pulse my-6" />
            <div className="h-4 w-full bg-surface-hover rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-surface-hover rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'goals') {
    return (
      <div className="p-6 space-y-6 w-full animate-in fade-in duration-200">
        <div className="flex justify-between items-center">
          <div className="h-6 w-40 bg-surface-hover rounded-md animate-pulse" />
          <div className="h-9 w-32 bg-[#2563EB]/20 rounded-lg animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 bg-surface border border-border rounded-xl space-y-4 shadow-2xs">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-surface-hover animate-pulse" />
                    <div className="h-5 w-64 bg-[#E5E8EC] rounded animate-pulse" />
                    <div className="h-5 w-16 bg-surface-hover rounded-full animate-pulse" />
                  </div>
                  <div className="h-3 w-96 bg-surface-hover rounded animate-pulse" />
                </div>
                <div className="w-12 h-6 bg-surface-hover rounded animate-pulse" />
              </div>
              <div className="space-y-1.5 pt-2 border-t border-[#F3F4F6]">
                <div className="flex justify-between text-xs">
                  <div className="h-3 w-24 bg-surface-hover rounded animate-pulse" />
                  <div className="h-3 w-10 bg-surface-hover rounded animate-pulse" />
                </div>
                <div className="h-2 w-full bg-surface-hover rounded-full overflow-hidden">
                  <div className="h-full bg-[#E5E8EC] w-2/3 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'habit-tracker') {
    return (
      <div className="p-6 space-y-6 w-full animate-in fade-in duration-200">
        <div className="flex justify-between items-center">
          <div className="h-6 w-44 bg-surface-hover rounded-md animate-pulse" />
          <div className="h-9 w-32 bg-[#0D9488]/20 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 bg-surface border border-border rounded-xl flex items-center justify-between shadow-2xs">
              <div className="space-y-1">
                <div className="h-3 w-20 bg-surface-hover rounded animate-pulse" />
                <div className="h-6 w-12 bg-[#E5E8EC] rounded animate-pulse" />
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#F0FDFA] animate-pulse" />
            </div>
          ))}
        </div>
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4 shadow-2xs">
          <div className="h-5 w-36 bg-surface-hover rounded animate-pulse mb-4" />
          {[1, 2, 3, 4, 5].map((j) => (
            <div key={j} className="flex items-center justify-between py-3 border-b border-[#F8F9FB] last:border-none">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-5 h-5 rounded bg-surface-hover animate-pulse" />
                <div className="h-4 w-48 bg-[#E5E8EC] rounded animate-pulse" />
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((k) => (
                  <div key={k} className="w-8 h-8 rounded-lg bg-surface-hover border border-border animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default Spinner variant
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full p-8 animate-in fade-in duration-200">
      <div className="relative mb-4">
        <div className="w-12 h-12 rounded-2xl bg-[#F0FDFA] border border-[#CCFBF1] flex items-center justify-center shadow-sm">
          <Loader2 className="w-6 h-6 text-[#0D9488] animate-spin stroke-[2]" />
        </div>
        <div className="absolute -inset-1 rounded-2xl bg-[#0D9488]/10 blur-md -z-10 animate-pulse" />
      </div>
      <h3 className="text-sm text-[#111827] font-semibold mb-1">{title}</h3>
      <p className="text-xs text-secondary max-w-sm text-center">{description}</p>

      {/* Sleek Skeleton Shimmer Preview below */}
      <div className="w-full max-w-3xl mt-8 space-y-3 opacity-60 pointer-events-none">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-24 bg-surface-hover border border-border rounded-xl animate-pulse" />
          <div className="h-24 bg-surface-hover border border-border rounded-xl animate-pulse delay-75" />
          <div className="h-24 bg-surface-hover border border-border rounded-xl animate-pulse delay-150" />
        </div>
        <div className="h-40 bg-surface-hover border border-border rounded-xl animate-pulse delay-200" />
      </div>
    </div>
  );
}
