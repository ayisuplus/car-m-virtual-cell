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
