# Task B: Simulation Engine Deep Optimization

You are working on the AI Virtual Macrophage (CAR-M) project at:
E:\projects\AI虚拟细胞\Kimi_Agent_AI巨噬细胞MVP\app

## Goal
Optimize the simulation engine for performance, add advanced features for presentation quality, and polish the scientific accuracy. This is the final round of simulation improvements before the Cambridge showcase.

## Files to Modify
1. `src/lib/simulation/engine.ts` — Spatial hashing, step mode, export, advanced stats
2. `src/lib/simulation/cell.ts` — Kill animation, improved behaviors
3. `src/lib/simulation/field.ts` — Better diffusion, oxygen gradient from center
4. `src/types/simulation.ts` — New fields if needed

**Do NOT modify** any files under `src/components/` or `src/sections/`.

---

## Task B.1: Spatial Hashing for Collision Detection

The current cell-to-cell interaction checks are O(n²). With 200+ cells, this gets slow. Add a spatial hash grid.

### In `engine.ts`, add a SpatialHash class:
```typescript
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
```

### Integrate into the engine loop:
- Create `private spatialHash = new SpatialHash(50)` in ABMEngine
- At the start of each loop iteration, call `spatialHash.clear()` and insert all living cells
- In cell `update()` methods, use `spatialHash.query()` instead of filtering all cells for neighbor detection
- This means changing the `update()` signature to accept a query function, or passing the spatialHash to cells

### Integration approach:
Add a `getNeighbors(x: number, y: number, radius: number): Cell[]` method to ABMEngine that delegates to the spatial hash. Pass this as a callback to cell updates:

```typescript
// In engine loop:
const getNeighbors = (x: number, y: number, r: number) => this.spatialHash.query(x, y, r);

for (const cell of this.cells) {
  if (cell.alive) {
    const env = this.field.getAt(cell.position.x, cell.position.y);
    cell.update(dt, env, this.cells, this.carDesign, this.bounds, this.field, getNeighbors);
  }
}
```

Then in cell.ts, cells can use `getNeighbors` for efficient lookups instead of scanning all cells.

---

## Task B.2: Step-Through Mode

Add a single-step mode for presentation — the simulation advances one discrete step per click.

### In `engine.ts`:
```typescript
// Add method:
step(): void {
  if (this.isRunning) this.pause();
  const dt = 0.1 * this.speed; // fixed timestep for stepping
  this.simTime += dt;
  this.field.update(this.cells, dt);
  for (const cell of this.cells) {
    if (cell.alive) {
      const env = this.field.getAt(cell.position.x, cell.position.y);
      cell.update(dt, env, this.cells, this.carDesign, this.bounds, this.field);
    }
  }
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
```

### In `ControlPanel.tsx` (UI side — but we can't modify UI, so just ensure the engine API exists):
The engine should expose `step()` as a public method. The UI agent will wire it up.

---

## Task B.3: Simulation Data Export

Add CSV export of simulation statistics for analysis.

### In `engine.ts`:
```typescript
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
      (this.statistics as any).ecmAverage?.[i]?.toFixed(3) ?? '',
      (this.statistics as any).tCellExhaustion?.[i]?.toFixed(3) ?? '',
      (this.statistics as any).totalKills?.[i] ?? '',
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
```

---

## Task B.4: Improved Tumor Proliferation

The current proliferation is too simplistic. Enhance it:

### In `engine.ts` `handleProliferation()`:
```typescript
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
    const prob = 0.003 * oxygenFactor * viabilityFactor; // per cell per frame

    if (Math.random() < prob) {
      const angle = Math.random() * Math.PI * 2;
      const offset = tumor.radius * 2.5;
      const newX = tumor.position.x + Math.cos(angle) * offset;
      const newY = tumor.position.y + Math.sin(angle) * offset;

      if (newX > 0 && newX < this.bounds.width && newY > 0 && newY < this.bounds.height) {
        const child = new TumorCell({ x: newX, y: newY });
        // Child inherits parent's HER2/CD47 with slight mutation
        child.her2Expression = clamp(tumor.her2Expression + (Math.random() - 0.5) * 0.2, 0.1, 1);
        child.cd47Expression = clamp(tumor.cd47Expression + (Math.random() - 0.5) * 0.2, 0.2, 1);
        this.cells.push(child);
      }
    }
  }
}
```

Add a `clamp` helper at the top of engine.ts if not already imported.

---

## Task B.5: Improved Oxygen Gradient

The oxygen field should have a realistic gradient — high at edges (near vasculature), low in center (hypoxic core).

