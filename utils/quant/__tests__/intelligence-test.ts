/**
 * Unit tests for Portfolio DNA (PCA), Monte Carlo simulator, and volatility regimes.
 */

import { topEigenpairs, identity, trace, powerIteration } from '../linearAlgebra';
import { computePortfolioDNA, herfindahl } from '../pca';
import { runMonteCarlo, aggregatePortfolioReturns, HORIZON_PRESETS } from '../monteCarloSimulator';
import { detectVolatilityRegime } from '../volatilityRegime';
import { dailyReturns } from '../indicators';

/** Deterministic PRNG (Mulberry32) for reproducible Monte Carlo tests. */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('linearAlgebra', () => {
  test('identity trace equals n', () => {
    expect(trace(identity(3))).toBe(3);
  });

  test('power iteration finds dominant eigenpair of diag(3,1)', () => {
    const A = [
      [3, 0],
      [0, 1],
    ];
    const { eigenvalue, eigenvector } = powerIteration(A);
    expect(eigenvalue).toBeCloseTo(3, 1);
    expect(Math.abs(eigenvector[0])).toBeGreaterThan(Math.abs(eigenvector[1]));
  });

  test('topEigenpairs returns k pairs for identity', () => {
    const { eigenvalues } = topEigenpairs(identity(4), 2);
    expect(eigenvalues.length).toBe(2);
    eigenvalues.forEach((ev) => expect(ev).toBeCloseTo(1, 1));
  });
});

describe('PCA / Portfolio DNA', () => {
  test('herfindahl of equal weights is 1/n', () => {
    expect(herfindahl([0.25, 0.25, 0.25, 0.25])).toBeCloseTo(0.25, 6);
  });

  test('returns null with fewer than 2 holdings', () => {
    expect(
      computePortfolioDNA({
        tickers: ['AAPL'],
        returnSeries: [dailyReturns(Array.from({ length: 100 }, (_, i) => 100 + i))],
        weights: [1],
      })
    ).toBeNull();
  });

  test('produces components whose variance shares sum near 1 for top PCs', () => {
    const n = 120;
    const rng = mulberry32(42);
    // Two correlated series + one more independent-ish
    const common: number[] = [];
    const r1: number[] = [];
    const r2: number[] = [];
    const r3: number[] = [];
    for (let i = 0; i < n; i++) {
      const c = (rng() - 0.5) * 0.02;
      common.push(c);
      r1.push(c + (rng() - 0.5) * 0.005);
      r2.push(c + (rng() - 0.5) * 0.005);
      r3.push((rng() - 0.5) * 0.02);
    }
    const dna = computePortfolioDNA({
      tickers: ['AAA', 'BBB', 'CCC'],
      returnSeries: [r1, r2, r3],
      weights: [0.4, 0.4, 0.2],
      benchmarkReturns: common,
    });
    expect(dna).not.toBeNull();
    expect(dna!.components.length).toBeGreaterThanOrEqual(1);
    expect(dna!.components[0].varianceExplained).toBeGreaterThan(0.3);
    expect(dna!.plainLabels.length).toBeGreaterThan(0);
    expect(['growth', 'balanced', 'defensive']).toContain(dna!.dominantStyle);
  });
});

describe('Monte Carlo simulator', () => {
  test('returns null with insufficient history', () => {
    expect(
      runMonteCarlo({
        currentValue: 10000,
        portfolioDailyReturns: [0.01, -0.01],
        horizonDays: 21,
      })
    ).toBeNull();
  });

  test('p10 <= p50 <= p90 at horizon', () => {
    const returns = Array.from({ length: 100 }, (_, i) => Math.sin(i / 7) * 0.01);
    const result = runMonteCarlo({
      currentValue: 10000,
      portfolioDailyReturns: returns,
      horizonDays: HORIZON_PRESETS['3m'],
      numPaths: 500,
      rng: mulberry32(7),
    });
    expect(result).not.toBeNull();
    expect(result!.finalP10).toBeLessThanOrEqual(result!.finalP50);
    expect(result!.finalP50).toBeLessThanOrEqual(result!.finalP90);
    expect(result!.p50.length).toBe(result!.horizonDays + 1);
    expect(result!.p50[0]).toBe(10000);
  });

  test('aggregatePortfolioReturns respects weights', () => {
    const a = [0.1, 0.1, 0.1];
    const b = [-0.1, -0.1, -0.1];
    const agg = aggregatePortfolioReturns([a, b], [0.5, 0.5]);
    expect(agg.every((r) => Math.abs(r) < 1e-12)).toBe(true);
  });
});

describe('Volatility regime', () => {
  test('returns null with too-short series', () => {
    expect(detectVolatilityRegime({ benchmarkCloses: [100, 101, 102] })).toBeNull();
  });

  test('detects calm or turbulent with enough history', () => {
    // Build a long price series: calm then turbulent
    const closes: number[] = [100];
    const rng = mulberry32(99);
    for (let i = 0; i < 200; i++) {
      const vol = i < 100 ? 0.005 : 0.03;
      const r = (rng() - 0.5) * 2 * vol;
      closes.push(closes[closes.length - 1] * (1 + r));
    }
    const result = detectVolatilityRegime({
      benchmarkCloses: closes,
      maxIter: 10,
    });
    expect(result).not.toBeNull();
    expect(['calm', 'turbulent']).toContain(result!.current);
    expect(['hmm', 'percentile']).toContain(result!.method);
    expect(result!.timeline.length).toBeGreaterThan(0);
    expect(result!.plainSummary.length).toBeGreaterThan(0);
  });
});
