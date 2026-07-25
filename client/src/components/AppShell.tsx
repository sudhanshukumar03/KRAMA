import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { KanbanBoard } from './KanbanBoard';
import { BrainWorkspace } from './BrainWorkspace';
import { Dashboard } from './Dashboard';
import { CommandPalette } from './CommandPalette';
import { Goals } from './Goals';
import { Projects } from './Projects';
import { SprintView } from './SprintView';
import { DailyReview } from './DailyReview';
import { ProjectDetail } from './ProjectDetail';
import { WeeklyPlanner } from './WeeklyPlanner';
import { TimelineView } from './TimelineView';
import { HabitTracker } from './HabitTracker';
import { Terminal, ArrowRight } from 'lucide-react';

export function AppShell() {
  const navigate = useNavigate();
  const [activePrefix, setActivePrefix] = useState<'g' | 'e' | null>(null);

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
        }
        setActivePrefix(null);
        clearTimeout(timeoutId);
        return;
      }

      // Start new chord
      if (key === 'g' || key === 'e') {
        e.preventDefault();
        setActivePrefix(key as 'g' | 'e');
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
  }, [activePrefix, navigate]);

  return (
    <div className="flex h-screen w-full bg-canvas text-primary overflow-hidden font-sans select-none">
      <CommandPalette />
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto bg-canvas relative animate-in fade-in duration-150">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/brain/*" element={<BrainWorkspace />} />
          <Route path="/goals/*" element={<Goals />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/board/*" element={<KanbanBoard />} />
          <Route path="/sprint/*" element={<SprintView />} />
          <Route path="/planner/*" element={<WeeklyPlanner />} />
          <Route path="/timeline/*" element={<TimelineView />} />
          <Route path="/review/*" element={<DailyReview />} />
          <Route path="/habits/*" element={<HabitTracker />} />
        </Routes>
      </main>

      {/* NEW: Visual Two-Key Chord HUD Indicator */}
      {activePrefix && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#111827] text-white px-4 py-3 rounded-xl shadow-2xl border border-white/10 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150 font-mono text-xs">
          <div className="w-6 h-6 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-bold shadow-sm">
            <Terminal className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#9CA3AF]">Chord:</span>
            <kbd className="bg-white/20 text-white px-2 py-0.5 rounded font-bold uppercase">{activePrefix}</kbd>
            <ArrowRight className="w-3 h-3 text-[#9CA3AF]" />
            <span className="text-white font-medium animate-pulse">Waiting for key...</span>
          </div>
          <div className="text-[10px] text-[#9CA3AF] pl-2 border-l border-white/10">
            {activePrefix === 'g' ? 'D (Dash), B (Brain), G (Goals), P (Proj)' : 'W (Plan), T (Time), K (Board), S (Sprint), R (Rev), H (Habit)'}
          </div>
        </div>
      )}
    </div>
  );
}
