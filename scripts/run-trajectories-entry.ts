/**
 * Headless trajectory exporter for CAR-M Simulator paper figures.
 * Runs the ABM engine in Node (no DOM/Canvas) with multiple scenario
 * configs, dumps per-step statistics as JSON for matplotlib plotting.
 */
import { ABMEngine } from '../app/src/lib/simulation/engine';
import type { CarDesign, SimParams, SimStatistics } from '../app/src/types/simulation';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Stub browser APIs that engine.ts touches
if (typeof (globalThis as any).performance === 'undefined') {
  (globalThis as any).performance = { now: () => Date.now() };
}
if (typeof (globalThis as any).requestAnimationFrame === 'undefined') {
  (globalThis as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 16);
  (globalThis as any).cancelAnimationFrame = (id: any) => clearTimeout(id);
}

interface ScenarioConfig {
  name: string;
  carDesign: CarDesign;
  simParams: SimParams;
  steps: number;
}

const baseDesign: CarDesign = {
  signalingDomain: 'CD3ζ',
  targetAntigen: 'HER2',
  affinity: 8,
  checkpointBlockade: { CD47_SIRPa: true, CD24_Siglec10: false },
};

const baseParams: SimParams = {
  carMCount: 12,
  wildTypeCount: 8,
  tumorCount: 25,
  cd8Count: 10,
  oxygenLevel: 0.5,
  lactateLevel: 0.3,
  tgfBetaLevel: 0.4,
  randomSeed: 20250706,
};

const scenarios: ScenarioConfig[] = [
  { name: 'baseline', carDesign: { ...baseDesign }, simParams: { ...baseParams }, steps: 400 },
  { name: 'HER2_low', carDesign: { ...baseDesign, affinity: 3 }, simParams: { ...baseParams }, steps: 400 },
  { name: 'no_CD47_block', carDesign: { ...baseDesign, checkpointBlockade: { CD47_SIRPa: false, CD24_Siglec10: false } }, simParams: { ...baseParams }, steps: 400 },
  { name: 'high_TGFb', carDesign: { ...baseDesign }, simParams: { ...baseParams, tgfBetaLevel: 0.8 }, steps: 400 },
  { name: 'CD147_ECM', carDesign: { ...baseDesign, signalingDomain: 'CD147' as any }, simParams: { ...baseParams }, steps: 400 },
  { name: 'pro_inflammatory', carDesign: { ...baseDesign }, simParams: { ...baseParams, oxygenLevel: 0.8, lactateLevel: 0.1, tgfBetaLevel: 0.1 }, steps: 400 },
];

function runScenario(cfg: ScenarioConfig) {
  const allStats: SimStatistics[] = [];
  const noop = (_s: SimStatistics) => { allStats.push(JSON.parse(JSON.stringify(_s))); };
  const engine = new ABMEngine(800, 600, cfg.carDesign, cfg.simParams, { onStatsUpdate: noop });
  for (let i = 0; i < cfg.steps; i++) engine.step();

  // Also grab a spatial snapshot at the end
  const snapshot = engine.getSnapshot() as any;
  const cellPositions = engine.cells.filter((c: any) => c.alive).map((c: any) => ({
    type: c.type,
    x: c.position.x,
    y: c.position.y,
    polarization: c.polarization || null,
  }));

  return { name: cfg.name, statistics: allStats, cellPositions, snapshot };
}

const outDir = path.resolve(__dirname, '../paper/figures/data');
fs.mkdirSync(outDir, { recursive: true });

const results = scenarios.map(runScenario);
fs.writeFileSync(path.join(outDir, 'trajectories.json'), JSON.stringify(results, null, 2));
console.log(`Wrote ${results.length} trajectories to ${outDir}/trajectories.json`);
for (const r of results) {
  console.log(`  ${r.name}: ${r.statistics.length} snapshots, ${r.cellPositions.length} final cells`);
}
