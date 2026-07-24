import type { LucideIcon } from 'lucide-react';
import { BaseButton } from './BaseButton';

interface EmptyStateProps {
  icon: LucideIcon;
  title?: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center h-full w-full animate-in fade-in duration-300">
      <div className="w-24 h-24 rounded-full bg-[#F3F4F6] flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-[#6B7280] stroke-[1.5]" />
      </div>
      {title && <h3 className="text-xl font-bold text-[#0A0A0A] mb-2">{title}</h3>}
      <p className="text-[#6B7280] max-w-sm mb-6">{description}</p>
      
      {actionLabel && onAction && (
        <BaseButton onClick={onAction}>
          {actionLabel}
        </BaseButton>
      )}
    </div>
  );
}
