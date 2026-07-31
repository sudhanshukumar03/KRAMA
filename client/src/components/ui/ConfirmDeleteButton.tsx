import { useState, useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ConfirmDeleteButtonProps {
  onConfirm: (e: React.MouseEvent) => void;
  className?: string;
  iconClassName?: string;
}

export function ConfirmDeleteButton({ onConfirm, className, iconClassName }: ConfirmDeleteButtonProps) {
  const [armed, setArmed] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (armed) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setArmed(false);
      onConfirm(e);
    } else {
      setArmed(true);
      timeoutRef.current = setTimeout(() => {
        setArmed(false);
      }, 3000); // 3 seconds to confirm
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={handleClick}
      title={armed ? "Click again to confirm delete" : "Delete"}
      className={cn(
        "transition-all duration-150 cursor-pointer overflow-hidden flex items-center justify-center",
        armed ? "bg-[#DC2626] text-white hover:bg-[#B91C1C] rounded px-1.5 py-0.5" : "text-muted hover:text-[#DC2626] hover:bg-[#DC2626]/10 rounded p-1",
        className
      )}
    >
      {armed ? (
        <span className="text-[10px] font-bold font-mono tracking-wider uppercase whitespace-nowrap">Sure?</span>
      ) : (
        <Trash2 className={cn("w-3.5 h-3.5 stroke-[1.5]", iconClassName)} />
      )}
    </button>
  );
}
