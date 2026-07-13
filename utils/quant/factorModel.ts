/**
 * factorModel.ts - The transparent "classical" half of the recommendation brain.
 *
 * It converts raw indicators into five named factors that a beginner can reason
 * about, scores each 0-100 (higher = more attractive), then combines them with
 * fixed weights into one composite score and a Buy / Hold / Watch signal.
 *
 * This is multi-factor investing in miniature - the same idea behind real
 * "smart beta" strategies (momentum, value, low-volatility, quality), just made
 * explicit and explainable rather than hidden inside a black box.
 */

import {
  annualizedVolatility,
  dailyReturns,
  logisticScore,
  maxDrawdown,
  rsi,
  sharpeRatio,
  sma,
  trailingReturn,
  clamp,
} from './indicators';
import { FactorReason, FactorScores, Signal } from './types';

export interface FactorInput {
  closes: number[];            // oldest -> newest daily closes
  benchmarkCloses?: number[];  // SPY closes, aligned by recency
  peRatio?: number;            // trailing P/E from fundamentals
  priceToBook?: number;        // P/B from fundamentals
}

/** Weights for blending factors into the composite. Must sum to 1. */
export const FACTOR_WEIGHTS: Record<keyof FactorScores, number> = {
  momentum: 0.3,
  trend: 0.25,
  value: 0.15,
  lowVolatility: 0.15,
  quality: 0.15,
};

const TRADING_DAYS = {
  threeMonth: 63,
  sixMonth: 126,
  twelveMonth: 252,
};

/**
 * Momentum: stocks that have been rising tend to keep rising over the medium
 * term (a well-documented market anomaly). We blend 3/6/12-month trailing
 * returns and, when we have the benchmark, reward beating the market.
 */
function momentumScore(closes: number[], benchmark?: number[]): number {
  const r3 = trailingReturn(closes, TRADING_DAYS.threeMonth);
  const r6 = trailingReturn(closes, TRADING_DAYS.sixMonth);
  const r12 = trailingReturn(closes, TRADING_DAYS.twelveMonth);
  let blended = 0.5 * r6 + 0.3 * r12 + 0.2 * r3;

  // Relative momentum: subtract the market's own 6-month return if available.
  if (benchmark && benchmark.length > TRADING_DAYS.sixMonth) {
    const mkt6 = trailingReturn(benchmark, TRADING_DAYS.sixMonth);
    blended -= 0.3 * mkt6;
  }
  // A 6-month return of ~+10% maps near 65; flat maps to 50.
  return clamp(logisticScore(blended, 0, 0.18), 0, 100);
}

/**
 * Trend: is the price structurally above its moving averages? We combine the
 * gap to the 50-day SMA, the gap to the 200-day SMA, and a "golden cross" bonus
 * (50-day above 200-day, a classic bullish signal).
 */
function trendScore(closes: number[]): number {
  const price = closes[closes.length - 1];
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);

  let score = 50;
  if (isFinite(sma50) && sma50 > 0) {
    score += clamp((price / sma50 - 1) * 200, -25, 25); // +/-25 for +/-12.5%
  }
  if (isFinite(sma200) && sma200 > 0) {
    score += clamp((price / sma200 - 1) * 100, -15, 15);
  }
  if (isFinite(sma50) && isFinite(sma200)) {
    score += sma50 >= sma200 ? 10 : -10; // golden vs death cross
  }
  return clamp(score, 0, 100);
}

/**
 * Value: cheaper stocks (low P/E, low P/B) have historically outperformed.
 * We score each ratio against rough market-typical levels and average them.
 * Missing fundamentals -> neutral 50 so we never penalize for absent data.
 */
