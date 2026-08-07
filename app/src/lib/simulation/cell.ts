import { v4 as uuidv4 } from 'uuid';
import type { CellType, PolarizationState, SignalingDomain, Vector2D, CarDesign, FieldCell } from '@/types/simulation';
import type { CytokineField } from './field';
import { neuralSurrogatePredict } from './neuralSurrogate';
import type { RandomSource } from './engine';

/** GNN 输出的巨噬细胞级预测（可选 GNN 推理模式，由 engine 传入）。 */
export interface GNNMacrophagePrediction {
  m1: number;
  m2: number;
  phago: number;
}

// Utility functions
function vecAdd(a: Vector2D, b: Vector2D): Vector2D {
  return { x: a.x + b.x, y: a.y + b.y };
}

function vecScale(v: Vector2D, s: number): Vector2D {
  return { x: v.x * s, y: v.y * s };
}

function vecDist(a: Vector2D, b: Vector2D): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function vecNormalize(v: Vector2D): Vector2D {
  const mag = Math.sqrt(v.x * v.x + v.y * v.y);
  if (mag === 0) return { x: 0, y: 0 };
  return { x: v.x / mag, y: v.y / mag };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Rescale a per-update probability to the actual timestep so stochastic event
 * rates are frame-rate- and speed-independent.
 *
 * The model's per-update probabilities were calibrated against a nominal
 * update interval of NOMINAL_DT = 0.1 simulated minutes. For a draw at a
 * different dt we treat the nominal probability p as
 * `p = 1 - (1-lambda)^1` with lambda = -ln(1-p) events per nominal interval,
 * giving p(dt) = 1 - (1-p)^(dt / NOMINAL_DT). For small p this is ~ p*dt/0.1,
 * but the exact form stays valid for large p and avoids overshooting 1.
 */
export function probPerUpdate(pPerNominalDt: number, dt: number, nominalDt = 0.1): number {
  const p = clamp(pPerNominalDt, 0, 1);
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  return 1 - Math.pow(1 - p, dt / nominalDt);
}

export interface KillEvent {
  x: number;
  y: number;
  time: number;
  killer: 'CAR_M' | 'CD8';
}

export const killEvents: KillEvent[] = [];

export function clearKillEvents(): void {
  killEvents.length = 0;
}

// Cell configuration
export const CELL_CONFIG = {
  CAR_MACROPHAGE: {
    radius: 10,
    baseSpeed: 0.8,
    color: '#00ff88',
    glowColor: 'rgba(0, 255, 136, 0.4)',
  },
  WILD_TYPE_MACROPHAGE: {
    radius: 9,
    baseSpeed: 0.5,
    colorM1: '#ff3366',
    colorM2: '#00ccff',
    glowColorM1: 'rgba(255, 51, 102, 0.4)',
    glowColorM2: 'rgba(0, 204, 255, 0.4)',
  },
  TUMOR_CELL: {
    radius: 14,
    baseSpeed: 0.1,
    color: '#cc66ff',
    glowColor: 'rgba(204, 102, 255, 0.4)',
  },
  CD8_T_CELL: {
    radius: 6,
    baseSpeed: 1.2,
    color: '#ffcc00',
    glowColor: 'rgba(255, 204, 0, 0.4)',
  },
};

// Abstract base cell class
export abstract class Cell {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  radius: number;
  type: CellType;
  alive: boolean;
  age: number;
  protected random: RandomSource;

  constructor(position: Vector2D, type: CellType, random: RandomSource = Math.random) {
    this.id = uuidv4();
    this.position = { ...position };
    this.velocity = { x: 0, y: 0 };
    this.type = type;
    this.alive = true;
    this.age = 0;
    this.radius = 8;
    this.random = random;
  }

  abstract update(
    dt: number,
    env: FieldCell,
    _allCells: Cell[],
    carDesign: CarDesign,
    bounds: { width: number; height: number },
    field: CytokineField,
    getNeighbors: (x: number, y: number, radius: number) => Cell[],
    gnnPrediction?: GNNMacrophagePrediction
  ): void;
  abstract render(ctx: CanvasRenderingContext2D): void;

  protected applyBounds(bounds: { width: number; height: number }) {
    const margin = this.radius;
    if (this.position.x < margin) { this.position.x = margin; this.velocity.x *= -0.5; }
    if (this.position.x > bounds.width - margin) { this.position.x = bounds.width - margin; this.velocity.x *= -0.5; }
    if (this.position.y < margin) { this.position.y = margin; this.velocity.y *= -0.5; }
    if (this.position.y > bounds.height - margin) { this.position.y = bounds.height - margin; this.velocity.y *= -0.5; }
  }

  protected randomWalk(speed: number) {
    // Brownian motion with persistence
    const angle = this.random() * Math.PI * 2;
    const randomForce = { x: Math.cos(angle) * speed * 0.3, y: Math.sin(angle) * speed * 0.3 };
    this.velocity = vecAdd(this.velocity, randomForce);
    // Damping
    this.velocity = vecScale(this.velocity, 0.95);
    // Clamp speed
    const currentSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    if (currentSpeed > speed) {
      this.velocity = vecScale(vecNormalize(this.velocity), speed);
    }
  }

  protected chemotaxisToward(target: Vector2D, strength: number) {
    const dir = { x: target.x - this.position.x, y: target.y - this.position.y };
    const dist = Math.sqrt(dir.x ** 2 + dir.y ** 2);
    if (dist > 1) {
      const normalized = vecScale(dir, 1 / dist);
      this.velocity = vecAdd(this.velocity, vecScale(normalized, strength));
    }
  }

  protected applyCytokineChemotaxis(field: CytokineField, m1Score: number, m2Score: number): void {
    const h = field.cellWidth;
    const right = field.getAt(this.position.x + h, this.position.y);
    const left = field.getAt(this.position.x - h, this.position.y);
    const up = field.getAt(this.position.x, this.position.y - h);
    const down = field.getAt(this.position.x, this.position.y + h);

    const gradIfn: Vector2D = {
      x: (right.ifnGamma - left.ifnGamma) / (2 * h),
      y: (down.ifnGamma - up.ifnGamma) / (2 * h),
    };
    const gradTgf: Vector2D = {
      x: (right.tgfBeta - left.tgfBeta) / (2 * h),
      y: (down.tgfBeta - up.tgfBeta) / (2 * h),
    };

    const gradient = vecAdd(vecScale(gradIfn, m1Score), vecScale(gradTgf, m2Score));
    // Scale the chemotactic force by gradient magnitude: previously the
    // gradient was normalized unconditionally, which amplified arbitrarily
    // small (noise-level) gradients into a full-strength 0.3 force. A typical
    // strong gradient is ~0.01 (field range 0-1 over ~2h = 80 units), so we
    // ramp linearly to full strength at that scale and cap there.
    const mag = Math.sqrt(gradient.x ** 2 + gradient.y ** 2);
    if (mag > 1e-6) {
      const strength = 0.3 * Math.min(1, mag / 0.01);
      this.velocity = vecAdd(this.velocity, vecScale(vecNormalize(gradient), strength));
    }
  }

  protected chemotaxisAway(from: Vector2D, strength: number) {
    const dir = { x: this.position.x - from.x, y: this.position.y - from.y };
    const dist = Math.sqrt(dir.x ** 2 + dir.y ** 2);
    if (dist > 1 && dist < 150) {
      const normalized = vecScale(dir, 1 / dist);
      this.velocity = vecAdd(this.velocity, vecScale(normalized, strength));
    }
  }
}

// CAR-Macrophage cell
export class CarMacrophage extends Cell {
  polarization: PolarizationState;
  m1Score: number;
  m2Score: number;
  carExpression: number;
  energy: number;
  phagocytosisCount: number;
  isPhagocytosing: boolean;
  phagocytosisTimer: number;
  targetTumor: TumorCell | null;
  debugPhagocytosisProb: number;

  constructor(position: Vector2D, random?: RandomSource) {
    super(position, 'CAR_MACROPHAGE', random);
    this.radius = CELL_CONFIG.CAR_MACROPHAGE.radius;
    this.polarization = 'MIXED';
    this.m1Score = 0.5;
    this.m2Score = 0.5;
    this.carExpression = 1.0;
    this.energy = 100.0;
    this.phagocytosisCount = 0;
    this.isPhagocytosing = false;
    this.phagocytosisTimer = 0;
    this.targetTumor = null;
    this.debugPhagocytosisProb = 0;
  }

  update(dt: number, env: FieldCell, _allCells: Cell[], carDesign: CarDesign, bounds: { width: number; height: number }, field: CytokineField, getNeighbors: (x: number, y: number, radius: number) => Cell[], gnnPrediction?: GNNMacrophagePrediction): void {
    this.age += dt;

    // Polarization dynamics based on cytokine environment
    this.updatePolarization(env, dt, gnnPrediction);

    // Energy metabolism
    this.energy = clamp(this.energy - 0.05 * dt, 0, 100);
    if (env.oxygen > 0.3) {
      this.energy = clamp(this.energy + 0.1 * dt, 0, 100);
    }
    const exhausted = this.energy < 20;
    const baseSpeed = exhausted ? CELL_CONFIG.CAR_MACROPHAGE.baseSpeed * 0.5 : CELL_CONFIG.CAR_MACROPHAGE.baseSpeed;
    const speed = baseSpeed * (1 - 0.7 * env.ecmDensity);

    // Movement
    if (this.isPhagocytosing && this.targetTumor) {
      // During phagocytosis, move toward target
      this.phagocytosisTimer -= dt;
      if (this.phagocytosisTimer <= 0) {
        // Complete phagocytosis
        if (this.targetTumor.alive) {
          this.targetTumor.alive = false;
          this.phagocytosisCount++;
          killEvents.push({ x: this.targetTumor.position.x, y: this.targetTumor.position.y, time: 0.5, killer: 'CAR_M' });
        }
        this.isPhagocytosing = false;
        this.targetTumor = null;
      } else {
        // Move toward target
        const dir = {
          x: this.targetTumor.position.x - this.position.x,
          y: this.targetTumor.position.y - this.position.y,
        };
        const dist = Math.sqrt(dir.x ** 2 + dir.y ** 2);
        if (dist > this.radius + this.targetTumor.radius - 2) {
          this.velocity = vecAdd(this.velocity, vecScale(vecNormalize(dir), 0.5));
        }
      }
    } else {
      // Cytokine gradient chemotaxis (M1 follows IFN-γ, M2 follows TGF-β)
      this.applyCytokineChemotaxis(field, this.m1Score, this.m2Score);

      // CAR-M bias toward nearest tumor cell within sensing range, scaled by target antigen density.
      const tumorCells = getNeighbors(this.position.x, this.position.y, 100).filter(c => c.type === 'TUMOR_CELL' && c.alive) as TumorCell[];
      if (tumorCells.length > 0) {
        // Find nearest tumor cell
        let nearest: TumorCell | null = null;
        let nearestDist = Infinity;
        for (const tumor of tumorCells) {
          const d = vecDist(this.position, tumor.position);
          if (d < nearestDist) {
            nearestDist = d;
            nearest = tumor;
          }
        }
        if (nearest && nearestDist < 100) {
          this.chemotaxisToward(nearest.position, 0.2 * nearest.getAntigenExpression(carDesign.targetAntigen));
        }
      }

      // Check for phagocytosis opportunity
      if (!this.isPhagocytosing && !exhausted) {
        const nearby = getNeighbors(this.position.x, this.position.y, this.radius + 25);
        for (const cell of nearby) {
          if (cell.type === 'TUMOR_CELL' && cell.alive) {
            const d = vecDist(this.position, cell.position);
            if (d < this.radius + cell.radius + 5) {
              const tumor = cell as TumorCell;
              if (this.canPhagocytose(tumor, carDesign, dt)) {
                this.startPhagocytosis(tumor, carDesign.signalingDomain);
                break;
              }
            }
          }
        }
      }
    }

    this.randomWalk(speed);
    this.position = vecAdd(this.position, this.velocity);
    this.applyBounds(bounds);

    // CD147 CAR-M secretes MMPs to degrade local ECM
    if (carDesign.signalingDomain === 'CD147') {
      const fieldCell = field.getAt(this.position.x, this.position.y);
      fieldCell.ecmDensity = Math.max(0, fieldCell.ecmDensity - 0.01 * dt);
    }
  }

  private updatePolarization(env: FieldCell, dt: number, gnnPrediction?: GNNMacrophagePrediction): void {
    // 优先使用 GNN 预测（可选模式）；否则回退到现有 MLP surrogate
    let nnM1: number, nnM2: number;
    if (gnnPrediction) {
      nnM1 = gnnPrediction.m1;
      nnM2 = gnnPrediction.m2;
    } else {
      const vals = neuralSurrogatePredict(
        env.ifnGamma, env.il4, env.il10, env.tgfBeta, env.oxygen, env.lactate
      );
      nnM1 = vals[0];
      nnM2 = vals[1];
    }
    
    // Exponential decay toward NN-predicted steady state
    const tau = 0.15;
    this.m1Score = clamp(this.m1Score + (nnM1 - this.m1Score) * tau * dt * 10, 0, 1);
    this.m2Score = clamp(this.m2Score + (nnM2 - this.m2Score) * tau * dt * 10, 0, 1);

    if (this.m1Score > 0.6) this.polarization = 'M1';
    else if (this.m2Score > 0.6) this.polarization = 'M2';
    else this.polarization = 'MIXED';
  }

  private canPhagocytose(tumor: TumorCell, carDesign: CarDesign, dt: number): boolean {
    const domain = carDesign.signalingDomain;
    // CD147 CAR-M specializes in ECM degradation, not phagocytosis
    if (domain === 'CD147') return false;

    const antigenDensity = tumor.getAntigenExpression(carDesign.targetAntigen);
    const pBase = (carDesign.affinity / 10) * antigenDensity;

    const cd47BlockadeEnabled = carDesign.checkpointBlockade.CD47_SIRPa;
    const cd24BlockadeEnabled = carDesign.checkpointBlockade.CD24_Siglec10;
    const cd47Factor = 1 - tumor.cd47Expression * (cd47BlockadeEnabled ? 0.15 : 0.85);
    const cd24Factor = 1 - tumor.cd24Expression * (cd24BlockadeEnabled ? 0.2 : 0.55);

    // Domain-specific M1 inflammatory bonus
    let m1Bonus = 1;
    switch (domain) {
      case 'CD3ζ':
        m1Bonus = 1 + 0.5 * this.m1Score;
        break;
      case 'FcRγ':
        m1Bonus = 1 + 0.3 * this.m1Score;
        break;
      case 'MerTK':
        m1Bonus = 1;
        break;
    }

    const energyFactor = clamp(this.energy / 50, 0.3, 1);

    let pFinal = clamp(pBase * cd47Factor * cd24Factor * m1Bonus * energyFactor, 0, 1);

    // MerTK: efferocytosis — only low-viability targets, but 2x higher probability
    if (domain === 'MerTK') {
      if (tumor.viability >= 0.4) return false;
      pFinal = clamp(pFinal * 2, 0, 1);
    }

    this.debugPhagocytosisProb = pFinal;

    // Rescale to the actual timestep so the rate is frame-rate-independent.
    return this.random() < probPerUpdate(pFinal, dt);
  }

  private startPhagocytosis(tumor: TumorCell, domain: SignalingDomain): void {
    this.isPhagocytosing = true;
    this.targetTumor = tumor;
    this.energy = clamp(this.energy - 30, 0, 100);
    // Phagocytosis duration depends on signaling domain
    switch (domain) {
      case 'CD3ζ':
      case 'FcRγ':
        this.phagocytosisTimer = 2 + this.random() * 2; // Fast animation for FcγR-like uptake
        break;
      case 'MerTK':
        this.phagocytosisTimer = 4 + this.random() * 2; // Slower animation for efferocytosis
        break;
      case 'CD147':
        this.phagocytosisTimer = 999; // Never completes — CD147 doesn't phagocytose
        break;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    const isEngulfing = this.isPhagocytosing && this.targetTumor?.alive;
    const progress = isEngulfing ? clamp(1 - this.phagocytosisTimer / 4, 0, 1) : 0;
    const renderRadius = this.radius * (isEngulfing ? 1 + progress * 0.3 : 1);

    // Glow effect
    const gradient = ctx.createRadialGradient(
      this.position.x, this.position.y, renderRadius * 0.5,
      this.position.x, this.position.y, renderRadius * 2
    );
    gradient.addColorStop(0, CELL_CONFIG.CAR_MACROPHAGE.glowColor);
    gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, renderRadius * 2, 0, Math.PI * 2);
    ctx.fill();

    // Main body
    ctx.fillStyle = CELL_CONFIG.CAR_MACROPHAGE.color;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, renderRadius, 0, Math.PI * 2);
    ctx.fill();

    // Inner gradient for 3D effect
    const innerGradient = ctx.createRadialGradient(
      this.position.x - renderRadius * 0.3, this.position.y - renderRadius * 0.3, 0,
      this.position.x, this.position.y, renderRadius
    );
    innerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    innerGradient.addColorStop(1, 'rgba(0, 255, 136, 0.1)');
    ctx.fillStyle = innerGradient;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, renderRadius, 0, Math.PI * 2);
    ctx.fill();

    // CAR receptor indicator (small dot on edge)
    const angle = this.age * 2;
    const carX = this.position.x + Math.cos(angle) * (renderRadius + 3);
    const carY = this.position.y + Math.sin(angle) * (renderRadius + 3);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(carX, carY, 2, 0, Math.PI * 2);
    ctx.fill();

    // Phagocytosis engulfment animation
    if (isEngulfing) {
      const target = this.targetTumor!;
      // Target shrinks and fades
      ctx.globalAlpha = 1 - progress * 0.8;
      ctx.fillStyle = CELL_CONFIG.TUMOR_CELL.color;
      ctx.beginPath();
      ctx.arc(target.position.x, target.position.y, target.radius * (1 - progress * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Engulfment cup (partial circle around target)
      const cupAngle = progress * Math.PI * 2;
      ctx.strokeStyle = CELL_CONFIG.CAR_MACROPHAGE.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(target.position.x, target.position.y, target.radius + 3, -cupAngle / 2, cupAngle / 2);
      ctx.stroke();

      // Progress ring
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, renderRadius + 6, 0, progress * Math.PI * 2);
      ctx.stroke();
    } else if (this.isPhagocytosing) {
      // Fallback indicator when target is dead/missing
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Polarization indicator (inner color)
    let polColor = 'rgba(255, 255, 255, 0.3)';
    if (this.polarization === 'M1') polColor = 'rgba(255, 51, 102, 0.5)';
    else if (this.polarization === 'M2') polColor = 'rgba(0, 204, 255, 0.5)';
    ctx.fillStyle = polColor;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Wild-type Macrophage cell
export class WildTypeMacrophage extends Cell {
  polarization: PolarizationState;
  m1Score: number;
  m2Score: number;
  energy: number;
  phagocytosisCount: number;

  constructor(position: Vector2D, random?: RandomSource) {
    super(position, 'WILD_TYPE_MACROPHAGE', random);
    this.radius = CELL_CONFIG.WILD_TYPE_MACROPHAGE.radius;
    this.polarization = 'M2'; // TAMs are mostly M2 in tumor
    this.m1Score = 0.2;
    this.m2Score = 0.8;
    this.energy = 100.0;
    this.phagocytosisCount = 0;
  }

  update(dt: number, env: FieldCell, _allCells: Cell[], _carDesign: CarDesign, bounds: { width: number; height: number }, field: CytokineField, getNeighbors: (x: number, y: number, radius: number) => Cell[], gnnPrediction?: GNNMacrophagePrediction): void {
    this.age += dt;

    // Polarization dynamics
    this.updatePolarization(env, dt, gnnPrediction);

    // Energy metabolism
    this.energy = clamp(this.energy - 0.05 * dt, 0, 100);
    if (env.oxygen > 0.3) {
      this.energy = clamp(this.energy + 0.1 * dt, 0, 100);
    }
    const exhausted = this.energy < 20;
    const baseSpeed = exhausted ? CELL_CONFIG.WILD_TYPE_MACROPHAGE.baseSpeed * 0.5 : CELL_CONFIG.WILD_TYPE_MACROPHAGE.baseSpeed;
    const speed = baseSpeed * (1 - 0.7 * env.ecmDensity);

    // Cytokine gradient chemotaxis (M1 follows IFN-γ, M2 follows TGF-β)
    this.applyCytokineChemotaxis(field, this.m1Score, this.m2Score);

    // Movement: random walk with slight chemotaxis toward tumor cells
    const tumorCells = getNeighbors(this.position.x, this.position.y, 150).filter(c => c.type === 'TUMOR_CELL' && c.alive) as TumorCell[];
    if (tumorCells.length > 0) {
      let nearest: TumorCell | null = null;
      let nearestDist = Infinity;
      for (const tumor of tumorCells) {
        const d = vecDist(this.position, tumor.position);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = tumor;
        }
      }
      if (nearest && nearestDist < 150) {
        // M1 moves toward tumor more aggressively
        if (this.polarization === 'M1') {
          this.chemotaxisToward(nearest.position, 0.1);
        } else {
          this.chemotaxisToward(nearest.position, 0.03);
        }
      }
    }

    // Attempt phagocytosis (much lower rate than CAR-M).
    // Both draws are rescaled by dt so the rate is frame-rate-independent.
    if (!exhausted && this.m1Score > 0.5 && this.random() < probPerUpdate(0.01, dt)) {
      const nearby = getNeighbors(this.position.x, this.position.y, this.radius + 25);
      for (const cell of nearby) {
        if (cell.type === 'TUMOR_CELL' && cell.alive) {
          const d = vecDist(this.position, cell.position);
          if (d < this.radius + cell.radius + 5) {
            const tumor = cell as TumorCell;
            // WT macrophage phagocytosis is weak due to CD47
            const pWt = 0.1 * (1 - tumor.cd47Expression * 0.9) * (1 - tumor.cd24Expression * 0.4);
            if (this.random() < probPerUpdate(pWt, dt)) {
              tumor.alive = false;
              this.phagocytosisCount++;
              this.energy = clamp(this.energy - 30, 0, 100);
            }
            break;
          }
        }
      }
    }

    this.randomWalk(speed);
    this.position = vecAdd(this.position, this.velocity);
    this.applyBounds(bounds);
  }

  private updatePolarization(env: FieldCell, dt: number, gnnPrediction?: GNNMacrophagePrediction): void {
    // 优先使用 GNN 预测（可选模式）；否则回退到现有 MLP surrogate
    let nnM1: number, nnM2: number;
    if (gnnPrediction) {
      nnM1 = gnnPrediction.m1;
      nnM2 = gnnPrediction.m2;
    } else {
      const vals = neuralSurrogatePredict(
        env.ifnGamma, env.il4, env.il10, env.tgfBeta, env.oxygen, env.lactate
      );
      nnM1 = vals[0];
      nnM2 = vals[1];
    }
    
    // Exponential decay toward NN-predicted steady state
    const tau = 0.15;
    this.m1Score = clamp(this.m1Score + (nnM1 - this.m1Score) * tau * dt * 10, 0, 1);
    this.m2Score = clamp(this.m2Score + (nnM2 - this.m2Score) * tau * dt * 10, 0, 1);

    if (this.m1Score > 0.6) this.polarization = 'M1';
    else if (this.m2Score > 0.6) this.polarization = 'M2';
    else this.polarization = 'MIXED';
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    const config = CELL_CONFIG.WILD_TYPE_MACROPHAGE;
    const color = this.polarization === 'M1' ? config.colorM1 : this.polarization === 'M2' ? config.colorM2 : '#8899aa';
    const glowColor = this.polarization === 'M1' ? config.glowColorM1 : config.glowColorM2;

    // Glow
    const gradient = ctx.createRadialGradient(
      this.position.x, this.position.y, this.radius * 0.5,
      this.position.x, this.position.y, this.radius * 2
    );
    gradient.addColorStop(0, glowColor);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius * 2, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    // Irregular shape for macrophage
    const points = 8;
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const r = this.radius + Math.sin(this.age * 3 + i) * 2;
      const x = this.position.x + Math.cos(angle) * r;
      const y = this.position.y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }
}

// Tumor cell
export class TumorCell extends Cell {
  cd47Expression: number;
  cd24Expression: number;
  her2Expression: number;
  cd19Expression: number;
  egfrExpression: number;
  viability: number;

  constructor(position: Vector2D, random?: RandomSource) {
    super(position, 'TUMOR_CELL', random);
    this.radius = CELL_CONFIG.TUMOR_CELL.radius;
    this.cd47Expression = 0.4 + this.random() * 0.6;
    this.cd24Expression = 0.25 + this.random() * 0.65;
    this.her2Expression = 0.2 + this.random() * 0.8;
    this.cd19Expression = this.random() * 0.35;
    this.egfrExpression = 0.25 + this.random() * 0.7;
    this.viability = 1.0;
  }

  getAntigenExpression(target: CarDesign['targetAntigen']): number {
    switch (target) {
      case 'HER2':
        return this.her2Expression;
      case 'CD19':
        return this.cd19Expression;
      case 'EGFR':
        return this.egfrExpression;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(dt: number, env: FieldCell, __allCells: Cell[], _carDesign: CarDesign, bounds: { width: number; height: number }, __field: CytokineField, __getNeighbors: (x: number, y: number, radius: number) => Cell[], _gnnPrediction?: GNNMacrophagePrediction): void {
    this.age += dt;

    // Metabolic stress in low oxygen
    if (env.oxygen < 0.2) {
      this.viability = clamp(this.viability - 0.001 * dt, 0, 1);
    }

    // Low viability = die
    if (this.viability <= 0) {
      this.alive = false;
      return;
    }

    this.randomWalk(CELL_CONFIG.TUMOR_CELL.baseSpeed * (1 - 0.7 * env.ecmDensity));
    this.position = vecAdd(this.position, this.velocity);
    this.applyBounds(bounds);
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    const config = CELL_CONFIG.TUMOR_CELL;

    // Glow
    const gradient = ctx.createRadialGradient(
      this.position.x, this.position.y, this.radius * 0.5,
      this.position.x, this.position.y, this.radius * 2.5
    );
    gradient.addColorStop(0, config.glowColor);
    gradient.addColorStop(1, 'rgba(204, 102, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Main body with irregular shape
    const her2Intensity = 0.5 + this.her2Expression * 0.5;
    ctx.fillStyle = `rgba(204, 102, 255, ${her2Intensity})`;
    ctx.beginPath();
    const points = 10;
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const r = this.radius + Math.sin(this.age * 2 + i * 1.5) * 3;
      const x = this.position.x + Math.cos(angle) * r;
      const y = this.position.y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // Nucleus
    ctx.fillStyle = 'rgba(100, 40, 150, 0.6)';
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // CD47 indicator — size/opacity proportional to expression
    const cd47Size = 1 + this.cd47Expression * 1.5;
    const cd47Opacity = 0.3 + this.cd47Expression * 0.5;
    ctx.fillStyle = `rgba(255, 100, 100, ${cd47Opacity})`;
    for (let i = 0; i < 3; i++) {
      const angle = this.age + (i / 3) * Math.PI * 2;
      const dotX = this.position.x + Math.cos(angle) * (this.radius + 2);
      const dotY = this.position.y + Math.sin(angle) * (this.radius + 2);
      ctx.beginPath();
      ctx.arc(dotX, dotY, cd47Size, 0, Math.PI * 2);
      ctx.fill();
    }

    // CD24 indicator — secondary "don't eat me" signal
    ctx.fillStyle = `rgba(255, 210, 120, ${0.25 + this.cd24Expression * 0.45})`;
    for (let i = 0; i < 2; i++) {
      const angle = -this.age * 0.7 + (i / 2) * Math.PI * 2;
      const dotX = this.position.x + Math.cos(angle) * (this.radius + 4);
      const dotY = this.position.y + Math.sin(angle) * (this.radius + 4);
      ctx.beginPath();
      ctx.arc(dotX, dotY, 1 + this.cd24Expression, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// CD8+ T Cell
export class CD8TCell extends Cell {
  activationLevel: number;
  exhaustion: number; // 0-1, 1 = fully exhausted
  killCount: number;  // track kills for clone expansion
  expansionCount: number;
  expansionTimer: number;
  killAnimationTimer: number;
  readyToSpawn: boolean;

  constructor(position: Vector2D, random?: RandomSource) {
    super(position, 'CD8_T_CELL', random);
    this.radius = CELL_CONFIG.CD8_T_CELL.radius;
    this.activationLevel = 0;
    this.exhaustion = 0;
    this.killCount = 0;
    this.expansionCount = 0;
    this.expansionTimer = 0;
    this.killAnimationTimer = 0;
    this.readyToSpawn = false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(dt: number, env: FieldCell, _allCells: Cell[], _carDesign: CarDesign, bounds: { width: number; height: number }, field: CytokineField, getNeighbors: (x: number, y: number, radius: number) => Cell[], _gnnPrediction?: GNNMacrophagePrediction): void {
    this.age += dt;

    // Exhaustion dynamics: immunosuppressive cytokines increase it, IFN-γ relieves it
    this.exhaustion += (env.tgfBeta * 0.05 + env.il10 * 0.03) * dt;
    this.exhaustion -= env.ifnGamma * 0.02 * dt;
    this.exhaustion = clamp(this.exhaustion, 0, 1);

    const anergic = this.exhaustion > 0.8;

    // Activation by IFN-γ with natural decay
    this.activationLevel = clamp(this.activationLevel + env.ifnGamma * dt * 0.1 - 0.02 * dt, 0, 1);

    // CXCL9 chemotaxis — T cells follow CXCL9 gradient produced by M1 macrophages
    const h = field.cellWidth;
    const right = field.getAt(this.position.x + h, this.position.y);
    const left = field.getAt(this.position.x - h, this.position.y);
    const up = field.getAt(this.position.x, this.position.y - h);
    const down = field.getAt(this.position.x, this.position.y + h);
    const gradCxcl9: Vector2D = {
      x: (right.cxcl9 - left.cxcl9) / (2 * h),
      y: (down.cxcl9 - up.cxcl9) / (2 * h),
    };
    const cxcl9Mag = Math.sqrt(gradCxcl9.x ** 2 + gradCxcl9.y ** 2);
    if (cxcl9Mag > 0.01 && !anergic) {
      const normalized = vecScale(gradCxcl9, 1 / cxcl9Mag);
      this.velocity = vecAdd(this.velocity, vecScale(normalized, 0.15 * this.activationLevel));
    }

    // Chemotaxis toward tumor cells (when activated and not exhausted)
    if (this.activationLevel > 0.3 && !anergic) {
      const tumorCells = getNeighbors(this.position.x, this.position.y, 200).filter(c => c.type === 'TUMOR_CELL' && c.alive);
      if (tumorCells.length > 0) {
        let nearest: Cell | null = null;
        let nearestDist = Infinity;
        for (const tumor of tumorCells) {
          const d = vecDist(this.position, tumor.position);
          if (d < nearestDist) {
            nearestDist = d;
            nearest = tumor;
          }
        }
        if (nearest && nearestDist < 200) {
          this.chemotaxisToward(nearest.position, 0.2 * this.activationLevel);
        }
      }
    }

    // Kill tumor cells on contact (when highly activated and not exhausted)
    if (this.activationLevel > 0.5 && !anergic) {
      const nearby = getNeighbors(this.position.x, this.position.y, this.radius + 20);
      for (const cell of nearby) {
        if (cell.type === 'TUMOR_CELL' && cell.alive) {
          const d = vecDist(this.position, cell.position);
          if (d < this.radius + cell.radius + 3) {
            const killProb = 0.08 * this.activationLevel * (1 - this.exhaustion * 0.8);
            if (this.random() < probPerUpdate(killProb, dt)) {
              cell.alive = false;
              this.killCount++;
              this.killAnimationTimer = 2;
              killEvents.push({ x: cell.position.x, y: cell.position.y, time: 0.5, killer: 'CD8' });
              // Trigger clonal expansion after 3 kills
              if (this.killCount >= 3 && this.expansionCount < 2 && this.expansionTimer <= 0) {
                this.expansionTimer = 5;
              }
            }
          }
        }
      }
    }

    // Clonal expansion countdown
    if (this.expansionTimer > 0) {
      this.expansionTimer -= dt;
      if (this.expansionTimer <= 0) {
        this.readyToSpawn = true;
      }
    }

    // Movement speed: ECM slows, exhaustion slows, kill animation slows
    let speed = CELL_CONFIG.CD8_T_CELL.baseSpeed * (1 - 0.7 * env.ecmDensity);
    speed *= (1 - this.exhaustion * 0.5);
    if (this.killAnimationTimer > 0) {
      this.killAnimationTimer -= dt;
      speed *= 0.5;
    }

    this.randomWalk(speed);
    this.position = vecAdd(this.position, this.velocity);
    this.applyBounds(bounds);
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    const exhaustionDim = 1 - this.exhaustion * 0.6;

    // Glow (dimmer when exhausted)
    const gradient = ctx.createRadialGradient(
      this.position.x, this.position.y, this.radius * 0.3,
      this.position.x, this.position.y, this.radius * 2
    );
    gradient.addColorStop(0, `rgba(255, 204, 0, ${0.4 * exhaustionDim})`);
    gradient.addColorStop(1, 'rgba(255, 204, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius * 2, 0, Math.PI * 2);
    ctx.fill();

    // Body (darker when exhausted)
    const r = Math.round(255 * exhaustionDim);
    const g = Math.round(204 * exhaustionDim);
    const b = Math.round(0 * exhaustionDim);
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Activation ring
    if (this.activationLevel > 0.3) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${this.activationLevel * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.radius + 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Exhaustion ring (red glow when highly exhausted)
    if (this.exhaustion > 0.5) {
      ctx.strokeStyle = `rgba(255, 50, 50, ${this.exhaustion * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Kill animation: brief pulsing white glow
    if (this.killAnimationTimer > 0) {
      const pulse = 0.5 + 0.5 * Math.sin(this.age * 15);
      ctx.fillStyle = `rgba(255, 255, 255, ${pulse * 0.4})`;
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.radius + 2 + pulse * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Kill count indicator (small number)
    if (this.killCount > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(this.killCount), this.position.x, this.position.y - this.radius - 4);
    }
  }
}
