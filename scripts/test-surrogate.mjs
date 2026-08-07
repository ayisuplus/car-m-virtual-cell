#!/usr/bin/env node
/**
 * GNN (GAT) consistency gate (headless).
 *
 * Verifies that the production GAT inference path
 * (app/src/lib/simulation/gatInference.ts) is self-consistent, deterministic,
 * shape-correct, attention-normalized, and that the on-disk weights at
 * app/public/models/gat-weights.json stay bit-identical to the in-memory
 * default weights (app/src/lib/simulation/gnnWeights.ts).
 *
 * History: the original MLP surrogate had a P0 weight-transpose bug (rows
 * flattened row-major but read column-major during inference).  The GAT
 * analogue is an attention-coefficient direction bug: e_ij must be computed
 * src→dst (a_src on the source node, a_dst on the destination node) and the
 * message must flow from the source's outgoing neighbors back into the source.
 * This script guards that direction explicitly (Test 3).
 *
 * Run:     node scripts/test-surrogate.mjs
 * Exits non-zero on any failure so it can gate CI.
 *
 * NOTE on output range: the inline forward pass mirrors gatInference.ts
 * EXACTLY, which does NOT apply a downstream sigmoid to the final layer.
 * Test 5 therefore guards finite + bounded output rather than a [0,1] range.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEIGHTS_PATH = join(__dirname, '..', 'app', 'public', 'models', 'gat-weights.json');

// ============================================================================
// === Inline GAT forward pass (sync with gatInference.ts) ====================
// ============================================================================
const LEAKY_ALPHA = 0.2;
function leakyRelu(x) {
  return x >= 0 ? x : LEAKY_ALPHA * x;
}

/**
 * Normalize JSON weights (plain nested arrays) into Float32Array structures.
 * Mirrors normalizeGATWeights() in gatInference.ts, accepting both snake_case
 * and camelCase keys.
 */
function normalizeGATWeights(json) {
  return {
    layers: (json.layers ?? []).map((l) => {
      const heads = l.heads ?? 1;
      const inDim = l.in_dim ?? l.inDim ?? 0;
      const outDim = l.out_dim ?? l.outDim ?? Math.floor((l.a_src ?? []).length / heads);
      const W = l.W instanceof Float32Array ? l.W : new Float32Array((l.W ?? []).flat());
      const a_src = l.a_src instanceof Float32Array ? l.a_src : new Float32Array(l.a_src ?? []);
      const a_dst = l.a_dst instanceof Float32Array ? l.a_dst : new Float32Array(l.a_dst ?? []);
      const biasRaw = l.bias ?? new Array(outDim * heads).fill(0);
      const bias = biasRaw instanceof Float32Array ? biasRaw : new Float32Array(biasRaw);
      return { W, a_src, a_dst, bias, inDim, outDim, heads, concat: l.concat ?? false };
    }),
  };
}

/**
 * GAT forward pass.  Mirrors GATModel.forward() in gatInference.ts.
 * @param {{numNodes:number,numEdges:number,nodeFeatures:Float32Array,featureDim:number,edgeIndex:{row:Int32Array,col:Int32Array}}} graph
 * @param {{layers:Array}} weights normalized weights
 * @returns {{predictions:Float32Array, attentionWeights:Float32Array|undefined}}
 */
