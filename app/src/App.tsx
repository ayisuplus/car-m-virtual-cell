import { SimProvider } from '@/context/SimContext';
import HeroSection from '@/sections/HeroSection';
import CellShowcase3D from '@/components/CellShowcase3D';
import SimSection from '@/sections/SimSection';
import ScienceSection from '@/sections/ScienceSection';
import ClinicalSection from '@/sections/ClinicalSection';
import DataSection from '@/sections/DataSection';
import TechSection from '@/sections/TechSection';
import TeamSection from '@/sections/TeamSection';
import ReferencesSection from '@/sections/ReferencesSection';
import Footer from '@/sections/Footer';

function App() {
  return (
    <SimProvider>
      <div className="min-h-screen bg-[#0a0f1a] text-slate-200">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-slate-700/30 rounded-none">
          <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
                <span className="text-[10px] font-bold text-cyan-400">M</span>
              </div>
              <span className="text-sm font-semibold text-white hidden sm:block">CAR-M Simulator</span>
            </div>
            <div className="flex items-center gap-1">
              <NavLink href="#simulation" label="Sim" />
              <NavLink href="#science" label="Science" />
              <NavLink href="#clinical" label="Clinical" />
              <NavLink href="#data" label="Data" />
              <NavLink href="#technology" label="Tech" />
              <NavLink href="#team" label="Team" />
              <NavLink href="#references" label="Refs" />
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="pt-12">
          <HeroSection />
          <CellShowcase3D />
          <SimSection />
          <ScienceSection />
          <ClinicalSection />
          <DataSection />
          <TechSection />
          <TeamSection />
          <ReferencesSection />
        </main>

        <Footer />
      </div>
    </SimProvider>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="px-3 py-1.5 rounded-md text-xs text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/5 transition-all duration-200"
    >
      {label}
    </a>
  );
}

export default App;
