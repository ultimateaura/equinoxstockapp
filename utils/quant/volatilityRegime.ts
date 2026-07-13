/**
 * volatilityRegime.ts - Calm vs Turbulent market regimes via a 2-state HMM
 * (or percentile fallback when EM fails to converge).
 *
 * States are estimated on SPY (or portfolio) log returns. We also summarize how
 * a given portfolio behaved during past turbulent stretches.
 */

import { logReturns, mean, stdDev } from './indicators';
import { RegimeLabel, VolatilityRegimeResult } from './types';

export interface RegimeInput {
  /** Benchmark (SPY) closes, oldest → newest. */
  benchmarkCloses: number[];
  /** Optional portfolio daily returns aligned by recency. */
  portfolioDailyReturns?: number[];
  /** EM iterations (default 15). */
  maxIter?: number;
}

/**
 * 2-state Gaussian HMM via Baum-Welch (EM) on 1D returns.
 * State 0 = Calm (lower σ), State 1 = Turbulent (higher σ).
 */
function fitTwoStateHMM(
  returns: number[],
  maxIter: number
): {
  means: [number, number];
  stds: [number, number];
  transition: number[][];
  states: number[];
} | null {
  const n = returns.length;
  if (n < 60) return null;

  // Init: split by absolute return magnitude.
  const abs = returns.map(Math.abs);
  const sortedAbs = [...abs].sort((a, b) => a - b);
  const thresh = sortedAbs[Math.floor(n * 0.7)] ?? sortedAbs[sortedAbs.length - 1];

  let means: [number, number] = [0, 0];
  let stds: [number, number] = [0.005, 0.02];
  let pi: [number, number] = [0.7, 0.3];
  let A: number[][] = [
    [0.95, 0.05],
    [0.1, 0.9],
  ];

  const calm: number[] = [];
  const turb: number[] = [];
  for (let i = 0; i < n; i++) {
    if (abs[i] <= thresh) calm.push(returns[i]);
    else turb.push(returns[i]);
  }
  if (calm.length > 5) {
    means[0] = mean(calm);
    stds[0] = Math.max(stdDev(calm), 1e-6);
  }
  if (turb.length > 5) {
    means[1] = mean(turb);
    stds[1] = Math.max(stdDev(turb), 1e-6);
  }
  // Ensure state 0 is lower vol.
  if (stds[0] > stds[1]) {
    means = [means[1], means[0]];
    stds = [stds[1], stds[0]];
  }

  const gauss = (x: number, m: number, s: number) => {
    const z = (x - m) / s;
    return Math.exp(-0.5 * z * z) / (s * Math.sqrt(2 * Math.PI));
  };

  for (let iter = 0; iter < maxIter; iter++) {
    // E-step: forward-backward with scaling
    const alpha: number[][] = Array.from({ length: n }, () => [0, 0]);
    const beta: number[][] = Array.from({ length: n }, () => [0, 0]);
    const scaleArr: number[] = Array(n).fill(0);
    const gamma: number[][] = Array.from({ length: n }, () => [0, 0]);
    const xi: number[][][] = Array.from({ length: n - 1 }, () => [
      [0, 0],
      [0, 0],
    ]);

    // Forward
    for (let k = 0; k < 2; k++) {
      alpha[0][k] = pi[k] * gauss(returns[0], means[k], stds[k]);
    }
    scaleArr[0] = alpha[0][0] + alpha[0][1];
    if (scaleArr[0] < 1e-300) return null;
    alpha[0][0] /= scaleArr[0];
    alpha[0][1] /= scaleArr[0];

    for (let t = 1; t < n; t++) {
      for (let j = 0; j < 2; j++) {
        alpha[t][j] =
          (alpha[t - 1][0] * A[0][j] + alpha[t - 1][1] * A[1][j]) *
          gauss(returns[t], means[j], stds[j]);
      }
      scaleArr[t] = alpha[t][0] + alpha[t][1];
      if (scaleArr[t] < 1e-300) return null;
      alpha[t][0] /= scaleArr[t];
      alpha[t][1] /= scaleArr[t];
    }

    // Backward
    beta[n - 1][0] = 1;
    beta[n - 1][1] = 1;
    for (let t = n - 2; t >= 0; t--) {
      for (let i = 0; i < 2; i++) {
        beta[t][i] =
          A[i][0] * gauss(returns[t + 1], means[0], stds[0]) * beta[t + 1][0] +
          A[i][1] * gauss(returns[t + 1], means[1], stds[1]) * beta[t + 1][1];
      }
      const s = scaleArr[t + 1];
      beta[t][0] /= s;
      beta[t][1] /= s;
    }

    // Gamma & Xi
    for (let t = 0; t < n; t++) {
      const g0 = alpha[t][0] * beta[t][0];
      const g1 = alpha[t][1] * beta[t][1];
      const den = g0 + g1 || 1;
      gamma[t][0] = g0 / den;
      gamma[t][1] = g1 / den;
    }
    for (let t = 0; t < n - 1; t++) {
      let den = 0;
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          xi[t][i][j] =
            alpha[t][i] *
            A[i][j] *
            gauss(returns[t + 1], means[j], stds[j]) *
            beta[t + 1][j];
          den += xi[t][i][j];
        }
      }
      if (den < 1e-300) continue;
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) xi[t][i][j] /= den;
      }
    }

    // M-step
    const newPi: [number, number] = [gamma[0][0], gamma[0][1]];
    const newA: number[][] = [
      [0, 0],
      [0, 0],
    ];
    for (let i = 0; i < 2; i++) {
      let rowSum = 0;
      for (let j = 0; j < 2; j++) {
        let s = 0;
        for (let t = 0; t < n - 1; t++) s += xi[t][i][j];
        newA[i][j] = s;
        rowSum += s;
      }
      if (rowSum < 1e-12) {
        newA[i] = [...A[i]];
      } else {
        newA[i][0] /= rowSum;
        newA[i][1] /= rowSum;
      }
    }

    const newMeans: [number, number] = [0, 0];
    const newStds: [number, number] = [1e-4, 1e-4];
    for (let k = 0; k < 2; k++) {
      let wSum = 0;
      let mSum = 0;
      for (let t = 0; t < n; t++) {
        wSum += gamma[t][k];
        mSum += gamma[t][k] * returns[t];
      }
      newMeans[k] = wSum > 0 ? mSum / wSum : means[k];
      let vSum = 0;
      for (let t = 0; t < n; t++) {
        const d = returns[t] - newMeans[k];
        vSum += gamma[t][k] * d * d;
      }
      newStds[k] = Math.max(Math.sqrt(wSum > 0 ? vSum / wSum : stds[k] * stds[k]), 1e-6);
    }

    pi = newPi;
    A = newA;
    means = newMeans;
    stds = newStds;
  }

  // Ensure calm = lower std
  if (stds[0] > stds[1]) {
    means = [means[1], means[0]];
    stds = [stds[1], stds[0]];
    A = [
      [A[1][1], A[1][0]],
      [A[0][1], A[0][0]],
    ];
    pi = [pi[1], pi[0]];
  }

  // Viterbi decode
  const states = viterbi(returns, means, stds, A, pi);
  return { means, stds, transition: A, states };
}