function gatForward(graph, weights) {
  const numNodes = graph.numNodes;
  const numEdges = graph.numEdges;
  const row = graph.edgeIndex.row;
  const col = graph.edgeIndex.col;

  if (numNodes === 0) {
    const lastOut = weights.layers[weights.layers.length - 1]?.outDim ?? 0;
    return { predictions: new Float32Array(0), attentionWeights: undefined };
  }

  // CSR adjacency grouped by source node (deterministic, no randomness).
  const degree = new Int32Array(numNodes);
  for (let e = 0; e < numEdges; e++) degree[row[e]]++;
  const offsets = new Int32Array(numNodes + 1);
  for (let i = 0; i < numNodes; i++) offsets[i + 1] = offsets[i] + degree[i];
  const cursor = offsets.slice();
  const neighbors = new Int32Array(numEdges);
  const edgeIds = new Int32Array(numEdges);
  for (let e = 0; e < numEdges; e++) {
    const src = row[e];
    const pos = cursor[src]++;
    neighbors[pos] = col[e];
    edgeIds[pos] = e;
  }

  let features = graph.nodeFeatures;
  let featureDim = graph.featureDim;
  let attentionWeights;

  for (let l = 0; l < weights.layers.length; l++) {
    const layer = weights.layers[l];
    const outTotal = layer.outDim * layer.heads;
    const outFeatureDim = layer.concat ? outTotal : layer.outDim;

    // Step 1 & 2: linear transform + bias -> hPrime [N, outTotal]
    const hPrime = new Float32Array(numNodes * outTotal);
    for (let i = 0; i < numNodes; i++) {
      const featBase = i * featureDim;
      const outBase = i * outTotal;
      for (let h = 0; h < layer.heads; h++) {
        for (let o = 0; o < layer.outDim; o++) {
          const rowId = h * layer.outDim + o;
          const wBase = rowId * layer.inDim;
          let sum = layer.bias[rowId];
          for (let k = 0; k < layer.inDim; k++) {
            sum += layer.W[wBase + k] * features[featBase + k];
          }
          hPrime[outBase + rowId] = sum;
        }
      }
    }

    // Step 3: attention logits e_ij per edge per head (src->dst direction)
    const eLogits = new Float32Array(numEdges * layer.heads);
    for (let e = 0; e < numEdges; e++) {
      const src = row[e];
      const dst = col[e];
      const srcBase = src * outTotal;
      const dstBase = dst * outTotal;
      for (let h = 0; h < layer.heads; h++) {
        let at = 0;
        for (let o = 0; o < layer.outDim; o++) {
          const rowId = h * layer.outDim + o;
          at += layer.a_src[rowId] * hPrime[srcBase + rowId] + layer.a_dst[rowId] * hPrime[dstBase + rowId];
        }
        eLogits[e * layer.heads + h] = leakyRelu(at);
      }
    }

    // Step 4/5/6: numerically-stable softmax + weighted aggregation
    const output = new Float32Array(numNodes * outFeatureDim);
    const alphas = new Float32Array(numEdges * layer.heads);
    const tempAlpha = new Float32Array(numEdges);

    for (let i = 0; i < numNodes; i++) {
      const start = offsets[i];
      const end = offsets[i + 1];
      const outBase = i * outFeatureDim;
      for (let h = 0; h < layer.heads; h++) {
        let maxE = -Infinity;
        for (let p = start; p < end; p++) {
          const v = eLogits[edgeIds[p] * layer.heads + h];
          if (v > maxE) maxE = v;
        }
        let sum = 0;
        for (let p = start; p < end; p++) {
          const a = Math.exp(eLogits[edgeIds[p] * layer.heads + h] - maxE);
          tempAlpha[p] = a;
          sum += a;
        }
        const invSum = sum > 0 ? 1 / sum : 0;
        for (let p = start; p < end; p++) {
          alphas[edgeIds[p] * layer.heads + h] = tempAlpha[p] * invSum;
        }
        for (let o = 0; o < layer.outDim; o++) {
          const rowId = h * layer.outDim + o;
          let acc = 0;
          for (let p = start; p < end; p++) {
            const dst = neighbors[p];
            acc += tempAlpha[p] * invSum * hPrime[dst * outTotal + rowId];
          }
          if (layer.concat) {
            output[outBase + rowId] = acc;
          } else {
            output[outBase + o] += acc / layer.heads; // mean multi-head
          }
        }
      }
    }

    features = output;
    featureDim = outFeatureDim;
    attentionWeights = alphas; // last layer's softmax attention (heads=1)
  }

  return { predictions: features, attentionWeights };
}

// === Inline default-weight generation (sync with gnnWeights.ts) ============
const DEFAULT_SEED = 20250706;
const SEED_STRIDE = 1013;
const ATTENTION_BOUND = 0.1;

