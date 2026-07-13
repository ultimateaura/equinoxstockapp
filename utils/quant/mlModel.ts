/**
 * mlModel.ts - On-device inference for the learned recommender.
 *
 * The model is a small feed-forward neural network (an MLP). Its weights live in
 * assets/models/recommender.json and are produced by the offline training
 * pipeline (see ml/). Here we just run the forward pass in plain TypeScript:
 *
 *   for each layer:  out_j = activation( sum_i in_i * W[i][j] + b[j] )
 *
 * That is literally all a dense neural net does at inference time - a few
 * weighted sums followed by a non-linearity. Running it by hand means it works
 * in Expo Go today with zero native dependencies. The optional TensorFlow.js
 * path (loadTfModel) can later load a larger model the same JSON describes; this
 * pure-TS path stays as the guaranteed fallback.
 *
 * The model predicts the probability a stock outperforms the market (SPY) over
 * the next ~21 trading days. It is one input to the recommendation, never a
 * promise about the future.
 */

import modelJson from '../../assets/models/recommender.json';
import { FEATURE_NAMES, FeatureInput, buildFeatureVector, standardize } from './features';
import { MLPrediction } from './types';

type Activation = 'relu' | 'sigmoid' | 'tanh' | 'linear';

interface DenseLayer {
  weights: number[][]; // [inputDim][outputDim]
  bias: number[];      // [outputDim]
  activation: Activation;
}

interface ModelSpec {
  featureNames: string[];
  scaler: { mean: number[]; std: number[] };
  layers: DenseLayer[];
}

const model = modelJson as unknown as ModelSpec;

function applyActivation(x: number, fn: Activation): number {
  switch (fn) {
    case 'relu':
      return Math.max(0, x);
    case 'sigmoid':
      return 1 / (1 + Math.exp(-x));
    case 'tanh':
      return Math.tanh(x);
    default:
      return x;
  }
}

/** One dense layer: matrix-vector multiply + bias + activation. */
function denseForward(input: number[], layer: DenseLayer): number[] {
  const outputDim = layer.bias.length;
  const out: number[] = new Array(outputDim).fill(0);
  for (let j = 0; j < outputDim; j++) {
    let sum = layer.bias[j];
    for (let i = 0; i < input.length; i++) {
      sum += input[i] * layer.weights[i][j];
    }
    out[j] = applyActivation(sum, layer.activation);
  }
  return out;
}

/** Full forward pass; returns the single probability output. */
function forward(standardized: number[]): number {
  let activations = standardized;
  for (const layer of model.layers) {
    activations = denseForward(activations, layer);
  }
  return activations[0];
}

/**
 * Estimate each feature's contribution by ablation: zero it out (set to the
 * standardized mean) and see how much the probability moves. This works for any
 * network depth and gives a beginner-friendly "what mattered most" list.
 */
function featureContributions(standardized: number[], baseline: number) {
  return standardized.map((_, i) => {
    const ablated = [...standardized];
    ablated[i] = 0; // 0 == the feature's mean after standardization
    const without = forward(ablated);
    return { name: FEATURE_NAMES[i], contribution: baseline - without };
  });
}

class MLModelService {
  /** Run inference on a stock's features. Never throws. */
  predict(input: FeatureInput): MLPrediction {
    try {
      const raw = buildFeatureVector(input);
      const std = standardize(raw, model.scaler);
      const probability = forward(std);

      const contributions = featureContributions(std, probability)
        .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
        .slice(0, 3);

      return {
        probability,
        score: Math.round(probability * 100),
        topFeatures: contributions,
        source: model.layers.length > 1 ? 'mlp' : 'logistic',
      };
    } catch (err) {
      console.warn('ML inference failed, returning neutral:', (err as Error)?.message);
      return {
        probability: 0.5,
        score: 50,
        topFeatures: [],
        source: 'unavailable',
      };
    }
  }
}

export const mlModelService = new MLModelService();