function viterbi(
  returns: number[],
  means: [number, number],
  stds: [number, number],
  A: number[][],
  pi: [number, number]
): number[] {
  const n = returns.length;
  const gauss = (x: number, m: number, s: number) => {
    const z = (x - m) / s;
    return Math.exp(-0.5 * z * z) / (s * Math.sqrt(2 * Math.PI));
  };
  const log = (x: number) => Math.log(Math.max(x, 1e-300));

  const dp: number[][] = Array.from({ length: n }, () => [0, 0]);
  const ptr: number[][] = Array.from({ length: n }, () => [0, 0]);

  dp[0][0] = log(pi[0]) + log(gauss(returns[0], means[0], stds[0]));
  dp[0][1] = log(pi[1]) + log(gauss(returns[0], means[1], stds[1]));

  for (let t = 1; t < n; t++) {
    for (let j = 0; j < 2; j++) {
      const from0 = dp[t - 1][0] + log(A[0][j]);
      const from1 = dp[t - 1][1] + log(A[1][j]);
      if (from0 > from1) {
        dp[t][j] = from0 + log(gauss(returns[t], means[j], stds[j]));
        ptr[t][j] = 0;
      } else {
        dp[t][j] = from1 + log(gauss(returns[t], means[j], stds[j]));
        ptr[t][j] = 1;
      }
    }
  }

  const path = Array(n).fill(0);
  path[n - 1] = dp[n - 1][1] > dp[n - 1][0] ? 1 : 0;
  for (let t = n - 2; t >= 0; t--) {
    path[t] = ptr[t + 1][path[t + 1]];
  }
  return path;
}

/** Percentile-based fallback: rolling 21-day vol vs 1y distribution. */
function fallbackRegimes(returns: number[]): number[] {
  const n = returns.length;
  const states = Array(n).fill(0);
  const window = 21;
  const vols: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i < window) {
      vols.push(0);
      continue;
    }
    const slice = returns.slice(i - window + 1, i + 1);
    vols.push(stdDev(slice));
  }
  const valid = vols.filter((_, i) => i >= window).sort((a, b) => a - b);
  const p75 = valid[Math.floor(valid.length * 0.75)] ?? 0;
  for (let i = 0; i < n; i++) {
    states[i] = vols[i] >= p75 && i >= window ? 1 : 0;
  }
  return states;
}

