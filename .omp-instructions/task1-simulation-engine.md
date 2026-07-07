# Task 1: Simulation Engine Deep Enhancement

You are working on the AI Virtual Macrophage (CAR-M) project at:
E:\projects\AI虚拟细胞\Kimi_Agent_AI巨噬细胞MVP\app

## Goal
Deepen the scientific accuracy of the ABM simulation engine. The current MVP has basic cell types and movement, but lacks ECM density field, CD8+ T cell exhaustion/clone expansion, CAR signaling domain differentiation, tumor heterogeneity, and T cell recruitment mechanisms. This task adds all of these to make the simulation scientifically credible for a Cambridge visiting scholarship presentation.

## Files to Modify

1. `src/types/simulation.ts` — Add new types and fields
2. `src/lib/simulation/cell.ts` — Enhance cell behaviors
3. `src/lib/simulation/field.ts` — Add ECM density field
4. `src/lib/simulation/engine.ts` — Update engine loop

**Do NOT modify** any files under `src/components/` or `src/sections/` — those are handled by another agent.

---

## Task 1.1: Add ECM Density Field

### In `src/types/simulation.ts`:
Add `ecmDensity: number` (0-1) to the `FieldCell` interface.

### In `src/lib/simulation/field.ts`:
- Initialize ECM density: center of the field has high density (0.6-0.9), edges have low density (0.1-0.3). This simulates a dense tumor stroma core.
- ECM decays very slowly: `ecmDensity *= (1 - 0.001 * dt)` (ECM is nearly static)
- Add ECM to the `diffuse()` method with a very low diffusion coefficient (D_ecm = 50, much lower than cytokines)
- In `getAt()`, include ecmDensity in the returned FieldCell
- In `render()`, add optional ECM overlay: render high ECM areas as `rgba(139, 90, 43, intensity * 0.2)` (brownish, representing collagen/ECM)

### In cell movement:
- All cells (macrophages, T cells, tumor cells) should have their speed reduced by ECM: `speed *= (1 - 0.7 * localECM)`. Dense ECM slows movement significantly.
- This makes the "cold tumor" scenario actually feel cold — cells can't penetrate dense stroma.

---

## Task 1.2: CD147 Signal Domain — ECM Degradation

### In `src/lib/simulation/cell.ts` (CarMacrophage class):
When `carDesign.signalingDomain === 'CD147'`:
- CAR-M cells secrete MMPs that degrade ECM in their local area
- In the `update()` method, after movement, reduce local ECM density:
  ```
  if (carDesign.signalingDomain === 'CD147') {
    const fieldCell = field.getAt(this.position.x, this.position.y);
    fieldCell.ecmDensity = Math.max(0, fieldCell.ecmDensity - 0.01 * dt);
  }
  ```
- This creates visible tunnels/channels through the ECM as CAR-M cells move
- CD147 CAR-M cells should NOT phagocytose (different from CD3ζ). Instead, their role is ECM clearance. Set phagocytosis probability to 0 for CD147.

### In `src/lib/simulation/cell.ts` (CarMacrophage `canPhagocytose` method):
Add signaling domain logic:
- `CD3ζ` and `FcRγ`: Standard phagocytosis (current behavior)
- `CD147`: No phagocytosis (ecmDegradation specialist)
- `MerTK`: Efferocytosis-like — only phagocytose cells with low viability (<0.4), but 2x higher probability for those targets. MerTK specializes in clearing dying/dead cells.

---

## Task 1.3: CAR Signaling Domain Differentiation

### In `src/lib/simulation/cell.ts` (CarMacrophage class):
Modify the `update()` method to differentiate behavior by signaling domain:

```typescript
// At the start of update(), determine domain-specific behavior
const domain = carDesign.signalingDomain;

// Phagocytosis duration varies by domain
// CD3ζ/FcRγ: fast (2-3s) — FcγR-like
// MerTK: medium (4-6s) — efferocytosis is slower
// CD147: no phagocytosis
```

Modify `startPhagocytosis()` to accept domain-specific timing:
```typescript
private startPhagocytosis(tumor: TumorCell, domain: SignalingDomain): void {
  this.isPhagocytosing = true;
  this.targetTumor = tumor;
  this.energy = clamp(this.energy - 30, 0, 100);
  // Duration depends on signaling domain
  switch (domain) {
    case 'CD3ζ':
    case 'FcRγ':
      this.phagocytosisTimer = 2 + Math.random() * 2; // Fast: FcγR-like
      break;
    case 'MerTK':
      this.phagocytosisTimer = 4 + Math.random() * 2; // Slower: efferocytosis
      break;
    case 'CD147':
      this.phagocytosisTimer = 999; // Never completes — CD147 doesn't phagocytose
      break;
  }
}
```