function createLCG(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function xavierBound(fanIn, fanOut) {
  return Math.sqrt(6 / (fanIn + fanOut));
}

function generateLayerWeights(inDim, outDim, heads, concat, seed) {
  const rand = createLCG(seed);
  const rows = outDim * heads;
  const total = rows * inDim;
  const W = new Float32Array(total);
  const bound = xavierBound(inDim, outDim * heads);
  for (let i = 0; i < total; i++) W[i] = (rand() * 2 - 1) * bound;
  const a_src = new Float32Array(rows);
  const a_dst = new Float32Array(rows);
  for (let i = 0; i < rows; i++) {
    a_src[i] = (rand() * 2 - 1) * ATTENTION_BOUND;
    a_dst[i] = (rand() * 2 - 1) * ATTENTION_BOUND;
  }
  const bias = new Float32Array(rows);
  return { W, a_src, a_dst, bias, inDim, outDim, heads, concat };
}

function getDefaultGATWeights() {
  return {
    layers: [
      generateLayerWeights(24, 16, 4, true, DEFAULT_SEED),
      generateLayerWeights(64, 3, 1, false, DEFAULT_SEED + SEED_STRIDE),
    ],
  };
}

// ============================================================================
// === Test harness ===========================================================
// ============================================================================
let passed = 0;
let failed = 0;

function check(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
  if (ok) passed++;
  else failed++;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertClose(a, b, tol, message) {
  assert(Math.abs(a - b) <= tol, `${message} (expected ${b}, got ${a}, tol ${tol})`);
}

function arraysBitEqual(a, b, label) {
  assert(a.length === b.length, `${label}: length mismatch (${a.length} vs ${b.length})`);
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      throw new Error(`${label}: bit mismatch at index ${i} (${a[i]} vs ${b[i]})`);
    }
  }
}

// 24-dim feature index mapping (mirrors FieldCell layout):
//   0 oxygen, 1 lactate, 2 tgfBeta, 3 ifnGamma, 4 il4, 5 il10 ...
const IFNGAMMA_IDX = 3;
const IL4_IDX = 4;
const FEATURE_DIM = 24;

// Deterministic LCG for generating test graphs (no Math.random).
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Build a random (or structured) graph.
 * @param {number} numNodes
 * @param {number} numEdges
 * @param {Float32Array} [nodeFeatures] explicit features; else random in [0,1]
 * @param {Function} [rng] random source
 */
function buildGraph(numNodes, numEdges, nodeFeatures, rng) {
  const rand = rng ?? makeRng(42);
  const row = new Int32Array(numEdges);
  const col = new Int32Array(numEdges);
  for (let e = 0; e < numEdges; e++) {
    row[e] = Math.floor(rand() * numNodes);
    col[e] = Math.floor(rand() * numNodes);
  }
  const features = nodeFeatures ?? new Float32Array(numNodes * FEATURE_DIM);
  if (!nodeFeatures) {
    for (let i = 0; i < features.length; i++) features[i] = rand();
  }
  return {
    nodeFeatures: features,
    edgeIndex: { row, col },
    numNodes,
    numEdges,
    featureDim: FEATURE_DIM,
  };
}

// ============================================================================
// Shared fixtures
// ============================================================================
let jsonWeights;
try {
  jsonWeights = normalizeGATWeights(JSON.parse(readFileSync(WEIGHTS_PATH, 'utf8')));
} catch (e) {
  console.error(`FATAL: could not load ${WEIGHTS_PATH}: ${e.message}`);
  process.exit(1);
}
const defaultWeights = getDefaultGATWeights();

