/**
 * indicators.ts - Pure, deterministic math on a price series.
 *
 * Nothing here touches the network or React. Every function takes plain arrays
 * and returns numbers, so it is trivial to unit-test and reason about. These are
 * the same building blocks professional quants use, just implemented from
 * scratch so the logic is fully visible.
 */

/**
 * Simple (arithmetic) daily returns.
 * return_t = (price_t - price_(t-1)) / price_(t-1)
 * A price series of length N produces N-1 returns.
 */
export function dailyReturns(prices: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1];
    if (prev > 0) out.push((prices[i] - prev) / prev);
  }
  return out;
}

/**
 * Log returns: ln(price_t / price_(t-1)). Log returns add up over time, which
 * makes them nicer for statistics (volatility, etc.).
 */
export function logReturns(prices: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0 && prices[i] > 0) {
      out.push(Math.log(prices[i] / prices[i - 1]));
    }
  }
  return out;
}

export function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/**
 * Sample standard deviation (divides by n-1, the unbiased estimator).
 * std = sqrt( sum((x - mean)^2) / (n - 1) )
 */
export function stdDev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const variance = xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

/** Simple moving average of the last `window` values. */
export function sma(values: number[], window: number): number {
  if (values.length < window || window <= 0) return NaN;
  const slice = values.slice(values.length - window);
  return mean(slice);
}

/**
 * Exponential moving average. Unlike the SMA, it weights recent prices more.
 * Smoothing factor k = 2 / (window + 1); ema_t = price_t*k + ema_(t-1)*(1-k).
 * Returns the full EMA series.
 */
export function ema(values: number[], window: number): number[] {
  if (values.length === 0 || window <= 0) return [];
  const k = 2 / (window + 1);
  const out: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    out.push(values[i] * k + out[i - 1] * (1 - k));
  }
  return out;
}

/**
 * Annualized volatility = stdev of daily returns * sqrt(252).
 * 252 = roughly the number of trading days in a year. This is the standard way
 * to express "how bumpy" a stock is as a yearly percentage.
 */
export function annualizedVolatility(returns: number[]): number {
  return stdDev(returns) * Math.sqrt(252);
}

/**
 * RSI (Relative Strength Index), Wilder's smoothing, default 14 periods.
 * RSI = 100 - 100 / (1 + RS), where RS = avgGain / avgLoss.
 * Ranges 0-100: >70 often called "overbought", <30 "oversold".
 */
export function rsi(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50; // neutral default
  let avgGain = 0;
  let avgLoss = 0;

  // Seed with the first `period` changes.
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change >= 0) avgGain += change;
    else avgLoss -= change;
  }
  avgGain /= period;
  avgLoss /= period;

  // Wilder smoothing for the rest of the series.
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Maximum drawdown: the largest peak-to-trough drop, as a positive fraction.
 * Walk forward tracking the running peak; the worst (price/peak - 1) is the MDD.
 * A value of 0.4 means the asset once fell 40% from a high.
 */
export function maxDrawdown(prices: number[]): number {
  if (prices.length === 0) return 0;
  let peak = prices[0];
  let maxDd = 0;
  for (const p of prices) {
    if (p > peak) peak = p;
    if (peak > 0) {
      const dd = p / peak - 1; // negative or zero
      if (dd < maxDd) maxDd = dd;
    }
  }
  return Math.abs(maxDd);
}

/**
 * Trailing total return over the last `lookback` bars: price_last / price_(last-lookback) - 1.
 * This is the core of the "momentum" factor.
 */
export function trailingReturn(prices: number[], lookback: number): number {
  if (prices.length <= lookback) return 0;
  const start = prices[prices.length - 1 - lookback];
  const end = prices[prices.length - 1];
  if (start <= 0) return 0;
  return end / start - 1;
}

/**
 * Z-score of the latest price vs its own moving average:
 * z = (price - SMA) / stdev(price window).
 * Big positive z = stretched above average (mean-reversion would expect a pull
 * back down); big negative z = unusually cheap vs its own recent range.
 */
