/**
 * Reproducible training script for the macrophage-polarization neural surrogate.
 *
 * This is the canonical generator for
 * app/src/lib/simulation/neuralSurrogateWeights.ts. It trains a small MLP
 * (6 -> 32 -> 32 -> 3, ReLU hidden layers, sigmoid outputs) against a
 * documented, synthetic ODE-style generator so that every number quoted in
 * the paper ("training samples", "epochs", accuracy/MAE/R2) is reproducible
 * from this script alone.
 *
 * Ground-truth generator (the same equations the UI demo panel implements):
 *   M1 = sigmoid(3.5*IFNg - 1.5*IL4 - 0.8*IL10 - 0.5*TGFb + 0.5)
 *   M2 = sigmoid(2.5*IL4 + 2.0*IL10 + 1.8*TGFb + 0.3 - 1.0*IFNg)
 * The third output ("phagocytosis probability") is derived from the SAME
 * steady-state M1 via the model's baseline phagocytosis formula
 * (affinity 8/10, antigen density 0.6, CD47/CD24 unblocked, M1 bonus with
 * CD3z, full energy):
 *   P = (8/10)*0.6 * (1-0.85*0.6) * (1-0.55*0.4) * (1+0.5*M1)
 *
 * Training: 30,000 samples uniform on [0,1]^6, 80/20 split, Adam (lr 1e-3),
 * MSE on all three outputs, 100 epochs, batch 64, fixed seed.
 *
 * Run:  node scripts/train-surrogate.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --------------------------------------------------------------------------
// Deterministic RNG (mulberry32) so the run is reproducible bit-for-bit.
// --------------------------------------------------------------------------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEED = 20250706;
const rnd = mulberry32(SEED);

// --------------------------------------------------------------------------
// Ground-truth generator
// --------------------------------------------------------------------------
const sig = (z) => 1 / (1 + Math.exp(-Math.max(-10, Math.min(10, z))));
function groundTruth(ifn, il4, il10, tgf /*, o2, lac unused by generator */) {
  const m1 = sig(3.5 * ifn - 1.5 * il4 - 0.8 * il10 - 0.5 * tgf + 0.5);
  const m2 = sig(2.5 * il4 + 2.0 * il10 + 1.8 * tgf + 0.3 - 1.0 * ifn);
  const phago = 0.48 * 0.49 * 0.78 * (1 + 0.5 * m1); // baseline phagocytosis formula
  return [m1, m2, phago];
}

// --------------------------------------------------------------------------
// Dataset
// --------------------------------------------------------------------------
const N = 30000;
const X = new Float32Array(N * 6);
const Y = new Float32Array(N * 3);
for (let i = 0; i < N; i++) {
  for (let k = 0; k < 6; k++) X[i * 6 + k] = rnd();
  const [m1, m2, p] = groundTruth(X[i * 6], X[i * 6 + 1], X[i * 6 + 2], X[i * 6 + 3]);
  Y[i * 3] = m1; Y[i * 3 + 1] = m2; Y[i * 3 + 2] = p;
}
// 80/20 split (deterministic: first 80% train)
const nTrain = Math.floor(N * 0.8);
const trainIdx = Array.from({ length: nTrain }, (_, i) => i);
const valIdx = Array.from({ length: N - nTrain }, (_, i) => nTrain + i);

// --------------------------------------------------------------------------
// Network: 6 -> 32 -> 32 -> 3
// --------------------------------------------------------------------------
const ARCH = [6, 32, 32, 3];
const irnd = mulberry32(SEED + 1);
const W = []; // W[l]: Float32Array [in][out] (stored orientation)
const B = []; // B[l]: Float32Array [out]
for (let l = 0; l < ARCH.length - 1; l++) {
  const nin = ARCH[l], nout = ARCH[l + 1];
  const limit = Math.sqrt(6 / (nin + nout)); // Xavier/Glorot uniform
  const w = new Float32Array(nin * nout);
  for (let i = 0; i < w.length; i++) w[i] = (irnd() * 2 - 1) * limit;
  W.push(w);
  B.push(new Float32Array(nout));
}