function valueScore(peRatio?: number, priceToBook?: number): number {
  const parts: number[] = [];
  if (peRatio && peRatio > 0) {
    // P/E of ~18 is "average" -> 50; lower P/E -> higher score.
    parts.push(clamp(logisticScore(-peRatio, -18, 12), 0, 100));
  }
  if (priceToBook && priceToBook > 0) {
    // P/B of ~3 -> 50; lower -> higher.
    parts.push(clamp(logisticScore(-priceToBook, -3, 2.5), 0, 100));
  }
  if (parts.length === 0) return 50;
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

/**
 * Low volatility: calmer stocks earn higher risk-adjusted returns on average
 * (the "low-vol anomaly"). We invert annualized volatility - ~15%/yr maps near
 * 50, calmer scores higher.
 */
function lowVolatilityScore(closes: number[]): number {
  const vol = annualizedVolatility(dailyReturns(closes));
  // Invert: higher vol -> lower score. 0.15 vol -> ~50.
  return clamp(logisticScore(-vol, -0.25, 0.15), 0, 100);
}

/**
 * Quality (here a price-based proxy): steady risk-adjusted gains and shallow
 * drawdowns. Combines the Sharpe ratio with the inverse of max drawdown.
 */
function qualityScore(closes: number[]): number {
  const rets = dailyReturns(closes);
  const sharpe = sharpeRatio(rets);
  const mdd = maxDrawdown(closes);
  const sharpePart = clamp(logisticScore(sharpe, 0.5, 0.8), 0, 100);
  const ddPart = clamp(logisticScore(-mdd, -0.3, 0.2), 0, 100); // 30% DD -> ~50
  return 0.6 * sharpePart + 0.4 * ddPart;
}

export function computeFactors(input: FactorInput): FactorScores {
  return {
    momentum: momentumScore(input.closes, input.benchmarkCloses),
    trend: trendScore(input.closes),
    value: valueScore(input.peRatio, input.priceToBook),
    lowVolatility: lowVolatilityScore(input.closes),
    quality: qualityScore(input.closes),
  };
}

/** Weighted blend of the five factors into a single 0-100 composite. */
export function compositeScore(factors: FactorScores): number {
  let total = 0;
  (Object.keys(FACTOR_WEIGHTS) as (keyof FactorScores)[]).forEach((k) => {
    total += factors[k] * FACTOR_WEIGHTS[k];
  });
  return clamp(total, 0, 100);
}

/**
 * Map a 0-100 score to a Buy / Hold / Watch signal.
 * We deliberately call it a "signal", never advice - it is a quantitative
 * read, not a personalized recommendation to transact.
 */
export function scoreToSignal(score: number): Signal {
  if (score >= 65) return 'Buy';
  if (score >= 45) return 'Hold';
  return 'Watch';
}

const FACTOR_LABELS: Record<keyof FactorScores, string> = {
  momentum: 'Momentum',
  trend: 'Trend',
  value: 'Value',
  lowVolatility: 'Stability',
  quality: 'Quality',
};

function explain(factor: keyof FactorScores, score: number): string {
  const strong = score >= 65;
  const weak = score <= 35;
  switch (factor) {
    case 'momentum':
      return strong
        ? 'Has been climbing faster than the market recently.'
        : weak
        ? 'Recent price trend has been weak or falling.'
        : 'Recent price trend is roughly in line with the market.';
    case 'trend':
      return strong
        ? 'Trading above its key moving averages (uptrend).'
        : weak
        ? 'Trading below its key moving averages (downtrend).'
        : 'Price is hovering around its moving averages.';
    case 'value':
      return strong
        ? 'Looks inexpensive on earnings/book value.'
        : weak
        ? 'Looks expensive on earnings/book value.'
        : 'Valuation is around typical market levels.';
    case 'lowVolatility':
      return strong
        ? 'Relatively calm, smaller day-to-day swings.'
        : weak
        ? 'Quite volatile, larger price swings.'
        : 'Average volatility for a stock.';
    case 'quality':
      return strong
        ? 'Steady risk-adjusted returns with shallow drawdowns.'
        : weak
        ? 'Bumpy returns and deep past drawdowns.'
        : 'Middle-of-the-road risk-adjusted track record.';
  }
}

/** Build the top-N plain-English reasons, strongest factors first. */
export function buildReasons(factors: FactorScores, topN = 3): FactorReason[] {
  return (Object.keys(factors) as (keyof FactorScores)[])
    .map((factor) => ({
      factor,
      score: factors[factor],
      label: FACTOR_LABELS[factor],
      explanation: explain(factor, factors[factor]),
    }))
    .sort((a, b) => Math.abs(b.score - 50) - Math.abs(a.score - 50))
    .slice(0, topN);
}

/**
 * Confidence = how much the factors agree. If every factor points the same way
 * we are confident; if they are scattered around 50 we are not. Implemented as
 * a function of the spread of factor scores from neutral.
 */
export function computeConfidence(factors: FactorScores): number {
  const vals = Object.values(factors);
  const avgDistance = vals.reduce((a, b) => a + Math.abs(b - 50), 0) / vals.length;
  // 0 distance -> 0 confidence, 50 distance -> 100 confidence.
  return clamp((avgDistance / 50) * 100, 0, 100);
}

/** Latest RSI exposed for UI context (overbought / oversold hints). */
export function latestRsi(closes: number[]): number {
  return rsi(closes);
}
