import type { FieldCell, SimParams } from '@/types/simulation';
import type { Cell } from './cell';
import type { RandomSource } from './engine';

export class CytokineField {
  grid: FieldCell[][];
  rows: number;
  cols: number;
  cellWidth: number;
  cellHeight: number;
  width: number;
  height: number;

  constructor(width: number, height: number, gridSize: number = 40, params?: SimParams, random: RandomSource = Math.random) {
    this.width = width;
    this.height = height;
    this.cols = Math.ceil(width / gridSize);
    this.rows = Math.ceil(height / gridSize);
    this.cellWidth = width / this.cols;
    this.cellHeight = height / this.rows;

    const baseOxygen = params?.oxygenLevel ?? 0.5;
    const baseLactate = params?.lactateLevel ?? 0.1;
    const baseTgfBeta = params?.tgfBetaLevel ?? 0.2;

    this.grid = [];
    for (let r = 0; r < this.rows; r++) {
      const row: FieldCell[] = [];
      for (let c = 0; c < this.cols; c++) {
        const x = (c + 0.5) * this.cellWidth;
        const y = (r + 0.5) * this.cellHeight;
        // Distance from center (0-1 normalized)
        const dx = (x - width / 2) / (width / 2);
        const dy = (y - height / 2) / (height / 2);
        const distFromCenter = Math.sqrt(dx * dx + dy * dy); // 0 at center, ~1 at corners

        // Oxygen: high at edges (vasculature), low in center (hypoxic core)
        const oxygen = this.clamp01(baseOxygen * (0.3 + 0.7 * distFromCenter) + (random() - 0.5) * 0.1);
        // Lactate: high in center (tumor produces it), low at edges
        const lactate = this.clamp01(baseLactate * (1.5 - distFromCenter) + (random() - 0.5) * 0.1);
        // TGF-beta: high in tumor core
        const tgfBeta = this.clamp01(baseTgfBeta * (1.3 - distFromCenter * 0.5) + (random() - 0.5) * 0.1);

        // ECM density increases toward center (dense tumor stroma)
        const baseEcm = 0.3 + (1 - distFromCenter) * 0.6;
        const ecmDensity = this.clamp01(baseEcm + (random() - 0.5) * 0.2);

        row.push({
          oxygen,
          lactate,
          tgfBeta,
          ifnGamma: 0.05 + random() * 0.1,
          il4: 0.05 + random() * 0.1,
          il10: 0.1 + random() * 0.2,
          vegf: 0.1 + random() * 0.2,
          cxcl9: 0.05 + random() * 0.1,
          spp1: 0.05 + random() * 0.1,
          ecmDensity,
        });
      }
      this.grid.push(row);
    }
  }

  // Get field values at a position
  getAt(x: number, y: number): FieldCell {
    const c = Math.floor(x / this.cellWidth);
    const r = Math.floor(y / this.cellHeight);
    const clampedC = Math.max(0, Math.min(this.cols - 1, c));
    const clampedR = Math.max(0, Math.min(this.rows - 1, r));
    return this.grid[clampedR][clampedC];
  }

