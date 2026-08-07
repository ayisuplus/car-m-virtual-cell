import { describe, expect, it } from 'vitest';
import { ABMEngine } from './engine';
import { getDefaultGATModel } from './gnnWeights';
import type { CarDesign, SimParams } from '@/types/simulation';

/**
 * Focused behavior tests for ABMEngine's seeded reproducibility contract
 * (see app/README.md "Reproducibility"): the same parameters + seed must
 * produce the same initialization and stochastic event sequence.
 */

const carDesign: CarDesign = {
  signalingDomain: 'CD3ζ',
  targetAntigen: 'HER2',
  affinity: 5,
  checkpointBlockade: { CD47_SIRPa: false, CD24_Siglec10: false },
};

function makeParams(seed: number): SimParams {
  return {
    carMCount: 4,
    wildTypeCount: 3,
    tumorCount: 5,
    cd8Count: 2,
    oxygenLevel: 0.5,
    lactateLevel: 0.1,
    tgfBetaLevel: 0.2,
    randomSeed: seed,
  };
}

function makeEngine(seed: number): ABMEngine {
  return new ABMEngine(400, 300, carDesign, makeParams(seed), {
    onStatsUpdate: () => undefined,
  });
}

function layout(engine: ABMEngine): string {
  return JSON.stringify(
    engine.cells.map((c) => ({
      type: c.type,
      x: c.position.x,
      y: c.position.y,
    })),
  );
}

describe('ABMEngine seeded reproducibility', () => {
  it('initializes the same cell layout for the same seed', () => {
    const a = makeEngine(42);
    const b = makeEngine(42);
    expect(layout(a)).toBe(layout(b));
  });

  it('initializes a different layout for a different seed (negative case)', () => {
    const a = makeEngine(42);
    const b = makeEngine(1337);
    expect(layout(a)).not.toBe(layout(b));
  });

  it('creates exactly the configured cell counts', () => {
    const engine = makeEngine(7);
    const params = makeParams(7);
    expect(engine.cells.length).toBe(
      params.tumorCount + params.carMCount + params.wildTypeCount + params.cd8Count,
    );
    const count = (type: string) => engine.cells.filter((c) => c.type === type).length;
    expect(count('TUMOR_CELL')).toBe(params.tumorCount);
    expect(count('CAR_MACROPHAGE')).toBe(params.carMCount);
    expect(count('WILD_TYPE_MACROPHAGE')).toBe(params.wildTypeCount);
    expect(count('CD8_T_CELL')).toBe(params.cd8Count);
  });

  it('keeps the same-seed trajectory identical across a short run', () => {
    const a = makeEngine(42);
    const b = makeEngine(42);
    for (let i = 0; i < 5; i++) {
      a.step();
      b.step();
    }
    expect(layout(a)).toBe(layout(b));
  });

  it('reset() restores the exact initial layout for the same seed', () => {
    const engine = makeEngine(42);
    const initial = layout(engine);
    for (let i = 0; i < 5; i++) engine.step();
    expect(layout(engine)).not.toBe(initial);
    engine.reset();
    expect(layout(engine)).toBe(initial);
  });

  it('keeps all initialized cells inside the world bounds', () => {
    const engine = makeEngine(99);
    for (const cell of engine.cells) {
      expect(cell.position.x).toBeGreaterThanOrEqual(0);
      expect(cell.position.x).toBeLessThanOrEqual(400);
      expect(cell.position.y).toBeGreaterThanOrEqual(0);
      expect(cell.position.y).toBeLessThanOrEqual(300);
    }
  });

  it('GNN mode keeps the same-seed trajectory deterministic', () => {
    const a = makeEngine(42);
    const b = makeEngine(42);
    a.initGNN(getDefaultGATModel());
    b.initGNN(getDefaultGATModel());
    for (let i = 0; i < 5; i++) {
      a.step();
      b.step();
    }
    expect(layout(a)).toBe(layout(b));
  });

  it('getSnapshot reports GNN enabled state', () => {
    const engine = makeEngine(42);
    expect((engine.getSnapshot() as { gnn: { enabled: boolean } }).gnn.enabled).toBe(false);
    engine.initGNN();
    const gnn = (engine.getSnapshot() as { gnn: { enabled: boolean; interval: number } }).gnn;
    expect(gnn.enabled).toBe(true);
    expect(gnn.interval).toBe(5);
  });
});
