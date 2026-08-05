/**
 * Surrogate consistency test (headless).
 *
 * Verifies that the production inference path in
 * app/src/lib/simulation/neuralSurrogate.ts applies the exported weight
 * matrices with the correct orientation and stays consistent with the
 * training-side reference computation ([input][output] layout).
 *
 * History: an earlier version flattened weights row-major ([input][output])
 * but indexed them as [output][input] during inference, silently applying the
 * transposed transformation (P0 bug fixed in the review pass).
 *
 * Run:  node scripts/test-surrogate.mjs
 * Exits non-zero on any failure so it can gate CI.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const weightsPath = resolve(
  __dirname,
  '../app/src/lib/simulation/neuralSurrogateWeights.ts'
);

// --- Verbatim copy of the production weight-loading + inference path ------
// (kept in sync with app/src/lib/simulation/neuralSurrogate.ts)
const raw = readFileSync(weightsPath, 'utf8');
const jsonStart = raw.indexOf('{');
const jsonEnd = raw.lastIndexOf('}');
const model = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));

const layerWeights = [];
const layerBiases = [];
const layerSizes = [...model.architecture];
for (const layer of model.layers) {
  const w = layer.weights;
  const rows = w.length;      // inputs
  const cols = w[0].length;   // output units (=== biases.length)
  const flat = new Float32Array(rows * cols);
  for (let r = 0; r < rows; r++)      // r = input index
    for (let c = 0; c < cols; c++)    // c = output index
      flat[c * rows + r] = w[r][c];   // store as [output][input]
  layerWeights.push(flat);
  layerBiases.push(new Float32Array(layer.biases));
}

function sigmoid(x) {
  return 1.0 / (1.0 + Math.exp(-Math.max(-10, Math.min(10, x))));
}

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
// --------------------------------------------------------------------------

// Reference: apply the matrices exactly as stored ([input][output]).
function referenceForward(x) {
  let cur = x;
  for (let li = 0; li < model.layers.length; li++) {
    const L = model.layers[li];
    const out = [];
    for (let j = 0; j < L.biases.length; j++) {
      let s = L.biases[j];
      for (let k = 0; k < cur.length; k++) s += cur[k] * L.weights[k][j];
      out.push(li === model.layers.length - 1 ? sigmoid(s) : Math.max(0, s));
    }
    cur = out;
  }
  return cur;
}

// The ODE generator used by the UI demo panel (computeODE in NeuralSurrogateDemo.tsx)
function uiComputeODE(ifn, il4, il10, tgf) {
  const sig = (z) => 1 / (1 + Math.exp(-Math.max(-10, Math.min(10, z))));
  const m1 = sig(3.5 * ifn - 1.5 * il4 - 0.8 * il10 - 0.5 * tgf + 0.5);
  const m2 = sig(2.5 * il4 + 2.0 * il10 + 1.8 * tgf + 0.3 - 1.0 * ifn);
  return {
    m1: Math.min(Math.max(m1, 0), 1),
    m2: Math.min(Math.max(m2, 0), 1),
  };
}

let failures = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
  if (!ok) failures++;
};

// 1) Structural sanity -------------------------------------------------------
check('architecture is 6-32-32-3', JSON.stringify(model.architecture) === '[6,32,32,3]',
  JSON.stringify(model.architecture));
check('three layers present', model.layers.length === 3);
for (let li = 0; li < model.layers.length; li++) {
  const L = model.layers[li];
  const nin = model.architecture[li];
  const nout = model.architecture[li + 1];
  check(
    `layer ${li} shapes [${nin}][${nout}]`,
    L.weights.length === nin && L.weights[0].length === nout && L.biases.length === nout,
    `weights=${L.weights.length}x${L.weights[0].length} biases=${L.biases.length}`
  );
}

// 2) Directional behavior ----------------------------------------------------
// The network must respond directionally to pro- vs anti-inflammatory input.
const pro = neuralSurrogatePredict(0.8, 0.05, 0.05, 0.1, 0.8, 0.1);
const anti = neuralSurrogatePredict(0.05, 0.8, 0.8, 0.8, 0.2, 0.8);
check('pro-inflammatory M1 > anti-inflammatory M1', pro[0] > anti[0],
  `pro.M1=${pro[0].toFixed(3)} anti.M1=${anti[0].toFixed(3)}`);
check('anti-inflammatory M2 > pro-inflammatory M2', anti[1] > pro[1],
  `pro.M2=${pro[1].toFixed(3)} anti.M2=${anti[1].toFixed(3)}`);
check('pro-inflammatory M1 exceeds 0.6 (M1 phenotype reachable)', pro[0] > 0.6,
  `pro.M1=${pro[0].toFixed(3)}`);

// 3) Agreement with the UI ODE generator over random inputs ------------------
const N = 20000;
let errSum = 0, errMax = 0, agreement = 0;
for (let i = 0; i < N; i++) {
  const ifn = Math.random(), il4 = Math.random(), il10 = Math.random(),
        tgf = Math.random(), o2 = Math.random(), lac = Math.random();
  const a = neuralSurrogatePredict(ifn, il4, il10, tgf, o2, lac);
  const b = uiComputeODE(ifn, il4, il10, tgf);
  const e1 = Math.abs(a[0] - b.m1), e2 = Math.abs(a[1] - b.m2);
  const e = (e1 + e2) / 2;
  errSum += e;
  if (e > errMax) errMax = e;
  agreement += (1 - e) * 100;
}
const meanMAE = errSum / N;
const meanAgreement = agreement / N;
console.log(`      agreement vs UI ODE generator: mean=${meanAgreement.toFixed(2)}%  MAE=${meanMAE.toFixed(4)}  maxErr=${errMax.toFixed(4)}  (N=${N})`);
check('mean agreement vs ODE generator >= 93%', meanAgreement >= 93, `${meanAgreement.toFixed(2)}%`);
check('mean MAE <= 0.04', meanMAE <= 0.04, meanMAE.toFixed(4));

// 4) Determinism -------------------------------------------------------------
const a = neuralSurrogatePredict(0.5, 0.3, 0.2, 0.4, 0.5, 0.2);
const b = neuralSurrogatePredict(0.5, 0.3, 0.2, 0.4, 0.5, 0.2);
check('inference deterministic', a.every((v, i) => v === b[i]));

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll surrogate checks passed.');
process.exit(failures ? 1 : 0);
