import { lazy, Suspense } from 'react';
import { Activity } from 'lucide-react';
import { SimProvider } from '@/context/SimContext';
import HeroSection from '@/sections/HeroSection';
import SimSection from '@/sections/SimSection';

const CellShowcase3D = lazy(() => import('@/components/CellShowcase3D'));
const ScienceSection = lazy(() => import('@/sections/ScienceSection'));
const ClinicalSection = lazy(() => import('@/sections/ClinicalSection'));
const DataSection = lazy(() => import('@/sections/DataSection'));
const TechSection = lazy(() => import('@/sections/TechSection'));
const TeamSection = lazy(() => import('@/sections/TeamSection'));
const ReferencesSection = lazy(() => import('@/sections/ReferencesSection'));
const AssetSection = lazy(() => import('@/sections/AssetSection'));
const Footer = lazy(() => import('@/sections/Footer'));

function SectionDivider() {
  return (
    <div className="relative py-5" aria-hidden="true">
      <div className="section-divider mx-auto max-w-5xl" />
      <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/40" />
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="px-8 py-20">
      <div className="mx-auto max-w-6xl animate-pulse">
        <div className="mx-auto mb-4 h-8 w-48 rounded-lg bg-slate-800/50" />
        <div className="mx-auto mb-12 h-4 w-96 rounded-lg bg-slate-800/30" />
        <div className="grid grid-cols-2 gap-6">
          <div className="h-64 rounded-xl bg-slate-800/20" />
          <div className="h-64 rounded-xl bg-slate-800/20" />
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <SimProvider>
      <div className="min-h-screen min-w-[1080px] bg-[#071019] text-slate-200">
        <nav className="fixed inset-x-0 top-0 z-50 border-b border-slate-700/50 bg-[#071019]/94 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-8">
            <a href="#top" className="flex items-center gap-3" aria-label="CAR-M Simulator home">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/10">
                <Activity className="h-4 w-4 text-cyan-300" />
              </div>
              <div>
                <div className="text-sm font-semibold tracking-wide text-white">CAR-M Simulator</div>
                <div className="text-[9px] uppercase tracking-[0.22em] text-slate-500">AI virtual cell platform</div>
              </div>
            </a>

            <div className="flex items-center gap-1">
              <NavLink href="#simulation" label="Simulator" />
              <NavLink href="#science" label="Science" />
              <NavLink href="#clinical" label="Clinical" />
              <NavLink href="#data" label="Data" />
              <NavLink href="#technology" label="Technology" />
              <NavLink href="#team" label="Team" />
              <a
                href="#simulation"
                className="ml-4 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                Open workbench
              </a>
            </div>
          </div>
        </nav>

        <main id="top" className="pt-16">
          <HeroSection />
          <SectionDivider />
          <SimSection />
          <SectionDivider />
          <Suspense fallback={<SectionSkeleton />}>
            <CellShowcase3D />
          </Suspense>
          <SectionDivider />

          <Suspense fallback={<SectionSkeleton />}>
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
            <Footer />
          </Suspense>
        </main>
      </div>
    </SimProvider>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
    >
      {label}
    </a>
  );
}

export default App;
