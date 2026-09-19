import React, { useState } from 'react';
import { X, Sliders, RotateCcw, Palette, Check } from 'lucide-react';
import type { TimerSettings } from './types';

interface SettingsPanelProps {
  settings: TimerSettings;
  onSaveSettings: (settings: TimerSettings) => void;
  onClose: () => void;
}

const PRESET_COLORS: { hex: string; name: string; isLight?: boolean }[] = [
  { hex: '#ffffff', name: 'Classic White', isLight: true },
  { hex: '#2dd4bf', name: 'Neon Teal' },
  { hex: '#10b981', name: 'Emerald Green' },
  { hex: '#38bdf8', name: 'Sky Blue' },
  { hex: '#a855f7', name: 'Electric Purple' },
  { hex: '#f43f5e', name: 'Vibrant Rose' },
  { hex: '#f59e0b', name: 'Solar Amber' },
  { hex: '#f97316', name: 'Sunset Orange' },
  { hex: '#a3e635', name: 'Electric Lime' },
];

const DEFAULT_SETTINGS: TimerSettings = {
  focusDuration: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakAfter: 4,
  customDuration: 45,
  autoStartBreaks: true,
  autoStartPomodoros: false,
  soundEnabled: true,
  digitsColor: '#ffffff',
};

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSaveSettings,
  onClose,
}) => {
  const [localSettings, setLocalSettings] = useState<TimerSettings>({ 
    ...DEFAULT_SETTINGS,
    ...settings 
  });

  const handleReset = () => {
    setLocalSettings(DEFAULT_SETTINGS);
    onSaveSettings(DEFAULT_SETTINGS);
  };

  const updateField = <K extends keyof TimerSettings>(field: K, val: TimerSettings[K]) => {
    const updated = { ...localSettings, [field]: val };
    setLocalSettings(updated);
    onSaveSettings(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-neutral-900/95 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-semibold">Customize</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Form Body with proper padding & scrolling */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Numbers Colour Section */}
          <div className="space-y-3 pb-5 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold flex items-center gap-1.5 text-white">
                  <Palette className="w-4 h-4 text-teal-400" />
                  <span>Numbers Colour</span>
                </label>
                <span className="text-[11px] text-white/50">Custom color for timer digits & clock</span>
              </div>

              {/* Live Preview Chip */}
              <div
                className="px-3 py-1 rounded-lg font-mono font-bold text-xs bg-black/70 border border-white/20 tracking-tight shadow-inner"
                style={{ color: localSettings.digitsColor || '#ffffff' }}
              >
                25:00
              </div>
            </div>

            {/* Presets & Custom Color Picker */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {PRESET_COLORS.map((preset) => {
                  const isSelected = (localSettings.digitsColor || '#ffffff').toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => updateField('digitsColor', preset.hex)}
                      className={`w-7 h-7 rounded-full transition-all flex items-center justify-center cursor-pointer border ${
                        isSelected ? 'scale-110 border-white ring-2 ring-white/50 shadow-lg' : 'border-white/20 hover:scale-105'
                      }`}
                      style={{ backgroundColor: preset.hex }}
                      title={preset.name}
                    >
                      {isSelected && (
                        <Check className={`w-3.5 h-3.5 ${preset.isLight ? 'text-black stroke-[2.5]' : 'text-white stroke-[2.5]'}`} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Custom Color Native Picker & Hex Input */}
              <div className="flex items-center gap-2 shrink-0">
                <label
                  className="relative w-7 h-7 rounded-full border border-white/30 cursor-pointer overflow-hidden flex items-center justify-center hover:border-white transition-colors shadow-inner shrink-0"
                  title="Pick custom color"
                  style={{ backgroundColor: localSettings.digitsColor || '#ffffff' }}
                >
                  <input
                    type="color"
                    value={localSettings.digitsColor || '#ffffff'}
                    onChange={(e) => updateField('digitsColor', e.target.value)}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                  />
                </label>
                <input
                  type="text"
                  value={localSettings.digitsColor || '#ffffff'}
                  onChange={(e) => updateField('digitsColor', e.target.value)}
                  placeholder="#ffffff"
                  className="w-20 bg-white/10 border border-white/15 rounded-xl px-2 py-1 text-center font-mono text-xs font-semibold focus:outline-none focus:border-white uppercase"
                  maxLength={7}
                />
              </div>
            </div>
          </div>

          {/* Durations */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <label className="text-xs font-semibold block">Focus Duration</label>
                <span className="text-[11px] text-white/50">Length of each work session</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={localSettings.focusDuration}
                  onChange={(e) => updateField('focusDuration', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 bg-white/10 border border-white/15 rounded-xl px-2.5 py-1.5 text-center font-mono text-xs font-semibold focus:outline-none focus:border-white"
                />
                <span className="text-xs text-white/60 font-mono w-8 text-left">min</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <label className="text-xs font-semibold block">Short Break</label>
                <span className="text-[11px] text-white/50">Rest between sessions</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={localSettings.shortBreak}
                  onChange={(e) => updateField('shortBreak', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 bg-white/10 border border-white/15 rounded-xl px-2.5 py-1.5 text-center font-mono text-xs font-semibold focus:outline-none focus:border-white"
                />
                <span className="text-xs text-white/60 font-mono w-8 text-left">min</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <label className="text-xs font-semibold block">Long Break</label>
                <span className="text-[11px] text-white/50">Extended rest interval</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={localSettings.longBreak}
                  onChange={(e) => updateField('longBreak', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 bg-white/10 border border-white/15 rounded-xl px-2.5 py-1.5 text-center font-mono text-xs font-semibold focus:outline-none focus:border-white"
                />
                <span className="text-xs text-white/60 font-mono w-8 text-left">min</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <label className="text-xs font-semibold block">Custom Timer Sprint</label>
                <span className="text-[11px] text-white/50">Personal user-decided focus duration</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  min={1}
                  max={360}
                  value={localSettings.customDuration || 45}
                  onChange={(e) => updateField('customDuration', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 bg-white/10 border border-white/15 rounded-xl px-2.5 py-1.5 text-center font-mono text-xs font-semibold focus:outline-none focus:border-white"
                />
                <span className="text-xs text-white/60 font-mono w-8 text-left">min</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <label className="text-xs font-semibold block">Long Break After</label>
                <span className="text-[11px] text-white/50">Number of pomodoro cycles</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  min={2}
                  max={12}
                  value={localSettings.longBreakAfter}
                  onChange={(e) => updateField('longBreakAfter', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 bg-white/10 border border-white/15 rounded-xl px-2.5 py-1.5 text-center font-mono text-xs font-semibold focus:outline-none focus:border-white"
                />
                <span className="text-xs text-white/60 font-mono w-8 text-left">slots</span>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 space-y-4">
            {/* Auto Start Breakers */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <label className="text-xs font-semibold block">Auto-start Breaks</label>
                <span className="text-[11px] text-white/50">Begin break immediately after focus</span>
              </div>
              <input
                type="checkbox"
                checked={localSettings.autoStartBreaks}
                onChange={(e) => updateField('autoStartBreaks', e.target.checked)}
                className="w-4 h-4 accent-teal-500 rounded cursor-pointer shrink-0"
              />
            </div>

            {/* Auto Start Pomodoros */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <label className="text-xs font-semibold block">Auto-start Pomodoros</label>
                <span className="text-[11px] text-white/50">Begin focus immediately after break</span>
              </div>
              <input
                type="checkbox"
                checked={localSettings.autoStartPomodoros}
                onChange={(e) => updateField('autoStartPomodoros', e.target.checked)}
                className="w-4 h-4 accent-teal-500 rounded cursor-pointer shrink-0"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/30 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to defaults</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white text-black font-semibold text-xs rounded-xl hover:bg-white/90 transition-colors"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