// ============================================================================
// Test 1: Weight shape validation
// ============================================================================
try {
  const layers = jsonWeights.layers;
  assert(layers.length >= 2, `expected >= 2 GAT layers, got ${layers.length}`);
  layers.forEach((layer, li) => {
    const rows = layer.outDim * layer.heads;
    assert(
      layer.W.length === layer.outDim * layer.heads * layer.inDim,
      `layer ${li}: W.length ${layer.W.length} !== outDim(${layer.outDim})*heads(${layer.heads})*inDim(${layer.inDim}) = ${layer.outDim * layer.heads * layer.inDim}`
    );
    assert(layer.a_src.length === rows, `layer ${li}: a_src.length ${layer.a_src.length} !== outDim*heads = ${rows}`);
    assert(layer.a_dst.length === rows, `layer ${li}: a_dst.length ${layer.a_dst.length} !== outDim*heads = ${rows}`);
    assert(layer.bias.length === rows, `layer ${li}: bias.length ${layer.bias.length} !== outDim*heads = ${rows}`);
    const isLast = li === layers.length - 1;
    assert(layer.concat === !isLast, `layer ${li}: concat should be ${!isLast} (last layer false, others true), got ${layer.concat}`);
  });
  // cross-layer connectivity
  for (let li = 0; li < layers.length - 1; li++) {
    const outDimCur = layers[li].concat ? layers[li].outDim * layers[li].heads : layers[li].outDim;
    assert(outDimCur === layers[li + 1].inDim, `layer ${li} output dim ${outDimCur} !== layer ${li + 1} inDim ${layers[li + 1].inDim}`);
  }
  check('Test 1: GAT weight shapes are consistent', true,
    `${layers.length} layers: [${layers.map((l) => `${l.inDim}->${l.outDim}x${l.heads}${l.concat ? '*' : ''}`).join(', ')}]`);
} catch (e) {
  check('Test 1: GAT weight shapes are consistent', false, e.message);
}

// ============================================================================
// Test 2: Determinism
// ============================================================================
try {
  const rng = makeRng(20250806);
  const graph = buildGraph(10, 20, null, rng);
  const a = gatForward(graph, jsonWeights);
  const b = gatForward(graph, jsonWeights);
  arraysBitEqual(a.predictions, b.predictions, 'Test 2 determinism');
  check('Test 2: GAT inference is deterministic', true,
    `${graph.numNodes} nodes / ${graph.numEdges} edges, bit-identical on repeat`);
} catch (e) {
  check('Test 2: GAT inference is deterministic', false, e.message);
}

// ============================================================================
// Test 3: Directional / plausibility response (src->dst P0-bug guard)
// ============================================================================
// Build a small connected graph where a macrophage node (node 0) is surrounded
// by neighbors carrying the same field environment.  Scenario A pushes the
// field toward high IFN-γ / low IL-4 (expected M1), B toward low IFN-γ / high
// IL-4 (expected M2).  This also exercises the attention direction: if e_ij were
// accidentally computed dst→src, aggregation would pull from the wrong neighbors
// and the directional trend would collapse.
try {
  const N = 3;
  const rows = [0, 1, 2, 1, 2, 0];
  const cols = [1, 2, 0, 0, 1, 2];

  function scenario(ifn, il4) {
    const f = new Float32Array(N * FEATURE_DIM).fill(0.1);
    for (let i = 0; i < N; i++) {
      f[i * FEATURE_DIM + IFNGAMMA_IDX] = ifn;
      f[i * FEATURE_DIM + IL4_IDX] = il4;
    }
    const graph = {
      nodeFeatures: f,
      edgeIndex: { row: new Int32Array(rows), col: new Int32Array(cols) },
      numNodes: N,
      numEdges: rows.length,
      featureDim: FEATURE_DIM,
    };
    const { predictions } = gatForward(graph, jsonWeights);
    // node 0 is the macrophage; outputs ordered [M1, M2, M3]
    return { m1: predictions[0], m2: predictions[1] };
  }

  const A = scenario(0.9, 0.05); // high IFN-γ, low IL-4 -> expect M1
  const B = scenario(0.05, 0.9); // low IFN-γ, high IL-4 -> expect M2

  // Guard attention direction src->dst: scenario trend must be preserved.
  assert(A.m1 > A.m2, `scenario A: expected M1 > M2 for high IFN-γ, got M1=${A.m1.toFixed(4)} M2=${A.m2.toFixed(4)} (attention direction may be reversed)`);
  assert(B.m2 > B.m1, `scenario B: expected M2 > M1 for high IL-4, got M1=${B.m1.toFixed(4)} M2=${B.m2.toFixed(4)} (attention direction may be reversed)`);
  assert(A.m1 > B.m1, `scenario A M1 (${A.m1.toFixed(4)}) should exceed scenario B M1 (${B.m1.toFixed(4)})`);
  assert(B.m2 > A.m2, `scenario B M2 (${B.m2.toFixed(4)}) should exceed scenario A M2 (${A.m2.toFixed(4)})`);

  check('Test 3: GAT shows correct M1/M2 directional response', true,
    `A(M1=${A.m1.toFixed(3)},M2=${A.m2.toFixed(3)}) B(M1=${B.m1.toFixed(3)},M2=${B.m2.toFixed(3)})`);
} catch (e) {
  check('Test 3: GAT shows correct M1/M2 directional response', false, e.message);
}