export function priceZScore(prices: number[], window: number): number {
  if (prices.length < window) return 0;
  const slice = prices.slice(prices.length - window);
  const m = mean(slice);
  const sd = stdDev(slice);
  if (sd === 0) return 0;
  return (prices[prices.length - 1] - m) / sd;
}

/**
 * Beta vs a benchmark (e.g. SPY): how much the stock moves when the market moves.
 * beta = covariance(stockReturns, marketReturns) / variance(marketReturns).
 * beta 1 = moves with the market, >1 = more sensitive, <1 = calmer.
 * The two return arrays are aligned from the most recent end.
 */
export function beta(stockReturns: number[], marketReturns: number[]): number {
  const n = Math.min(stockReturns.length, marketReturns.length);
  if (n < 2) return 1;
  const s = stockReturns.slice(stockReturns.length - n);
  const m = marketReturns.slice(marketReturns.length - n);
  const ms = mean(s);
  const mm = mean(m);
  let cov = 0;
  let varM = 0;
  for (let i = 0; i < n; i++) {
    cov += (s[i] - ms) * (m[i] - mm);
    varM += (m[i] - mm) * (m[i] - mm);
  }
  if (varM === 0) return 1;
  return cov / varM;
}

/**
 * Annualized Sharpe ratio: risk-adjusted return.
 * Sharpe = (meanDailyReturn - dailyRiskFree) / stdevDailyReturn * sqrt(252).
 * Higher = more return per unit of risk. riskFreeAnnual defaults to 4%.
 */
export function sharpeRatio(returns: number[], riskFreeAnnual = 0.04): number {
  if (returns.length < 2) return 0;
  const dailyRf = riskFreeAnnual / 252;
  const excess = returns.map((r) => r - dailyRf);
  const sd = stdDev(returns);
  if (sd === 0) return 0;
  return (mean(excess) / sd) * Math.sqrt(252);
}

/**
 * Covariance matrix of a set of return series (each row = one asset's returns).
 * cov[i][j] = average over time of (r_i - mean_i)(r_j - mean_j).
 * Used by the portfolio optimizer to understand how holdings move together.
 * Series are aligned to the shortest length from the most recent end.
 */
export function covarianceMatrix(returnSeries: number[][]): number[][] {
  const n = returnSeries.length;
  if (n === 0) return [];
  const minLen = Math.min(...returnSeries.map((s) => s.length));
  if (minLen < 2) return Array.from({ length: n }, () => Array(n).fill(0));

  const aligned = returnSeries.map((s) => s.slice(s.length - minLen));
  const means = aligned.map(mean);

  const cov: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let sum = 0;
      for (let t = 0; t < minLen; t++) {
        sum += (aligned[i][t] - means[i]) * (aligned[j][t] - means[j]);
      }
      const c = sum / (minLen - 1);
      cov[i][j] = c;
      cov[j][i] = c; // symmetric
    }
  }
  return cov;
}

/** Correlation matrix derived from the covariance matrix (cov normalized to -1..1). */
export function correlationMatrix(returnSeries: number[][]): number[][] {
  const cov = covarianceMatrix(returnSeries);
  const n = cov.length;
  const corr: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const denom = Math.sqrt(cov[i][i] * cov[j][j]);
      corr[i][j] = denom === 0 ? (i === j ? 1 : 0) : cov[i][j] / denom;
    }
  }
  return corr;
}

/**
 * Clamp helper used when mapping raw metrics onto 0-100 display scales.
 */
export function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/**
 * Map a value to 0-100 using a logistic (S-curve) so extreme inputs saturate
 * smoothly instead of clipping hard. `center` maps to 50, `scale` controls width.
 */
export function logisticScore(x: number, center: number, scale: number): number {
  if (scale === 0) return 50;
  const z = (x - center) / scale;
  return 100 / (1 + Math.exp(-z));
}
