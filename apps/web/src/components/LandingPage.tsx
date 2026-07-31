import { useNavigate } from 'react-router-dom';
import { ArrowRight, Brain, FolderKanban, Target, Sparkles, CheckSquare, Clock, FileText, CheckCircle2 } from 'lucide-react';
import { BaseButton } from './ui/BaseButton';

export function LandingPage() {
 const navigate = useNavigate();

 return (
 <div className="min-h-screen w-full bg-canvas font-sans antialiased text-primary selection:bg-accent/10 selection:text-accent select-none flex flex-col">
 
 {/* Navigation Bar (#1px bottom border separating from hero) */}
 <header className="border-b border-border bg-canvas sticky top-0 z-40">
 <div className="max-w-7xl mx-auto px-6 lg:px-12 py-4 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-sm bg-primary text-canvas flex items-center justify-center font-mono font-bold text-body shadow-2xs">
 K
 </div>
 <span className="font-bold tracking-tight text-primary text-body leading-none">KRAMA OS</span>
 </div>
 
 <div className="flex items-center gap-4">
 <span className="hidden sm:flex items-center gap-1.5 text-badge text-goals bg-[#0D9488]/10 px-2.5 py-1 rounded-md border border-[#0D9488]/20">
 <span className="w-1.5 h-1.5 rounded-full bg-goals animate-pulse" /> Local Workspace Synced
 </span>
 <BaseButton onClick={() => navigate('/app')} size="md" className="shadow-2xs group">
 Open App <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-0.5 transition-transform duration-150" />
 </BaseButton>
 </div>
 </div>
 </header>

 {/* Hero Section (Above Fold - White Canvas, Left-Aligned 2-Column Grid) */}
 <main className="flex-1 bg-canvas">
 <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-24">
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
 
 {/* Left Column: Bold Headline, Muted Subhead, Single Primary CTA */}
 <div className="lg:col-span-6 text-left space-y-6">
 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border text-caption text-secondary shadow-2xs">
 <Sparkles className="w-3.5 h-3.5 text-brain" />
 <span>Unified Engineering Workspace & Knowledge Tree</span>
 </div>

 <h1 className="text-title text-primary mb-4 sm: lg: font-[650] leading-[1.08]">
 Where Knowledge Becomes <span className="text-accent underline decoration-accent/20 underline-offset-8">Execution</span>.
 </h1>

 <p className="text-body text-secondary max-w-xl leading-relaxed">
 The high-velocity operating system built for solo engineers and builders. Bridge strategic quarterly OKRs, structured document trees, and daily Kanban execution in one bounded white canvas.
 </p>

 <div className="pt-2">
 <BaseButton onClick={() => navigate('/app')} size="lg" className="w-full sm:w-auto px-8 shadow-sm text-body font-medium group">
 Launch Workspace <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-150" />
 </BaseButton>
 </div>
 </div>

 {/* Right Column Visual Anchor: Clean, Flat UI Mockup (Page Card + Kanban Card, Real Tokens, shadow-sm only) */}
 <div className="lg:col-span-6">
 <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-4">
 
 <div className="flex items-center justify-between pb-3 border-b border-border text-caption font-mono text-muted">
 <span className="flex items-center gap-2">
 <span className="w-2.5 h-2.5 rounded-full bg-primary" />
 krama-os://workspace/active
 </span>
 <span className="text-badge text-accent bg-accent-tint px-2 py-0.5 rounded border border-accent/20">Live Sync</span>
 </div>

 {/* Card 1: Brain Page Document Card */}
 <div className="bg-canvas border border-border rounded-lg p-4 shadow-2xs hover:border-[#7C3AED] transition-colors duration-150 space-y-3">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-md bg-[#7C3AED]/10 flex items-center justify-center text-[#7C3AED] shrink-0">
 <FileText className="w-4 h-4 stroke-[1.75]" />
 </div>
 <div>
 <div className="text-card-title text-primary">ADR-004: Storage Engine Architecture</div>
 <div className="text-caption text-secondary">Knowledge Base • Architecture Decisions</div>
 </div>
 </div>
 <span className="text-badge text-[#7C3AED] bg-[#7C3AED]/10 px-2 py-0.5 rounded">Brain</span>
 </div>
 <p className="text-caption text-secondary line-clamp-2 pl-10.5">
 We evaluated SQLite vs. PostgreSQL for local persistence. Selected SQLite with write-ahead logging (WAL) for sub-millisecond local queries and zero-latency offline execution.
 </p>
 <div className="flex items-center justify-between pl-10.5 pt-2 border-t border-border/60 text-caption font-mono text-muted">
 <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> 4m reading time</span>
 <span>1,240 words</span>
 </div>
 </div>

 {/* Card 2: Kanban Execution Issue Card */}
 <div className="bg-canvas border border-border rounded-lg p-4 shadow-2xs hover:border-[#2563EB] transition-colors duration-150 space-y-3">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-md bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB] shrink-0">
 <FolderKanban className="w-4 h-4 stroke-[1.75]" />
 </div>
 <div>
 <div className="text-card-title text-primary">KRM-102: Migrate storage engine to SQLite WAL</div>
 <div className="text-caption text-secondary">Sprint 14 • Execution Board</div>
 </div>
 </div>
 <span className="text-badge text-[#DC2626] bg-[#DC2626]/10 px-2 py-0.5 rounded border border-[#DC2626]/20">Urgent</span>
 </div>
 <div className="pl-10.5 space-y-2">
 <div className="flex justify-between text-caption font-mono text-secondary">
 <span className="flex items-center gap-1.5"><CheckSquare className="w-3.5 h-3.5 text-[#2563EB]" /> Sub-task Progress</span>
 <span className="font-bold text-primary">3 / 4 Done</span>
 </div>
 <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden border border-border">
 <div className="h-full bg-[#2563EB] w-3/4 progress-fill" />
 </div>
 </div>
 <div className="flex items-center justify-between pl-10.5 pt-2 border-t border-border/60 text-caption font-mono text-muted">
 <span className="flex items-center gap-1 text-[#0D9488]"><CheckCircle2 className="w-3.5 h-3.5" /> Blocked by: KRM-098</span>
 <span className="text-badge text-[#2563EB] bg-accent-tint px-1.5 py-0.5 rounded">In Progress</span>
 </div>
 </div>

 </div>
 </div>

 </div>
 </div>
 </main>

 {/* Feature Section Below the Fold (Set on #FCFCFD with 1px top border, 3-Column Row) */}
 <section className="bg-surface border-t border-border py-20 w-full">
 <div className="max-w-7xl mx-auto px-6 lg:px-12">
 
 <div className="text-left mb-12">
 <h2 className="text-section text-primary mb-3 ">Three Core Systems. One Bounded Workspace.</h2>
 <p className="text-body text-secondary max-w-2xl">
 Stop context switching between fragmented note apps, issue trackers, and spreadsheets. Krama unites your technical thinking with daily execution.
 </p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
 
 {/* Column 1: Brain (#7C3AED) */}
 <div className="bg-canvas border border-border p-6 rounded-lg shadow-sm hover:border-[#7C3AED] hover:shadow-md transition-all duration-150 flex flex-col justify-between">
 <div>
 <div className="w-9 h-9 rounded-md bg-[#7C3AED]/10 text-[#7C3AED] flex items-center justify-center mb-5 shadow-2xs">
 <Brain className="w-4 h-4 stroke-[1.75]" />
 </div>
 <h3 className="text-card text-primary mb-2 ">Strategic Brain</h3>
 <p className="text-body text-secondary leading-relaxed">
 Structured document trees with live word counters and reading time metrics. Never lose architectural context in flat note lists.
 </p>
 </div>
 <div className="pt-4 mt-6 border-t border-border/60 text-badge text-[#7C3AED] flex items-center gap-1 cursor-pointer" onClick={() => navigate('/app/brain')}>
 <span>Explore Knowledge Tree</span> &rarr;
 </div>
 </div>

 {/* Column 2: Execution (#2563EB) */}
 <div className="bg-canvas border border-border p-6 rounded-lg shadow-sm hover:border-[#2563EB] hover:shadow-md transition-all duration-150 flex flex-col justify-between">
 <div>
 <div className="w-9 h-9 rounded-md bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center mb-5 shadow-2xs">
 <FolderKanban className="w-4 h-4 stroke-[1.75]" />
 </div>
 <h3 className="text-card text-primary mb-2 ">Execution Board</h3>
 <p className="text-body text-secondary leading-relaxed">
 High-velocity Kanban execution boards built for solo builders. Includes sub-task progress bars, velocity pacing, and urgency tags.
 </p>
 </div>
 <div className="pt-4 mt-6 border-t border-border/60 text-badge text-[#2563EB] flex items-center gap-1 cursor-pointer" onClick={() => navigate('/app/board')}>
 <span>View Kanban Board</span> &rarr;
 </div>
 </div>

 {/* Column 3: Goals (#0D9488) */}
 <div className="bg-canvas border border-border p-6 rounded-lg shadow-sm hover:border-[#0D9488] hover:shadow-md transition-all duration-150 flex flex-col justify-between">
 <div>
 <div className="w-9 h-9 rounded-md bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center mb-5 shadow-2xs">
 <Target className="w-4 h-4 stroke-[1.75]" />
 </div>
 <h3 className="text-card text-primary mb-2 ">OKR Pacing Engine</h3>
 <p className="text-body text-secondary leading-relaxed">
 Automatic required vs. actual pacing calculations. Know exactly what completion percentage you must hit daily to launch on schedule.
 </p>
 </div>
 <div className="pt-4 mt-6 border-t border-border/60 text-badge text-[#0D9488] flex items-center gap-1 cursor-pointer" onClick={() => navigate('/app/goals')}>
 <span>Check Quarterly OKRs</span> &rarr;
 </div>
 </div>

 </div>
 </div>
 </section>

 {/* Footer */}
 <footer className="py-8 border-t border-border bg-canvas mt-auto">
 <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col sm:flex-row items-center justify-between text-caption font-mono text-secondary gap-4">
 <div className="flex items-center gap-2">
 <span className="font-bold text-primary">KRAMA OS</span>
 <span>•</span>
 <span>Built for high-velocity engineering execution.</span>
 </div>
 <div className="flex items-center gap-6">
 <button onClick={() => navigate('/app')} className="hover:text-primary transition-colors duration-150">Dashboard</button>
 <button onClick={() => navigate('/app/brain')} className="hover:text-primary transition-colors duration-150">Docs</button>
 <button onClick={() => navigate('/app/board')} className="hover:text-primary transition-colors duration-150">Kanban</button>
 <button onClick={() => navigate('/app/goals')} className="hover:text-primary transition-colors duration-150">OKRs</button>
 </div>
 </div>
 </footer>

 </div>
 );
}
