import { useState } from 'react';
import { Play, Pause, RotateCcw, Zap, Grid3x3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useSim } from '@/context/SimContext';
import { Switch } from '@/components/ui/switch';
import type { SimParams } from '@/types/simulation';

export default function ControlPanel() {
  const { state, startSim, pauseSim, resetSim, setSpeed, updateSimParams } = useSim();
  const [showECM, setShowECM] = useState(() => localStorage.getItem('car-m-show-ecm') === 'true');

  const isRunning = state.simulation.isRunning;

  const handleParamChange = (key: keyof SimParams, value: number) => {
    updateSimParams({ [key]: value });
  };

  return (
    <div className="glass-panel p-4 space-y-4 w-full">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Simulation Control
        </h3>
        <Badge variant={isRunning ? 'default' : 'secondary'} className="text-xs">
          {isRunning ? 'Running' : state.simulation.isPaused ? 'Paused' : 'Ready'}
        </Badge>
      </div>

      {/* Control buttons */}
      <div className="flex gap-2">
        <Button
          onClick={isRunning ? pauseSim : startSim}
          className={`flex-1 ${isRunning ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'} text-white`}
          size="sm"
        >
          {isRunning ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
          {isRunning ? 'Pause' : 'Start'}
        </Button>
        <Button
          onClick={resetSim}
          variant="outline"
          size="sm"
          className="border-red-400/30 text-red-400 hover:bg-red-400/10 hover:text-red-300"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          Reset
        </Button>
      </div>

      {/* Speed control */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Speed</span>
          <span className="font-mono text-cyan-400">{state.simulation.speed}x</span>
        </div>
        <Slider
          value={[state.simulation.speed]}
          onValueChange={(v) => setSpeed(v[0])}
          min={0.5}
          max={5}
          step={0.5}
          className="[&_[role=slider]]:bg-cyan-400"
        />
      </div>

      <div className="h-px bg-cyan-400/20" />

      {/* Cell counts */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-slate-400 uppercase">Cell Counts</h4>

        <ParamSlider
          label="CAR-M"
          color="#00ff88"
          value={state.simParams.carMCount}
          onChange={(v) => handleParamChange('carMCount', v)}
          min={0}
          max={30}
          step={1}
        />
        <ParamSlider
          label="WT Macrophage"
          color="#8899aa"
          value={state.simParams.wildTypeCount}
          onChange={(v) => handleParamChange('wildTypeCount', v)}
          min={0}
          max={20}
          step={1}
        />
        <ParamSlider
          label="Tumor Cells"
          color="#cc66ff"
          value={state.simParams.tumorCount}
          onChange={(v) => handleParamChange('tumorCount', v)}
          min={5}
          max={50}
          step={1}
        />
        <ParamSlider
          label="CD8+ T Cells"
          color="#ffcc00"
          value={state.simParams.cd8Count}
          onChange={(v) => handleParamChange('cd8Count', v)}
          min={0}
          max={25}
          step={1}
        />
      </div>

      <div className="h-px bg-cyan-400/20" />

      {/* Microenvironment */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-slate-400 uppercase">TME Conditions</h4>

        <ParamSlider
          label="O₂ Level"
          color="#4488ff"
          value={state.simParams.oxygenLevel}
          onChange={(v) => handleParamChange('oxygenLevel', v)}
          min={0}
          max={1}
          step={0.05}
          format="percent"
        />
        <ParamSlider
          label="Lactate"
          color="#ff6644"
          value={state.simParams.lactateLevel}
          onChange={(v) => handleParamChange('lactateLevel', v)}
          min={0}
          max={1}
          step={0.05}
          format="percent"
        />
        <ParamSlider
          label="TGF-β"
          color="#ff88cc"
          value={state.simParams.tgfBetaLevel}
          onChange={(v) => handleParamChange('tgfBetaLevel', v)}
          min={0}
          max={1}
          step={0.05}
          format="percent"
        />
        <ParamSlider
          label="Random Seed"
          color="#94a3b8"
          value={state.simParams.randomSeed}
          onChange={(v) => handleParamChange('randomSeed', v)}
          min={1}
          max={99999999}
          step={1}
        />
      </div>

      <div className="h-px bg-cyan-400/20" />

      {/* Display Options */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-slate-400 uppercase flex items-center gap-1.5">
          <Grid3x3 className="w-3 h-3" />
          Display Options
        </h4>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">ECM Overlay</span>
          <Switch
            checked={showECM}
            onCheckedChange={(v) => {
              setShowECM(v);
              localStorage.setItem('car-m-show-ecm', String(v));
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Parameter slider sub-component
function ParamSlider({
  label,
  color,
  value,
  onChange,
  min,
  max,
  step,
  format,
}: {
  label: string;
  color: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format?: 'percent' | 'number';
}) {
  const displayValue = format === 'percent' ? `${(value * 100).toFixed(0)}%` : value.toString();

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="font-mono" style={{ color }}>{displayValue}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        min={min}
        max={max}
        step={step}
        className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
        style={{ ['--slider-color' as string]: color }}
      />
    </div>
  );
}
