/**
 * portfolioOptimizer.ts - Modern Portfolio Theory, the beginner-friendly way.
 *
 * Harry Markowitz's insight (Nobel Prize, 1990): a portfolio's risk is not just
 * the average of its holdings' risks - it depends on how they move TOGETHER
 * (their covariance). Combining assets that don't move in lockstep lowers risk
 * for the same expected return. The set of "best possible" risk/return tradeoffs
 * is the efficient frontier.
 *
 * Finding the exact frontier needs quadratic programming. Instead we use Monte
 * Carlo: randomly sample thousands of valid weightings, evaluate each, and keep
 * the best ones (highest Sharpe, lowest variance). It is simple, robust, has no
 * dependencies, and is easy to explain - perfect for this app.
 */

import { covarianceMatrix, mean } from './indicators';
import { OptimizationResult } from './types';

export interface OptimizerInput {
  tickers: string[];
  /** One daily-return series per ticker (aligned by recency). */
  returnSeries: number[][];
  /** Current portfolio weights (sum to 1). */
  currentWeights: number[];
  riskFreeAnnual?: number;
  samples?: number;
  /** Max weight per asset to avoid degenerate all-in-one solutions. */
  maxWeight?: number;
}

const TRADING_DAYS = 252;

/** Portfolio expected daily return = weighted average of asset mean returns. */
function portfolioReturn(weights: number[], meanReturns: number[]): number {
  let r = 0;
  for (let i = 0; i < weights.length; i++) r += weights[i] * meanReturns[i];
  return r;
}

/** Portfolio variance = wᵀ Σ w (this is where covariance does the work). */
function portfolioVariance(weights: number[], cov: number[][]): number {
  let v = 0;
  for (let i = 0; i < weights.length; i++) {
    for (let j = 0; j < weights.length; j++) {
      v += weights[i] * weights[j] * cov[i][j];
    }
  }
  return v;
}

/** Random weights that sum to 1, each capped at maxWeight. */
function randomWeights(n: number, maxWeight: number): number[] {
  for (let attempt = 0; attempt < 20; attempt++) {
    const raw = Array.from({ length: n }, () => -Math.log(Math.random())); // exp dist
    const sum = raw.reduce((a, b) => a + b, 0);
    const w = raw.map((x) => x / sum);
    if (w.every((x) => x <= maxWeight)) return w;
  }
  // Fallback: equal weight if the cap is hard to satisfy.
  return Array(n).fill(1 / n);
}

export function optimizePortfolio(input: OptimizerInput): OptimizationResult | null {
  const {
    tickers,
    returnSeries,
    currentWeights,
    riskFreeAnnual = 0.04,
    samples = 4000,
  } = input;

  const n = tickers.length;
  if (n < 2) return null;

  const meanReturns = returnSeries.map(mean);
  const cov = covarianceMatrix(returnSeries);
  const maxWeight = input.maxWeight ?? Math.max(0.35, 1.5 / n);
  const dailyRf = riskFreeAnnual / TRADING_DAYS;

  let bestSharpe = -Infinity;
  let bestSharpeWeights = currentWeights.slice();
  let bestSharpeReturn = 0;
  let bestSharpeVol = 0;

  let minVar = Infinity;
  let minVarVol = 0;

  for (let s = 0; s < samples; s++) {
    const w = randomWeights(n, maxWeight);
    const ret = portfolioReturn(w, meanReturns);
    const variance = portfolioVariance(w, cov);
    if (variance <= 0) continue;
    const vol = Math.sqrt(variance);

    const sharpe = (ret - dailyRf) / vol;
    if (sharpe > bestSharpe) {
      bestSharpe = sharpe;
      bestSharpeWeights = w;
      bestSharpeReturn = ret;
      bestSharpeVol = vol;
    }
    if (variance < minVar) {
      minVar = variance;
      minVarVol = vol;
    }
  }

  return {
    tickers,
    currentWeights,
    suggestedWeights: bestSharpeWeights,
    // Annualize daily figures for display.
    expectedAnnualReturn: bestSharpeReturn * TRADING_DAYS,
    expectedAnnualVolatility: bestSharpeVol * Math.sqrt(TRADING_DAYS),
    sharpeRatio: bestSharpe * Math.sqrt(TRADING_DAYS),
    minVarianceVolatility: minVarVol * Math.sqrt(TRADING_DAYS),
  };
}
