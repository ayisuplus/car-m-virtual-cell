import { CarMacrophage, WildTypeMacrophage, TumorCell, CD8TCell, killEvents, clearKillEvents } from './cell';
import { CytokineField } from './field';
import type { Cell } from './cell';
import type { CarDesign, SimParams, SimStatistics } from '@/types/simulation';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export type RandomSource = () => number;

function createSeededRandom(seed: number): RandomSource {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

class SpatialHash {
  private grid: Map<string, Cell[]>;
  private cellSize: number;

  constructor(cellSize: number) {
    this.grid = new Map();
    this.cellSize = cellSize;
  }

  clear(): void {
    this.grid.clear();
  }

  private key(x: number, y: number): string {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
  }

  insert(cell: Cell): void {
    const k = this.key(cell.position.x, cell.position.y);
    const existing = this.grid.get(k);
    if (existing) existing.push(cell);
    else this.grid.set(k, [cell]);
  }

  query(x: number, y: number, radius: number): Cell[] {
    const results: Cell[] = [];
    const minCX = Math.floor((x - radius) / this.cellSize);
    const maxCX = Math.floor((x + radius) / this.cellSize);
    const minCY = Math.floor((y - radius) / this.cellSize);
    const maxCY = Math.floor((y + radius) / this.cellSize);
    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const cells = this.grid.get(`${cx},${cy}`);
        if (cells) results.push(...cells);
      }
    }
    return results;
  }
}

export interface EngineCallbacks {
  onStatsUpdate: (stats: SimStatistics) => void;
}

export class ABMEngine {
  cells: Cell[] = [];
  field: CytokineField;
  carDesign: CarDesign;
  simParams: SimParams;
  statistics: SimStatistics;
  callbacks: EngineCallbacks;
  bounds: { width: number; height: number };
  animationId: number | null = null;
  lastTime: number = 0;
  stepCount: number = 0;
  simTime: number = 0; // simulated minutes
  isRunning: boolean = false;
  speed: number = 1;
  private random: RandomSource;
  private spatialHash = new SpatialHash(50);
  private statsTimer: number = 0;
  private initialCD8Count: number = 0;

  constructor(
    width: number,
    height: number,
    carDesign: CarDesign,
    simParams: SimParams,
    callbacks: EngineCallbacks
  ) {
    this.bounds = { width, height };
    this.carDesign = carDesign;
    this.simParams = simParams;
    this.callbacks = callbacks;
    this.random = createSeededRandom(simParams.randomSeed);
    this.field = new CytokineField(width, height, 40, simParams, this.random);

    this.statistics = {
      time: [],
      tumorVolume: [],
      phagocytosisRate: [],
      m1Ratio: [],
      m2Ratio: [],
      cd8Infiltration: [],
      carMCount: [],
      tumorCount: [],
      ecmAverage: [],
      tCellExhaustion: [],
      totalKills: [],
    };

    this.initializeCells();
  }