### Differentiate M1/M2 bonus by domain:
- `CD3ζ`: M1 bonus = 1.5x (strongest inflammatory response)
- `FcRγ`: M1 bonus = 1.3x
- `MerTK`: No M1 bonus (works regardless of polarization — it's a scavenger receptor)
- `CD147`: No phagocytosis at all

---

## Task 1.4: CD8+ T Cell Exhaustion Model

### In `src/types/simulation.ts`:
Add to CD8TCell or as general properties tracked:
- No type changes needed, but track in the cell class

### In `src/lib/simulation/cell.ts` (CD8TCell class):
Add exhaustion mechanics:
```typescript
export class CD8TCell extends Cell {
  activationLevel: number;
  exhaustion: number; // 0-1, 1 = fully exhausted
  killCount: number;  // track kills for clone expansion

  constructor(position: Vector2D) {
    super(position, 'CD8_T_CELL');
    this.radius = CELL_CONFIG.CD8_T_CELL.radius;
    this.activationLevel = 0;
    this.exhaustion = 0;
    this.killCount = 0;
  }
```

Update logic:
- TGF-β and IL-10 in the environment increase exhaustion: `exhaustion += (env.tgfBeta * 0.05 + env.il10 * 0.03) * dt`
- Exhaustion decays slowly when IFN-γ is high: `exhaustion -= env.ifnGamma * 0.02 * dt`
- Exhaustion reduces killing probability: `killProb *= (1 - exhaustion * 0.8)`
- Exhaustion reduces speed: `speed *= (1 - exhaustion * 0.5)`
- When exhaustion > 0.8, the T cell becomes "anergic" — stops moving toward tumors, just wanders

### T Cell Killing:
- When highly activated (>0.5) AND not exhausted, kill tumor cells on contact
- Kill probability: `0.08 * activationLevel * (1 - exhaustion * 0.8)` per dt
- After killing, add a brief "kill animation" state (2 seconds of slowed movement + pulsing glow)
- Track killCount

### Clone Expansion:
- When a T cell kills 3+ tumor cells, it enters "clonal expansion" mode
- After a delay (5 simulated seconds), spawn a new CD8TCell nearby with similar activation level
- This is limited: max 2 expansions per T cell, and total CD8 count capped at 3x initial count
- This models the adaptive immune response that CT-0508 showed

---

## Task 1.5: T Cell Recruitment by CXCL9

### In `src/lib/simulation/cell.ts` (CD8TCell class):
In the `update()` method, add CXCL9-driven chemotaxis:
```typescript
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
if (cxcl9Mag > 0.01) {
  const normalized = vecScale(gradCxcl9, 1 / cxcl9Mag);
  this.velocity = vecAdd(this.velocity, vecScale(normalized, 0.15 * this.activationLevel));
}
```

This creates the "CAR-M secretes IFN-γ → M1 polarization → CXCL9 production → T cell recruitment" cascade.

---

## Task 1.6: Tumor Heterogeneity

### In `src/lib/simulation/cell.ts` (TumorCell constructor):
Make HER2 and CD47 expression more varied:
```typescript
constructor(position: Vector2D) {
  super(position, 'TUMOR_CELL');
  this.radius = CELL_CONFIG.TUMOR_CELL.radius;
  // Heterogeneous expression — some tumor cells have high HER2, some low
  // This is biologically realistic: tumors are heterogeneous
  this.cd47Expression = 0.4 + Math.random() * 0.6; // Range: 0.4-1.0 (wider spread)
  this.her2Expression = 0.2 + Math.random() * 0.8;  // Range: 0.2-1.0 (wider spread)
  this.viability = 1.0;
  this.proliferationTimer = 10 + Math.random() * 20;
}
```

### Visual indicator:
In TumorCell `render()`, make cell color intensity correlate with HER2 expression:
```typescript
// Color intensity based on HER2 expression
const her2Intensity = 0.5 + this.her2Expression * 0.5;
ctx.fillStyle = `rgba(204, 102, 255, ${her2Intensity})`;
```

And CD47 indicator dots should be more visible for high CD47:
```typescript
// CD47 indicator — size/opacity proportional to expression
const cd47Size = 1 + this.cd47Expression * 1.5;
const cd47Opacity = 0.3 + this.cd47Expression * 0.5;
ctx.fillStyle = `rgba(255, 100, 100, ${cd47Opacity})`;
```

---

## Task 1.7: Engine Statistics Update

### In `src/lib/simulation/engine.ts`:
Add new statistics to track:
```typescript
// In collectStats():
// Track ECM average density
const ecmCells = this.field.grid.flat();
const avgECM = ecmCells.reduce((s, c) => s + c.ecmDensity, 0) / ecmCells.length;

// Track T cell exhaustion average
const cd8Cells = this.cells.filter(c => c.type === 'CD8_T_CELL' && c.alive) as CD8TCell[];
const avgExhaustion = cd8Cells.length > 0
  ? cd8Cells.reduce((s, c) => s + c.exhaustion, 0) / cd8Cells.length
  : 0;

// Track total kills
const totalKills = cd8Cells.reduce((s, c) => s + c.killCount, 0);

// Add to statistics object (update the type in simulation.ts too)
```

### In `src/types/simulation.ts`:
Add to SimStatistics:
```typescript
ecmAverage?: number[];
tCellExhaustion?: number[];
totalKills?: number[];
```

---

## Important Scientific Context
- CT-0508 clinical trial (Nature Medicine 2025) showed: CD8+ T cell infiltration increased after CAR-M treatment, macrophages shifted to M1, and antigen presentation genes were upregulated
- The simulation should demonstrate this "phagocytosis → antigen presentation → T cell activation → tumor killing" cascade
- CD147 signal domain upregulates MMPs for ECM degradation — this is a distinct function from CD3ζ/FcRγ (which trigger phagocytosis)
- MerTK specializes in efferocytosis (clearing apoptotic cells)
- Tumor heterogeneity in HER2 expression is why CT-0508 worked for HER2 IHC 3+ but not 2+

## Commit
After all changes, run:
```
cd "E:\projects\AI虚拟细胞\Kimi_Agent_AI巨噬细胞MVP\app"
git add src/types/simulation.ts src/lib/simulation/cell.ts src/lib/simulation/engine.ts src/lib/simulation/field.ts
git commit -m "feat: deep simulation — ECM field, CD8 exhaustion/clone, CAR domain diff, tumor heterogeneity"
```
