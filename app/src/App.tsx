import { lazy, Suspense, useEffect, useState } from 'react';
import { Activity, Menu, X } from 'lucide-react';
import { SimProvider } from '@/context/SimContext';
import HeroSection from '@/sections/HeroSection';
import CellShowcase3D from '@/components/CellShowcase3D';
import SimSection from '@/sections/SimSection';

const ScienceSection = lazy(() => import('@/sections/ScienceSection'));
const ClinicalSection = lazy(() => import('@/sections/ClinicalSection'));
const DataSection = lazy(() => import('@/sections/DataSection'));
const TechSection = lazy(() => import('@/sections/TechSection'));
const TeamSection = lazy(() => import('@/sections/TeamSection'));
const ReferencesSection = lazy(() => import('@/sections/ReferencesSection'));
const AssetSection = lazy(() => import('@/sections/AssetSection'));
const Footer = lazy(() => import('@/sections/Footer'));

const NAV_ITEMS = [
  { href: '#simulation', label: 'Simulator' },
  { href: '#science', label: 'Science' },
  { href: '#clinical', label: 'Clinical' },
  { href: '#data', label: 'Data' },
  { href: '#technology', label: 'Technology' },
  { href: '#team', label: 'Team' },
  { href: '#references', label: 'References' },
];

function SectionDivider() {
  return (
    <div className="relative mx-auto h-px max-w-7xl px-6" aria-hidden="true">
      <div className="h-px bg-gradient-to-r from-transparent via-cyan-300/15 to-transparent" />
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="px-6 py-24" aria-label="Loading content">
      <div className="mx-auto max-w-6xl animate-pulse">
        <div className="mx-auto mb-5 h-3 w-28 rounded-full bg-cyan-300/10" />
        <div className="mx-auto mb-12 h-10 w-72 rounded-xl bg-slate-800/60" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-64 rounded-2xl bg-slate-800/30" />
          <div className="h-64 rounded-2xl bg-slate-800/30" />
        </div>
      </div>
    </div>
  );
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const closeMenu = () => setMenuOpen(false);
    window.addEventListener('resize', closeMenu);
    return () => window.removeEventListener('resize', closeMenu);
  }, []);

  return (
    <SimProvider>
      <div className="min-h-screen overflow-x-hidden bg-[#071019] text-slate-200">
        <nav className="site-nav fixed inset-x-0 top-0 z-50" aria-label="Primary navigation">
          <div className="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between px-5 md:px-8">
            <a href="#top" className="group flex items-center gap-3" aria-label="CAR-M Simulator home">
              <span className="relative grid h-10 w-10 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/[0.07] text-cyan-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <Activity className="h-5 w-5" />
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-[#071019] bg-emerald-300" />
              </span>
              <span className="leading-none">
                <span className="block text-[15px] font-semibold tracking-[-0.01em] text-white">CAR-M</span>
                <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">Virtual Cell Lab</span>
              </span>
            </a>

            <div className="hidden items-center gap-0.5 lg:flex">
              {NAV_ITEMS.map((item) => <NavLink key={item.href} {...item} />)}
            </div>

            <div className="flex items-center gap-3">
              <a href="#simulation" className="nav-cta hidden sm:inline-flex">Open workbench</a>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 lg:hidden"
                aria-expanded={menuOpen}
                aria-controls="mobile-navigation"
                aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {menuOpen && (
            <div id="mobile-navigation" className="border-t border-white/[0.06] bg-[#071019]/95 px-5 py-4 backdrop-blur-2xl lg:hidden">
              <div className="mx-auto grid max-w-[1600px] grid-cols-2 gap-2 sm:grid-cols-4">
                {NAV_ITEMS.map((item) => (
                  <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm text-slate-300 hover:bg-white/[0.05] hover:text-white">
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </nav>

        <main id="top" className="pt-[72px]">
          <HeroSection />
          <SectionDivider />
          <CellShowcase3D />
          <SectionDivider />
          <SimSection />
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
    <a href={href} className="rounded-lg px-3 py-2 text-[12px] font-medium text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-white">
      {label}
    </a>
  );
}

export default App;