function labelFromStates(states: number[]): RegimeLabel {
  const last5 = states.slice(-5);
  const turbCount = last5.filter((s) => s === 1).length;
  return turbCount >= 3 ? 'turbulent' : 'calm';
}

/**
 * Detect continuous turbulent stretches and measure portfolio vs market return
 * during each stretch.
 */
function analyzePastTurbulence(
  states: number[],
  marketReturns: number[],
  portfolioReturns?: number[]
): {
  episodes: number;
  avgPortfolioReturn: number | null;
  avgMarketReturn: number;
  worstPortfolioReturn: number | null;
} {
  const episodes: { start: number; end: number }[] = [];
  let i = 0;
  while (i < states.length) {
    if (states[i] === 1) {
      const start = i;
      while (i < states.length && states[i] === 1) i++;
      // Keep stretches of at least 3 days
      if (i - start >= 3) episodes.push({ start, end: i - 1 });
    } else {
      i++;
    }
  }

  // Use last up to 8 episodes
  const recent = episodes.slice(-8);
  const mktRets: number[] = [];
  const portRets: number[] = [];

  for (const ep of recent) {
    let m = 0;
    for (let t = ep.start; t <= ep.end && t < marketReturns.length; t++) {
      m += marketReturns[t];
    }
    mktRets.push(m);

    if (portfolioReturns && portfolioReturns.length >= marketReturns.length) {
      const offset = portfolioReturns.length - marketReturns.length;
      let p = 0;
      for (let t = ep.start; t <= ep.end; t++) {
        p += portfolioReturns[offset + t] ?? 0;
      }
      portRets.push(p);
    } else if (portfolioReturns && portfolioReturns.length > 0) {
      // Align from the end
      const endOff = marketReturns.length - 1 - ep.end;
      const startOff = marketReturns.length - 1 - ep.start;
      const pEnd = portfolioReturns.length - 1 - endOff;
      const pStart = portfolioReturns.length - 1 - startOff;
      if (pStart >= 0 && pEnd < portfolioReturns.length) {
        let p = 0;
        for (let t = pStart; t <= pEnd; t++) p += portfolioReturns[t];
        portRets.push(p);
      }
    }
  }

  return {
    episodes: recent.length,
    avgMarketReturn: mktRets.length ? mean(mktRets) : 0,
    avgPortfolioReturn: portRets.length ? mean(portRets) : null,
    worstPortfolioReturn: portRets.length ? Math.min(...portRets) : null,
  };
}

/**
 * Main entry: fit HMM (or fallback) and return regime diagnosis.
 */
export function detectVolatilityRegime(input: RegimeInput): VolatilityRegimeResult | null {
  const { benchmarkCloses, portfolioDailyReturns, maxIter = 15 } = input;
  if (benchmarkCloses.length < 80) return null;

  const returns = logReturns(benchmarkCloses);
  if (returns.length < 60) return null;

  let method: 'hmm' | 'percentile' = 'hmm';
  let states: number[];
  let calmVol = 0;
  let turbVol = 0;

  const hmm = fitTwoStateHMM(returns, maxIter);
  if (hmm) {
    states = hmm.states;
    calmVol = hmm.stds[0] * Math.sqrt(252);
    turbVol = hmm.stds[1] * Math.sqrt(252);
  } else {
    method = 'percentile';
    states = fallbackRegimes(returns);
    const calmR = returns.filter((_, i) => states[i] === 0);
    const turbR = returns.filter((_, i) => states[i] === 1);
    calmVol = stdDev(calmR) * Math.sqrt(252);
    turbVol = stdDev(turbR) * Math.sqrt(252);
  }

  const current = labelFromStates(states);
  const past = analyzePastTurbulence(returns, returns, portfolioDailyReturns);

  // Last 90 days timeline for UI
  const timeline = states.slice(-90).map((s) => (s === 1 ? 'turbulent' : 'calm') as RegimeLabel);

  return {
    current,
    method,
    calmAnnualVol: calmVol,
    turbulentAnnualVol: turbVol,
    timeline,
    pastTurbulentEpisodes: past.episodes,
    avgPortfolioReturnInTurbulence: past.avgPortfolioReturn,
    avgMarketReturnInTurbulence: past.avgMarketReturn,
    worstPortfolioReturnInTurbulence: past.worstPortfolioReturn,
    plainSummary:
      current === 'turbulent'
        ? 'Markets look turbulent right now — swings are larger than usual.'
        : 'Markets look relatively calm right now.',
  };
}