### In `field.ts` constructor:
Replace the random initialization with a distance-based gradient:
```typescript
for (let r = 0; r < this.rows; r++) {
  for (let c = 0; c < this.cols; c++) {
    const x = (c + 0.5) * this.cellWidth;
    const y = (r + 0.5) * this.cellHeight;
    // Distance from center (0-1 normalized)
    const dx = (x - width / 2) / (width / 2);
    const dy = (y - height / 2) / (height / 2);
    const distFromCenter = Math.sqrt(dx * dx + dy * dy); // 0 at center, ~1 at corners
    
    // Oxygen: high at edges (vasculature), low in center (hypoxic core)
    const oxygen = clamp(baseOxygen * (0.3 + 0.7 * distFromCenter) + (Math.random() - 0.5) * 0.1, 0, 1);
    // Lactate: high in center (tumor produces it), low at edges
    const lactate = clamp(baseLactate * (1.5 - distFromCenter) + (Math.random() - 0.5) * 0.1, 0, 1);
    // TGF-beta: high in tumor core
    const tgfBeta = clamp(baseTgfBeta * (1.3 - distFromCenter * 0.5) + (Math.random() - 0.5) * 0.1, 0, 1);
    
    // ... rest of cytokines with similar gradient logic
  }
}
```

This creates a biologically realistic "hypoxic tumor core with well-vascularized periphery" pattern.

---

## Task B.6: Kill Event Visualization

When a CD8+ T cell or CAR-M kills a tumor cell, show a brief visual effect.

### In `cell.ts`, add a static kill event tracker:
```typescript
// At module level:
export interface KillEvent {
  x: number;
  y: number;
  time: number;
  killer: 'CAR_M' | 'CD8';
}
export const killEvents: KillEvent[] = [];
```

When a kill happens (in CarMacrophage or CD8TCell), push to killEvents:
```typescript
killEvents.push({ x: this.position.x, y: this.position.y, time: 0.5, killer: 'CAR_M' });
```

### In `engine.ts` render method:
```typescript
// Render kill events (expanding ring animation)
for (let i = killEvents.length - 1; i >= 0; i--) {
  const evt = killEvents[i];
  evt.time -= 0.016; // ~60fps
  if (evt.time <= 0) {
    killEvents.splice(i, 1);
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
```

---

## Task B.7: CD8+ T Cell Exhaustion Visualization

In the CD8TCell render method, make exhausted T cells visually distinct:
```typescript
render(ctx: CanvasRenderingContext2D): void {
  if (!this.alive) return;
  
  const config = CELL_CONFIG.CD8_T_CELL;
  // Exhaustion dims the color
  const exhaustionDim = 1 - this.exhaustion * 0.6;
  
  // Glow (dimmer when exhausted)
  const gradient = ctx.createRadialGradient(...);
  gradient.addColorStop(0, `rgba(255, 204, 0, ${0.4 * exhaustionDim})`);
  gradient.addColorStop(1, 'rgba(255, 204, 0, 0)');
  
  // Body (darker when exhausted)
  const r = Math.round(255 * exhaustionDim);
  const g = Math.round(204 * exhaustionDim);
  const b = Math.round(0 * exhaustionDim);
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  
  // Exhaustion ring (red glow when highly exhausted)
  if (this.exhaustion > 0.5) {
    ctx.strokeStyle = `rgba(255, 50, 50, ${this.exhaustion * 0.5})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius + 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  // Kill count indicator (small number)
  if (this.killCount > 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(this.killCount), this.position.x, this.position.y - this.radius - 4);
  }
}
```

---

## Task B.8: Phagocytosis Animation Enhancement

Make phagocytosis visually dramatic — the macrophage engulfs the tumor cell.

### In CarMacrophage render:
When `isPhagocytosing`:
- Show the macrophage growing slightly (radius * 1.3)
- Show the target tumor cell shrinking
- Draw a "cup" shape around the tumor cell
- Show a progress ring

```typescript
if (this.isPhagocytosing && this.targetTumor?.alive) {
  // Engulfment animation
  const progress = 1 - (this.phagocytosisTimer / 4); // 0 to 1
  
  // Macro grows
  const growFactor = 1 + progress * 0.3;
  // ... render with growFactor
  
  // Target shrinks and fades
  ctx.globalAlpha = 1 - progress * 0.8;
  // ... render target smaller
  ctx.globalAlpha = 1;
  
  // Engulfment cup (partial circle around target)
  const cupAngle = progress * Math.PI * 2;
  ctx.strokeStyle = CELL_CONFIG.CAR_MACROPHAGE.color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(this.targetTumor.position.x, this.targetTumor.position.y, 
          this.targetTumor.radius + 3, -cupAngle / 2, cupAngle / 2);
  ctx.stroke();
}
```

---

## Commit
After all changes:
```
cd "E:\projects\AI虚拟细胞\Kimi_Agent_AI巨噬细胞MVP\app"
git add src/lib/simulation/ src/types/
git commit -m "feat: spatial hash, step mode, CSV export, kill animations, oxygen gradient, improved proliferation"
```
