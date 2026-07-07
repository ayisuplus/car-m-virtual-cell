/**
 * Neural Surrogate Model for Macrophage Polarization
 * 
 * A lightweight MLP inference engine that replaces the ODE solver
 * for predicting M1/M2 polarization and phagocytosis probability.
 * 
 * Architecture: 6 → 32 → 32 → 3 (ReLU hidden, Sigmoid output)
 * Trained on 30,000 synthetic samples from biologically-motivated ODE model
 * Validation accuracy: 95.96%
 * 
 * Input:  [IFN-γ, IL-4, IL-10, TGF-β, oxygen, lactate]
 * Output: [M1_score, M2_score, phagocytosis_probability]
 */

import { NEURAL_SURROGATE_MODEL } from './neuralSurrogateWeights';

const model = NEURAL_SURROGATE_MODEL;

// Pre-parse weights for performance
const layerWeights: Float32Array[] = [];
const layerBiases: Float32Array[] = [];
const layerSizes: number[] = [...model.architecture];

for (const layer of model.layers) {
  const w = layer.weights;
  const rows = w.length;
  const cols = w[0].length;
  const flat = new Float32Array(rows * cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      flat[r * cols + c] = w[r][c];
    }
  }
  layerWeights.push(flat);
  layerBiases.push(new Float32Array(layer.biases));
}

/**
 * Run inference on the neural surrogate model.
 * @param ifnGamma - IFN-γ concentration (0-1)
 * @param il4 - IL-4 concentration (0-1)
 * @param il10 - IL-10 concentration (0-1)
 * @param tgfBeta - TGF-β concentration (0-1)
 * @param oxygen - Oxygen level (0-1)
 * @param lactate - Lactate level (0-1)
 * @returns [m1Score, m2Score, phagocytosisProbability]
 */
export function neuralSurrogatePredict(
  ifnGamma: number,
  il4: number,
  il10: number,
  tgfBeta: number,
  oxygen: number,
  lactate: number
): [number, number, number] {
  let current = new Float32Array([ifnGamma, il4, il10, tgfBeta, oxygen, lactate]);

  for (let l = 0; l < layerWeights.length; l++) {
    const W = layerWeights[l];
    const b = layerBiases[l];
    const outSize = layerSizes[l + 1];
    const inSize = layerSizes[l];
    const output = new Float32Array(outSize);
    const isOutput = l === layerWeights.length - 1;

    for (let j = 0; j < outSize; j++) {
      let sum = b[j];
      const offset = j * inSize;
      for (let k = 0; k < inSize; k++) {
        sum += W[offset + k] * current[k];
      }
      // ReLU for hidden layers, sigmoid for output
      output[j] = isOutput ? sigmoid(sum) : Math.max(0, sum);
    }
    current = output;
  }

  return [current[0], current[1], current[2]];
}

function sigmoid(x: number): number {
  return 1.0 / (1.0 + Math.exp(-Math.max(-10, Math.min(10, x))));
}

/**
 * Get model metadata for display.
 */
export function getModelInfo() {
  return {
    architecture: model.architecture,
    accuracy: model.accuracy,
    parameterCount: model.layers.reduce((sum, l) => sum + l.weights.length * l.weights[0].length + l.biases.length, 0),
  };
}
