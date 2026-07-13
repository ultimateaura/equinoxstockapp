/**
 * features.ts - Turns a price series + fundamentals into a fixed feature vector.
 *
 * This is the single source of truth for "what the ML model sees". The exact
 * same function is used both:
 *   - offline, in Python, to build the training set (ported 1:1), and
 *   - on-device, here, at inference time.
 * Keeping them identical avoids "train/serve skew" - the classic bug where a
 * model behaves differently in production because features were computed
 * slightly differently than during training.
 *
 * FEATURE_NAMES defines the order; never reorder without retraining the model.
 */

import {
  annualizedVolatility,
  beta,
  dailyReturns,
  maxDrawdown,
  rsi,
  sma,
  trailingReturn,
} from './indicators';

export const FEATURE_NAMES = [
  'mom3',          // 3-month trailing return
  'mom6',          // 6-month trailing return
  'mom12',         // 12-month trailing return
  'volAnn',        // annualized volatility
  'rsi14',         // 14-day RSI
  'priceToSMA50',  // price / SMA50 - 1
  'priceToSMA200', // price / SMA200 - 1
  'maxDD',         // max drawdown (positive fraction)
  'beta',          // beta vs benchmark
  'relReturn6',    // 6-month return minus benchmark's
  'pe',            // trailing P/E
  'pb',            // price / book
] as const;

export type FeatureName = (typeof FEATURE_NAMES)[number];

export interface FeatureInput {
  closes: number[];
  benchmarkCloses?: number[];
  peRatio?: number;
  priceToBook?: number;
}

/**
 * Compute the raw (un-standardized) feature vector in FEATURE_NAMES order.
 * Missing fundamentals fall back to market-typical defaults so the vector is
 * always complete (the scaler then centers them to ~0).
 */
export function buildFeatureVector(input: FeatureInput): number[] {
  const { closes, benchmarkCloses } = input;
  const price = closes[closes.length - 1] ?? 0;
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  const rets = dailyReturns(closes);

  const mom6 = trailingReturn(closes, 126);
  const benchMom6 = benchmarkCloses ? trailingReturn(benchmarkCloses, 126) : 0;

  const betaVal = benchmarkCloses
    ? beta(rets, dailyReturns(benchmarkCloses))
    : 1;

  return [
    trailingReturn(closes, 63),
    mom6,
    trailingReturn(closes, 252),
    annualizedVolatility(rets),
    rsi(closes),
    isFinite(sma50) && sma50 > 0 ? price / sma50 - 1 : 0,
    isFinite(sma200) && sma200 > 0 ? price / sma200 - 1 : 0,
    maxDrawdown(closes),
    betaVal,
    mom6 - benchMom6,
    input.peRatio && input.peRatio > 0 ? input.peRatio : 22, // default ~market avg
    input.priceToBook && input.priceToBook > 0 ? input.priceToBook : 4,
  ];
}

/** Standardize a raw vector: (x - mean) / std, element-wise. */
export function standardize(
  raw: number[],
  scaler: { mean: number[]; std: number[] }
): number[] {
  return raw.map((x, i) => {
    const s = scaler.std[i] || 1;
    return (x - (scaler.mean[i] ?? 0)) / s;
  });
}