  // Update cytokine field based on cell activities
  update(cells: Cell[], dt: number): void {
    // Decay all cytokines
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        cell.oxygen = this.clamp01(cell.oxygen + (0.5 - cell.oxygen) * 0.01 * dt);
        cell.lactate *= (1 - 0.02 * dt);
        cell.tgfBeta *= (1 - 0.03 * dt);
        cell.ifnGamma *= (1 - 0.04 * dt);
        cell.il4 *= (1 - 0.03 * dt);
        cell.il10 *= (1 - 0.03 * dt);
        cell.vegf *= (1 - 0.02 * dt);
        cell.cxcl9 *= (1 - 0.03 * dt);
        cell.spp1 *= (1 - 0.03 * dt);
        // ECM is nearly static — very slow decay
        cell.ecmDensity *= (1 - 0.001 * dt);
      }
    }

    // Cell contributions
    for (const cell of cells) {
      if (!cell.alive) continue;
      const c = Math.floor(cell.position.x / this.cellWidth);
      const r = Math.floor(cell.position.y / this.cellHeight);
      if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) continue;

      const field = this.grid[r][c];

      switch (cell.type) {
        case 'TUMOR_CELL': {
          // Tumor cells consume oxygen, produce lactate and TGF-β
          const hypoxic = field.oxygen < 0.3;
          const lactateProduction = hypoxic ? 0.008 * 3 : 0.008;
          const tgfBetaProduction = hypoxic ? 0.003 * 3 : 0.003;
          field.oxygen = this.clamp01(field.oxygen - 0.005 * dt);
          field.lactate = this.clamp01(field.lactate + lactateProduction * dt);
          field.tgfBeta = this.clamp01(field.tgfBeta + tgfBetaProduction * dt);
          field.vegf = this.clamp01(field.vegf + 0.002 * dt);
          break;
        }
        case 'CAR_MACROPHAGE': {
          const carM = cell as import('./cell').CarMacrophage;
          // CAR-M secretes IFN-γ when M1 polarized
          if (carM.polarization === 'M1' || carM.polarization === 'MIXED') {
            field.ifnGamma = this.clamp01(field.ifnGamma + 0.01 * dt);
            field.cxcl9 = this.clamp01(field.cxcl9 + 0.01 * dt);
          }
          if (carM.polarization === 'M2') {
            field.il10 = this.clamp01(field.il10 + 0.005 * dt);
            field.spp1 = this.clamp01(field.spp1 + 0.005 * dt);
          }
          break;
        }
        case 'WILD_TYPE_MACROPHAGE': {
          const wt = cell as import('./cell').WildTypeMacrophage;
          if (wt.polarization === 'M1') {
            field.ifnGamma = this.clamp01(field.ifnGamma + 0.005 * dt);
            field.cxcl9 = this.clamp01(field.cxcl9 + 0.01 * dt);
          } else if (wt.polarization === 'M2') {
            field.il10 = this.clamp01(field.il10 + 0.008 * dt);
            field.il4 = this.clamp01(field.il4 + 0.003 * dt);
            field.spp1 = this.clamp01(field.spp1 + 0.008 * dt);
          }
          break;
        }
        case 'CD8_T_CELL': {
          // CD8+ T cells produce IFN-γ when activated
          const cd8 = cell as import('./cell').CD8TCell;
          if (cd8.activationLevel > 0.3) {
            field.ifnGamma = this.clamp01(field.ifnGamma + 0.008 * cd8.activationLevel * dt);
          }
          break;
        }
      }
    }

    // Diffusion (simplified - spread to neighbors)
    this.diffuse(dt);
  }

  private diffuse(dt: number): void {
    // Grid-invariant diffusion coefficient (scaled by h²)
    const D = 1000;
    const D_ecm = 50;
    const h2 = this.cellWidth * this.cellWidth;
    const factor = D * dt / h2;
    const factorEcm = D_ecm * dt / h2;
    const newGrid: FieldCell[][] = this.grid.map(row =>
      row.map(cell => ({ ...cell }))
    );
    const keys: (keyof FieldCell)[] = [
      'oxygen', 'lactate', 'tgfBeta', 'ifnGamma', 'il4', 'il10', 'vegf', 'cxcl9', 'spp1', 'ecmDensity',
    ];

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const old = this.grid[r][c];
        for (const key of keys) {
          const sum =
            this.grid[Math.max(0, r - 1)][c][key] +
            this.grid[Math.min(this.rows - 1, r + 1)][c][key] +
            this.grid[r][Math.max(0, c - 1)][key] +
            this.grid[r][Math.min(this.cols - 1, c + 1)][key];
          const f = key === 'ecmDensity' ? factorEcm : factor;
          const diff = f * (sum - 4 * old[key]);
          newGrid[r][c][key] = this.clamp01(old[key] + diff);
        }
      }
    }

    this.grid = newGrid;
  }

  // Render the field as a heatmap overlay
  render(ctx: CanvasRenderingContext2D, showOxygen: boolean = false, showLactate: boolean = false, showECM: boolean = false): void {
    if (!showOxygen && !showLactate && !showECM) return;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = c * this.cellWidth;
        const y = r * this.cellHeight;
        const cell = this.grid[r][c];

        if (showOxygen) {
          const intensity = 1 - cell.oxygen;
          if (intensity > 0.3) {
            ctx.fillStyle = `rgba(50, 30, 80, ${intensity * 0.3})`;
            ctx.fillRect(x, y, this.cellWidth, this.cellHeight);
          }
        }

        if (showLactate) {
          const intensity = cell.lactate;
          if (intensity > 0.3) {
            ctx.fillStyle = `rgba(100, 50, 50, ${intensity * 0.2})`;
            ctx.fillRect(x, y, this.cellWidth, this.cellHeight);
          }
        }

        if (showECM) {
          const intensity = cell.ecmDensity;
          if (intensity > 0.3) {
            ctx.fillStyle = `rgba(139, 90, 43, ${intensity * 0.2})`;
            ctx.fillRect(x, y, this.cellWidth, this.cellHeight);
          }
        }
      }
    }
  }

  private clamp01(v: number): number {
    return Math.max(0, Math.min(1, v));
  }
}
