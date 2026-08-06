import { describe, expect, it } from 'vitest';
import { probPerUpdate, killEvents, clearKillEvents } from './cell';

/**
 * Focused behavior tests for the pure-logic paths of the simulation core.
 * Run with `npm run test:unit` (vitest) — no DOM/browser required.
 */

describe('probPerUpdate (timestep rescaling)', () => {
  it('returns the nominal probability unchanged at the nominal dt (0.1)', () => {
    expect(probPerUpdate(0.3, 0.1)).toBeCloseTo(0.3, 12);
    expect(probPerUpdate(0.005, 0.1)).toBeCloseTo(0.005, 12);
  });

  it('scales probability with dt using 1 - (1-p)^(dt/nominalDt)', () => {
    // Two nominal intervals: 1 - (1-0.5)^2 = 0.75
    expect(probPerUpdate(0.5, 0.2)).toBeCloseTo(0.75, 12);
    // Half a nominal interval: 1 - (1-0.36)^0.5 = 0.2
    expect(probPerUpdate(0.36, 0.05)).toBeCloseTo(0.2, 12);
  });

  it('never exceeds 1 even for large dt (no overshoot)', () => {
    expect(probPerUpdate(0.9, 5)).toBeLessThanOrEqual(1);
    expect(probPerUpdate(0.9, 5)).toBeGreaterThan(0.9);
  });

  it('clamps out-of-range inputs (negative cases)', () => {
    // Negative probability must clamp to 0, never produce NaN or negative draws
    expect(probPerUpdate(-0.5, 0.1)).toBe(0);
    // Probability above 1 must clamp to 1
    expect(probPerUpdate(1.5, 0.1)).toBe(1);
    // Zero dt means no elapsed time -> no chance of an event
    expect(probPerUpdate(0.5, 0)).toBe(0);
  });

  it('is monotonic in both p and dt', () => {
    expect(probPerUpdate(0.4, 0.1)).toBeGreaterThan(probPerUpdate(0.2, 0.1));
    expect(probPerUpdate(0.2, 0.3)).toBeGreaterThan(probPerUpdate(0.2, 0.1));
  });
});

describe('killEvents registry', () => {
  it('clearKillEvents empties the shared registry', () => {
    killEvents.push({ x: 1, y: 2, time: 0.5, killer: 'CAR_M' });
    expect(killEvents.length).toBeGreaterThan(0);
    clearKillEvents();
    expect(killEvents.length).toBe(0);
  });
});
