import { CarMacrophage, WildTypeMacrophage, TumorCell, CD8TCell, killEvents, clearKillEvents, probPerUpdate } from './cell';
import { CytokineField } from './field';
import type { Cell, GNNMacrophagePrediction } from './cell';
import { GATModel } from './gatInference';
import { getDefaultGATModel } from './gnnWeights';
import type { CarDesign, SimParams, SimStatistics, CellGraph } from '@/types/simulation';

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
  // === 可选 GNN 推理状态（默认关闭，不影响现有行为） ===
  private gatModel: GATModel | null = null;
  private lastGNNStep: number = 0;
  private gnnInterval: number = 5; // 每 5 步调用一次 GNN
  private cachedPredictions: Map<string, GNNMacrophagePrediction> = new Map();
  private gnnEnabled: boolean = false;

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
    this.lastGNNStep = 0;
    this.cachedPredictions.clear();
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

  /**
   * 启用可选 GNN 推理模式。
   * @param model 可选：显式传入的 GAT 模型；缺省使用确定性默认权重（seed 固定）。
   */
  initGNN(model?: GATModel): void {
    this.gatModel = model ?? getDefaultGATModel();
    this.gnnEnabled = true;
    this.lastGNNStep = 0;
    this.cachedPredictions.clear();
  }

  public step(): void {
    if (this.isRunning) this.pause();
    const dt = 0.1 * this.speed; // fixed timestep for stepping
    this.simTime += dt;

    // Execution order is identical to loop(): field → spatial hash → GNN →
    // cells → expansion/proliferation → removal → stats. Keeping the two
    // paths aligned preserves the same-seed reproducibility contract no
    // matter which path advanced the simulation.
    this.field.update(this.cells, dt);

    this.spatialHash.clear();
    for (const cell of this.cells) {
      if (cell.alive) this.spatialHash.insert(cell);
    }
    const getNeighbors = (x: number, y: number, r: number) => this.spatialHash.query(x, y, r);

    // 可选 GNN 推理（每 gnnInterval 步执行一次），随后将 per-cell 预测传入 cell.update
    this.runGNNInference();

    for (const cell of this.cells) {
      if (cell.alive) {
        const env = this.field.getAt(cell.position.x, cell.position.y);
        const gnnPred = this.cachedPredictions.get(cell.id);
        cell.update(dt, env, this.cells, this.carDesign, this.bounds, this.field, getNeighbors, gnnPred);
      }
    }

    this.handleCD8Expansion();
    this.handleProliferation(dt);
    this.cells = this.cells.filter(c => c.alive);
    this.advanceKillEvents(dt);
    this.statsTimer += dt;
    if (this.statsTimer >= 0.5) {
      this.statsTimer = 0;
      this.collectStats(); // collectStats() is the single onStatsUpdate emitter
    }
    this.stepCount++;
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

    // Optional GNN inference (every gnnInterval steps), then pass per-cell predictions
    this.runGNNInference();

    // Update cells
    for (const cell of this.cells) {
      if (cell.alive) {
        const env = this.field.getAt(cell.position.x, cell.position.y);
        const gnnPred = this.cachedPredictions.get(cell.id);
        cell.update(dt, env, this.cells, this.carDesign, this.bounds, this.field, getNeighbors, gnnPred);
      }
    }

    // Handle CD8+ T cell clonal expansion
    this.handleCD8Expansion();

    // Tumor proliferation
    this.handleProliferation(dt);

    // Remove dead cells
    this.cells = this.cells.filter(c => c.alive);

    // Advance kill-event animations on the simulation clock (not per render
    // frame) so they do not decay while the simulation is paused.
    this.advanceKillEvents(dt);

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
    // Mutable counter: incremented per spawn so the 3x cap cannot be exceeded
    // within a single step when several cells are ready to spawn at once.
    let currentCD8Count = cd8Cells.length;
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
          currentCD8Count++;
        }
        cd8.readyToSpawn = false;
        cd8.expansionCount++;
      }
    }
  }

  /**
   * Advance kill-event ring animations on the simulation clock. Previously
   * this happened in render() per frame, which let animations decay while
   * the simulation was paused (the display loop always renders).
   */
  private advanceKillEvents(dt: number): void {
    for (let i = killEvents.length - 1; i >= 0; i--) {
      killEvents[i].time -= dt;
      if (killEvents[i].time <= 0) killEvents.splice(i, 1);
    }
  }

  private handleProliferation(dt: number): void {
    const maxTumorCount = this.simParams.tumorCount * 3; // Allow up to 3x growth
    const tumorCells = this.cells.filter(c => c.type === 'TUMOR_CELL' && c.alive) as TumorCell[];
    const currentTumorCount = tumorCells.length;

    if (currentTumorCount >= maxTumorCount) return;

    for (const tumor of tumorCells) {
      // Proliferation rate depends on oxygen and viability.
      // The per-update probability is rescaled by dt so the growth rate is
      // frame-rate- and speed-independent.
      const env = this.field.getAt(tumor.position.x, tumor.position.y);
      const oxygenFactor = env.oxygen > 0.3 ? 1 : env.oxygen > 0.1 ? 0.3 : 0;
      const viabilityFactor = tumor.viability;
      const prob = probPerUpdate(0.003 * oxygenFactor * viabilityFactor, dt); // per cell per update

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

  /**
   * 遍历所有活细胞，构建 24 维节点特征矩阵与空间邻近边。
   * 节点特征：one-hot 类型(4) + position(2) + 极化/能量(3) + 抗原(3) + 检查点(2) + 场环境(10)。
   * 边：每个巨噬细胞 (CAR-M=100, WT=150) 用 SpatialHash 查询邻居，并附加自环
   * （self-loop，标准 GAT 做法），保证感知范围内无邻居的孤立巨噬细胞仍能聚合自身特征，
   * 否则其输出会退化为全零。边特征 = 1/距离（自环为 1）；注意当前 GATModel.forward
   * 并不消费 edgeFeatures，保留该数组仅供可视化/未来扩展，避免误导读者。
   */
  private buildCellGraph(): CellGraph {
    const aliveCells = this.cells.filter(c => c.alive);
    const numNodes = aliveCells.length;
    const featureDim = 24;
    const nodeFeatures = new Float32Array(numNodes * featureDim);

    const nodeIndex = new Map<string, number>();
    for (let i = 0; i < numNodes; i++) nodeIndex.set(aliveCells[i].id, i);

    for (let i = 0; i < numNodes; i++) {
      const cell = aliveCells[i];
      const base = i * featureDim;
      const isMacro = cell.type === 'CAR_MACROPHAGE' || cell.type === 'WILD_TYPE_MACROPHAGE';
      const isTumor = cell.type === 'TUMOR_CELL';

      // one-hot 类型 (4)
      nodeFeatures[base + 0] = cell.type === 'CAR_MACROPHAGE' ? 1 : 0;
      nodeFeatures[base + 1] = cell.type === 'WILD_TYPE_MACROPHAGE' ? 1 : 0;
      nodeFeatures[base + 2] = cell.type === 'TUMOR_CELL' ? 1 : 0;
      nodeFeatures[base + 3] = cell.type === 'CD8_T_CELL' ? 1 : 0;
      // position (2) 归一化到 [0,1]
      nodeFeatures[base + 4] = this.bounds.width > 0 ? cell.position.x / this.bounds.width : 0;
      nodeFeatures[base + 5] = this.bounds.height > 0 ? cell.position.y / this.bounds.height : 0;
      // 巨噬细胞极化/能量 (3)
      nodeFeatures[base + 6] = isMacro ? (cell as CarMacrophage).m1Score : 0;
      nodeFeatures[base + 7] = isMacro ? (cell as CarMacrophage).m2Score : 0;
      nodeFeatures[base + 8] = isMacro ? (cell as CarMacrophage).energy : 0;
      // 肿瘤抗原表达 (3)
      nodeFeatures[base + 9] = isTumor ? (cell as TumorCell).her2Expression : 0;
      nodeFeatures[base + 10] = isTumor ? (cell as TumorCell).cd19Expression : 0;
      nodeFeatures[base + 11] = isTumor ? (cell as TumorCell).egfrExpression : 0;
      // 免疫检查点表达 (2)
      nodeFeatures[base + 12] = isTumor ? (cell as TumorCell).cd47Expression : 0;
      nodeFeatures[base + 13] = isTumor ? (cell as TumorCell).cd24Expression : 0;
      // 局部场环境 (10)
      const env = this.field.getAt(cell.position.x, cell.position.y);
      nodeFeatures[base + 14] = env.oxygen;
      nodeFeatures[base + 15] = env.lactate;
      nodeFeatures[base + 16] = env.tgfBeta;
      nodeFeatures[base + 17] = env.ifnGamma;
      nodeFeatures[base + 18] = env.il4;
      nodeFeatures[base + 19] = env.il10;
      nodeFeatures[base + 20] = env.vegf;
      nodeFeatures[base + 21] = env.cxcl9;
      nodeFeatures[base + 22] = env.spp1;
      nodeFeatures[base + 23] = env.ecmDensity;
    }

    // 边构建：每个巨噬细胞用 SpatialHash 查询邻居
    const rowArr: number[] = [];
    const colArr: number[] = [];
    const edgeFeatArr: number[] = [];
    for (let i = 0; i < numNodes; i++) {
      const cell = aliveCells[i];
      if (cell.type !== 'CAR_MACROPHAGE' && cell.type !== 'WILD_TYPE_MACROPHAGE') continue;
      // Self-loop: isolated macrophages still aggregate their own features.
      rowArr.push(i);
      colArr.push(i);
      edgeFeatArr.push(1);
      const perceptionRadius = cell.type === 'CAR_MACROPHAGE' ? 100 : 150;
      const neighbors = this.spatialHash.query(cell.position.x, cell.position.y, perceptionRadius);
      for (const nb of neighbors) {
        if (nb === cell || !nb.alive) continue;
        const j = nodeIndex.get(nb.id);
        if (j === undefined) continue;
        const dx = cell.position.x - nb.position.x;
        const dy = cell.position.y - nb.position.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d <= 0 || d > perceptionRadius) continue;
        rowArr.push(i);
        colArr.push(j);
        edgeFeatArr.push(1 / d);
      }
    }

    const numEdges = rowArr.length;
    return {
      nodeFeatures,
      edgeIndex: { row: new Int32Array(rowArr), col: new Int32Array(colArr) },
      edgeFeatures: new Float32Array(edgeFeatArr),
      numNodes,
      numEdges,
      featureDim,
    };
  }

  /**
   * 每 gnnInterval 步运行一次 GNN 推理，缓存 per-node 巨噬细胞预测。
   * 仅当 initGNN() 已启用时生效；否则与原有行为完全一致。
   */
  private runGNNInference(): void {
    if (!this.gatModel || !this.gnnEnabled) return;
    if (this.stepCount - this.lastGNNStep < this.gnnInterval) return;

    const graph = this.buildCellGraph();
    const predictions = this.gatModel.forward(graph);
    const outputDim = 3;

    // 将 per-node 预测缓存到 map（节点索引 → 细胞 ID）。
    // 整体替换 Map 以同时清除已死亡细胞的陈旧条目，防止内存随运行时长增长。
    const aliveCells = this.cells.filter(c => c.alive);
    const next = new Map<string, GNNMacrophagePrediction>();
    for (let i = 0; i < graph.numNodes; i++) {
      next.set(aliveCells[i].id, {
        m1: predictions.predictions[i * outputDim + 0],
        m2: predictions.predictions[i * outputDim + 1],
        phago: predictions.predictions[i * outputDim + 2],
      });
    }
    this.cachedPredictions = next;
    this.lastGNNStep = this.stepCount;
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

    // NOTE: phagocytosisRate is a *cumulative count* of phagocytosis events
    // credited to currently-living macrophages, not a per-time rate. It is
    // monotonic only because macrophages currently never die; if macrophage
    // death is ever added, this series can decrease and must be reworked.
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
      // NOTE: `(arr[i] * 100)?.toFixed(1)` would NOT guard undefined — the
      // multiplication yields NaN (not nullish), printing "NaN". Guard first.
      const m1 = this.statistics.m1Ratio[i];
      const m2 = this.statistics.m2Ratio[i];
      rows.push([
        this.statistics.time[i]?.toFixed(2),
        this.statistics.tumorCount[i],
        this.statistics.carMCount[i],
        m1 === undefined ? '' : (m1 * 100).toFixed(1),
        m2 === undefined ? '' : (m2 * 100).toFixed(1),
        this.statistics.cd8Infiltration[i]?.toFixed(3),
        this.statistics.phagocytosisRate[i],
        this.statistics.ecmAverage?.[i]?.toFixed(3) ?? '',
        this.statistics.tCellExhaustion?.[i]?.toFixed(3) ?? '',
        this.statistics.totalKills?.[i] ?? '',
      ].join(','));
    }

    if (this.gnnEnabled) {
      rows.push('');
      rows.push(`# GNN enabled: interval=${this.gnnInterval}, lastStep=${this.lastGNNStep}, cachedNodes=${this.cachedPredictions.size}`);
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
      gnn: this.gnnEnabled
        ? {
            enabled: true,
            interval: this.gnnInterval,
            lastStep: this.lastGNNStep,
            cachedPredictions: this.cachedPredictions.size,
          }
        : { enabled: false },
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

    // Render kill events (expanding ring animation). Event timers advance in
    // advanceKillEvents() on the sim clock; render() only draws current state.
    for (const evt of killEvents) {
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