/**
 * 纯 JS/TypedArray 实现的 Graph Attention Network (GAT) 前向推理。
 *
 * 架构：任意层数的 GAT，默认为 2 层
 * - Layer 0: GATConv(inDim, 16, heads=4, concat=true) → 64 dim
 * - Layer 1: GATConv(64, outputDim, heads=1, concat=false, mean) → outputDim
 *
 * 关键约束：
 * - 纯 Float32Array 运算，零 Math.random
 * - 位级确定性（同输入 → 同输出）
 * - 支持注意力权重提取（用于可视化）
 * - 支持任意层数/头数/输出维度的配置
 *
 * GAT 消息传递核心算法（对每个节点 i 及其邻居 j）：
 * 1. 线性变换：h_i' = W · h_i  (矩阵-向量乘法)
 * 2. 注意力系数：e_ij = LeakyReLU(a_src · h_i' + a_dst · h_j')
 * 3. Softmax 归一化：α_ij = exp(e_ij) / Σ_k exp(e_ik)  (对 i 的所有邻居 k)
 * 4. 加权聚合：h_i'' = Σ_j α_ij · h_j'
 * 5. 可选 concat 或 mean 多头
 * 6. 偏置添加
 */

import type {
  CellGraph,
  GATLayerWeights,
  GATModelWeights,
  GNNNodePredictions,
} from '@/types/simulation';

/** GAT 标准 LeakyReLU 负斜率 */
const LEAKY_ALPHA = 0.2;

function leakyRelu(x: number): number {
  return x >= 0 ? x : LEAKY_ALPHA * x;
}

/**
 * 将 JSON（普通嵌套数组）权重规范化为 Float32Array 结构。
 * 支持 snake_case（in_dim/out_dim）与 camelCase（inDim/outDim）两种键名。
 */
export function normalizeGATWeights(json: object): GATModelWeights {
  const raw = json as {
    layers?: Array<{
      W: number[][] | Float32Array;
      a_src: number[] | Float32Array;
      a_dst: number[] | Float32Array;
      bias?: number[] | Float32Array;
      in_dim?: number;
      inDim?: number;
      out_dim?: number;
      outDim?: number;
      heads?: number;
      concat?: boolean;
    }>;
  };

  const layers = (raw.layers ?? []).map((l) => {
    const heads = l.heads ?? 1;
    const inDim = l.in_dim ?? l.inDim ?? 0;
    // outDim 推断：优先显式字段，否则由 a_src 长度 / heads 推导
    const outDim = l.out_dim ?? l.outDim ?? Math.floor((l.a_src as ArrayLike<number>).length / heads);

    const W = l.W instanceof Float32Array ? l.W : new Float32Array((l.W as number[][]).flat());
    const a_src = l.a_src instanceof Float32Array ? l.a_src : new Float32Array(l.a_src as number[]);
    const a_dst = l.a_dst instanceof Float32Array ? l.a_dst : new Float32Array(l.a_dst as number[]);
    const biasRaw = l.bias ?? (l.bias === undefined ? new Array<number>(outDim * heads).fill(0) : l.bias);
    const bias =
      biasRaw instanceof Float32Array
        ? biasRaw
        : new Float32Array(biasRaw as number[]);

    const out: GATLayerWeights = {
      W,
      a_src,
      a_dst,
      bias,
      inDim,
      outDim,
      heads,
      concat: l.concat ?? false,
    };
    return out;
  });

  return { layers };
}

/**
 * 异步加载 GNN 权重文件。
 * @param url 权重 JSON 的 URL（相对或绝对）
 */
export async function loadGATWeights(url: string): Promise<GATModelWeights> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load GAT weights from ${url}: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as object;
  return normalizeGATWeights(json);
}

/**
 * 2 层 GAT 图注意力网络推理引擎。
 */
export class GATModel {
  private weights: GATModelWeights;

  constructor(weights: GATModelWeights) {
    this.weights = weights;
  }

  /**
   * 批量前向推理。
   * @param graph 细胞交互图
   * @returns per-node 预测 + 注意力权重
   */
  forward(graph: CellGraph): GNNNodePredictions {
    const numNodes = graph.numNodes;
    const numEdges = graph.numEdges;
    const row = graph.edgeIndex.row;
    const col = graph.edgeIndex.col;
    const timestamp = performance.now();

    if (numNodes === 0) {
      return { predictions: new Float32Array(0), timestamp };
    }

    // 构建按源节点分组的 CSR 邻接结构（确定性的，无随机性）。
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

    // 当前层特征 [N, featureDim]
    let features = graph.nodeFeatures;
    let featureDim = graph.featureDim;
    let attentionWeights: Float32Array | undefined;

    for (let l = 0; l < this.weights.layers.length; l++) {
      const layer = this.weights.layers[l];
      const outTotal = layer.outDim * layer.heads;
      const outFeatureDim = layer.concat ? outTotal : layer.outDim;

      // --- Step 1 & 2: 线性变换 + 偏置 → hPrime [N, outTotal] ---
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

      // --- Step 3: 注意力原始系数 e_ij 每边每头 ---
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

      // --- Step 4/5/6: 数值稳定 softmax + 加权聚合 + 偏置已计入 hPrime ---
      const output = new Float32Array(numNodes * outFeatureDim);
      const alphas = new Float32Array(numEdges * layer.heads);
      const tempAlpha = new Float32Array(numEdges);

      for (let i = 0; i < numNodes; i++) {
        const start = offsets[i];
        const end = offsets[i + 1];
        const outBase = i * outFeatureDim;
        for (let h = 0; h < layer.heads; h++) {
          // 求邻居 logits 最大值（数值稳定 softmax）
          let maxE = -Infinity;
          for (let p = start; p < end; p++) {
            const v = eLogits[edgeIds[p] * layer.heads + h];
            if (v > maxE) maxE = v;
          }
          // 指数化并求和
          let sum = 0;
          for (let p = start; p < end; p++) {
            const a = Math.exp(eLogits[edgeIds[p] * layer.heads + h] - maxE);
            tempAlpha[p] = a;
            sum += a;
          }
          const invSum = sum > 0 ? 1 / sum : 0;
          // 记录最终 softmax 注意力（供可视化）
          for (let p = start; p < end; p++) {
            alphas[edgeIds[p] * layer.heads + h] = tempAlpha[p] * invSum;
          }
          // 加权聚合
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
              output[outBase + o] += acc / layer.heads; // mean 多头
            }
          }
        }
      }

      features = output;
      featureDim = outFeatureDim;
      // 仅保留最后一层的注意力（空间 layering 语义）
      attentionWeights = alphas;
    }

    return {
      predictions: features,
      attentionWeights,
      timestamp,
    };
  }

  /**
   * 从 JSON 加载权重。
   */
  static fromJSON(json: object): GATModel {
    return new GATModel(normalizeGATWeights(json));
  }
}

/**
 * 便捷函数：从 JSON 权重构建模型。
 */
export function createGATModel(weights: GATModelWeights): GATModel {
  return new GATModel(weights);
}

/** 供类型检查/尺寸推导使用的辅助信息（不参与推理）。 */
export interface GATLayerShape {
  inDim: number;
  outDim: number;
  heads: number;
  concat: boolean;
}

export function getGATLayerShapes(weights: GATModelWeights): GATLayerShape[] {
  return weights.layers.map((l: GATLayerWeights) => ({
    inDim: l.inDim,
    outDim: l.outDim,
    heads: l.heads,
    concat: l.concat,
  }));
}