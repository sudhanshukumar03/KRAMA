import { Routes, Route } from 'react-router-dom';
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

export function AppShell() {
  return (
    <div className="flex h-screen w-full bg-white text-[#0A0A0A] overflow-hidden font-sans">
      <CommandPalette />
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-white relative animate-in fade-in duration-150">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/brain/*" element={<BrainWorkspace />} />
          <Route path="/goals/*" element={<Goals />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/board/*" element={<KanbanBoard />} />
          <Route path="/sprint/*" element={<SprintView />} />
          <Route path="/planner/*" element={<WeeklyPlanner />} />
          <Route path="/review/*" element={<DailyReview />} />
        </Routes>
      </main>
    </div>
  );
}
