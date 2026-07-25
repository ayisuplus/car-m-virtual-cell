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
import AssetSection from '@/sections/AssetSection';
import Footer from '@/sections/Footer';

/* ── Section Divider Component ──────────────────────────────────── */
function SectionDivider() {
  return (
    <div className="relative py-8">
      <div className="section-divider max-w-4xl mx-auto" />
      {/* Center dot */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400/30" />
    </div>
  );
}

function App() {
  return (
    <SimProvider>
      <div className="min-h-screen bg-[#0a0f1a] text-slate-200">
        {/* Navigation — enhanced */}
        <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-slate-700/20 rounded-none backdrop-blur-xl">
          <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400/20 to-purple-400/20 border border-cyan-400/30 flex items-center justify-center hover:from-cyan-400/30 hover:to-purple-400/30 transition-all duration-300">
                <span className="text-xs font-bold text-cyan-400">M</span>
              </div>
              <div className="hidden sm:block">
                <span className="text-sm font-bold text-white">CAR-M</span>
                <span className="text-xs text-slate-400 ml-1.5 font-light">Simulator</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <NavLink href="#simulation" label="Sim" />
              <NavLink href="#science" label="Science" />
              <NavLink href="#clinical" label="Clinical" />
              <NavLink href="#data" label="Data" />
              <NavLink href="#technology" label="Tech" />
              <NavLink href="#team" label="Team" />
              <NavLink href="#references" label="Refs" />
              <NavLink href="#assets" label="Assets" />
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="pt-14">
          <HeroSection />
          <SectionDivider />
          <CellShowcase3D />
          <SectionDivider />
          <SimSection />
          <SectionDivider />
          <ScienceSection />
          <SectionDivider />
          <ClinicalSection />
          <SectionDivider />
          <DataSection />
          <SectionDivider />
          <TechSection />
          <SectionDivider />
          <TeamSection />
          <SectionDivider />
          <ReferencesSection />
          <SectionDivider />
          <AssetSection />
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
      className="px-3.5 py-2 rounded-lg text-xs text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/5 transition-all duration-300 font-medium relative group"
    >
      {label}
      {/* Hover underline effect */}
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-cyan-400/50 rounded-full group-hover:w-4/5 transition-all duration-300" />
    </a>
  );
}

export default App;
