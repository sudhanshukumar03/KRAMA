import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import type { Editor } from '@tiptap/core';
import { cn } from '../../lib/utils';

export interface SlashCommandItem {
  id: string;
  title: string;
  description: string;
  icon: any;
  keywords: string[];
  command: (editor: Editor) => void;
}

export interface SlashCommandMenuProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
  editor: any;
  range: any;
}

export interface SlashCommandMenuRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

export const SlashCommandMenu = forwardRef<SlashCommandMenuRef, SlashCommandMenuProps>((props, ref) => {
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
        setSelectedIndex((prev) => (prev + props.items.length - 1) % props.items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % props.items.length);
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
      <div className="w-64 p-3 bg-surface/95 backdrop-blur-md border border-border rounded-xl shadow-2xl text-caption text-secondary font-mono text-center">
        No matching commands
      </div>
    );
  }

  return (
    <div className="w-72 max-h-80 overflow-y-auto p-1.5 bg-surface/95 backdrop-blur-md border border-border rounded-xl shadow-2xl flex flex-col gap-0.5 font-sans animate-in fade-in zoom-in-95 duration-100">
      <div className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-muted border-b border-border/60 mb-1">
        Commands
      </div>
      {props.items.map((item, index) => {
        const Icon = item.icon;
        const isSelected = index === selectedIndex;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => selectItem(index)}
            onMouseEnter={() => setSelectedIndex(index)}
            className={cn(
              "w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer group",
              isSelected 
                ? "bg-blue-600 text-white shadow-2xs" 
                : "text-primary hover:bg-surface-hover"
            )}
          >
            <div
              className={cn(
                "w-7 h-7 rounded-md flex items-center justify-center shrink-0 border transition-colors",
                isSelected
                  ? "bg-white/20 border-transparent text-white"
                  : "bg-surface-hover border-border/80 text-secondary group-hover:text-primary"
              )}
            >
              <Icon className="w-4 h-4 stroke-[2]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-[13px] leading-tight truncate">
                {item.title}
              </div>
              <div
                className={cn(
                  "text-[11px] leading-tight truncate mt-0.5",
                  isSelected ? "text-blue-100" : "text-secondary"
                )}
              >
                {item.description}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
});

SlashCommandMenu.displayName = 'SlashCommandMenu';
