/**
 * recommendationService.ts - Orchestrates the whole recommendation pipeline.
 *
 * Flow for one stock:
 *   price history + fundamentals
 *        -> indicators -> factorModel (classical 0-100 score)
 *        -> features   -> mlModel     (learned 0-100 score)
 *        -> blend the two -> Buy / Hold / Watch + plain-English reasons
 *
 * The blend keeps the app honest: the transparent factor score and the learned
 * ML score are shown side by side, and the final number is just their average.
 * Everything is a "recommendation, not financial advice".
 */

import { marketDataService } from './marketDataService';
import { stockApiService } from './stockApi';
import { cacheService } from './cacheService';
import {
  buildReasons,
  compositeScore,
  computeConfidence,
  computeFactors,
  scoreToSignal,
} from './quant/factorModel';
import { mlModelService } from './quant/mlModel';
import { optimizePortfolio } from './quant/portfolioOptimizer';
import { dailyReturns } from './quant/indicators';
import { OptimizationResult, StockRecommendation } from './quant/types';

const DISCLAIMER =
  'This is an algorithmic recommendation for educational purposes, not financial advice.';
// Bump the version suffix whenever the data source or scoring changes so stale
// cached results (e.g. from the broken Stooq period) are ignored.
const REC_CACHE_PREFIX = 'rec:v2:';
const REC_CACHE_MS = 6 * 60 * 60 * 1000; // 6h
const ML_BLEND_WEIGHT = 0.5;

class RecommendationService {
  /** Full recommendation for a single ticker. Never throws. */
  async getRecommendation(
    ticker: string,
    companyName?: string,
    useCache = true
  ): Promise<StockRecommendation> {
    const sym = ticker.toUpperCase();
    const cacheKey = `${REC_CACHE_PREFIX}${sym}`;

    if (useCache) {
      const cached = await cacheService.getCache<StockRecommendation>(cacheKey);
      if (cached) return cached;
    }

    // Fetch price history, benchmark, and fundamentals together.
    const [history, benchmarkCloses, detailsRes] = await Promise.all([
      marketDataService.getDailyHistory(sym),
      marketDataService.getBenchmarkCloses(),
      stockApiService.getStockDetails(sym).catch(() => null),
    ]);

    const closes = history.bars.map((b) => b.close);
    const details = detailsRes?.success ? detailsRes.data : undefined;
    const peRatio = details?.trailingPE;
    const priceToBook = details?.priceToBook;

    const dataQuality =
      closes.length >= 200 ? 'full' : closes.length >= 60 ? 'partial' : 'insufficient';

    console.log(
      `[rec] ${sym}: ${closes.length} bars (source=${history.source}, quality=${dataQuality})`
    );

    // Not enough data to compute anything meaningful. Do NOT cache this - it is
    // usually a transient data-fetch failure, and caching it would hide a later
    // successful fetch behind a stale "insufficient" result.
    if (dataQuality === 'insufficient') {
      return this.neutralRecommendation(sym, companyName, closes.length);
    }

    // 1) Classical factor model
    const factors = computeFactors({ closes, benchmarkCloses, peRatio, priceToBook });
    const classicalScore = compositeScore(factors);

    // 2) Learned ML model
    const ml = mlModelService.predict({ closes, benchmarkCloses, peRatio, priceToBook });
    const mlScore = ml.source === 'unavailable' ? null : ml.score;

    // 3) Blend
    const score =
      mlScore === null
        ? classicalScore
        : Math.round((1 - ML_BLEND_WEIGHT) * classicalScore + ML_BLEND_WEIGHT * mlScore);

    const recommendation: StockRecommendation = {
      ticker: sym,
      companyName: companyName || details?.longName || details?.shortName,
      signal: scoreToSignal(score),
      score,
      classicalScore: Math.round(classicalScore),
      mlScore,
      confidence: Math.round(computeConfidence(factors)),
      factors,
      reasons: buildReasons(factors),
      ml: mlScore === null ? undefined : ml,
      dataQuality,
      asOf: new Date().toISOString(),
      disclaimer: DISCLAIMER,
    };

    await cacheService.setCache(cacheKey, recommendation, REC_CACHE_MS);
    return recommendation;
  }

  /**
   * Rank a universe of tickers by blended score (the Discover screener).
   * Runs in small concurrent batches to be polite to the data source.
   */
  async rankUniverse(
    tickers: string[],
    topN = 10,
    batchSize = 4
  ): Promise<StockRecommendation[]> {
    const results: StockRecommendation[] = [];
    for (let i = 0; i < tickers.length; i += batchSize) {
      const batch = tickers.slice(i, i + batchSize);
      const recs = await Promise.all(
        batch.map((t) => this.getRecommendation(t).catch(() => null))
      );
      recs.forEach((r) => {
        if (r && r.dataQuality !== 'insufficient') results.push(r);
      });
    }
    return results.sort((a, b) => b.score - a.score).slice(0, topN);
  }

  /**
   * Optimize a portfolio with Modern Portfolio Theory. Fetches each holding's
   * price history, turns it into daily returns, and runs the Monte Carlo
   * optimizer to suggest weights with a better risk/return tradeoff.
   * `holdings` weights should sum to ~1 (current allocation).
   */
  async getPortfolioOptimization(
    holdings: { ticker: string; weight: number }[]
  ): Promise<OptimizationResult | null> {
    const valid = holdings.filter((h) => h.ticker && h.weight > 0);
    if (valid.length < 2) return null;

    const histories = await Promise.all(
      valid.map((h) => marketDataService.getCloses(h.ticker).catch(() => []))
    );

    // Keep only holdings with enough history, and align return series length.
    const usable = valid
      .map((h, i) => ({ ticker: h.ticker, weight: h.weight, closes: histories[i] }))
      .filter((x) => x.closes.length >= 60);
    if (usable.length < 2) return null;

    const returnSeries = usable.map((x) => dailyReturns(x.closes));
    const weightSum = usable.reduce((a, b) => a + b.weight, 0) || 1;
    const currentWeights = usable.map((x) => x.weight / weightSum);

    return optimizePortfolio({
      tickers: usable.map((x) => x.ticker),
      returnSeries,
      currentWeights,
    });
  }

  private neutralRecommendation(
    ticker: string,
    companyName?: string,
    bars = 0
  ): StockRecommendation {
    // Distinguish "too new to score" (some history, but < ~3 months) from a real
    // data outage (no history at all).
    const reason =
      bars > 0
        ? `${ticker} has only about ${bars} trading days of price history - too new to score reliably (we need at least 3 months). `
        : `We could not load enough price history for ${ticker} right now. `;
    return {
      ticker,
      companyName,
      signal: 'Watch',
      score: 50,
      classicalScore: 50,
      mlScore: null,
      confidence: 0,
      factors: { momentum: 50, trend: 50, value: 50, lowVolatility: 50, quality: 50 },
      reasons: [],
      dataQuality: 'insufficient',
      asOf: new Date().toISOString(),
      disclaimer: reason + DISCLAIMER,
    };
  }
}

export const recommendationService = new RecommendationService();
