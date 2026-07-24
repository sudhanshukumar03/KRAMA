import { useNavigate } from 'react-router-dom';
import { BookOpen, FolderKanban, Target } from 'lucide-react';
import { BaseButton } from './ui/BaseButton';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-white font-sans antialiased text-[#0A0A0A] selection:bg-[#0A0A0A]/10 selection:text-[#0A0A0A]">
      
      {/* Content Container */}
      <div className="max-w-[1200px] mx-auto px-6 lg:px-12 flex flex-col min-h-screen">
        
        {/* Nav Bar */}
        <nav className="flex items-center justify-between py-8 animate-in fade-in duration-200 ease-out">
          <div className="font-bold tracking-widest text-lg">
            KRAMA
          </div>
          
          <BaseButton onClick={() => navigate('/app')}>
            Open App
          </BaseButton>
        </nav>

        {/* Hero Section */}
        <main className="flex-1 flex flex-col justify-center pb-24 pt-16">
          
          <div className="max-w-3xl animate-in fade-in duration-200 ease-out slide-in-from-bottom-4">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-8">
              Where Knowledge<br />
              Becomes<br />
              Execution
            </h1>

            <p className="text-xl md:text-2xl text-[#6B7280] font-medium max-w-2xl mb-12 leading-relaxed">
              A single system for solo builders — connecting research, goals, and daily execution.
            </p>

            <BaseButton onClick={() => navigate('/app')} className="px-8 py-3 text-base">
              Open Krama
            </BaseButton>
          </div>

          {/* Feature Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-32 animate-in fade-in duration-200 ease-out delay-150 fill-mode-both slide-in-from-bottom-4">
            
            <div className="flex flex-col items-start">
              <div className="w-10 h-10 rounded-lg bg-[#FAFAFA] border border-[#E5E7EB] flex items-center justify-center mb-5">
                <BookOpen className="w-5 h-5 text-[#0A0A0A]" />
              </div>
              <h3 className="text-lg font-bold mb-2">Notes that connect</h3>
              <p className="text-[#6B7280] leading-relaxed">
                Every doc lives in a structured space, not a flat list.
              </p>
            </div>

            <div className="flex flex-col items-start">
              <div className="w-10 h-10 rounded-lg bg-[#FAFAFA] border border-[#E5E7EB] flex items-center justify-center mb-5">
                <FolderKanban className="w-5 h-5 text-[#0A0A0A]" />
              </div>
              <h3 className="text-lg font-bold mb-2">A board that moves</h3>
              <p className="text-[#6B7280] leading-relaxed">
                Track real work with a Kanban board built for one.
              </p>
            </div>

            <div className="flex flex-col items-start">
              <div className="w-10 h-10 rounded-lg bg-[#FAFAFA] border border-[#E5E7EB] flex items-center justify-center mb-5">
                <Target className="w-5 h-5 text-[#0A0A0A]" />
              </div>
              <h3 className="text-lg font-bold mb-2">Goals that add up</h3>
              <p className="text-[#6B7280] leading-relaxed">
                Progress on daily tasks rolls up into the bigger picture.
              </p>
            </div>

          </div>

        </main>
      </div>
    </div>
  );
}
