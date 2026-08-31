import { useState, useEffect } from 'react';
import { GlobalErrorBoundary } from './ui/GlobalErrorBoundary';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Analytics } from './Analytics';
import { Sidebar } from './Sidebar';
import { KanbanBoard } from './KanbanBoard';
import { BrainWorkspace } from './BrainWorkspace';
import { Dashboard } from './Dashboard';
import { CommandPalette } from './CommandPalette';
import { FocusTimerWidget } from './FocusTimerWidget';

import { Goals } from './Goals';
import { Projects } from './Projects';
import { SprintView } from './SprintView';
import { DailyReview } from './DailyReview';
import { ProjectDetail } from './ProjectDetail';
import { PlannerPage } from './planner/PlannerPage';
import { TimelineView } from './TimelineView';
import { HabitTracker } from './HabitTracker';
import { DecisionLog } from './DecisionLog';
import { KnowledgeGraph } from './KnowledgeGraph';
import { AIAssistant } from './AIAssistant';
import { Terminal, ArrowRight, WifiOff, Menu, Moon, Sun, Search, Sparkles, Bell, Check } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useTheme } from '../lib/theme';

export function AppShell() {
 const navigate = useNavigate();
 const { theme, toggleTheme } = useTheme();
 const [activePrefix, setActivePrefix] = useState<'g' | 'e' | 't' | 's' | null>(null);
 const [showCheatsheet, setShowCheatsheet] = useState(false);
 const [isOffline, setIsOffline] = useState(false);
 const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
 const [focusMode, setFocusMode] = useState(false);
 const queryClient = useQueryClient();

 useEffect(() => {
 const handleOffline = () => setIsOffline(true);
 const handleOnline = () => setIsOffline(false);
 const handleToggleFocus = () => setFocusMode(prev => !prev);
 window.addEventListener('krama:api-offline', handleOffline);
 window.addEventListener('krama:api-online', handleOnline);
 window.addEventListener('toggle-focus', handleToggleFocus);
 return () => {
 window.removeEventListener('krama:api-offline', handleOffline);
 window.removeEventListener('krama:api-online', handleOnline);
 window.removeEventListener('toggle-focus', handleToggleFocus);
 };
 }, []);

 useEffect(() => {
 let timeoutId: ReturnType<typeof setTimeout>;

 const handleKeyDown = (e: KeyboardEvent) => {
 // Ignore if typing inside input, textarea, or contentEditable
 const target = e.target as HTMLElement;
 if (
 target.tagName === 'INPUT' ||
 target.tagName === 'TEXTAREA' ||
 target.isContentEditable ||
 e.metaKey ||
 e.ctrlKey ||
 e.altKey
 ) {
 return;
 }

 const key = e.key.toLowerCase();

 if (e.key === '?' || (e.shiftKey && e.code === 'Slash')) {
 e.preventDefault();
 setShowCheatsheet(prev => !prev);
 return;
 }
 if (e.key === 'Escape') {
 if (showCheatsheet) {
 setShowCheatsheet(false);
 return;
 }
 if (activePrefix) {
 setActivePrefix(null);
 return;
 }
 setFocusMode(prev => !prev);
 return;
 }

 // If waiting for second chord key
 if (activePrefix) {
 e.preventDefault();
 if (activePrefix === 'g') {
 if (key === 'd') navigate('/app/');
 else if (key === 'b') navigate('/app/brain');
 else if (key === 'g') navigate('/app/goals');
 else if (key === 'p') navigate('/app/projects');
 } else if (activePrefix === 'e') {
 if (key === 'w') navigate('/app/planner');
 else if (key === 't') navigate('/app/timeline');
 else if (key === 'k') navigate('/app/board');
 else if (key === 's') navigate('/app/sprint');
 else if (key === 'r') navigate('/app/review');
 else if (key === 'h') navigate('/app/habits');
 } else if (activePrefix === 't') {
 if (key === 't') toggleTheme();
 } else if (activePrefix === 's') {
  if (key === 'n') navigate('/app/analytics');
  else if (key === 'a') window.dispatchEvent(new CustomEvent('open-ai-assistant'));
  }
 setActivePrefix(null);
 clearTimeout(timeoutId);
 return;
 }

 // Start new chord
 if (key === 'g' || key === 'e' || key === 't' || key === 's') {
 e.preventDefault();
 setActivePrefix(key as 'g' | 'e' | 't' | 's');
 timeoutId = setTimeout(() => {
 setActivePrefix(null);
 }, 2000);
 }
 };

 window.addEventListener('keydown', handleKeyDown);
 return () => {
 window.removeEventListener('keydown', handleKeyDown);
 clearTimeout(timeoutId);
 };
 }, [activePrefix, navigate, showCheatsheet, toggleTheme]);

 return (
 <div className="flex flex-col md:flex-row h-screen w-full bg-canvas text-primary overflow-hidden font-sans select-none">
 <CommandPalette />
      <FocusTimerWidget />

 {!focusMode && (
 <Sidebar 
 mobileOpen={mobileMenuOpen} 
 onMobileClose={() => setMobileMenuOpen(false)} 
 />
 )}
 
 <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">

 {/* Focus Mode Floating Badge */}
 {focusMode && (
 <button
 onClick={() => setFocusMode(false)}
 className="absolute top-20 right-4 z-50 px-3 py-1.5 rounded-full bg-surface/90 backdrop-blur-md border border-border text-caption font-mono text-secondary hover:text-primary hover:border-primary transition-all shadow-lg flex items-center gap-2 group cursor-pointer animate-in fade-in zoom-in-95 duration-200"
 title="Exit Focus Mode (Press ESC)"
 >
 <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-pulse" />
 <span>Focus Mode Active</span>
 <kbd className="bg-surface-hover px-1.5 py-0.5 rounded border border-border text-[9px] group-hover:text-primary">ESC</kbd>
 </button>
 )}

 {/* Offline Mode Warning Banner */}
 {isOffline && (
 <div className="w-full bg-[#FEF2F2] border-b border-[#FECACA] px-4 py-2 flex items-center justify-between text-caption text-[#991B1B] z-50 shrink-0 animate-in fade-in slide-in-from-top duration-200">
 <div className="flex items-center gap-2 font-medium">
 <WifiOff className="w-4 h-4 text-[#DC2626] animate-pulse shrink-0" />
 <span>API Unreachable — Offline Mode. Changes may not be saved to server. Reconnecting...</span>
 </div>
 <button
 onClick={() => window.location.reload()}
 className="px-2.5 py-1 bg-surface hover:bg-[#FEE2E2] text-[#DC2626] rounded border border-[#FECACA] font-medium transition-colors shrink-0"
 >
 Retry Now
 </button>
 </div>
 )}

 {/* Mobile Top Header */}
 {!focusMode && (
 <div className="md:hidden flex items-center justify-between p-3 bg-sidebar backdrop-blur-2xl border-b border-border z-40 shrink-0">
 <div className="flex items-center gap-2">
 <button
 onClick={() => setMobileMenuOpen(true)}
 className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-hover transition-colors"
 >
 <Menu className="w-5 h-5" />
 </button>
 <span className="font-mono font-bold text-body text-primary tracking-tight">KRAMA OS</span>
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={toggleTheme}
 className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-hover transition-colors border border-border"
 title="Toggle Theme"
 >
 {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-secondary" />}
 </button>
 <div className="text-[10px] font-mono text-[#0D9488] bg-[#F0FDF4] px-2 py-0.5 rounded border border-[#BBF7D0] flex items-center gap-1">
 <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]" /> Online
 </div>
 </div>
 </div>
 )}

 <main className="flex-1 overflow-y-auto bg-canvas relative animate-in fade-in duration-150 p-6 md:p-10">
 <GlobalErrorBoundary><Routes>
 <Route path="/" element={<Dashboard />} />
 <Route path="/brain/*" element={<BrainWorkspace />} />
 <Route path="/goals/*" element={<Goals />} />
 <Route path="/projects" element={<Projects />} />
 <Route path="/projects/:id" element={<ProjectDetail />} />
 <Route path="/board/*" element={<KanbanBoard />} />
 <Route path="/sprint/*" element={<SprintView />} />
 <Route path="/planner/*" element={<PlannerPage />} />
 <Route path="/timeline/*" element={<TimelineView />} />
 <Route path="/review/*" element={<DailyReview />} />
 <Route path="/habits/*" element={<HabitTracker />} />
 <Route path="/analytics/*" element={<Analytics />} />
 <Route path="/decisions" element={<DecisionLog />} />
 <Route path="/graph" element={<KnowledgeGraph />} />
 </Routes></GlobalErrorBoundary>
 </main>
 </div>
 <AIAssistant />

 {/* NEW: Visual Two-Key Chord HUD Indicator */}
 {activePrefix && (
 <div className="fixed bottom-6 right-6 z-50 bg-primary text-white px-4 py-3 rounded-xl shadow-2xl border border-white/10 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150 font-mono text-caption">
 <div className="w-6 h-6 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-bold shadow-sm">
 <Terminal className="w-3.5 h-3.5" />
 </div>
 <div className="flex items-center gap-2">
 <span className="text-muted">Chord:</span>
 <kbd className="bg-white/20 text-white px-2 py-0.5 rounded font-bold uppercase">{activePrefix}</kbd>
 <ArrowRight className="w-3 h-3 text-muted" />
 <span className="text-white font-medium animate-pulse">Waiting for key...</span>
 </div>
 <div className="text-[10px] text-muted pl-2 border-l border-white/10">
 {activePrefix === 'g' ? 'D (Dash), B (Brain), G (Goals), P (Proj)' : 
   activePrefix === 'e' ? 'W (Plan), T (Time), K (Board), S (Sprint), R (Rev), H (Habit)' :
   activePrefix === 's' ? 'N (Analytics)' : 'T (Toggle Theme)'}
 </div>
 </div>
 )}

 {/* Shortcut Cheatsheet Modal */}
 {showCheatsheet && (
 <div 
 onClick={() => setShowCheatsheet(false)}
 className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150"
 >
 <div 
 onClick={(e) => e.stopPropagation()}
 className="bg-surface border border-border rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5 relative"
 >
 <div className="flex items-center justify-between border-b border-border pb-3">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center font-mono font-bold text-body">?</div>
 <div>
 <h3 className="text-card text-primary mb-2 ">Keyboard Shortcuts</h3>
 <p className="text-caption text-secondary">Two-key chord navigation & commands</p>
 </div>
 </div>
 <button 
 onClick={() => setShowCheatsheet(false)}
 className="text-caption font-mono text-secondary bg-surface-hover px-2 py-1 rounded hover:bg-border transition-colors"
 >
 ESC
 </button>
 </div>

 <div className="grid grid-cols-2 gap-6 text-body">
 <div className="space-y-2.5">
 <h4 className="font-mono text-badge font-bold text-secondary uppercase tracking-wider mb-2">Go To (G Chords)</h4>
 <div className="flex items-center justify-between"><span className="text-primary">Dashboard</span><span className="font-mono text-caption bg-surface-hover px-1.5 py-0.5 rounded border border-border">G D</span></div>
 <div className="flex items-center justify-between"><span className="text-primary">Knowledge Brain</span><span className="font-mono text-caption bg-surface-hover px-1.5 py-0.5 rounded border border-border">G B</span></div>
 <div className="flex items-center justify-between"><span className="text-primary">Execution Kanban</span><span className="font-mono text-caption bg-surface-hover px-1.5 py-0.5 rounded border border-border">G E</span></div>
 <div className="flex items-center justify-between"><span className="text-primary">Projects & Sprints</span><span className="font-mono text-caption bg-surface-hover px-1.5 py-0.5 rounded border border-border">G P</span></div>
 <div className="flex items-center justify-between"><span className="text-primary">Goals & OKRs</span><span className="font-mono text-caption bg-surface-hover px-1.5 py-0.5 rounded border border-border">G G</span></div>
 </div>

 <div className="space-y-2.5">
 <h4 className="font-mono text-badge font-bold text-secondary uppercase tracking-wider mb-2">Execute (E Chords)</h4>
 <div className="flex items-center justify-between"><span className="text-primary">Weekly Planner</span><span className="font-mono text-caption bg-surface-hover px-1.5 py-0.5 rounded border border-border">E W</span></div>
 <div className="flex items-center justify-between"><span className="text-primary">Daily Timeline</span><span className="font-mono text-caption bg-surface-hover px-1.5 py-0.5 rounded border border-border">E T</span></div>
 <div className="flex items-center justify-between"><span className="text-primary">Kanban Board</span><span className="font-mono text-caption bg-surface-hover px-1.5 py-0.5 rounded border border-border">E K</span></div>
 <div className="flex items-center justify-between"><span className="text-primary">Sprint View</span><span className="font-mono text-caption bg-surface-hover px-1.5 py-0.5 rounded border border-border">E S</span></div>
 <div className="flex items-center justify-between"><span className="text-primary">Daily Review</span><span className="font-mono text-caption bg-surface-hover px-1.5 py-0.5 rounded border border-border">E R</span></div>
 <div className="flex items-center justify-between"><span className="text-primary">Habit Tracker</span><span className="font-mono text-caption bg-surface-hover px-1.5 py-0.5 rounded border border-border">E H</span></div>
 <div className="flex items-center justify-between"><span className="text-primary">Toggle Theme</span><span className="font-mono text-caption bg-surface-hover px-1.5 py-0.5 rounded border border-border">T T</span></div>
 </div>
 </div>

 <div className="border-t border-border pt-3 flex items-center justify-between text-caption text-secondary">
 <span>Command Palette</span>
 <span className="font-mono bg-surface-hover px-1.5 py-0.5 rounded border border-border">CMD / CTRL + K</span>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
