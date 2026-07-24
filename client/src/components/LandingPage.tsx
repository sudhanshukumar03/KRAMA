import { Link } from 'react-router-dom';
import { Brain, CheckSquare, Target, Bot, ArrowRight, Waypoints } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-zinc-950 font-sans selection:bg-white/20 selection:text-white">
      {/* Background Gradient Mesh */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1e2a35] via-[#2a3c4a] to-[#8fa3a8] opacity-90" />
      
      {/* Film Grain Noise Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />

      {/* Content Container */}
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12 h-screen flex flex-col">
        
        {/* Nav Bar */}
        <nav className="flex items-center justify-between py-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
              <Waypoints className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold tracking-widest text-lg">KRAMA</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
            <a href="#" className="hover:text-white transition-colors">Product</a>
            <a href="#" className="hover:text-white transition-colors">Workflow</a>
            <a href="#" className="hover:text-white transition-colors">Pricing</a>
            <a href="#" className="hover:text-white transition-colors">Docs</a>
          </div>

          <Link 
            to="/app" 
            className="bg-white text-zinc-950 px-5 py-2 rounded-full text-sm font-semibold hover:bg-white/90 transition-colors shadow-lg"
          >
            Get Started
          </Link>
        </nav>

        {/* Hero Section */}
        <div className="flex-1 flex flex-col lg:flex-row items-center gap-12 lg:gap-20 pb-20 pt-10">
          
          {/* Left Column (55%) */}
          <div className="w-full lg:w-[55%] flex flex-col items-start pt-10">
            
            <h1 className="text-5xl md:text-6xl lg:text-[5rem] leading-[1.05] font-bold text-white tracking-tight mb-4 max-w-2xl">
              Where Knowledge<br />
              Becomes<br />
              Execution
            </h1>

            {/* Capability Pills inline-ish */}
            <div className="flex flex-wrap gap-3 mb-8 mt-4">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full">
                <Brain className="w-4 h-4 text-white/90" />
                <span className="text-xs font-medium text-white/80">Brain</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full">
                <CheckSquare className="w-4 h-4 text-white/90" />
                <span className="text-xs font-medium text-white/80">Execution</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full">
                <Target className="w-4 h-4 text-white/90" />
                <span className="text-xs font-medium text-white/80">Goals</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full">
                <Bot className="w-4 h-4 text-white/90" />
                <span className="text-xs font-medium text-white/80">Copilot</span>
              </div>
            </div>

            <p className="text-lg md:text-xl text-white/70 max-w-xl mb-10 leading-relaxed font-medium">
              A single operating system for solo builders — connecting research, goals, and daily execution so nothing gets tangled or lost.
            </p>

            {/* Email Capture Row */}
            <div className="flex items-center w-full max-w-md bg-white/5 backdrop-blur-md border border-white/10 rounded-full p-1.5 mb-12 shadow-2xl">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/40 px-4 text-sm"
              />
              <Link 
                to="/app"
                className="bg-white text-zinc-950 px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-white/90 transition-colors flex items-center gap-2"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Trust Row */}
            <div className="flex items-center gap-4 opacity-80">
              <div className="flex -space-x-3">
                <div className="w-8 h-8 rounded-full border border-[#1e2a35] bg-zinc-800 flex items-center justify-center text-[10px] text-white/50">M1</div>
                <div className="w-8 h-8 rounded-full border border-[#1e2a35] bg-zinc-700 flex items-center justify-center text-[10px] text-white/50">B2</div>
                <div className="w-8 h-8 rounded-full border border-[#1e2a35] bg-zinc-600 flex items-center justify-center text-[10px] text-white/50">X3</div>
              </div>
              <span className="text-xs font-medium text-white/70 tracking-wide">
                Trusted by 500+ solo builders and indie makers
              </span>
            </div>

          </div>

          {/* Right Column (45%) - Product Mockup Visual */}
          <div className="w-full lg:w-[45%] h-full relative hidden lg:block">
            
            {/* The Visual Container */}
            <div className="absolute inset-0 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px]">
              
              {/* BACK LAYER: Brain Doc Card */}
              <div className="absolute top-10 left-10 w-[380px] h-[400px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl -rotate-6 transition-transform hover:-rotate-3 duration-500">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center mb-4 text-xl">🏛️</div>
                <h3 className="text-white text-xl font-bold mb-2">Architecture Overview</h3>
                <div className="flex gap-2 mb-6">
                  <span className="px-2 py-0.5 bg-white/10 text-white/70 rounded text-[10px] uppercase font-bold tracking-wider">Design</span>
                  <span className="px-2 py-0.5 bg-white/10 text-white/70 rounded text-[10px] uppercase font-bold tracking-wider">Draft</span>
                </div>
                
                {/* Mock text blocks */}
                <div className="space-y-3">
                  <div className="w-full h-3 bg-white/10 rounded" />
                  <div className="w-5/6 h-3 bg-white/10 rounded" />
                  <div className="w-full h-3 bg-white/10 rounded" />
                  <div className="w-4/6 h-3 bg-white/10 rounded" />
                </div>
                
                {/* Specific anchor point for annotation 1 */}
                <div className="absolute right-0 top-1/2 w-3 h-3 rounded-full bg-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.5)] translate-x-1.5 -translate-y-1.5" id="anchor-brain" />
              </div>

              {/* FRONT LAYER: Kanban Stack */}
              <div className="absolute bottom-10 right-0 w-[420px] bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rotate-3 transition-transform hover:rotate-6 duration-500">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-white font-bold text-sm">Sprint 1: The Setup</h4>
                  {/* Goal ring anchor */}
                  <div className="flex items-center gap-2 bg-white/10 px-2 py-1 rounded-full relative">
                    <div className="w-3 h-3 rounded-full border-2 border-amber-400 border-t-transparent animate-spin-slow relative" id="anchor-goal" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">35%</span>
                  </div>
                </div>

                <div className="flex gap-4">
                  {/* Column 1 */}
                  <div className="flex-1 space-y-3">
                    <div className="text-white/50 text-[10px] uppercase font-bold tracking-wider">Todo</div>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <div className="w-full h-2.5 bg-white/20 rounded mb-2" />
                      <div className="w-2/3 h-2.5 bg-white/20 rounded mb-3" />
                      <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-red-400" /></div>
                    </div>
                  </div>
                  {/* Column 2 */}
                  <div className="flex-1 space-y-3">
                    <div className="text-white/50 text-[10px] uppercase font-bold tracking-wider">In Progress</div>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3 relative">
                      {/* Anchor point for execution link */}
                      <div className="absolute -left-1.5 top-1/2 w-3 h-3 rounded-full bg-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.5)] -translate-y-1.5" id="anchor-execution" />
                      
                      <div className="w-full h-2.5 bg-white/60 rounded mb-2" />
                      <div className="w-1/2 h-2.5 bg-white/60 rounded mb-3" />
                      <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-amber-400" /></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Glowing SVG Connector Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                <defs>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                {/* Line linking Brain to Kanban */}
                <path 
                  d="M 380 200 C 420 200, 350 350, 200 375" 
                  fill="none" 
                  stroke="rgba(251,191,36,0.6)" 
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  filter="url(#glow)"
                />
                {/* Line for Annotation 1 */}
                <path d="M 380 200 L 480 150" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                {/* Line for Annotation 2 */}
                <path d="M 400 400 L 520 420" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                {/* Line for Annotation 3 */}
                <path d="M 350 250 L 320 180" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
              </svg>

              {/* Floating Annotations */}
              <div className="absolute top-[135px] left-[485px] bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full text-white text-[10px] font-bold tracking-wide whitespace-nowrap shadow-xl z-30">
                Every doc links to real work
              </div>
              <div className="absolute top-[405px] left-[525px] bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full text-white text-[10px] font-bold tracking-wide whitespace-nowrap shadow-xl z-30">
                Linear-style execution board
              </div>
              <div className="absolute top-[150px] left-[200px] bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full text-white text-[10px] font-bold tracking-wide whitespace-nowrap shadow-xl z-30">
                Goal progress rolls up
              </div>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