function forward(x, cache) {
  // cache: activations and pre-activations for backprop
  let a = x;
  cache.a = [a];
  cache.z = [];
  for (let l = 0; l < W.length; l++) {
    const nin = ARCH[l], nout = ARCH[l + 1];
    const z = new Float32Array(nout);
    for (let j = 0; j < nout; j++) {
      let s = B[l][j];
      for (let k = 0; k < nin; k++) s += a[k] * W[l][k * nout + j];
      z[j] = s;
    }
    cache.z.push(z);
    const isOut = l === W.length - 1;
    a = new Float32Array(nout);
    for (let j = 0; j < nout; j++) a[j] = isOut ? sig(z[j]) : Math.max(0, z[j]);
    cache.a.push(a);
  }
  return a;
}

function backward(cache, dLoss_daOut, gW, gB) {
  // MSE loss derivative wrt output activations: (2/3)*(a - y) per output
  let delta = dLoss_daOut; // Float32Array(nout)
  for (let l = W.length - 1; l >= 0; l--) {
    const nin = ARCH[l], nout = ARCH[l + 1];
    const aPrev = cache.a[l];
    const z = cache.z[l];
    const isOut = l === W.length - 1;
    // dL/dz
    const dz = new Float32Array(nout);
    for (let j = 0; j < nout; j++) {
      const dAct = isOut ? (sig(z[j]) * (1 - sig(z[j]))) : (z[j] > 0 ? 1 : 0);
      dz[j] = delta[j] * dAct;
    }
    // gradients
    for (let j = 0; j < nout; j++) {
      gB[l][j] += dz[j];
      for (let k = 0; k < nin; k++) gW[l][k * nout + j] += aPrev[k] * dz[j];
    }
    // propagate
    if (l > 0) {
      const dPrev = new Float32Array(nin);
      for (let k = 0; k < nin; k++) {
        let s = 0;
        for (let j = 0; j < nout; j++) s += W[l][k * nout + j] * dz[j];
        dPrev[k] = s;
      }
      delta = dPrev;
    }
  }
}

// Adam
const LR = 1e-3, BETA1 = 0.9, BETA2 = 0.999, EPS = 1e-8;
const mW = W.map(w => new Float32Array(w.length));
const vW = W.map(w => new Float32Array(w.length));
const mB = B.map(b => new Float32Array(b.length));
const vB = B.map(b => new Float32Array(b.length));
let t = 0;

const BATCH = 64;
const EPOCHS = 100;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function evalMetrics(idxList) {
  const cache = {};
  let mae = [0, 0, 0], sqErr = [0, 0, 0], varSum = [0, 0, 0];
  const yMean = [0, 0, 0];
  for (const i of idxList) for (let j = 0; j < 3; j++) yMean[j] += Y[i * 3 + j];
  for (let j = 0; j < 3; j++) yMean[j] /= idxList.length;
  let labelAgree = 0;
  const label = (m1, m2) => (m1 > 0.6 ? 'M1' : m2 > 0.6 ? 'M2' : 'MIXED');
  for (const i of idxList) {
    const x = X.subarray(i * 6, i * 6 + 6);
    const a = forward(x, cache);
    for (let j = 0; j < 3; j++) {
      const e = a[j] - Y[i * 3 + j];
      mae[j] += Math.abs(e);
      sqErr[j] += e * e;
      varSum[j] += (Y[i * 3 + j] - yMean[j]) ** 2;
    }
    if (label(a[0], a[1]) === label(Y[i * 3], Y[i * 3 + 1])) labelAgree++;
  }
  const n = idxList.length;
  return {
    mae: mae.map(v => v / n),
    r2: sqErr.map((v, j) => 1 - v / (varSum[j] || 1)),
    phenotypeAgreement: (100 * labelAgree) / n,
  };
}

