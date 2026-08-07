import { useEffect, useRef, useState } from 'react';
import { ABMEngine } from '@/lib/simulation/engine';
import { useSim } from '@/context/SimContext';
import { STORAGE_KEYS, getStorageFlag, setStorageFlag } from '@/lib/storage';

interface SimulationCanvasProps {
  onEngineReady: (engine: ABMEngine | null) => void;
}

export default function SimulationCanvas({ onEngineReady }: SimulationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ABMEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { state, onStatsUpdate } = useSim();
  const animationFrameRef = useRef<number | null>(null);
  // Stable callback ref — captures latest onStatsUpdate without retriggering effects
  const onStatsUpdateRef = useRef(onStatsUpdate);
  // Stable callback ref for engine registration (replaces module-level singleton)
  const onEngineReadyRef = useRef(onEngineReady);

  const [showField, setShowField] = useState(true);
  const [showECM, setShowECM] = useState(() => getStorageFlag(STORAGE_KEYS.SHOW_ECM));
  const [cellCount, setCellCount] = useState(0);
  const [simTime, setSimTime] = useState(0);

  useEffect(() => {
    onStatsUpdateRef.current = onStatsUpdate;
  }, [onStatsUpdate]);

  useEffect(() => {
    onEngineReadyRef.current = onEngineReady;
  }, [onEngineReady]);

  // Initialize engine (one-shot per design/param change; uses refs for stable
  // callbacks so deps are correct). Display-layer toggles (showField/showECM)
  // are intentionally NOT in the deps — they must not recreate the engine.
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    canvas.width = width;
    canvas.height = height;

    const engine = new ABMEngine(
      width,
      height,
      state.carDesign,
      state.simParams,
      {
        onStatsUpdate: (stats) => onStatsUpdateRef.current(stats),
      }
    );

    engineRef.current = engine;
    onEngineReadyRef.current(engine);

    // Initial render
    const ctx = canvas.getContext('2d');
    if (ctx) {
      engine.render(ctx, showField, showECM);
    }

    setCellCount(engine.cells.length);
    setSimTime(engine.simTime);

    return () => {
      onEngineReadyRef.current(null);
      engine.destroy();
      // The display loop has its own effect/lifecycle and always reads the
      // latest engineRef. Cancelling it here freezes the canvas after a
      // parameter change because this engine effect is recreated while the
      // display effect is not.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.carDesign, state.simParams]);

  // Handle start/pause; design/params are updated via the dedicated effect below
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    if (state.simulation.isRunning) {
      engine.carDesign = state.carDesign;
      engine.simParams = state.simParams;
      engine.setSpeed(state.simulation.speed);
      engine.start();
    } else {
      engine.pause();
    }
  }, [state.simulation.isRunning, state.simulation.speed, state.carDesign, state.simParams]);

  // Update params without reinit
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.updateCarDesign(state.carDesign);
    engine.updateParams(state.simParams);
  }, [state.carDesign, state.simParams]);

  // Render loop for display
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const renderLoop = () => {
      if (!running) return;
      const engine = engineRef.current;
      if (engine) {
        engine.render(ctx, showField, showECM);
      }
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      running = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [showField, showECM]);

  // Live cell count and sim time overlay
  useEffect(() => {
    const interval = window.setInterval(() => {
      const engine = engineRef.current;
      if (!engine) return;
      setCellCount(engine.cells.length);
      setSimTime(engine.simTime);
    }, 200);
    return () => window.clearInterval(interval);
  }, []);

  // Reset handling: react ONLY to the explicit resetCounter from the Reset
  // button. Pause/start transitions never trigger a reset.
  const resetCounter = state.simulation.resetCounter;
  const prevResetRef = useRef(resetCounter);
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    if (prevResetRef.current !== resetCounter) {
      prevResetRef.current = resetCounter;
      engine.reset();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        engine.render(ctx, showField, showECM);
      }
      setCellCount(engine.cells.length);
      setSimTime(engine.simTime);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetCounter]);

  const handleStep = () => {
    const engine = engineRef.current;
    const canvas = canvasRef.current;
    if (!engine || !canvas) return;
    engine.step();
    const ctx = canvas.getContext('2d');
    if (ctx) {
      engine.render(ctx, showField, showECM);
    }
    setCellCount(engine.cells.length);
    setSimTime(engine.simTime);
  };

  const toggleECM = () => {
    const next = !showECM;
    setStorageFlag(STORAGE_KEYS.SHOW_ECM, next);
    setShowECM(next);
  };

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full block rounded-lg"
        style={{ background: '#080c14' }}
      />
      {/* Canvas toolbar - floating overlay */}
      <div className="absolute top-3 left-3 flex gap-1.5 z-10">
        <button
          onClick={() => setShowField(f => !f)}
          className={`px-2 py-1 rounded text-[10px] border transition-all ${
            showField ? 'bg-cyan-400/20 border-cyan-400/40 text-cyan-400' : 'bg-slate-800/60 border-slate-700/40 text-slate-400'
          }`}
        >
          Cytokines
        </button>
        <button
          onClick={toggleECM}
          className={`px-2 py-1 rounded text-[10px] border transition-all ${
            showECM ? 'bg-amber-400/20 border-amber-400/40 text-amber-400' : 'bg-slate-800/60 border-slate-700/40 text-slate-400'
          }`}
        >
          ECM
        </button>
        <button
          onClick={handleStep}
          className="px-2 py-1 rounded text-[10px] border bg-slate-800/60 border-slate-700/40 text-slate-400 hover:text-white hover:border-white/40 transition-all"
        >
          Step →
        </button>
      </div>
      {/* Cell count and time overlay */}
      <div className="absolute top-3 right-3 text-[10px] text-slate-500 font-mono z-10">
        {cellCount} cells | t={simTime.toFixed(1)} min
      </div>
    </div>
  );
}
