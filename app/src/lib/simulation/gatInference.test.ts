import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { GATModel } from '@/lib/simulation/gatInference';
import { getDefaultGATWeights } from '@/lib/simulation/gnnWeights';
import type { CellGraph } from '@/types/simulation';

function buildGraph(numNodes: number): CellGraph {
  // 链式图 0-1-2-... 保证每个节点有邻居
  const row: number[] = [];
  const col: number[] = [];
  for (let i = 0; i < numNodes - 1; i++) {
    row.push(i);
    col.push(i + 1);
    row.push(i + 1);
    col.push(i);
  }
  const features = new Float32Array(numNodes * 24);
  for (let i = 0; i < numNodes * 24; i++) features[i] = Math.sin(i * 0.1);
  return {
    nodeFeatures: features,
    edgeIndex: { row: new Int32Array(row), col: new Int32Array(col) },
    numNodes,
    numEdges: row.length,
    featureDim: 24,
  };
}

describe('GATModel', () => {
  const weights = getDefaultGATWeights();
  const model = new GATModel(weights);

  it('produces deterministic output for same input', () => {
    const graph = buildGraph(8);
    const a = model.forward(graph);
    const b = model.forward(graph);
    expect(a.predictions).toEqual(b.predictions);
    expect(a.predictions.length).toBe(8 * 3);
    expect(a.attentionWeights).toBeDefined();
  });

  it('outputs finite values', () => {
    const graph = buildGraph(8);
    const out = model.forward(graph).predictions;
    for (let i = 0; i < out.length; i++) {
      expect(Number.isFinite(out[i])).toBe(true);
    }
  });

  it('handles single node graph', () => {
    const graph = buildGraph(1);
    const out = model.forward(graph).predictions;
    expect(out.length).toBe(3);
  });

  it('default weights match JSON file', () => {
    const raw = readFileSync(join(__dirname, '../../../public/models/gat-weights.json'), 'utf8');
    const json = JSON.parse(raw) as object;
    const fromFile = GATModel.fromJSON(json).forward(buildGraph(8));
    const fromDefault = new GATModel(weights).forward(buildGraph(8));
    expect(fromFile.predictions).toEqual(fromDefault.predictions);
  });
});