const xBuf = new Float32Array(6);
let trainLossHistory = [];
for (let epoch = 0; epoch < EPOCHS; epoch++) {
  shuffle(trainIdx);
  let lossSum = 0;
  for (let b0 = 0; b0 < nTrain; b0 += BATCH) {
    const bEnd = Math.min(b0 + BATCH, nTrain);
    const bs = bEnd - b0;
    const gW = W.map(w => new Float32Array(w.length));
    const gB = B.map(b => new Float32Array(b.length));
    const cache = {};
    for (let bi = b0; bi < bEnd; bi++) {
      const i = trainIdx[bi];
      xBuf.set(X.subarray(i * 6, i * 6 + 6));
      const a = forward(xBuf, cache);
      const dLoss = new Float32Array(3);
      for (let j = 0; j < 3; j++) {
        const e = a[j] - Y[i * 3 + j];
        lossSum += e * e;
        dLoss[j] = (2 / 3) * e / bs; // MSE averaged over 3 outputs and batch
      }
      backward(cache, dLoss, gW, gB);
    }
    // Adam update
    t++;
    for (let l = 0; l < W.length; l++) {
      for (let i = 0; i < W[l].length; i++) {
        mW[l][i] = BETA1 * mW[l][i] + (1 - BETA1) * gW[l][i];
        vW[l][i] = BETA2 * vW[l][i] + (1 - BETA2) * gW[l][i] * gW[l][i];
        const mHat = mW[l][i] / (1 - BETA1 ** t);
        const vHat = vW[l][i] / (1 - BETA2 ** t);
        W[l][i] -= LR * mHat / (Math.sqrt(vHat) + EPS);
      }
      for (let i = 0; i < B[l].length; i++) {
        mB[l][i] = BETA1 * mB[l][i] + (1 - BETA1) * gB[l][i];
        vB[l][i] = BETA2 * vB[l][i] + (1 - BETA2) * gB[l][i] * gB[l][i];
        const mHat = mB[l][i] / (1 - BETA1 ** t);
        const vHat = vB[l][i] / (1 - BETA2 ** t);
        B[l][i] -= LR * mHat / (Math.sqrt(vHat) + EPS);
      }
    }
  }
  trainLossHistory.push(lossSum / nTrain / 3);
  if ((epoch + 1) % 10 === 0 || epoch === EPOCHS - 1) {
    const v = evalMetrics(valIdx);
    console.log(
      `epoch ${epoch + 1}: trainLoss=${trainLossHistory.at(-1).toExponential(3)} ` +
      `val MAE(m1,m2,phago)=${v.mae.map(x => x.toFixed(4)).join(',')} ` +
      `R2=${v.r2.map(x => x.toFixed(4)).join(',')} ` +
      `phenotype=${v.phenotypeAgreement.toFixed(2)}%`
    );
  }
}

// --------------------------------------------------------------------------
// Final validation metrics
// --------------------------------------------------------------------------
const val = evalMetrics(valIdx);
const train = evalMetrics(trainIdx);
console.log('\n=== Final ===');
console.log('train:', JSON.stringify(train, null, 0));
console.log('val  :', JSON.stringify(val, null, 0));

// --------------------------------------------------------------------------
// Emit the weights module
// --------------------------------------------------------------------------
const layers = W.map((w, l) => {
  const nin = ARCH[l], nout = ARCH[l + 1];
  const weights = [];
  for (let k = 0; k < nin; k++) {
    const row = [];
    for (let j = 0; j < nout; j++) row.push(w[k * nout + j]);
    weights.push(row);
  }
  return { weights, biases: [...B[l]] };
});

const out = {
  architecture: ARCH,
  activation: 'relu_hidden_sigmoid_output',
  accuracy: Number(val.phenotypeAgreement.toFixed(2)), // per-sample discrete-label agreement (M1/M2/MIXED) on held-out 20%
  training_samples: N,
  train_split: nTrain,
  epochs: EPOCHS,
  batch_size: BATCH,
  optimizer: 'adam',
  learning_rate: LR,
  seed: SEED,
  generator: 'sigmoid ODE-style polarization generator (see scripts/train-surrogate.mjs)',
  validation: {
    phenotype_agreement_pct: Number(val.phenotypeAgreement.toFixed(2)),
    mae: val.mae.map(v => Number(v.toFixed(4))),
    r2: val.r2.map(v => Number(v.toFixed(4))),
  },
  layers,
};

const ts = [
  '// Auto-generated by scripts/train-surrogate.mjs — do not edit by hand.',
  `// Reproducible training (seed ${SEED}): node scripts/train-surrogate.mjs`,
  `// Validation (held-out 20%): phenotype-label agreement ${out.accuracy}%;`,
  `//   per-output MAE ${out.validation.mae.join('/')}; R2 ${out.validation.r2.join('/')}.`,
  `export const NEURAL_SURROGATE_MODEL = ${JSON.stringify(out)};`,
  '',
].join('\n');

const outPath = resolve(__dirname, '../app/src/lib/simulation/neuralSurrogateWeights.ts');
writeFileSync(outPath, ts, 'utf8');
console.log('\nWrote', outPath);
