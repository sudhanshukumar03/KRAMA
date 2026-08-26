// =============================================================================
// PLANNER SKELETON — KRAMA OS
// =============================================================================

export function PlannerSkeleton() {
  return (
    <div className="p-6 space-y-5 animate-in fade-in">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-10 w-64 animate-pulse rounded-xl bg-slate-200" />
      </div>

      {/* Capacity cards skeleton */}
      <div className="grid grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100 border border-slate-200" />
        ))}
      </div>

      {/* Matrix skeleton */}
      <div className="h-[600px] animate-pulse rounded-2xl bg-slate-100 border border-slate-200" />
    </div>
  );
}