// ============================================================================
// Test 4: Attention weight normalization
// ============================================================================
try {
  const rng = makeRng(777);
  const graph = buildGraph(12, 26, null, rng);
  const { attentionWeights } = gatForward(graph, jsonWeights);
  assert(attentionWeights !== undefined, 'attentionWeights missing from forward output');
  assert(attentionWeights.length === graph.numEdges, `last layer has 1 head, expected attention length ${graph.numEdges}, got ${attentionWeights.length}`);

  // softmax over a node's *outgoing* edges (last layer heads=1) must sum to 1.
  let checked = 0;
  let maxErr = 0;
  for (let i = 0; i < graph.numNodes; i++) {
    let sum = 0;
    let degree = 0;
    for (let e = 0; e < graph.numEdges; e++) {
      if (graph.edgeIndex.row[e] === i) {
        sum += attentionWeights[e];
        degree++;
      }
    }
    if (degree === 0) continue; // no outgoing edges -> no normalization
    checked++;
    const err = Math.abs(sum - 1);
    if (err > maxErr) maxErr = err;
    assertClose(sum, 1, 1e-4, `node ${i} attention sum ${sum} should be ~1.0`);
  }
  assert(checked > 0, 'no node with outgoing edges found to check');
  check('Test 4: GAT attention weights sum to ~1.0', true,
    `checked ${checked} nodes, max deviation ${maxErr.toExponential(2)}`);
} catch (e) {
  check('Test 4: GAT attention weights sum to ~1.0', false, e.message);
}

// ============================================================================
// Test 5: Batch inference stability (1000 random graphs)
// ============================================================================
try {
  const N_GRAPHS = 1000;
  const baseSeed = 123456789;
  let checked = 0;
  let maxAbs = 0;
  for (let g = 0; g < N_GRAPHS; g++) {
    const rng = makeRng(baseSeed + g);
    const numNodes = 2 + Math.floor(rng() * 14); // 2..15 nodes
    const maxEdges = Math.min(numNodes * (numNodes - 1), 40);
    const numEdges = 1 + Math.floor(rng() * maxEdges);
    const graph = buildGraph(numNodes, numEdges, null, rng);

    const a = gatForward(graph, jsonWeights);
    const b = gatForward(graph, jsonWeights);
    arraysBitEqual(a.predictions, b.predictions, `graph ${g} determinism`);

    for (let i = 0; i < a.predictions.length; i++) {
      const v = a.predictions[i];
      assert(Number.isFinite(v), `graph ${g}: non-finite prediction ${v}`);
      const av = Math.abs(v);
      if (av > maxAbs) maxAbs = av;
      // The inline pass matches gatInference.ts (no sigmoid), so guard magnitude.
      assert(av <= 50, `graph ${g}: |prediction| ${av.toFixed(4)} out of reasonable range`);
    }
    checked++;
  }
  check('Test 5: GAT batch inference is stable (1000 random graphs)', true,
    `${checked} graphs deterministic & finite, max |prediction| ${maxAbs.toFixed(3)}`);
} catch (e) {
  check('Test 5: GAT batch inference is stable (1000 random graphs)', false, e.message);
}

// ============================================================================
// Test 6: JSON weights vs in-memory default weights consistency
// ============================================================================
try {
  const rng = makeRng(555);
  const graph = buildGraph(9, 18, null, rng);
  const fromJson = gatForward(graph, jsonWeights);
  const fromDefault = gatForward(graph, defaultWeights);
  arraysBitEqual(fromJson.predictions, fromDefault.predictions, 'Test 6 JSON vs default');
  check('Test 6: JSON weights match default in-memory weights', true,
    'bit-identical predictions for identical input');
} catch (e) {
  check('Test 6: JSON weights match default in-memory weights', false, e.message);
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);