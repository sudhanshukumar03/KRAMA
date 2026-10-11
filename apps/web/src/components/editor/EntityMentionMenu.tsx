import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { FileText, CheckSquare, FolderKanban } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface MentionEntityItem {
  id: string;
  title: string;
  type: 'DOCUMENT' | 'TASK' | 'PROJECT';
  subtitle?: string;
}

export interface EntityMentionMenuProps {
  items: MentionEntityItem[];
  command: (item: MentionEntityItem) => void;
  editor: any;
  range: any;
}

export interface EntityMentionMenuRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

export const EntityMentionMenu = forwardRef<EntityMentionMenuRef, EntityMentionMenuProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + props.items.length - 1) % Math.max(props.items.length, 1));
        return true;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(props.items.length, 1));
        return true;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (!props.items || props.items.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl shadow-xl p-3 w-64 text-center font-mono text-[11px] text-muted select-none">
        No matching entities found
      </div>
    );
  }

  const getTypeIcon = (type: MentionEntityItem['type']) => {
    switch (type) {
      case 'DOCUMENT':
        return <FileText className="w-3.5 h-3.5 text-cat-tasks shrink-0" />;
      case 'TASK':
        return <CheckSquare className="w-3.5 h-3.5 text-success-fg shrink-0" />;
      case 'PROJECT':
        return <FolderKanban className="w-3.5 h-3.5 text-cat-projects shrink-0" />;
    }
  };

  return (
    <div className="bg-surface border border-border rounded-xl shadow-2xl overflow-hidden py-1 w-72 max-h-64 overflow-y-auto font-sans select-none animate-in fade-in zoom-in-95 duration-100">
      <div className="px-3 py-1.5 border-b border-border/50 text-[10px] font-mono font-bold uppercase tracking-wider text-muted">
        Link Workspace Entity
      </div>
      <div className="p-1 space-y-0.5">
        {props.items.map((item, index) => {
          const isSelected = index === selectedIndex;
          return (
            <button
              key={`${item.type}-${item.id}`}
              type="button"
              onClick={() => selectItem(index)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={cn(
                "w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer",
                isSelected ? "bg-surface-hover text-primary" : "text-secondary hover:text-primary"
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                item.type === 'DOCUMENT' && "bg-cat-tasks-bg",
                item.type === 'TASK' && "bg-success-bg",
                item.type === 'PROJECT' && "bg-cat-projects-bg",
              )}>
                {getTypeIcon(item.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium truncate leading-tight text-primary">
                  {item.title}
                </div>
                <div className="text-[10px] font-mono text-muted flex items-center gap-1.5 mt-0.5">
                  <span className={cn(
                    "uppercase font-bold text-[9px] px-1 py-0.2 rounded",
                    item.type === 'DOCUMENT' && "text-cat-tasks bg-cat-tasks-bg",
                    item.type === 'TASK' && "text-success-fg bg-success-bg",
                    item.type === 'PROJECT' && "text-cat-projects bg-cat-projects-bg",
                  )}>
                    {item.type}
                  </span>
                  {item.subtitle && <span className="truncate">{item.subtitle}</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});

EntityMentionMenu.displayName = 'EntityMentionMenu';
