// Cell types in the simulation
export type CellType = 'CAR_MACROPHAGE' | 'WILD_TYPE_MACROPHAGE' | 'TUMOR_CELL' | 'CD8_T_CELL';

// Polarization states for macrophages
export type PolarizationState = 'M1' | 'M2' | 'MIXED';

// CAR signaling domain options
export type SignalingDomain = 'CD3ζ' | 'FcRγ' | 'CD147' | 'MerTK';

// Target antigen options
export type TargetAntigen = 'HER2' | 'CD19' | 'EGFR';

// CAR-M design parameters
export interface CarDesign {
  signalingDomain: SignalingDomain;
  targetAntigen: TargetAntigen;
  affinity: number; // 0-10
  checkpointBlockade: {
    CD47_SIRPa: boolean;
    CD24_Siglec10: boolean;
  };
}

// Simulation parameters
export interface SimParams {
  carMCount: number;
  wildTypeCount: number;
  tumorCount: number;
  cd8Count: number;
  oxygenLevel: number; // 0-1
  lactateLevel: number; // 0-1
  tgfBetaLevel: number; // 0-1
  randomSeed: number;
}

// 2D Vector
export interface Vector2D {
  x: number;
  y: number;
}

// Simulation statistics for charts
export interface SimStatistics {
  time: number[];
  tumorVolume: number[];
  phagocytosisRate: number[];
  m1Ratio: number[];
  m2Ratio: number[];
  cd8Infiltration: number[];
  carMCount: number[];
  tumorCount: number[];
  ecmAverage?: number[];
  tCellExhaustion?: number[];
  totalKills?: number[];
}

// Simulation state
export interface SimulationState {
  isRunning: boolean;
  isPaused: boolean;
  speed: number;
  stepCount: number;
  simTime: number; // simulated minutes
  /** Monotonic counter incremented by an explicit Reset request; the canvas
   *  watches this instead of inferring resets from state transitions. */
  resetCounter: number;
}

// Cytokine field cell
export interface FieldCell {
  oxygen: number;
  lactate: number;
  tgfBeta: number;
  ifnGamma: number;
  il4: number;
  il10: number;
  vegf: number;
  cxcl9: number;
  spp1: number;
  ecmDensity: number;
}

// Experiment snapshot for comparison
export interface Experiment {
  id: string;
  name: string;
  carDesign: CarDesign;
  simParams: SimParams;
  statistics: SimStatistics;
  timestamp: number;
}

// Complete app state
export interface AppState {
  simulation: SimulationState;
  carDesign: CarDesign;
  simParams: SimParams;
  statistics: SimStatistics;
  experiments: Experiment[];
  currentExperimentId: string | null;
}

// === GNN 图数据类型 ===

/** 稀疏边索引 (COO format) */
export interface EdgeIndex {
  /** 源节点索引 [num_edges] */
  row: Int32Array;
  /** 目标节点索引 [num_edges] */
  col: Int32Array;
}

/** ABM 细胞交互图 */
export interface CellGraph {
  /** 节点特征矩阵 [numNodes, featureDim] */
  nodeFeatures: Float32Array;
  /** 边索引 */
  edgeIndex: EdgeIndex;
  /** 边特征（可选）[numEdges, edgeFeatureDim] */
  edgeFeatures?: Float32Array;
  /** 节点数量 */
  numNodes: number;
  /** 边数量 */
  numEdges: number;
  /** 节点特征维度 */
  featureDim: number;
}

/** GNN 推理结果（per-node） */
export interface GNNNodePredictions {
  /** per-node 预测 [numNodes, outputDim] */
  predictions: Float32Array;
  /** per-node 注意力权重（用于可视化），按边(源→目标)排列 [numEdges * heads] */
  attentionWeights?: Float32Array;
  /** 推理时间戳（用于降频外推） */
  timestamp: number;
}

/** GNN 模型权重 */
export interface GATModelWeights {
  /** 每层的权重 */
  layers: GATLayerWeights[];
}

export interface GATLayerWeights {
  /** 线性变换 W [outDim * heads, inDim] */
  W: Float32Array;
  /** 注意力参数 a_src [outDim * heads] */
  a_src: Float32Array;
  /** 注意力参数 a_dst [outDim * heads] */
  a_dst: Float32Array;
  /** 偏置 [outDim * heads] */
  bias: Float32Array;
  /** 输入维度 */
  inDim: number;
  /** 输出维度（每 head） */
  outDim: number;
  /** 注意力头数 */
  heads: number;
  /** 是否 concat 多头（最后一层为 false/mean） */
  concat: boolean;
}

/** TCGA 参考数据（从 JSON 加载） */
export interface TcgaReferenceData {
  metadata: {
    cancer_type: string;
    n_samples: number;
    n_genes: number;
    model: string;
    cv_scores: { auc: number; accuracy: number };
  };
  predictions: Array<{
    sample_id: string;
    immune_infiltration: number[];
    immune_subtype: string;
    subtype_probs: number[];
    survival_risk: number;
  }>;
  immune_cell_types: string[];
}

/** TCGA 注意力权重数据 */
export interface TcgaAttentionData {
  metadata: { model: string; n_layers: number; n_heads: number };
  gene_names: string[];
  attention: Array<Record<string, number[][]>>;
  top_pathways: Array<{
    name: string;
    genes: string[];
    avg_attention: number;
  }>;
}

/** TCGA 图信息 */
export interface TcgaGraphInfo {
  n_nodes: number;
  n_edges: number;
  gene_names: string[];
  node_features_dim: number;
  feature_names: string[];
}

/** TCGA 患者预设场景 */
export interface TcgaPatientScenario {
  name: string;
  description: string;
  sim_params: Partial<SimParams>;
  car_design: Partial<CarDesign>;
  tcga_source: { subtype: string; sample_count: number };
}
