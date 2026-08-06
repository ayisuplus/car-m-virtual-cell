import { lazy, Suspense, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SimulationCanvas from '@/components/SimulationCanvas';
import ControlPanel from '@/components/ControlPanel';
import CellLegend from '@/components/CellLegend';
import { Sliders, Dna, BarChart3, FlaskConical, GitCompare, Brain } from 'lucide-react';
import { useSim } from '@/context/SimContext';
import type { SimParams, CarDesign } from '@/types/simulation';
import type { ABMEngine } from '@/lib/simulation/engine';

const Simulation3D = lazy(() => import('@/components/Simulation3D'));
const CarDesigner = lazy(() => import('@/components/CarDesigner'));
const Dashboard = lazy(() => import('@/components/Dashboard'));
const PresetScenarios = lazy(() => import('@/components/PresetScenarios'));
const ExperimentComparator = lazy(() => import('@/components/ExperimentComparator'));
const NeuralSurrogateDemo = lazy(() => import('@/components/NeuralSurrogateDemo'));

function PanelFallback() {
  return <div className="h-40 animate-pulse rounded-xl border border-slate-800 bg-slate-900/40" aria-label="Loading panel" />;
}

export default function SimSection() {
  const [activeTab, setActiveTab] = useState('control');
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [engine, setEngine] = useState<ABMEngine | null>(null);
  const { updateSimParams, updateCarDesign } = useSim();

  const handlePresetSelect = (simParams: SimParams, carDesign: CarDesign) => {
    updateSimParams(simParams);
    updateCarDesign(carDesign);
  };

  return (
    <section id="simulation" className="min-h-screen px-8 py-20">
      <div className="mx-auto max-w-[1600px]">
        {/* Section header — enhanced */}
        <div className="mb-8 grid grid-cols-[1fr_auto] items-end gap-8">
          <div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/5 mb-4">
            <span className="w-2 h-2 rounded-full bg-cyan-400 pulse-dot" />
            <span className="text-xs text-cyan-400 font-semibold tracking-widest uppercase">Interactive Simulation</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
            TME <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">Simulator</span>
          </h2>
          <p className="text-slate-400 text-base max-w-2xl leading-relaxed">
            Real-time agent-based simulation of CAR-M cells interacting with tumor cells
            in the tumor microenvironment. Adjust parameters and observe emergent behaviors.
          </p>
          </div>
          <div className="mb-1 flex items-center gap-6 rounded-xl border border-slate-700/60 bg-[#0a141f] px-5 py-3">
            <div>
              <div className="text-[9px] uppercase tracking-[0.18em] text-slate-500">Model</div>
              <div className="mt-1 font-mono text-xs text-cyan-300">ABM v2.4</div>
            </div>
            <div className="h-7 w-px bg-slate-700" />
            <div>
              <div className="text-[9px] uppercase tracking-[0.18em] text-slate-500">State</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />Ready</div>
            </div>
          </div>
        </div>

        {/* View mode toggle — enhanced */}
        <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-800 bg-[#09131d] p-2">
          <span className="px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Simulation viewport</span>
          <div className="flex gap-2">
          <button
            onClick={() => setViewMode('2d')}
            aria-pressed={viewMode === '2d'}
            className={`rounded-md px-4 py-2 text-xs font-semibold transition-colors ${
              viewMode === '2d'
                ? 'border border-cyan-400/50 bg-cyan-400/15 text-cyan-300'
                : 'bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600'
            }`}
          >
            2D View
          </button>
          <button
            onClick={() => setViewMode('3d')}
            aria-pressed={viewMode === '3d'}
            className={`rounded-md px-4 py-2 text-xs font-semibold transition-colors ${
              viewMode === '3d'
                ? 'border border-cyan-400/50 bg-cyan-400/15 text-cyan-300'
                : 'bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600'
            }`}
          >
            3D View
          </button>
          </div>
        </div>

        {/* Main layout: Canvas + Sidebar */}
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Canvas area — enhanced */}
          <div className="relative min-h-[650px] flex-1 overflow-hidden rounded-xl border border-slate-700/60 bg-[#050a11] shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
            <div className={viewMode === '2d' ? 'relative w-full h-full' : 'absolute inset-0 opacity-0 pointer-events-none -z-10'}>
              <SimulationCanvas onEngineReady={setEngine} />
            </div>
            {viewMode === '3d' && (
              <div className="absolute inset-0 z-10">
                <Suspense fallback={<PanelFallback />}><Simulation3D engine={engine} /></Suspense>
              </div>
            )}
            {/* Corner accent */}
            <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-cyan-400/30 rounded-tl-xl" />
            <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-cyan-400/30 rounded-br-xl" />
          </div>

          {/* Sidebar with tabs */}
          <div className="w-full lg:w-80 xl:w-96 space-y-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList aria-label="Simulation workbench" className="grid h-auto w-full grid-cols-3 gap-1 border border-slate-700/60 bg-[#09131d] p-1">
                <TabsTrigger value="control" aria-label="Setup controls" className="min-h-10 px-2 text-xs data-[state=active]:bg-cyan-400/15 data-[state=active]:text-cyan-300">
                  <Sliders className="w-3.5 h-3.5 mr-0.5" />
                  <span>Setup</span>
                </TabsTrigger>
                <TabsTrigger value="designer" aria-label="CAR-M designer" className="min-h-10 px-2 text-xs data-[state=active]:bg-cyan-400/15 data-[state=active]:text-cyan-300">
                  <Dna className="w-3.5 h-3.5 mr-0.5" />
                  <span>CAR-M</span>
                </TabsTrigger>
                <TabsTrigger value="dashboard" aria-label="Simulation results" className="min-h-10 px-2 text-xs data-[state=active]:bg-cyan-400/15 data-[state=active]:text-cyan-300">
                  <BarChart3 className="w-3.5 h-3.5 mr-0.5" />
                  <span>Results</span>
                </TabsTrigger>
                <TabsTrigger value="scenarios" aria-label="Preset scenarios" className="min-h-10 px-2 text-xs data-[state=active]:bg-amber-400/15 data-[state=active]:text-amber-300">
                  <FlaskConical className="w-3.5 h-3.5 mr-0.5" />
                  <span>Presets</span>
                </TabsTrigger>
                <TabsTrigger value="compare" aria-label="Compare experiments" className="min-h-10 px-2 text-xs data-[state=active]:bg-emerald-400/15 data-[state=active]:text-emerald-300">
                  <GitCompare className="w-3.5 h-3.5 mr-0.5" />
                  <span>Compare</span>
                </TabsTrigger>
                <TabsTrigger value="ai" aria-label="AI surrogate" className="min-h-10 px-2 text-xs data-[state=active]:bg-purple-400/15 data-[state=active]:text-purple-300">
                  <Brain className="w-3.5 h-3.5 mr-0.5" />
                  <span>AI model</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="control" className="mt-3">
                <ControlPanel />
              </TabsContent>

              <TabsContent value="designer" className="mt-3">
                <Suspense fallback={<PanelFallback />}><CarDesigner /></Suspense>
              </TabsContent>

              <TabsContent value="dashboard" className="mt-3">
                <Suspense fallback={<PanelFallback />}><Dashboard /></Suspense>
              </TabsContent>

              <TabsContent value="scenarios" className="mt-3">
                <Suspense fallback={<PanelFallback />}><PresetScenarios onSelect={handlePresetSelect} /></Suspense>
              </TabsContent>

              <TabsContent value="compare" className="mt-3">
                <Suspense fallback={<PanelFallback />}><ExperimentComparator /></Suspense>
              </TabsContent>

              <TabsContent value="ai" className="mt-3">
                <Suspense fallback={<PanelFallback />}><NeuralSurrogateDemo /></Suspense>
              </TabsContent>
            </Tabs>

            {/* Legend - always visible */}
            <CellLegend />
          </div>
        </div>
      </div>
    </section>
  );
}