  initializeCells(): void {
    this.cells = [];
    const { width, height } = this.bounds;

    // Create tumor cluster in center
    const centerX = width / 2;
    const centerY = height / 2;
    for (let i = 0; i < this.simParams.tumorCount; i++) {
      const angle = this.random() * Math.PI * 2;
      const dist = this.random() * Math.min(width, height) * 0.25;
      const x = centerX + Math.cos(angle) * dist;
      const y = centerY + Math.sin(angle) * dist;
      this.cells.push(new TumorCell({ x, y }, this.random));
    }

    // Create CAR-M cells scattered around
    for (let i = 0; i < this.simParams.carMCount; i++) {
      const angle = this.random() * Math.PI * 2;
      const dist = Math.min(width, height) * 0.3 + this.random() * Math.min(width, height) * 0.15;
      const x = centerX + Math.cos(angle) * dist;
      const y = centerY + Math.sin(angle) * dist;
      this.cells.push(new CarMacrophage({ x, y }, this.random));
    }

    // Create wild-type macrophages
    for (let i = 0; i < this.simParams.wildTypeCount; i++) {
      const x = this.random() * width;
      const y = this.random() * height;
      this.cells.push(new WildTypeMacrophage({ x, y }, this.random));
    }

    // Create CD8+ T cells
    for (let i = 0; i < this.simParams.cd8Count; i++) {
      const x = this.random() * width;
      const y = this.random() * height;
      this.cells.push(new CD8TCell({ x, y }, this.random));
    }
    this.initialCD8Count = this.simParams.cd8Count;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  pause(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  reset(): void {
    this.pause();
    this.stepCount = 0;
    this.simTime = 0;
    this.statsTimer = 0;
    clearKillEvents();
    this.random = createSeededRandom(this.simParams.randomSeed);
    this.statistics = {
      time: [],
      tumorVolume: [],
      phagocytosisRate: [],
      m1Ratio: [],
      m2Ratio: [],
      cd8Infiltration: [],
      carMCount: [],
      tumorCount: [],
      ecmAverage: [],
      tCellExhaustion: [],
      totalKills: [],
    };
    this.field = new CytokineField(this.bounds.width, this.bounds.height, 40, this.simParams, this.random);
    this.initializeCells();
    this.callbacks.onStatsUpdate(this.statistics);
  }

  updateParams(simParams: SimParams): void {
    this.simParams = simParams;
  }

  updateCarDesign(carDesign: CarDesign): void {
    this.carDesign = carDesign;
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }

  public step(): void {
    if (this.isRunning) this.pause();
    const dt = 0.1 * this.speed; // fixed timestep for stepping
    this.simTime += dt;

    this.spatialHash.clear();
    for (const cell of this.cells) {
      if (cell.alive) this.spatialHash.insert(cell);
    }
    const getNeighbors = (x: number, y: number, r: number) => this.spatialHash.query(x, y, r);

    this.field.update(this.cells, dt);
    for (const cell of this.cells) {
      if (cell.alive) {
        const env = this.field.getAt(cell.position.x, cell.position.y);
        cell.update(dt, env, this.cells, this.carDesign, this.bounds, this.field, getNeighbors);
      }
    }

    this.handleCD8Expansion();
    this.handleProliferation();
    this.cells = this.cells.filter(c => c.alive);
    this.statsTimer += dt;
    if (this.statsTimer >= 0.5) {
      this.statsTimer = 0;
      this.collectStats();
    }
    this.stepCount++;
    this.callbacks.onStatsUpdate({ ...this.statistics });
  }

  private loop = (currentTime: number): void => {
    if (!this.isRunning) return;

    const deltaMs = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Cap delta to avoid spiral of death
    const dt = Math.min(deltaMs / 1000, 0.05) * this.speed;
    this.simTime += dt;

    // Update field
    this.field.update(this.cells, dt);

    // Rebuild spatial hash for neighbor queries
    this.spatialHash.clear();
    for (const cell of this.cells) {
      if (cell.alive) this.spatialHash.insert(cell);
    }
    const getNeighbors = (x: number, y: number, r: number) => this.spatialHash.query(x, y, r);

    // Update cells
    for (const cell of this.cells) {
      if (cell.alive) {
        const env = this.field.getAt(cell.position.x, cell.position.y);
        cell.update(dt, env, this.cells, this.carDesign, this.bounds, this.field, getNeighbors);
      }
    }

    // Handle CD8+ T cell clonal expansion
    this.handleCD8Expansion();

    // Tumor proliferation
    this.handleProliferation();

    // Remove dead cells
    this.cells = this.cells.filter(c => c.alive);

    // Collect statistics every ~0.5 simulated minutes
    this.statsTimer += dt;
    if (this.statsTimer >= 0.5) {
      this.statsTimer = 0;
      this.collectStats();
    }

    this.stepCount++;
    this.animationId = requestAnimationFrame(this.loop);
  };

  private handleCD8Expansion(): void {
    const cd8Cells = this.cells.filter(c => c.type === 'CD8_T_CELL' && c.alive) as CD8TCell[];
    const currentCD8Count = cd8Cells.length;
    const maxCD8Count = this.initialCD8Count * 3;

    for (const cd8 of cd8Cells) {
      if (cd8.readyToSpawn && currentCD8Count < maxCD8Count) {
        const angle = this.random() * Math.PI * 2;
        const offset = cd8.radius * 3;
        const newX = cd8.position.x + Math.cos(angle) * offset;
        const newY = cd8.position.y + Math.sin(angle) * offset;
        if (newX > 0 && newX < this.bounds.width && newY > 0 && newY < this.bounds.height) {
          const child = new CD8TCell({ x: newX, y: newY }, this.random);
          child.activationLevel = cd8.activationLevel;
          this.cells.push(child);
        }
        cd8.readyToSpawn = false;
        cd8.expansionCount++;
      }
    }
  }

  private handleProliferation(): void {
    const maxTumorCount = this.simParams.tumorCount * 3; // Allow up to 3x growth
    const tumorCells = this.cells.filter(c => c.type === 'TUMOR_CELL' && c.alive) as TumorCell[];
    const currentTumorCount = tumorCells.length;

    if (currentTumorCount >= maxTumorCount) return;

    for (const tumor of tumorCells) {
      // Proliferation rate depends on oxygen and viability
      const env = this.field.getAt(tumor.position.x, tumor.position.y);
      const oxygenFactor = env.oxygen > 0.3 ? 1 : env.oxygen > 0.1 ? 0.3 : 0;
      const viabilityFactor = tumor.viability;
      const prob = 0.003 * oxygenFactor * viabilityFactor; // per cell per update

      if (this.random() < prob) {
        const angle = this.random() * Math.PI * 2;
        const offset = tumor.radius * 2.5;
        const newX = tumor.position.x + Math.cos(angle) * offset;
        const newY = tumor.position.y + Math.sin(angle) * offset;

        if (newX > 0 && newX < this.bounds.width && newY > 0 && newY < this.bounds.height) {
          const child = new TumorCell({ x: newX, y: newY }, this.random);
          // Child inherits parent antigen/checkpoint expression with slight mutation.
          child.her2Expression = clamp(tumor.her2Expression + (this.random() - 0.5) * 0.2, 0.1, 1);
          child.cd19Expression = clamp(tumor.cd19Expression + (this.random() - 0.5) * 0.2, 0, 0.5);
          child.egfrExpression = clamp(tumor.egfrExpression + (this.random() - 0.5) * 0.2, 0.1, 1);
          child.cd47Expression = clamp(tumor.cd47Expression + (this.random() - 0.5) * 0.2, 0.2, 1);
          child.cd24Expression = clamp(tumor.cd24Expression + (this.random() - 0.5) * 0.2, 0.1, 1);
          this.cells.push(child);
        }
      }
    }
  }

  private collectStats(): void {
    const carMs = this.cells.filter(c => c.type === 'CAR_MACROPHAGE' && c.alive) as CarMacrophage[];
    const wts = this.cells.filter(c => c.type === 'WILD_TYPE_MACROPHAGE' && c.alive) as WildTypeMacrophage[];
    const tumors = this.cells.filter(c => c.type === 'TUMOR_CELL' && c.alive);
    const cd8s = this.cells.filter(c => c.type === 'CD8_T_CELL' && c.alive) as CD8TCell[];
    const allMacrophages = [...carMs, ...wts];

    const totalPhago = carMs.reduce((sum, c) => sum + c.phagocytosisCount, 0) +
                       wts.reduce((sum, c) => sum + c.phagocytosisCount, 0);

    const m1Count = allMacrophages.filter(c => c.polarization === 'M1').length;
    const m2Count = allMacrophages.filter(c => c.polarization === 'M2').length;
    const totalM = allMacrophages.length || 1;

    const avgActivation = cd8s.length > 0
      ? cd8s.reduce((sum, c) => sum + c.activationLevel, 0) / cd8s.length
      : 0;

    const ecmCells = this.field.grid.flat();
    const avgECM = ecmCells.reduce((s, c) => s + c.ecmDensity, 0) / ecmCells.length;

    const avgExhaustion = cd8s.length > 0
      ? cd8s.reduce((s, c) => s + c.exhaustion, 0) / cd8s.length
      : 0;

    const totalKills = cd8s.reduce((s, c) => s + c.killCount, 0);

    this.statistics.time.push(this.simTime);
    this.statistics.tumorVolume.push(tumors.length);
    this.statistics.phagocytosisRate.push(totalPhago);
    this.statistics.m1Ratio.push(m1Count / totalM);
    this.statistics.m2Ratio.push(m2Count / totalM);
    this.statistics.cd8Infiltration.push(avgActivation);
    this.statistics.carMCount.push(carMs.length);
    this.statistics.tumorCount.push(tumors.length);
    this.statistics.ecmAverage?.push(avgECM);
    this.statistics.tCellExhaustion?.push(avgExhaustion);
    this.statistics.totalKills?.push(totalKills);

    // Keep only last 200 points
    const maxPoints = 200;
    if (this.statistics.time.length > maxPoints) {
      const stats = this.statistics as Required<SimStatistics>;
      for (const key of Object.keys(stats) as (keyof SimStatistics)[]) {
        stats[key] = stats[key].slice(-maxPoints) as number[];
      }
    }

    this.callbacks.onStatsUpdate({ ...this.statistics });
  }

  exportToCSV(): string {
    const headers = ['time', 'tumorCount', 'carMCount', 'm1Ratio', 'm2Ratio', 'cd8Infiltration', 'phagocytosisRate', 'ecmAverage', 'tCellExhaustion', 'totalKills'];
    const rows: string[] = [headers.join(',')];
    for (let i = 0; i < this.statistics.time.length; i++) {
      rows.push([
        this.statistics.time[i]?.toFixed(2),
        this.statistics.tumorCount[i],
        this.statistics.carMCount[i],
        (this.statistics.m1Ratio[i] * 100)?.toFixed(1),
        (this.statistics.m2Ratio[i] * 100)?.toFixed(1),
        this.statistics.cd8Infiltration[i]?.toFixed(3),
        this.statistics.phagocytosisRate[i],
        this.statistics.ecmAverage?.[i]?.toFixed(3) ?? '',
        this.statistics.tCellExhaustion?.[i]?.toFixed(3) ?? '',
        this.statistics.totalKills?.[i] ?? '',
      ].join(','));
    }
    return rows.join('\n');
  }

  getSnapshot(): object {
    return {
      simTime: this.simTime,
      stepCount: this.stepCount,
      carDesign: this.carDesign,
      simParams: this.simParams,
      cellCounts: {
        carM: this.cells.filter(c => c.type === 'CAR_MACROPHAGE' && c.alive).length,
        tumor: this.cells.filter(c => c.type === 'TUMOR_CELL' && c.alive).length,
        cd8: this.cells.filter(c => c.type === 'CD8_T_CELL' && c.alive).length,
        wildType: this.cells.filter(c => c.type === 'WILD_TYPE_MACROPHAGE' && c.alive).length,
      },
      statistics: this.statistics,
    };
  }

  render(ctx: CanvasRenderingContext2D, showField: boolean = false, showECM: boolean = false): void {
    // NOTE: engine.render() accepts a third parameter for ECM overlay and forwards it to the field renderer.
    // Clear
    ctx.clearRect(0, 0, this.bounds.width, this.bounds.height);

    // Background gradient
    const bg = ctx.createRadialGradient(
      this.bounds.width / 2, this.bounds.height / 2, 0,
      this.bounds.width / 2, this.bounds.height / 2, this.bounds.width * 0.7
    );
    bg.addColorStop(0, '#0d1525');
    bg.addColorStop(1, '#080c14');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.bounds.width, this.bounds.height);

    // Grid lines
    ctx.strokeStyle = 'rgba(0, 204, 255, 0.03)';
    ctx.lineWidth = 0.5;
    const gridSize = 40;
    for (let x = 0; x < this.bounds.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.bounds.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.bounds.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.bounds.width, y);
      ctx.stroke();
    }

    // Cytokine field overlay
    if (showField) {
      this.field.render(ctx, true, true, showECM);
    }

    // Render cells (dead cells last, living cells sorted by type for visual layering)
    const livingCells = this.cells.filter(c => c.alive);
    const sortedCells = [
      ...livingCells.filter(c => c.type === 'TUMOR_CELL'),
      ...livingCells.filter(c => c.type === 'WILD_TYPE_MACROPHAGE'),
      ...livingCells.filter(c => c.type === 'CAR_MACROPHAGE'),
      ...livingCells.filter(c => c.type === 'CD8_T_CELL'),
    ];

    for (const cell of sortedCells) {
      cell.render(ctx);
    }

    // Render kill events (expanding ring animation)
    const events = killEvents;
    for (let i = events.length - 1; i >= 0; i--) {
      const evt = events[i];
      evt.time -= 0.016; // ~60fps
      if (evt.time <= 0) {
        events.splice(i, 1);
        continue;
      }
      const progress = 1 - evt.time / 0.5;
      const radius = 5 + progress * 20;
      const opacity = (1 - progress) * 0.8;
      const color = evt.killer === 'CAR_M' ? '0, 255, 136' : '255, 204, 0';
      ctx.strokeStyle = `rgba(${color}, ${opacity})`;
      ctx.lineWidth = 2 * (1 - progress);
      ctx.beginPath();
      ctx.arc(evt.x, evt.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  destroy(): void {
    this.pause();
    clearKillEvents();
  }
}