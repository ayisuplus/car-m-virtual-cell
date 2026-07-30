/**
 * Honest micro-benchmark: neural surrogate inference vs. an equivalent
 * biologically-motivated ODE polarization solver.
 *
 * The surrogate inference code is copied VERBATIM from
 * app/src/lib/simulation/neuralSurrogate.ts so that the timing reflects the
 * exact production code path. The ODE baseline solves the same 6-input →
 * M1/M2 polarization problem with an explicit RK4 integrator over a short
 * relaxation horizon, which is the classic approach the surrogate replaces.
 *
 * Run:  node scripts/benchmark-surrogate.mjs
 */

import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const weightsPath = resolve(
  __dirname,
  '../app/src/lib/simulation/neuralSurrogateWeights.ts'
);

// --- Load real trained weights out of the TS module -----------------------
const raw = readFileSync(weightsPath, 'utf8');
const jsonStart = raw.indexOf('{');
const jsonEnd = raw.lastIndexOf('}');
const model = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));

const layerWeights = [];
const layerBiases = [];
const layerSizes = [...model.architecture];
for (const layer of model.layers) {
  const w = layer.weights;
  const rows = w.length;
  const cols = w[0].length;
  const flat = new Float32Array(rows * cols);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) flat[r * cols + c] = w[r][c];
  layerWeights.push(flat);
  layerBiases.push(new Float32Array(layer.biases));
}

function sigmoid(x) {
  return 1.0 / (1.0 + Math.exp(-Math.max(-10, Math.min(10, x))));
}

// Verbatim inference from neuralSurrogate.ts
function neuralSurrogatePredict(ifnGamma, il4, il10, tgfBeta, oxygen, lactate) {
  let current = new Float32Array([ifnGamma, il4, il10, tgfBeta, oxygen, lactate]);
  for (let l = 0; l < layerWeights.length; l++) {
    const W = layerWeights[l];
    const b = layerBiases[l];
    const outSize = layerSizes[l + 1];
    const inSize = layerSizes[l];
    const output = new Float32Array(outSize);
    const isOutput = l === layerWeights.length - 1;
    for (let j = 0; j < outSize; j++) {
      let sum = b[j];
      const offset = j * inSize;
      for (let k = 0; k < inSize; k++) sum += W[offset + k] * current[k];
      output[j] = isOutput ? sigmoid(sum) : Math.max(0, sum);
    }
    current = output;
  }
  return [current[0], current[1], current[2]];
}

// --- Equivalent ODE polarization solver (the classic baseline) ------------
// State s = [M1, M2]; driven by cytokine inputs. Hill-type activation with
// mutual inhibition, integrated to (approximate) steady state with RK4.
// This is representative of the per-cell ODE the surrogate is meant to avoid.
function polarizationODE(ifnGamma, il4, il10, tgfBeta, oxygen, lactate) {
  const hill = (x, k = 0.5, n = 2) => (x ** n) / (k ** n + x ** n);
  // M1 drive: IFN-γ & oxygen up; lactate & TGF-β down.
  // M2 drive: IL-4, IL-10, TGF-β up.
  const deriv = (m1, m2) => {
    const m1Drive =
      hill(ifnGamma) * (0.6 + 0.4 * oxygen) - 0.5 * hill(lactate) - 0.4 * hill(tgfBeta);
    const m2Drive =
      0.5 * hill(il4) + 0.4 * hill(il10) + 0.5 * hill(tgfBeta);
    const dm1 = m1Drive * (1 - m1) - 0.3 * m2 * m1 - 0.15 * m1;
    const dm2 = m2Drive * (1 - m2) - 0.3 * m1 * m2 - 0.15 * m2;
    return [dm1, dm2];
  };
  let m1 = 0.5;
  let m2 = 0.5;
  const dt = 0.05;
  const steps = 200; // relaxation horizon to reach quasi steady state
  for (let i = 0; i < steps; i++) {
    const [k1a, k1b] = deriv(m1, m2);
    const [k2a, k2b] = deriv(m1 + 0.5 * dt * k1a, m2 + 0.5 * dt * k1b);
    const [k3a, k3b] = deriv(m1 + 0.5 * dt * k2a, m2 + 0.5 * dt * k2b);
    const [k4a, k4b] = deriv(m1 + dt * k3a, m2 + dt * k3b);
    m1 += (dt / 6) * (k1a + 2 * k2a + 2 * k3a + k4a);
    m2 += (dt / 6) * (k1b + 2 * k2b + 2 * k3b + k4b);
    m1 = Math.max(0, Math.min(1, m1));
    m2 = Math.max(0, Math.min(1, m2));
  }
  return [m1, m2, m1 * 0.8];
}

// --- Benchmark harness ----------------------------------------------------
function randInputs() {
  return [
    Math.random(), Math.random(), Math.random(),
    Math.random(), Math.random(), Math.random(),
  ];
}

function bench(fn, iters, warmup = 5000) {
  // warmup for JIT
  for (let i = 0; i < warmup; i++) fn(...randInputs());
  // prebuild inputs so RNG cost is excluded
  const inputs = new Array(iters);
  for (let i = 0; i < iters; i++) inputs[i] = randInputs();
  const t0 = performance.now();
  let sink = 0;
  for (let i = 0; i < iters; i++) {
    const r = fn(...inputs[i]);
    sink += r[0];
  }
  const t1 = performance.now();
  return { totalMs: t1 - t0, perCallMs: (t1 - t0) / iters, sink };
}

const ITERS = 200000;
const surr = bench(neuralSurrogatePredict, ITERS);
const ode = bench(polarizationODE, ITERS);

const perCellSurr = surr.perCallMs;
const perCellODE = ode.perCallMs;
const speedup = perCellODE / perCellSurr;

// Realistic scene: N cells × F frames
const N = 55; // typical alive-cell count in a running scene
const FPS = 60;

console.log('=== CAR-M Surrogate vs ODE micro-benchmark ===');
console.log(`Node: ${process.version}`);
console.log(`Iterations per method: ${ITERS.toLocaleString()}`);
console.log('');
console.log(`Surrogate  per-call: ${(perCellSurr * 1000).toFixed(3)} µs  (${perCellSurr.toFixed(5)} ms)`);
console.log(`ODE (RK4)  per-call: ${(perCellODE * 1000).toFixed(3)} µs  (${perCellODE.toFixed(5)} ms)`);
console.log(`Speedup (ODE/surrogate): ${speedup.toFixed(1)}x`);
console.log('');
console.log(`Per-frame cost for N=${N} cells:`);
console.log(`  Surrogate: ${(perCellSurr * N).toFixed(3)} ms/frame  → headroom at 60fps (16.7ms budget): ${(16.7 / (perCellSurr * N)).toFixed(0)}x`);
console.log(`  ODE:       ${(perCellODE * N).toFixed(3)} ms/frame  → ${(perCellODE * N) > 16.7 ? 'EXCEEDS' : 'within'} 60fps budget`);
console.log('');
console.log(JSON.stringify({
  node: process.version,
  iters: ITERS,
  surrogate_ms: perCellSurr,
  ode_ms: perCellODE,
  speedup,
  surrogate_us: perCellSurr * 1000,
  ode_us: perCellODE * 1000,
  frame_ms_surrogate_N55: perCellSurr * N,
  frame_ms_ode_N55: perCellODE * N,
}, null, 2));
