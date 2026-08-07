/**
 * 生成默认 GAT 权重 JSON：app/public/models/gat-weights.json
 *
 * 逻辑与 app/src/lib/simulation/gnnWeights.ts 的 getDefaultGATWeights() 完全一致，
 * 保证内存回退权重与文件内容位级一致：
 * - Layer 0: inDim=24, outDim=16, heads=4, concat=true  → 64 dim
 * - Layer 1: inDim=64, outDim=3,  heads=1, concat=false → 3 dim
 * - 种子: 20250706（与项目训练 seed 一致），层间子种子 = seed + 1013
 * - 初始化: Xavier 均匀权重 + 小随机注意力参数 + 零偏置
 *
 * 运行: node scripts/generate-gat-weights.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

function generateLayer(inDim, outDim, heads, concat, seed) {
  const rand = createLCG(seed);
  const rows = outDim * heads;
  const bound = xavierBound(inDim, outDim * heads);

  // W: [rows][inDim]
  const W = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let k = 0; k < inDim; k++) {
      row.push((rand() * 2 - 1) * bound);
    }
    W.push(row);
  }

  const a_src = [];
  const a_dst = [];
  for (let r = 0; r < rows; r++) {
    a_src.push((rand() * 2 - 1) * ATTENTION_BOUND);
    a_dst.push((rand() * 2 - 1) * ATTENTION_BOUND);
  }

  const bias = new Array(rows).fill(0);

  return { in_dim: inDim, out_dim: outDim, heads, concat, W, a_src, a_dst, bias };
}

const model = {
  model: 'GAT',
  seed: DEFAULT_SEED,
  description:
    'Development placeholder GAT weights (24->64->3). Will be replaced by Python-trained artifacts.',
  layers: [
    generateLayer(24, 16, 4, true, DEFAULT_SEED),
    generateLayer(64, 3, 1, false, DEFAULT_SEED + SEED_STRIDE),
  ],
};

const outPath = join(__dirname, '..', 'app', 'public', 'models', 'gat-weights.json');
const json = JSON.stringify(model, null, 2);
writeFileSync(outPath, json, 'utf8');
const bytes = Buffer.byteLength(json, 'utf8');
console.log(`Wrote ${outPath} (${bytes} bytes, ${model.layers[0].rows ?? ''})`);