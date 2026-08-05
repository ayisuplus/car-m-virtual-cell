import { useEffect, useState } from 'react';
import { Activity, Zap, Play, Gauge, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { neuralSurrogatePredict, getModelInfo } from '@/lib/simulation/neuralSurrogate';

const modelInfo = getModelInfo();
const SWEEP_RUNS = 50;
const BENCH_ITERS = 20000;

interface Cytokines {
  ifn: number;
  il4: number;
  il10: number;
  tgf: number;
}

// The analytic generator the surrogate approximates (same equations as
// scripts/train-surrogate.mjs). This is the reference, not a slow ODE solver.
function computeReferenceODE(c: Cytokines) {
  const sig = (x: number) => 1 / (1 + Math.exp(-Math.max(-10, Math.min(10, x))));
  const m1 = sig(3.5 * c.ifn - 1.5 * c.il4 - 0.8 * c.il10 - 0.5 * c.tgf + 0.5);
  const m2 = sig(2.5 * c.il4 + 2.0 * c.il10 + 1.8 * c.tgf + 0.3 - 1.0 * c.ifn);
  return { m1: Math.min(Math.max(m1, 0), 1), m2: Math.min(Math.max(m2, 0), 1) };
}

function computeNN(c: Cytokines) {
  const [m1, m2] = neuralSurrogatePredict(c.ifn, c.il4, c.il10, c.tgf, 0.5, 0.2);
  return { m1, m2 };
}

function randomCytokines(): Cytokines {
  return {
    ifn: Math.round(Math.random() * 100) / 100,
    il4: Math.round(Math.random() * 100) / 100,
    il10: Math.round(Math.random() * 100) / 100,
    tgf: Math.round(Math.random() * 100) / 100,
  };
}

// Live micro-benchmark: actually times both code paths in this browser.
// Numbers are measured on the viewer's machine, never hard-coded.
function measureBenchmark() {
  const inputs: Cytokines[] = [];
  for (let i = 0; i < BENCH_ITERS; i++) inputs.push(randomCytokines());

  // Warm-up (JIT)
  for (let i = 0; i < 2000; i++) {
    const c = inputs[i % inputs.length];
    computeNN(c);
    computeReferenceODE(c);
  }

  let sink = 0;
  const t0 = performance.now();
  for (let i = 0; i < BENCH_ITERS; i++) {
    const c = inputs[i];
    const r = computeNN(c);
    sink += r.m1;
  }
  const t1 = performance.now();
  for (let i = 0; i < BENCH_ITERS; i++) {
    const c = inputs[i];
    const r = computeReferenceODE(c);
    sink += r.m1;
  }
  const t2 = performance.now();
  if (sink === Infinity) throw new Error('unreachable');
  const nnUs = ((t1 - t0) / BENCH_ITERS) * 1000;
  const odeUs = ((t2 - t1) / BENCH_ITERS) * 1000;
  return { nnUs, odeUs, speedup: odeUs / nnUs };
}

export default function NeuralSurrogateDemo() {
  const [cytokines, setCytokines] = useState<Cytokines>({ ifn: 0.5, il4: 0.3, il10: 0.2, tgf: 0.4 });
  const [outputs, setOutputs] = useState({ m1: 0.5, m2: 0.5 });
  const [refOutputs, setRefOutputs] = useState<{ m1: number; m2: number } | null>(null);
  const [bench, setBench] = useState<{ nnUs: number; odeUs: number; speedup: number } | null>(null);
  const [runningBench, setRunningBench] = useState(false);

  useEffect(() => {
    const nnOut = computeNN(cytokines);
    setOutputs(nnOut);
    setRefOutputs(computeReferenceODE(cytokines));
  }, [cytokines]);

  const [sweep, setSweep] = useState<{
    running: boolean;
    run: number;
    accuracy: number[];
  } | null>(null);

  const runBenchmark = () => {
    setSweep({ running: true, run: 0, accuracy: [] });
    const N = SWEEP_RUNS;
    let i = 0;
    const results: number[] = [];

    const next = () => {
      if (i >= N) {
        setSweep(prev => (prev ? { ...prev, running: false } : null));
        return;
      }
      const c = randomCytokines();
      setCytokines(c);
      // Real accuracy: surrogate vs the reference generator it approximates
      const ode = computeReferenceODE(c);
      const nn = computeNN(c);
      const m1Err = Math.abs(ode.m1 - nn.m1);
      const m2Err = Math.abs(ode.m2 - nn.m2);
      const accuracy = (1 - (m1Err + m2Err) / 2) * 100;
      results.push(accuracy);

      setSweep(prev => ({
        ...prev!,
        run: i + 1,
        accuracy: [...results],
      }));
      i++;
      setTimeout(next, 30);
    };
    next();
  };

  const runMicroBench = () => {
    setRunningBench(true);
    // Yield to the event loop so the button state paints before the blocking run
    setTimeout(() => {
      const r = measureBenchmark();
      setBench(r);
      setRunningBench(false);
    }, 30);
  };

  const avgAccuracy = sweep && sweep.accuracy.length
    ? sweep.accuracy.reduce((a, b) => a + b, 0) / sweep.accuracy.length
    : null;

  return (
    <div className="mt-16 glass-panel rounded-xl p-6 md:p-8">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-2">Neural Surrogate Demo</h3>
        <p className="text-sm text-slate-400">
          Trained MLP ({modelInfo.architecture.join('→')}, {modelInfo.accuracy}% validation
          phenotype agreement, {modelInfo.parameterCount.toLocaleString()} params) vs the analytic
          ODE-style generator it approximates.
        </p>
      </div>

      {/* Why Neural Surrogate? */}
      <div className="mb-6 glass-panel rounded-xl p-4 border border-cyan-400/10">
        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          Why Neural Surrogate?
        </h4>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="flex items-start gap-2 text-xs text-slate-400">
            <Zap className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
            <span>Removes the per-cell polarization cost from the ABM hot path.</span>
          </div>
          <div className="flex items-start gap-2 text-xs text-slate-400">
            <Gauge className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <span>Enables real-time parameter sweeps for therapy design.</span>
          </div>
          <div className="flex items-start gap-2 text-xs text-slate-400">
            <Activity className="w-3.5 h-3.5 text-purple-400 mt-0.5 flex-shrink-0" />
            <span>Trained reproducibly (scripts/train-surrogate.mjs, seed {20250706}).</span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Reference generator */}
        <div className="glass-panel rounded-xl p-5 border-rose-400/20">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-rose-400/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-rose-400" />
            </div>
            <h4 className="font-semibold text-white">Reference ODE Generator</h4>
          </div>

          <InputPanel values={cytokines} onChange={setCytokines} />

          <div className="mt-5 text-xs text-slate-400">
            Analytic steady-state map (training ground truth)
          </div>

          {refOutputs && <MiniBarChart outputs={refOutputs} />}
        </div>

        {/* Neural Surrogate */}
        <div className="glass-panel rounded-xl p-5 border-cyan-400/20">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-cyan-400/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-cyan-400" />
            </div>
            <h4 className="font-semibold text-white">Neural Surrogate</h4>
          </div>

          <InputPanel values={cytokines} onChange={setCytokines} />

          <div className="mt-5 text-xs text-slate-400">
            {bench
              ? <>Measured here: <span className="text-cyan-400 font-medium">{bench.nnUs.toFixed(2)} µs/call</span> (reference {bench.odeUs.toFixed(2)} µs/call, {bench.speedup.toFixed(1)}×)</>
              : 'Run the micro-benchmark to measure timing on this machine'}
          </div>

          <MiniBarChart outputs={outputs} />
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Button onClick={runMicroBench} disabled={runningBench}>
          <Zap className="w-4 h-4 mr-1" />
          {runningBench ? 'Measuring…' : 'Run Micro-Benchmark'}
        </Button>
        <Button onClick={runBenchmark} disabled={sweep?.running ?? false} variant="outline">
          <Play className="w-4 h-4 mr-1" />
          Agreement Sweep ({SWEEP_RUNS})
        </Button>
        {sweep && (
          <div className="text-sm text-slate-300">
            {sweep.running ? (
              <span className="flex items-center gap-2">
                Sweep {sweep.run} / {SWEEP_RUNS}...
                <Progress value={(sweep.run / SWEEP_RUNS) * 100} className="w-24 h-1.5" />
              </span>
            ) : avgAccuracy !== null ? (
              <>
                {SWEEP_RUNS} runs — mean agreement{' '}
                <span className="text-cyan-400">{avgAccuracy.toFixed(2)}%</span>
              </>
            ) : null}
          </div>
        )}
      </div>

      {avgAccuracy !== null && !(sweep?.running) && (
        <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-400/20">
          <div className="text-sm text-emerald-400 font-medium">
            Agreement: {avgAccuracy.toFixed(2)}% (this sweep) · {modelInfo.accuracy}% (held-out validation, training script)
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Agreement = 1 − mean(|M1 error|, |M2 error|) vs the analytic generator. Full metrics
            (MAE/R²) are printed by scripts/train-surrogate.mjs.
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-slate-500">
        Model agreement is measured against the synthetic ODE-style training generator used in this
        prototype — not against experimental data.
      </p>
    </div>
  );
}

function InputPanel({
  values,
  onChange,
}: {
  values: Cytokines;
  onChange: (v: Cytokines) => void;
}) {
  const update = (key: keyof Cytokines, value: number) => {
    onChange({ ...values, [key]: value });
  };
  return (
    <div className="space-y-4">
      <InputSlider label="IFN-γ" value={values.ifn} onChange={v => update('ifn', v)} />
      <InputSlider label="IL-4" value={values.il4} onChange={v => update('il4', v)} />
      <InputSlider label="IL-10" value={values.il10} onChange={v => update('il10', v)} />
      <InputSlider label="TGF-β" value={values.tgf} onChange={v => update('tgf', v)} />
    </div>
  );
}

function InputSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="font-mono text-cyan-400">{value.toFixed(2)}</span>
      </div>
      <Slider
        value={[value]}
        min={0}
        max={1}
        step={0.01}
        onValueChange={v => onChange(v[0])}
      />
    </div>
  );
}

function MiniBarChart({ outputs }: { outputs: { m1: number; m2: number } }) {
  return (
    <div className="mt-5 space-y-3">
      <div>
        <div className="flex justify-between text-xs text-slate-300 mb-1">
          <span>M1 score</span>
          <span>{outputs.m1.toFixed(3)}</span>
        </div>
        <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-rose-500 rounded-full transition-all duration-300"
            style={{ width: `${outputs.m1 * 100}%` }}
          />
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs text-slate-300 mb-1">
          <span>M2 score</span>
          <span>{outputs.m2.toFixed(3)}</span>
        </div>
        <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-400 rounded-full transition-all duration-300"
            style={{ width: `${outputs.m2 * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
