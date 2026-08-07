/**
 * GNN 权重管理
 * - 从 public/models/gat-weights.json 异步加载
 * - 提供默认初始化权重（用于开发/测试）
 * - 权重序列化为 Float32Array 以优化内存
 *
 * 默认权重：小型 GAT（仅用于开发阶段的占位权重，尚未被训练产物替换）
 * 2 层 GAT:
 * - Layer 0: inDim=24, outDim=16, heads=4, concat=true → 64 dim
 * - Layer 1: inDim=64, outDim=3, heads=1, concat=false → 3 dim
 * 总参数 ~5K（轻量级）
 *
 * ⚠️ 学术诚信提示：默认权重是 Xavier 随机初始化（仅 seed 固定以保证可复现），
 * 未经任何训练。GNN 模式下输出的 m1/m2/phago 仅验证推理管线的连通性，
 * 不具有生物学意义，禁止在论文、deck 或 UI 中作为有效预测结果引用。
 *
 * 权重初始化使用与项目一致的可复现 LCG：
 * value = (value * 1664525 + 1013904223) >>> 0
 */

import { GATModel } from './gatInference';
import type { GATLayerWeights, GATModelWeights } from '@/types/simulation';

/** 默认权重 JSON 的公开路径（相对站点根）。 */
export const DEFAULT_GAT_WEIGHTS_URL = './models/gat-weights.json';

/** 默认权重生成的固定种子（与项目训练 seed 一致）。 */
const DEFAULT_SEED = 20250706;

/** 各层以固定步长派生子种子，保证层间权重去相关且可复现。 */
const SEED_STRIDE = 1013;

/** 注意力参数初始化幅度（小值即可）。 */
const ATTENTION_BOUND = 0.1;

/**
 * 返回一个确定性的 LCG 随机源（与 engine.ts / Simulation3D 等保持一致）。
 * @param seed 32 位整数种子
 */
export function createLCG(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

/** Xavier 均匀分布边界：sqrt(6 / (fanIn + fanOut))。 */
function xavierBound(fanIn: number, fanOut: number): number {
  return Math.sqrt(6 / (fanIn + fanOut));
}

/**
 * 用确定性 LCG 生成单层 GAT 权重。
 * @param inDim 输入维度
 * @param outDim 每 head 输出维度
 * @param heads 注意力头数
 * @param concat 是否 concat 多头
 * @param seed 该层所用种子
 */
function generateLayerWeights(
  inDim: number,
  outDim: number,
  heads: number,
  concat: boolean,
  seed: number
): GATLayerWeights {
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

  const bias = new Float32Array(rows); // 偏置初始化为 0

  return { W, a_src, a_dst, bias, inDim, outDim, heads, concat };
}

/**
 * 生成默认 GAT 权重（开发阶段占位，后续由 Python 训练产物替换）。
 * 该函数的逻辑与 scripts/generate-gat-weights.mjs 完全一致，保证
 * 内存回退权重与 public/models/gat-weights.json 内容位级一致。
 */
export function getDefaultGATWeights(): GATModelWeights {
  const layer0 = generateLayerWeights(24, 16, 4, true, DEFAULT_SEED);
  const layer1 = generateLayerWeights(64, 3, 1, false, DEFAULT_SEED + SEED_STRIDE);
  return { layers: [layer0, layer1] };
}

/**
 * 从 public/models/gat-weights.json 异步加载 GAT 模型。
 * 加载失败时回退到默认权重（保证开发环境可用）。
 */
export async function loadGATWeightsFromPublic(): Promise<GATModel> {
  try {
    const res = await fetch(DEFAULT_GAT_WEIGHTS_URL);
    if (res.ok) {
      const json = (await res.json()) as object;
      return GATModel.fromJSON(json);
    }
  } catch {
    // 网络/解析失败时回退默认权重
  }
  return new GATModel(getDefaultGATWeights());
}

/**
 * 同步返回默认 GAT 模型实例（不依赖网络）。
 * 用于冷启动或测试场景。
 */
export function getDefaultGATModel(): GATModel {
  return new GATModel(getDefaultGATWeights());
}