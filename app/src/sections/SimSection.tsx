import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SimulationCanvas from '@/components/SimulationCanvas';
import Simulation3D from '@/components/Simulation3D';
import ControlPanel from '@/components/ControlPanel';
import CarDesigner from '@/components/CarDesigner';
import Dashboard from '@/components/Dashboard';
import CellLegend from '@/components/CellLegend';
import PresetScenarios from '@/components/PresetScenarios';
import ExperimentComparator from '@/components/ExperimentComparator';
import NeuralSurrogateDemo from '@/components/NeuralSurrogateDemo';
import { Sliders, Dna, BarChart3, FlaskConical, GitCompare, Brain } from 'lucide-react';
import { useSim } from '@/context/SimContext';
import type { SimParams, CarDesign } from '@/types/simulation';

export default function SimSection() {
  const [activeTab, setActiveTab] = useState('control');
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const { updateSimParams, updateCarDesign } = useSim();

  const handlePresetSelect = (simParams: SimParams, carDesign: CarDesign) => {
    updateSimParams(simParams);
    updateCarDesign(carDesign);
  };

  return (
    <section id="simulation" className="min-h-screen py-16 px-4 md:px-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Section header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            TME <span className="text-cyan-400">Simulator</span>
          </h2>
          <p className="text-slate-400 text-sm max-w-xl">
            Real-time agent-based simulation of CAR-M cells interacting with tumor cells
            in the tumor microenvironment. Adjust parameters and observe emergent behaviors.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex gap-1 mb-3">
          <button
            onClick={() => setViewMode('2d')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === '2d'
                ? 'bg-cyan-400/20 border border-cyan-400/40 text-cyan-400'
                : 'bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white'
            }`}
          >
            2D View
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === '3d'
                ? 'bg-cyan-400/20 border border-cyan-400/40 text-cyan-400'
                : 'bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white'
            }`}
          >
            3D View
          </button>
        </div>

        {/* Main layout: Canvas + Sidebar */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Canvas area */}
          <div className="flex-1 min-h-[500px] lg:min-h-[650px] rounded-xl overflow-hidden border border-slate-700/50 bg-[#080c14] relative">
            <div className={viewMode === '2d' ? 'relative w-full h-full' : 'absolute inset-0 opacity-0 pointer-events-none -z-10'}>
              <SimulationCanvas />
            </div>
            {viewMode === '3d' && (
              <div className="absolute inset-0 z-10">
                <Simulation3D />
              </div>
            )}
          </div>

          {/* Sidebar with tabs */}
          <div className="w-full lg:w-80 xl:w-96 space-y-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-6 bg-slate-800/50 border border-slate-700/50">
                <TabsTrigger value="control" className="text-xs data-[state=active]:bg-cyan-400/20 data-[state=active]:text-cyan-400 px-1">
                  <Sliders className="w-3.5 h-3.5 mr-0.5" />
                  <span className="hidden xl:inline">Control</span>
                </TabsTrigger>
                <TabsTrigger value="designer" className="text-xs data-[state=active]:bg-cyan-400/20 data-[state=active]:text-cyan-400 px-1">
                  <Dna className="w-3.5 h-3.5 mr-0.5" />
                  <span className="hidden xl:inline">CAR-M</span>
                </TabsTrigger>
                <TabsTrigger value="dashboard" className="text-xs data-[state=active]:bg-cyan-400/20 data-[state=active]:text-cyan-400 px-1">
                  <BarChart3 className="w-3.5 h-3.5 mr-0.5" />
                  <span className="hidden xl:inline">Metrics</span>
                </TabsTrigger>
                <TabsTrigger value="scenarios" className="text-xs data-[state=active]:bg-amber-400/20 data-[state=active]:text-amber-400 px-1">
                  <FlaskConical className="w-3.5 h-3.5 mr-0.5" />
                  <span className="hidden xl:inline">Scenarios</span>
                </TabsTrigger>
                <TabsTrigger value="compare" className="text-xs data-[state=active]:bg-emerald-400/20 data-[state=active]:text-emerald-400 px-1">
                  <GitCompare className="w-3.5 h-3.5 mr-0.5" />
                  <span className="hidden xl:inline">Compare</span>
                </TabsTrigger>
                <TabsTrigger value="ai" className="text-xs data-[state=active]:bg-purple-400/20 data-[state=active]:text-purple-400 px-1">
                  <Brain className="w-3.5 h-3.5 mr-0.5" />
                  <span className="hidden xl:inline">AI</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="control" className="mt-3">
                <ControlPanel />
              </TabsContent>

              <TabsContent value="designer" className="mt-3">
                <CarDesigner />
              </TabsContent>

              <TabsContent value="dashboard" className="mt-3">
                <Dashboard />
              </TabsContent>

              <TabsContent value="scenarios" className="mt-3">
                <PresetScenarios onSelect={handlePresetSelect} />
              </TabsContent>

              <TabsContent value="compare" className="mt-3">
                <ExperimentComparator />
              </TabsContent>

              <TabsContent value="ai" className="mt-3">
                <NeuralSurrogateDemo />
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
