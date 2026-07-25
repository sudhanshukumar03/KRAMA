import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, FolderKanban, Target, TrendingUp, Sparkles, ArrowRight, CheckCircle2, Clock, Brain, Terminal, CheckSquare } from 'lucide-react';
import { BaseButton } from './ui/BaseButton';
import { cn } from '../lib/utils';

export function LandingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'execution' | 'brain' | 'okrs'>('execution');

  return (
    <div className="min-h-screen w-full bg-canvas font-sans antialiased text-[#111827] selection:bg-[#2563EB]/10 selection:text-[#2563EB] select-none">
      
      {/* Content Container */}
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12 flex flex-col min-h-screen">
        
        {/* Nav Bar */}
        <header className="flex items-center justify-between py-6 border-b border-[#E5E8EC] animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#111827] text-white flex items-center justify-center font-mono font-bold text-sm shadow-sm">
              K
            </div>
            <div>
              <span className="font-bold tracking-tight text-[#111827] text-base leading-none block">KRAMA OS</span>
              <span className="text-[10px] font-mono text-[#9CA3AF] tracking-widest uppercase">v2.4 Enterprise</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-[#0D9488] bg-[#0D9488]/10 px-2.5 py-1 rounded-lg border border-[#0D9488]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488] animate-pulse" /> Local Workspace Synced
            </span>
            <BaseButton onClick={() => navigate('/app')} size="md" className="shadow-2xs group">
              Launch Workspace <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
            </BaseButton>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex flex-col items-center text-center pt-16 pb-20">
          
          <div className="max-w-4xl animate-in fade-in duration-200 slide-in-from-bottom-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F8F9FB] border border-[#E5E8EC] text-xs font-mono text-[#6B7280] mb-8 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-[#7C3AED]" />
              <span>Introducing Master Design Language & Two-Key Chord Navigation</span>
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05] text-[#111827] mb-6 max-w-4xl">
              Where Engineering Knowledge Becomes <span className="text-[#2563EB] underline decoration-[#2563EB]/20 underline-offset-8">Autonomous Execution</span>.
            </h1>

            <p className="text-lg md:text-xl text-[#6B7280] font-normal max-w-2xl mx-auto mb-10 leading-relaxed">
              The high-velocity operating system built for solo engineers and builders. Bridge strategic quarterly OKRs, structured knowledge trees, and daily Kanban execution in one unified white canvas.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <BaseButton onClick={() => navigate('/app')} size="lg" className="w-full sm:w-auto px-8 shadow-sm text-base group">
                Open Local OS <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </BaseButton>
              <BaseButton onClick={() => navigate('/app/brain')} variant="secondary" size="lg" className="w-full sm:w-auto px-6 text-base">
                Explore Knowledge Base
              </BaseButton>
            </div>
          </div>

          {/* NEW: Interactive Live OS Preview Showcase Widget */}
          <div className="w-full max-w-5xl bg-white border border-[#E5E8EC] rounded-2xl shadow-2xl overflow-hidden mb-24 animate-in fade-in duration-300 slide-in-from-bottom-6 text-left">
            
            {/* Window Top Bar */}
            <div className="h-12 bg-[#F8F9FB] border-b border-[#E5E8EC] px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400/80" />
                <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                <div className="w-3 h-3 rounded-full bg-green-400/80" />
                <span className="text-xs font-mono text-[#6B7280] ml-3 hidden sm:inline">krama-os://workspace/local/preview</span>
              </div>

              {/* Interactive Widget Tab Switcher */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-[#E5E8EC] shadow-2xs">
                <button 
                  onClick={() => setActiveTab('execution')}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-1.5",
                    activeTab === 'execution' ? "bg-[#111827] text-white shadow-2xs" : "text-[#6B7280] hover:text-[#111827]"
                  )}
                >
                  <FolderKanban className="w-3.5 h-3.5 text-[#2563EB]" /> Execution Board
                </button>
                <button 
                  onClick={() => setActiveTab('brain')}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-1.5",
                    activeTab === 'brain' ? "bg-[#111827] text-white shadow-2xs" : "text-[#6B7280] hover:text-[#111827]"
                  )}
                >
                  <Brain className="w-3.5 h-3.5 text-[#7C3AED]" /> Knowledge Tree
                </button>
                <button 
                  onClick={() => setActiveTab('okrs')}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-1.5",
                    activeTab === 'okrs' ? "bg-[#111827] text-white shadow-2xs" : "text-[#6B7280] hover:text-[#111827]"
                  )}
                >
                  <Target className="w-3.5 h-3.5 text-[#0D9488]" /> Quarterly OKRs
                </button>
              </div>

              <div className="text-[10px] font-mono text-[#9CA3AF] hidden md:block">
                Press <kbd className="bg-white px-1.5 py-0.5 rounded border border-[#E5E8EC]">G D</kbd> to jump
              </div>
            </div>

            {/* Widget Content Canvas */}
            <div className="p-6 md:p-8 bg-canvas min-h-[420px] flex flex-col justify-center">
              
              {/* TAB 1: Execution Board Mockup */}
              {activeTab === 'execution' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-[#E5E8EC] shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-bold font-mono text-xs">
                        EB
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-[#111827]">Active Sprint 14: Core Pipeline Architecture</div>
                        <div className="text-[11px] font-mono text-[#6B7280]">12 tickets • Velocity pacing: 32 pts/wk</div>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#2563EB] bg-[#EFF4FE] px-2.5 py-1 rounded-lg border border-[#2563EB]/20">
                      84% Burned
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Column 1 */}
                    <div className="bg-white rounded-xl border border-[#E5E8EC] p-3.5 shadow-2xs space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b border-[#E5E8EC] text-xs font-mono font-bold uppercase text-[#6B7280]">
                        <span>In Progress</span>
                        <span className="bg-[#F8F9FB] px-2 py-0.5 rounded text-[#111827]">2</span>
                      </div>
                      <div className="p-3 bg-[#F8F9FB] rounded-lg border border-[#E5E8EC] space-y-2">
                        <div className="flex justify-between text-[10px] font-mono text-[#9CA3AF]">
                          <span>KRM-102</span>
                          <span className="bg-red-50 text-[#DC2626] border border-[#DC2626]/20 px-1.5 rounded font-bold">URGENT</span>
                        </div>
                        <div className="font-medium text-xs text-[#111827]">Migrate storage engine to SQLite persistence layer</div>
                        <div className="space-y-1 pt-1 border-t border-[#E5E8EC]/60">
                          <div className="flex justify-between text-[10px] font-mono text-[#6B7280]">
                            <span className="flex items-center gap-1"><CheckSquare className="w-3 h-3 text-[#2563EB]" /> Sub-tasks</span>
                            <span className="font-bold">3/4</span>
                          </div>
                          <div className="h-1.5 w-full bg-white rounded-full overflow-hidden border border-[#E5E8EC]">
                            <div className="h-full bg-[#2563EB] w-3/4" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Column 2 */}
                    <div className="bg-white rounded-xl border border-[#E5E8EC] p-3.5 shadow-2xs space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b border-[#E5E8EC] text-xs font-mono font-bold uppercase text-[#6B7280]">
                        <span>In Review</span>
                        <span className="bg-[#F8F9FB] px-2 py-0.5 rounded text-[#111827]">1</span>
                      </div>
                      <div className="p-3 bg-[#F8F9FB] rounded-lg border border-[#E5E8EC] space-y-2">
                        <div className="flex justify-between text-[10px] font-mono text-[#9CA3AF]">
                          <span>KRM-104</span>
                          <span className="bg-amber-50 text-amber-600 border border-amber-200 px-1.5 rounded font-bold">HIGH</span>
                        </div>
                        <div className="font-medium text-xs text-[#111827]">Implement linear two-key chord navigation bindings</div>
                        <div className="text-[10px] font-mono text-[#0D9488] flex items-center gap-1 pt-1 border-t border-[#E5E8EC]/60">
                          <CheckCircle2 className="w-3 h-3" /> All unit tests passing
                        </div>
                      </div>
                    </div>

                    {/* Column 3 */}
                    <div className="bg-white rounded-xl border border-[#E5E8EC] p-3.5 shadow-2xs space-y-3 opacity-80">
                      <div className="flex justify-between items-center pb-2 border-b border-[#E5E8EC] text-xs font-mono font-bold uppercase text-[#6B7280]">
                        <span>Released</span>
                        <span className="bg-[#F8F9FB] px-2 py-0.5 rounded text-[#0D9488]">14</span>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-[#E5E8EC] space-y-1.5">
                        <div className="flex justify-between text-[10px] font-mono text-[#9CA3AF]">
                          <span>KRM-098</span>
                          <span className="text-[#0D9488] font-bold">DONE</span>
                        </div>
                        <div className="font-medium text-xs text-[#6B7280] line-through">Enforce strict #FFFFFF canvas and hairline borders</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Strategic Brain Mockup */}
              {activeTab === 'brain' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-200">
                  <div className="bg-white p-4 rounded-xl border border-[#E5E8EC] shadow-2xs space-y-2">
                    <div className="text-[10px] font-mono font-bold text-[#6B7280] uppercase tracking-wider mb-3">Page Tree</div>
                    <div className="p-2 bg-[#111827] text-white rounded-lg text-xs font-medium flex items-center gap-2 shadow-2xs">
                      <Brain className="w-4 h-4 text-[#7C3AED]" /> Architecture Specification v2.4
                    </div>
                    <div className="p-2 text-[#6B7280] hover:bg-[#F8F9FB] rounded-lg text-xs font-medium flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#9CA3AF]" /> Database Schema & ERD
                    </div>
                    <div className="p-2 text-[#6B7280] hover:bg-[#F8F9FB] rounded-lg text-xs font-medium flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-[#9CA3AF]" /> CLI & Terminal Sidecars
                    </div>
                  </div>

                  <div className="md:col-span-2 bg-white p-6 rounded-xl border border-[#E5E8EC] shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E5E8EC]">
                        <div className="flex items-center gap-2 text-xs font-mono text-[#6B7280]">
                          <span className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                          <span>420 words (2,410 chars)</span>
                          <span>•</span>
                          <span className="text-[#0D9488]">~3 min read</span>
                        </div>
                        <span className="text-[10px] font-mono text-[#7C3AED] bg-[#7C3AED]/10 px-2 py-0.5 rounded border border-[#7C3AED]/20 font-bold">
                          LIVE DOC
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-[#111827] mb-3">Architecture Specification v2.4</h3>
                      <p className="text-xs text-[#6B7280] leading-relaxed font-normal">
                        Krama operates as a self-contained local desktop application. All state persistence is managed through high-velocity SQLite transactions, ensuring zero latency during rapid keyboard navigation and focus sprints...
                      </p>
                    </div>
                    <div className="pt-4 mt-6 border-t border-[#E5E8EC]/60 flex justify-between items-center text-[10px] font-mono text-[#9CA3AF]">
                      <span>Linked Project: Krama OS Overhaul</span>
                      <span>Auto-saved 2m ago</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Quarterly OKRs Mockup */}
              {activeTab === 'okrs' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-white p-6 rounded-xl border border-[#E5E8EC] shadow-2xs">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#0D9488] bg-[#0D9488]/10 px-2 py-0.5 rounded border border-[#0D9488]/20">
                            QUARTERLY OKR
                          </span>
                          <h3 className="text-lg font-semibold text-[#111827]">Ship Krama OS v2.4 Enterprise Release</h3>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-mono text-[#6B7280]">
                          <Clock className="w-3.5 h-3.5 text-[#0D9488]" /> Target Date: Sept 30, 2026 (66d remaining)
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-3xl font-bold text-[#111827]">75%</span>
                        <span className="block text-[10px] text-[#6B7280] uppercase">Progress</span>
                      </div>
                    </div>

                    <div className="h-2.5 w-full bg-[#F8F9FB] rounded-full overflow-hidden border border-[#E5E8EC] mb-4">
                      <div className="h-full bg-[#0D9488] w-3/4 transition-all duration-500" />
                    </div>

                    <div className="bg-[#F8F9FB] p-3.5 rounded-lg border border-[#E5E8EC] flex flex-wrap justify-between items-center text-xs font-mono">
                      <div className="flex items-center gap-1.5 text-[#0D9488] font-bold uppercase tracking-wider">
                        <CheckCircle2 className="w-4 h-4" /> Ahead of Schedule
                      </div>
                      <div className="text-[#6B7280]">
                        Req: 0.38%/day • Act: <strong className="text-[#111827]">0.75%/day</strong>
                      </div>
                      <div className="text-[#111827] font-bold">
                        Est. Completion: Aug 18, 2026
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
            
            <div className="bg-[#F8F9FB] border-t border-[#E5E8EC] px-6 py-3 flex flex-col sm:flex-row items-center justify-between text-xs text-[#6B7280] font-mono gap-2">
              <span>Experience zero-latency state sync and keyboard-first workflows.</span>
              <button onClick={() => navigate('/app')} className="text-[#2563EB] font-bold hover:underline flex items-center gap-1">
                Enter Full OS Workspace &rarr;
              </button>
            </div>

          </div>

          {/* Feature Row with 40x40px Colorblind-Safe Category Tiles */}
          <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            
            {/* Tile 1: Brain (#7C3AED) */}
            <div className="bg-white border border-[#E5E8EC] p-6 rounded-2xl shadow-sm hover:border-[#7C3AED] hover:shadow-md transition-all group flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-[12px] bg-[#7C3AED] text-white flex items-center justify-center mb-5 shadow-sm group-hover:scale-105 transition-transform">
                  <Brain className="w-5 h-5 stroke-[1.75]" />
                </div>
                <h3 className="text-base font-semibold text-[#111827] mb-2">Strategic Brain</h3>
                <p className="text-xs text-[#6B7280] leading-relaxed font-normal">
                  Structured document trees with live word counters and reading time metrics. Never lose context in flat note lists.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-[#E5E8EC]/60 text-[11px] font-mono font-bold text-[#7C3AED] flex items-center gap-1">
                <span>Explore Docs</span> &rarr;
              </div>
            </div>

            {/* Tile 2: Execution (#2563EB) */}
            <div className="bg-white border border-[#E5E8EC] p-6 rounded-2xl shadow-sm hover:border-[#2563EB] hover:shadow-md transition-all group flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-[12px] bg-[#2563EB] text-white flex items-center justify-center mb-5 shadow-sm group-hover:scale-105 transition-transform">
                  <FolderKanban className="w-5 h-5 stroke-[1.75]" />
                </div>
                <h3 className="text-base font-semibold text-[#111827] mb-2">High-Velocity Board</h3>
                <p className="text-xs text-[#6B7280] leading-relaxed font-normal">
                  Kanban execution boards built for solo builders. Includes sub-task progress bars, velocity scorecards, and urgent tags.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-[#E5E8EC]/60 text-[11px] font-mono font-bold text-[#2563EB] flex items-center gap-1">
                <span>View Kanban</span> &rarr;
              </div>
            </div>

            {/* Tile 3: Goals (#0D9488) */}
            <div className="bg-white border border-[#E5E8EC] p-6 rounded-2xl shadow-sm hover:border-[#0D9488] hover:shadow-md transition-all group flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-[12px] bg-[#0D9488] text-white flex items-center justify-center mb-5 shadow-sm group-hover:scale-105 transition-transform">
                  <Target className="w-5 h-5 stroke-[1.75]" />
                </div>
                <h3 className="text-base font-semibold text-[#111827] mb-2">OKR Pacing Engine</h3>
                <p className="text-xs text-[#6B7280] leading-relaxed font-normal">
                  Automatic required vs. actual pacing calculations. Know exactly what completion percentage you must hit daily to launch on time.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-[#E5E8EC]/60 text-[11px] font-mono font-bold text-[#0D9488] flex items-center gap-1">
                <span>Check OKRs</span> &rarr;
              </div>
            </div>

            {/* Tile 4: Habits (#EA580C) */}
            <div className="bg-white border border-[#E5E8EC] p-6 rounded-2xl shadow-sm hover:border-[#EA580C] hover:shadow-md transition-all group flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-[12px] bg-[#EA580C] text-white flex items-center justify-center mb-5 shadow-sm group-hover:scale-105 transition-transform">
                  <TrendingUp className="w-5 h-5 stroke-[1.75]" />
                </div>
                <h3 className="text-base font-semibold text-[#111827] mb-2">Consistency Heatmaps</h3>
                <p className="text-xs text-[#6B7280] leading-relaxed font-normal">
                  30-day GitHub-style streak heatmaps and daily routine rollups. Track deep work hours and energy levels seamlessly.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-[#E5E8EC]/60 text-[11px] font-mono font-bold text-[#EA580C] flex items-center gap-1">
                <span>Track Habits</span> &rarr;
              </div>
            </div>

          </div>

        </main>

        {/* Footer */}
        <footer className="py-8 border-t border-[#E5E8EC] mt-auto flex flex-col sm:flex-row items-center justify-between text-xs text-[#6B7280] font-mono gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#111827]">KRAMA OS</span>
            <span>•</span>
            <span>Built for autonomous engineering execution.</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/app')} className="hover:text-[#111827]">Dashboard</button>
            <button onClick={() => navigate('/app/brain')} className="hover:text-[#111827]">Docs</button>
            <button onClick={() => navigate('/app/board')} className="hover:text-[#111827]">Kanban</button>
            <button onClick={() => navigate('/app/goals')} className="hover:text-[#111827]">OKRs</button>
          </div>
        </footer>

      </div>
    </div>
  );
}
