import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  title?: string;
  description?: string;
}

export function LoadingState({
  title = 'Loading...',
  description = 'Syncing distributed engineering workspace...'
}: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full p-8 animate-in fade-in duration-200">
      <div className="relative mb-4">
        <div className="w-12 h-12 rounded-2xl bg-[#F0FDFA] border border-[#CCFBF1] flex items-center justify-center shadow-sm">
          <Loader2 className="w-6 h-6 text-[#0D9488] animate-spin stroke-[2]" />
        </div>
        <div className="absolute -inset-1 rounded-2xl bg-[#0D9488]/10 blur-md -z-10 animate-pulse" />
      </div>
      <h3 className="text-section text-[#111827] font-semibold mb-1">{title}</h3>
      <p className="text-body text-[#6B7280] max-w-sm text-center">{description}</p>

      {/* Sleek Skeleton Shimmer Preview below */}
      <div className="w-full max-w-3xl mt-8 space-y-3 opacity-60 pointer-events-none">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-24 bg-[#F8F9FB] border border-[#E5E8EC] rounded-xl animate-pulse" />
          <div className="h-24 bg-[#F8F9FB] border border-[#E5E8EC] rounded-xl animate-pulse delay-75" />
          <div className="h-24 bg-[#F8F9FB] border border-[#E5E8EC] rounded-xl animate-pulse delay-150" />
        </div>
        <div className="h-40 bg-[#F8F9FB] border border-[#E5E8EC] rounded-xl animate-pulse delay-200" />
      </div>
    </div>
  );
}
