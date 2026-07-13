/**
 * monteCarloSimulator.ts - Forward "What-If" portfolio value projections.
 *
 * Distinct from portfolioOptimizer.ts (which samples weight allocations for MPT).
 * Here we project portfolio VALUE over time using geometric Brownian motion
 * calibrated to the portfolio's historical daily mean and volatility.
 */

import { dailyReturns, mean, stdDev } from './indicators';
import { MonteCarloResult } from './types';

export interface MonteCarloInput {
  /** Current portfolio market value. */
  currentValue: number;
  /** Daily portfolio returns (oldest → newest), already weight-aggregated. */
  portfolioDailyReturns: number[];
  /** Projection horizon in trading days. */
  horizonDays: number;
  /** Number of simulated paths (default 2000). */
  numPaths?: number;
  /** Optional RNG for deterministic tests. */
  rng?: () => number;
}

/** Box-Muller transform → standard normal sample. */
function gaussian(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const w = idx - lo;
  return sorted[lo] * (1 - w) + sorted[hi] * w;
}

/**
 * Run GBM Monte Carlo on the portfolio.
 * V(t+1) = V(t) * exp((μ - σ²/2) + σ Z)
 * where μ, σ are estimated from historical daily returns.
 */
export function runMonteCarlo(input: MonteCarloInput): MonteCarloResult | null {
  const {
    currentValue,
    portfolioDailyReturns,
    horizonDays,
    numPaths = 2000,
    rng = Math.random,
  } = input;

  if (currentValue <= 0 || horizonDays < 1) return null;
  if (portfolioDailyReturns.length < 30) return null;

  // Cap horizon at ~1 year of trading days for UI responsiveness.
  const T = Math.min(horizonDays, 252);
  const mu = mean(portfolioDailyReturns);
  const sigma = stdDev(portfolioDailyReturns);
  if (!isFinite(mu) || !isFinite(sigma) || sigma < 0) return null;

  // Only store percentile series (not all raw paths) to keep memory small.
  // We keep endpoint values for the final distribution summary.
  const p10: number[] = [currentValue];
  const p50: number[] = [currentValue];
  const p90: number[] = [currentValue];

  // Simulate path-by-path, but only keep a rolling column of values at each step
  // would be huge. Instead: simulate all paths day-by-day into a values array.
  let values = Array(numPaths).fill(currentValue);
  const drift = mu - 0.5 * sigma * sigma;

  for (let day = 1; day <= T; day++) {
    for (let p = 0; p < numPaths; p++) {
      const z = gaussian(rng);
      values[p] = values[p] * Math.exp(drift + sigma * z);
    }
    const sorted = [...values].sort((a, b) => a - b);
    p10.push(percentile(sorted, 10));
    p50.push(percentile(sorted, 50));
    p90.push(percentile(sorted, 90));
  }

  const finalSorted = [...values].sort((a, b) => a - b);
  return {
    currentValue,
    horizonDays: T,
    numPaths,
    muDaily: mu,
    sigmaDaily: sigma,
    p10,
    p50,
    p90,
    finalP10: percentile(finalSorted, 10),
    finalP50: percentile(finalSorted, 50),
    finalP90: percentile(finalSorted, 90),
    method: `${numPaths.toLocaleString()} Monte Carlo GBM paths`,
    disclaimer:
      'Illustrative only. Past volatility does not guarantee future results. Not financial advice.',
  };
}

/**
 * Build a weighted portfolio daily return series from per-ticker returns + weights.
 * Series are aligned from the most recent end to the shortest length.
 */
export function aggregatePortfolioReturns(
  returnSeries: number[][],
  weights: number[]
): number[] {
  const n = returnSeries.length;
  if (n === 0) return [];
  const minLen = Math.min(...returnSeries.map((s) => s.length));
  if (minLen < 2) return [];

  const out: number[] = [];
  for (let t = 0; t < minLen; t++) {
    let r = 0;
    for (let i = 0; i < n; i++) {
      const series = returnSeries[i];
      r += (weights[i] ?? 0) * series[series.length - minLen + t];
    }
    out.push(r);
  }
  return out;
}

/** Convenience: closes → daily returns → aggregate. */
export function returnsFromCloses(closes: number[]): number[] {
  return dailyReturns(closes);
}

/** Horizon presets in trading days. */
export const HORIZON_PRESETS = {
  '1m': 21,
  '3m': 63,
  '6m': 126,
  '1y': 252,
} as const;

export type HorizonKey = keyof typeof HORIZON_PRESETS;
