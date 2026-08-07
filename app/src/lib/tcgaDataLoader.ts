/**
 * TCGA 参考数据加载器
 * 从 public/data/tcga/ 目录加载静态 JSON，带内存缓存。
 *
 * 数据文件（后续由 Python 训练管线导出）：
 * - ./data/tcga/immune_predictions.json  → 免疫浸润预测
 * - ./data/tcga/tcga_attention.json      → GNN 注意力权重
 * - ./data/tcga/genemania_graph.json     → 基因交互图信息
 * - ./data/tcga/patient_scenarios.json   → 患者预设场景
 */

import type {
  TcgaAttentionData,
  TcgaGraphInfo,
  TcgaPatientScenario,
  TcgaReferenceData,
} from '@/types/simulation';

/** TCGA 静态数据根目录（相对站点根）。 */
const BASE_PATH = './data/tcga';

const FILES = {
  predictions: `${BASE_PATH}/immune_predictions.json`,
  attention: `${BASE_PATH}/tcga_attention.json`,
  graphInfo: `${BASE_PATH}/genemania_graph.json`,
  scenarios: `${BASE_PATH}/patient_scenarios.json`,
};

let cachedPredictions: TcgaReferenceData | null = null;
let cachedAttention: TcgaAttentionData | null = null;
let cachedGraphInfo: TcgaGraphInfo | null = null;
let cachedScenarios: TcgaPatientScenario[] | null = null;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load ${url}: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

/** 加载 TCGA 免疫浸润预测数据。 */
export async function loadTcgaPredictions(): Promise<TcgaReferenceData> {
  if (!cachedPredictions) {
    cachedPredictions = await fetchJson<TcgaReferenceData>(FILES.predictions);
  }
  return cachedPredictions;
}

/** 加载 TCGA GNN 注意力权重数据。 */
export async function loadTcgaAttention(): Promise<TcgaAttentionData> {
  if (!cachedAttention) {
    cachedAttention = await fetchJson<TcgaAttentionData>(FILES.attention);
  }
  return cachedAttention;
}

/** 加载 TCGA 基因交互图信息。 */
export async function loadTcgaGraphInfo(): Promise<TcgaGraphInfo> {
  if (!cachedGraphInfo) {
    cachedGraphInfo = await fetchJson<TcgaGraphInfo>(FILES.graphInfo);
  }
  return cachedGraphInfo;
}

/** 加载 TCGA 患者预设场景。 */
export async function loadTcgaScenarios(): Promise<TcgaPatientScenario[]> {
  if (!cachedScenarios) {
    cachedScenarios = await fetchJson<TcgaPatientScenario[]>(FILES.scenarios);
  }
  return cachedScenarios;
}

/** 清空缓存（用于 HMR / 数据刷新场景）。 */
export function clearTcgaCache(): void {
  cachedPredictions = null;
  cachedAttention = null;
  cachedGraphInfo = null;
  cachedScenarios = null;
}

/** TCGA 队列统计结果（用于面板展示）。 */
export interface TcgaStats {
  /** 样本数 */
  nSamples: number;
  /** 各免疫亚型样本计数 */
  subtypeDistribution: Record<string, number>;
  /** 免疫细胞类型名称（与 meanImmuneInfiltration 对齐） */
  immuneCellTypes: string[];
  /** 平均免疫浸润（每个免疫细胞类型） */
  meanImmuneInfiltration: number[];
  /** 平均亚型概率（与 predictions 的 subtype_probs 维度一致） */
  meanSubtypeProbs: number[];
  /** 平均生存风险 */
  meanSurvivalRisk: number;
  /** 高风险（>0.5）样本占比 */
  highRiskFraction: number;
}

/**
 * 计算 TCGA 队列统计信息（纯同步、确定性）。
 */
export function computeTcgaStats(data: TcgaReferenceData): TcgaStats {
  const predictions = data.predictions ?? [];
  const n = predictions.length;
  const immuneCellTypes = data.immune_cell_types ?? [];
  const featureDim = immuneCellTypes.length;

  const subtypeDistribution: Record<string, number> = {};
  const meanImmuneInfiltration = new Array<number>(featureDim).fill(0);
  const meanSubtypeProbs = new Array<number>(
    predictions[0]?.subtype_probs?.length ?? 0
  ).fill(0);
  let riskAcc = 0;
  let highRisk = 0;

  for (const p of predictions) {
    const subtype = p.immune_subtype ?? 'Unknown';
    subtypeDistribution[subtype] = (subtypeDistribution[subtype] ?? 0) + 1;

    const infil = p.immune_infiltration ?? [];
    for (let d = 0; d < featureDim && d < infil.length; d++) {
      meanImmuneInfiltration[d] += infil[d];
    }

    const probs = p.subtype_probs ?? [];
    for (let d = 0; d < meanSubtypeProbs.length; d++) {
      meanSubtypeProbs[d] += probs[d] ?? 0;
    }

    const risk = p.survival_risk ?? 0;
    riskAcc += risk;
    if (risk > 0.5) highRisk++;
  }

  if (n > 0) {
    for (let d = 0; d < meanImmuneInfiltration.length; d++) {
      meanImmuneInfiltration[d] /= n;
    }
    for (let d = 0; d < meanSubtypeProbs.length; d++) {
      meanSubtypeProbs[d] /= n;
    }
  }

  return {
    nSamples: n,
    subtypeDistribution,
    immuneCellTypes,
    meanImmuneInfiltration,
    meanSubtypeProbs,
    meanSurvivalRisk: n > 0 ? riskAcc / n : 0,
    highRiskFraction: n > 0 ? highRisk / n : 0,
  };
}