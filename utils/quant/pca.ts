/**
 * pca.ts - Portfolio DNA via Principal Component Analysis.
 *
 * Takes aligned daily return series for each holding, builds a correlation
 * matrix, extracts the top 2–3 principal components, and maps them to
 * beginner-friendly labels (market exposure, growth vs defensive, etc.).
 */

import { correlationMatrix, mean } from './indicators';
import { topEigenpairs, trace } from './linearAlgebra';
import { PortfolioDNA, PortfolioDNAComponent } from './types';

export interface PCAInput {
  tickers: string[];
  /** One daily-return series per ticker (aligned by caller). */
  returnSeries: number[][];
  /** Portfolio weights (sum to 1). */
  weights: number[];
  /** Optional SPY (or benchmark) returns for labeling PC1 as market exposure. */
  benchmarkReturns?: number[];
}

const MAX_TICKERS = 15;
const NUM_COMPONENTS = 3;

/**
 * Correlate a PC loading vector with the benchmark return series projected
 * onto holdings. We approximate market loading of PC i as:
 * corr(PC_scores, benchmark) where PC_scores_t = sum_j loading_j * r_j,t
 */
function corrWithBenchmark(
  loadings: number[],
  returnSeries: number[][],
  benchmarkReturns: number[]
): number {
  const n = returnSeries.length;
  const minLen = Math.min(
    ...returnSeries.map((s) => s.length),
    benchmarkReturns.length
  );
  if (minLen < 10) return 0;

  const scores: number[] = [];
  const bench: number[] = [];
  for (let t = 0; t < minLen; t++) {
    let s = 0;
    for (let i = 0; i < n; i++) {
      const series = returnSeries[i];
      s += loadings[i] * series[series.length - minLen + t];
    }
    scores.push(s);
    bench.push(benchmarkReturns[benchmarkReturns.length - minLen + t]);
  }

  const ms = mean(scores);
  const mb = mean(bench);
  let cov = 0;
  let vs = 0;
  let vb = 0;
  for (let t = 0; t < minLen; t++) {
    const ds = scores[t] - ms;
    const db = bench[t] - mb;
    cov += ds * db;
    vs += ds * ds;
    vb += db * db;
  }
  const denom = Math.sqrt(vs * vb);
  return denom === 0 ? 0 : cov / denom;
}

function labelComponent(
  index: number,
  varianceExplained: number,
  loadings: Record<string, number>,
  marketCorr: number
): string {
  if (index === 0 && Math.abs(marketCorr) > 0.5) {
    return marketCorr > 0 ? 'Market exposure' : 'Market-contra (hedge-like)';
  }
  const sorted = Object.entries(loadings).sort(
    (a, b) => Math.abs(b[1]) - Math.abs(a[1])
  );
  const top = sorted.slice(0, 2).map(([t]) => t);
  if (index === 0) return `Main theme (${top.join(', ')})`;
  if (index === 1) return `Secondary tilt (${top.join(' vs ')})`;
  return `Niche factor (${top[0] ?? 'misc'})`;
}

function dominantStyleFromWeights(
  weights: number[],
  returnSeries: number[][]
): 'growth' | 'balanced' | 'defensive' {
  // Rough: high recent vol or high trailing return → growth; low vol → defensive.
  const vols = returnSeries.map((r) => {
    if (r.length < 20) return 0;
    const slice = r.slice(-63);
    const m = mean(slice);
    const v =
      slice.reduce((a, x) => a + (x - m) * (x - m), 0) / Math.max(1, slice.length - 1);
    return Math.sqrt(v) * Math.sqrt(252);
  });
  let wVol = 0;
  for (let i = 0; i < weights.length; i++) wVol += (weights[i] ?? 0) * (vols[i] ?? 0);
  if (wVol > 0.28) return 'growth';
  if (wVol < 0.15) return 'defensive';
  return 'balanced';
}

/** Herfindahl-Hirschman Index of weights (1 = all in one name). */
export function herfindahl(weights: number[]): number {
  return weights.reduce((a, w) => a + w * w, 0);
}

/**
 * Run PCA on the correlation matrix of holding returns.
 * Returns null if fewer than 2 holdings have usable data.
 */
export function computePortfolioDNA(input: PCAInput): PortfolioDNA | null {
  let { tickers, returnSeries, weights, benchmarkReturns } = input;

  if (tickers.length < 2) return null;

  // Cap ticker count for performance.
  if (tickers.length > MAX_TICKERS) {
    const indexed = tickers
      .map((t, i) => ({ t, i, w: weights[i] ?? 0 }))
      .sort((a, b) => b.w - a.w)
      .slice(0, MAX_TICKERS);
    tickers = indexed.map((x) => x.t);
    returnSeries = indexed.map((x) => returnSeries[x.i]);
    const wSum = indexed.reduce((a, x) => a + x.w, 0) || 1;
    weights = indexed.map((x) => x.w / wSum);
  }

  const minLen = Math.min(...returnSeries.map((s) => s.length));
  if (minLen < 30) return null;

  const corr = correlationMatrix(returnSeries);
  const totalVar = trace(corr);
  if (totalVar <= 0) return null;

  const { eigenvalues, eigenvectors } = topEigenpairs(corr, NUM_COMPONENTS);
  if (eigenvalues.length === 0) return null;

  const components: PortfolioDNAComponent[] = eigenvalues.map((ev, idx) => {
    const evec = eigenvectors[idx];
    const loadings: Record<string, number> = {};
    for (let i = 0; i < tickers.length; i++) {
      loadings[tickers[i]] = evec[i];
    }
    const marketCorr = benchmarkReturns
      ? corrWithBenchmark(evec, returnSeries, benchmarkReturns)
      : 0;
    const varianceExplained = Math.max(0, ev / totalVar);
    return {
      label: labelComponent(idx, varianceExplained, loadings, marketCorr),
      varianceExplained,
      loadings,
      marketCorr,
    };
  });

  const concentrationRisk = herfindahl(weights);
  const style = dominantStyleFromWeights(weights, returnSeries);

  const plainLabels: string[] = [];
  const pc1 = components[0];
  if (pc1) {
    plainLabels.push(
      `${(pc1.varianceExplained * 100).toFixed(0)}% of how your holdings move together is explained by "${pc1.label}".`
    );
  }
  if (concentrationRisk > 0.35) {
    plainLabels.push('Your portfolio is concentrated — a few names drive most of the risk.');
  } else if (concentrationRisk < 0.15) {
    plainLabels.push('Your portfolio looks relatively diversified across names.');
  }
  plainLabels.push(
    style === 'growth'
      ? 'Overall style leans growth (higher day-to-day swings).'
      : style === 'defensive'
        ? 'Overall style leans defensive (calmer day-to-day swings).'
        : 'Overall style looks balanced between growth and defensive.'
  );

  return {
    components,
    concentrationRisk,
    dominantStyle: style,
    plainLabels,
    tickers,
    method: 'PCA on return correlation matrix',
  };
}
