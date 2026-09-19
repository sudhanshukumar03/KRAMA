import React from 'react';
import { X, Check, LayoutGrid } from 'lucide-react';
import type { LayoutName } from './types';

interface TimerLayoutPickerProps {
  currentLayout: LayoutName;
  onSelectLayout: (layout: LayoutName) => void;
  onClose: () => void;
}

interface LayoutItem {
  id: LayoutName;
  name: string;
  tag: string;
  description: string;
  renderPreview: (isSelected: boolean) => React.ReactNode;
}

const LAYOUT_ITEMS: LayoutItem[] = [
  {
    id: 'standby',
    name: 'Default',
    tag: 'Classic',
    description: 'Split broken-digit clock with active session slots and ambient backdrop.',
    renderPreview: (isSelected) => (
      <div className="w-full h-24 rounded-xl bg-black/60 border border-white/10 p-2.5 flex flex-col justify-between items-center relative overflow-hidden group-hover:border-white/20 transition-colors">
        <div className="w-full flex justify-between items-center text-[8px] text-white/40 font-mono">
          <span className="bg-white/10 px-1.5 py-0.5 rounded">FOCUS</span>
          <span>10:42 AM</span>
        </div>
        {/* Split Digits Simulation */}
        <div className="flex items-center gap-1 my-auto">
          <div className="w-7 h-9 rounded bg-white/15 border border-white/10 flex flex-col justify-center items-center relative">
            <div className="w-full h-[1px] bg-black/80 absolute inset-x-0 top-1/2 -translate-y-1/2" />
            <span className={`text-base font-mono font-black ${isSelected ? 'text-teal-300' : 'text-white'}`}>2</span>
          </div>
          <div className="w-7 h-9 rounded bg-white/15 border border-white/10 flex flex-col justify-center items-center relative">
            <div className="w-full h-[1px] bg-black/80 absolute inset-x-0 top-1/2 -translate-y-1/2" />
            <span className={`text-base font-mono font-black ${isSelected ? 'text-teal-300' : 'text-white'}`}>5</span>
          </div>
        </div>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
        </div>
      </div>
    ),
  },
  {
    id: 'centered',
    name: 'Centered Minimal',
    tag: 'Focus',
    description: 'Large ultra-clean centered countdown digits with zero distraction.',
    renderPreview: (isSelected) => (
      <div className="w-full h-24 rounded-xl bg-black/60 border border-white/10 p-2.5 flex flex-col justify-center items-center relative overflow-hidden group-hover:border-white/20 transition-colors">
        <span className={`text-2xl font-mono font-bold tracking-tight ${isSelected ? 'text-teal-300' : 'text-white'}`}>
          25:00
        </span>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-12 h-1 rounded-full bg-teal-400/60" />
          <div className="w-4 h-4 rounded-full bg-white/15 border border-white/20" />
        </div>
      </div>
    ),
  },
  {
    id: 'zen',
    name: 'Zen Flow',
    tag: 'Calm',
    description: 'Organic relaxed timer layout with breathing room and subtle controls.',
    renderPreview: (isSelected) => (
      <div className="w-full h-24 rounded-xl bg-black/60 border border-white/10 p-2.5 flex flex-col justify-between items-center relative overflow-hidden group-hover:border-white/20 transition-colors">
        <div className="w-12 h-1 rounded-full bg-white/10" />
        <div className="flex flex-col items-center">
          <span className={`text-xl font-mono font-light tracking-widest ${isSelected ? 'text-teal-300' : 'text-white/90'}`}>
            25:00
          </span>
          <span className="text-[8px] text-white/40 tracking-wider uppercase mt-0.5">Deep Flow</span>
        </div>
        <div className="w-16 h-1 rounded-full bg-white/10" />
      </div>
    ),
  },
  {
    id: 'card',
    name: 'Glass Card',
    tag: 'Modern',
    description: 'Frosted translucent glass card with elevated controls and timer.',
    renderPreview: (isSelected) => (
      <div className="w-full h-24 rounded-xl bg-black/60 border border-white/10 p-2 flex items-center justify-center relative overflow-hidden group-hover:border-white/20 transition-colors">
        <div className="w-4/5 h-4/5 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 p-2 flex flex-col justify-between items-center shadow-lg">
          <div className="w-full flex justify-between items-center text-[7px] text-white/50">
            <span>TASK</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>
          <span className={`text-sm font-mono font-bold ${isSelected ? 'text-teal-300' : 'text-white'}`}>
            25:00
          </span>
          <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="w-1/2 h-full bg-teal-400" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'overlay',
    name: 'Corner Overlay',
    tag: 'HUD',
    description: 'Unobtrusive floating corner timer keeping your screen completely open.',
    renderPreview: (isSelected) => (
      <div className="w-full h-24 rounded-xl bg-black/60 border border-white/10 p-2 flex flex-col justify-between relative overflow-hidden group-hover:border-white/20 transition-colors">
        <div className="text-[7px] font-mono text-white/30 uppercase">Screen Area</div>
        <div className="self-end w-20 h-10 rounded-lg bg-white/15 border border-white/20 p-1 flex flex-col justify-center items-center shadow-md">
          <span className={`text-[11px] font-mono font-bold ${isSelected ? 'text-teal-300' : 'text-white'}`}>
            25:00
          </span>
          <span className="text-[6px] text-white/40 uppercase">Corner HUD</span>
        </div>
      </div>
    ),
  },
  {
    id: 'sidebar',
    name: 'Sidebar Plan',
    tag: 'Structured',
    description: 'Integrated sidebar plan and tasks alongside the active timer display.',
    renderPreview: (isSelected) => (
      <div className="w-full h-24 rounded-xl bg-black/60 border border-white/10 p-1.5 flex gap-1.5 relative overflow-hidden group-hover:border-white/20 transition-colors">
        <div className="w-1/3 h-full rounded-lg bg-white/10 border border-white/10 p-1 flex flex-col gap-1">
          <div className="w-full h-1.5 rounded bg-teal-400/40" />
          <div className="w-full h-1 rounded bg-white/15" />
          <div className="w-full h-1 rounded bg-white/15" />
          <div className="w-full h-1 rounded bg-white/15" />
        </div>
        <div className="flex-1 h-full rounded-lg bg-white/5 flex flex-col items-center justify-center">
          <span className={`text-xs font-mono font-bold ${isSelected ? 'text-teal-300' : 'text-white'}`}>
            25:00
          </span>
          <div className="w-8 h-1 rounded-full bg-teal-400/60 mt-1" />
        </div>
      </div>
    ),
  },
];

export const TimerLayoutPicker: React.FC<TimerLayoutPickerProps> = ({
  currentLayout,
  onSelectLayout,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-neutral-900/95 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <LayoutGrid className="w-5 h-5 text-teal-400" />
            <div>
              <h2 className="text-base font-semibold">Timer Layout</h2>
              <p className="text-[11px] text-white/50">
                Choose your focus screen presentation & layout design
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Layout Cards Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {LAYOUT_ITEMS.map((item) => {
              const isSelected = currentLayout === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectLayout(item.id)}
                  className={`group relative rounded-2xl border p-3.5 text-left transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-teal-500/10 border-teal-400/80 ring-2 ring-teal-400/30 shadow-lg'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Top: Name & Badge */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-white tracking-wide">
                        {item.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/60 uppercase">
                          {item.tag}
                        </span>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-teal-400 flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 text-black stroke-[3]" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Preview Wireframe */}
                    <div className="my-2.5">
                      {item.renderPreview(isSelected)}
                    </div>

                    {/* Description */}
                    <p className="text-[11px] text-white/60 line-clamp-2 leading-relaxed mt-1">
                      {item.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/30 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white text-black font-semibold text-xs rounded-xl hover:bg-white/90 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
