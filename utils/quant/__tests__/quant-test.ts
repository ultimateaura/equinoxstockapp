/**
 * Deterministic unit tests for the quant engine. These run with fixed inputs so
 * they always produce the same result - no network, no randomness (except the
 * optimizer, which we only check for structural validity).
 */

import {
  annualizedVolatility,
  beta,
  dailyReturns,
  ema,
  maxDrawdown,
  rsi,
  sma,
  sharpeRatio,
  trailingReturn,
  covarianceMatrix,
} from '../indicators';
import {
  compositeScore,
  computeConfidence,
  computeFactors,
  scoreToSignal,
} from '../factorModel';
import { optimizePortfolio } from '../portfolioOptimizer';

// A steadily rising series and a flat series for predictable assertions.
const rising = Array.from({ length: 260 }, (_, i) => 100 * Math.pow(1.001, i));
const flat = Array.from({ length: 260 }, () => 100);

describe('indicators', () => {
  test('dailyReturns length is n-1', () => {
    expect(dailyReturns([100, 110, 121]).length).toBe(2);
    expect(dailyReturns([100, 110])[0]).toBeCloseTo(0.1, 6);
  });

  test('sma of constant series equals the constant', () => {
    expect(sma(flat, 50)).toBeCloseTo(100, 6);
  });

  test('ema returns a full-length series', () => {
    expect(ema(rising, 10).length).toBe(rising.length);
  });

  test('annualized volatility of a flat series is 0', () => {
    expect(annualizedVolatility(dailyReturns(flat))).toBeCloseTo(0, 6);
  });

  test('RSI of a monotonic uptrend is high', () => {
    expect(rsi(rising)).toBeGreaterThan(70);
  });

  test('max drawdown of a rising series is ~0', () => {
    expect(maxDrawdown(rising)).toBeLessThan(0.01);
  });

  test('max drawdown captures a 50% fall', () => {
    expect(maxDrawdown([100, 120, 60, 80])).toBeCloseTo(0.5, 6);
  });

  test('trailing return over the whole window is positive for uptrend', () => {
    expect(trailingReturn(rising, 252)).toBeGreaterThan(0);
  });

  test('beta of a series with itself is 1', () => {
    const r = dailyReturns(rising);
    expect(beta(r, r)).toBeCloseTo(1, 6);
  });

  test('sharpe ratio of flat series is 0', () => {
    expect(sharpeRatio(dailyReturns(flat))).toBe(0);
  });

  test('covariance matrix is square and symmetric', () => {
    const m = covarianceMatrix([dailyReturns(rising), dailyReturns(flat)]);
    expect(m.length).toBe(2);
    expect(m[0][1]).toBeCloseTo(m[1][0], 9);
  });
});

describe('factor model', () => {
  test('scores are within 0-100', () => {
    const f = computeFactors({ closes: rising, benchmarkCloses: flat });
    Object.values(f).forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    });
  });

  test('an uptrend scores higher on trend than a flat series', () => {
    const up = computeFactors({ closes: rising });
    const noTrend = computeFactors({ closes: flat });
    expect(up.trend).toBeGreaterThan(noTrend.trend);
  });

  test('composite maps to a valid signal', () => {
    const f = computeFactors({ closes: rising, benchmarkCloses: flat });
    const score = compositeScore(f);
    expect(['Buy', 'Hold', 'Watch']).toContain(scoreToSignal(score));
  });

  test('confidence is 0 when all factors are neutral', () => {
    const neutral = { momentum: 50, trend: 50, value: 50, lowVolatility: 50, quality: 50 };
    expect(computeConfidence(neutral)).toBeCloseTo(0, 6);
  });
});

describe('portfolio optimizer', () => {
  test('returns weights that sum to ~1 and respect length', () => {
    const a = dailyReturns(rising);
    const b = dailyReturns(flat.map((x, i) => x + Math.sin(i))); // mild wiggle
    const res = optimizePortfolio({
      tickers: ['A', 'B'],
      returnSeries: [a, b],
      currentWeights: [0.5, 0.5],
      samples: 500,
    });
    expect(res).not.toBeNull();
    const sum = res!.suggestedWeights.reduce((x, y) => x + y, 0);
    expect(sum).toBeCloseTo(1, 4);
    expect(res!.suggestedWeights.length).toBe(2);
  });

  test('returns null for a single asset', () => {
    expect(
      optimizePortfolio({
        tickers: ['A'],
        returnSeries: [dailyReturns(rising)],
        currentWeights: [1],
      })
    ).toBeNull();
  });
});
