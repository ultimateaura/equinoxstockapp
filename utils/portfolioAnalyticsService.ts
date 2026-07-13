/**
 * portfolioAnalyticsService.ts - Central orchestrator for Portfolio Intelligence.
 * Builds DNA / Monte Carlo / regime / behavior snapshots from holdings + history.
 */

import { Holding } from '../contexts/HoldingsContext';
import { TradeEvent } from '../contexts/TradeEventsContext';
import { cacheService } from './cacheService';
import { marketDataService, BENCHMARK_SYMBOL } from './marketDataService';
import { behaviorAnalysisService } from './behaviorAnalysisService';
import { dailyReturns } from './quant/indicators';
import {
  aggregatePortfolioReturns,
  runMonteCarlo,
  HORIZON_PRESETS,
  HorizonKey,
} from './quant/monteCarloSimulator';
import { computePortfolioDNA } from './quant/pca';
import { detectVolatilityRegime } from './quant/volatilityRegime';
import {
  MonteCarloResult,
  PortfolioDNA,
  PortfolioIntelligenceSnapshot,
  VolatilityRegimeResult,
  BehaviorAnalysisResult,
} from './quant/types';

const CACHE_MS = 6 * 60 * 60 * 1000; // 6h
const MAX_TICKERS = 15;

export interface WeightedHolding {
  ticker: string;
  value: number;
}

function holdingsFingerprint(holdings: WeightedHolding[], extra = ''): string {
  const core = holdings
    .map((h) => `${h.ticker}:${Math.round(h.value)}`)
    .sort()
    .join('|');
  return `${core}|${extra}`;
}

function toWeighted(holdings: Holding[]): WeightedHolding[] {
  return holdings
    .map((h) => {
      const qty =
        h.purchaseLots?.reduce((s, l) => s + l.quantity, 0) || h.quantity || 0;
      return { ticker: h.ticker, value: qty * (h.currentPrice || 0) };
    })
    .filter((h) => h.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, MAX_TICKERS);
}

async function loadReturnSeries(tickers: string[], lookback = 400) {
  const results = await Promise.all(
    tickers.map((t) => marketDataService.getDailyHistory(t, lookback))
  );
  const closes = results.map((r) => r.bars.map((b) => b.close));
  const returnSeries = closes.map(dailyReturns);
  return { closes, returnSeries, results };
}

class PortfolioAnalyticsService {
  /**
   * Portfolio DNA (PCA). Needs ≥2 holdings with ~30+ days of returns.
   */
  async getPortfolioDNA(holdings: Holding[] | WeightedHolding[]): Promise<PortfolioDNA | null> {
    const weighted = Array.isArray(holdings) && holdings.length && 'value' in holdings[0]
      ? (holdings as WeightedHolding[])
      : toWeighted(holdings as Holding[]);

    if (weighted.length < 2) return null;

    const fp = holdingsFingerprint(weighted, 'dna');
    const cacheKey = `intel:dna:${fp}`;
    const cached = await cacheService.getCache<PortfolioDNA>(cacheKey);
    if (cached) return cached;

    try {
      const tickers = weighted.map((h) => h.ticker);
      const total = weighted.reduce((a, h) => a + h.value, 0) || 1;
      const weights = weighted.map((h) => h.value / total);

      const [{ returnSeries }, spyCloses] = await Promise.all([
        loadReturnSeries(tickers),
        marketDataService.getBenchmarkCloses(400),
      ]);

      const usable = returnSeries.filter((r) => r.length >= 30);
      if (usable.length < 2) return null;

      const dna = computePortfolioDNA({
        tickers,
        returnSeries,
        weights,
        benchmarkReturns: dailyReturns(spyCloses),
      });
      if (dna) await cacheService.setCache(cacheKey, dna, CACHE_MS);
      return dna;
    } catch (err) {
      console.warn('getPortfolioDNA failed:', (err as Error)?.message);
      return null;
    }
  }

  /**
   * Forward Monte Carlo "What-If" simulator.
   */
  async getMonteCarlo(
    holdings: Holding[] | WeightedHolding[],
    horizon: HorizonKey = '6m'
  ): Promise<MonteCarloResult | null> {
    const weighted = Array.isArray(holdings) && holdings.length && 'value' in holdings[0]
      ? (holdings as WeightedHolding[])
      : toWeighted(holdings as Holding[]);

    if (weighted.length < 1) return null;
    const total = weighted.reduce((a, h) => a + h.value, 0);
    if (total <= 0) return null;

    const horizonDays = HORIZON_PRESETS[horizon];
    const fp = holdingsFingerprint(weighted, `mc:${horizon}`);
    const cacheKey = `intel:mc:${fp}`;
    const cached = await cacheService.getCache<MonteCarloResult>(cacheKey);
    if (cached) return cached;

    try {
      const tickers = weighted.map((h) => h.ticker);
      const weights = weighted.map((h) => h.value / total);
      const { returnSeries } = await loadReturnSeries(tickers, 300);
      const portfolioReturns = aggregatePortfolioReturns(returnSeries, weights);
      const result = runMonteCarlo({
        currentValue: total,
        portfolioDailyReturns: portfolioReturns,
        horizonDays,
        numPaths: 2000,
      });
      if (result) await cacheService.setCache(cacheKey, result, CACHE_MS);
      return result;
    } catch (err) {
      console.warn('getMonteCarlo failed:', (err as Error)?.message);
      return null;
    }
  }

  /**
   * Volatility regime vs SPY + portfolio behavior in past turbulent periods.
   */
  async getVolatilityRegime(
    holdings: Holding[] | WeightedHolding[]
  ): Promise<VolatilityRegimeResult | null> {
    const weighted = Array.isArray(holdings) && holdings.length && 'value' in holdings[0]
      ? (holdings as WeightedHolding[])
      : toWeighted(holdings as Holding[]);

    const dateKey = new Date().toISOString().slice(0, 10);
    const fp = holdingsFingerprint(weighted, `regime:${dateKey}`);
    const cacheKey = `intel:regime:${fp}`;
    const cached = await cacheService.getCache<VolatilityRegimeResult>(cacheKey);
    if (cached) return cached;

    try {
      const spyCloses = await marketDataService.getBenchmarkCloses(500);
      let portfolioDailyReturns: number[] | undefined;

      if (weighted.length >= 1) {
        const total = weighted.reduce((a, h) => a + h.value, 0) || 1;
        const weights = weighted.map((h) => h.value / total);
        const { returnSeries } = await loadReturnSeries(
          weighted.map((h) => h.ticker),
          400
        );
        portfolioDailyReturns = aggregatePortfolioReturns(returnSeries, weights);
      }

      const regime = detectVolatilityRegime({
        benchmarkCloses: spyCloses,
        portfolioDailyReturns,
      });
      if (regime) await cacheService.setCache(cacheKey, regime, CACHE_MS);
      return regime;
    } catch (err) {
      console.warn('getVolatilityRegime failed:', (err as Error)?.message);
      return null;
    }
  }

  getBehavior(events: TradeEvent[]): BehaviorAnalysisResult {
    return behaviorAnalysisService.analyze(events);
  }

  /**
   * Full parallel snapshot for the Portfolio Hub + LLM explainer.
   */
  async getFullSnapshot(
    holdings: Holding[],
    events: TradeEvent[] = [],
    horizon: HorizonKey = '6m'
  ): Promise<PortfolioIntelligenceSnapshot> {
    const weighted = toWeighted(holdings);
    const totalValue = weighted.reduce((a, h) => a + h.value, 0);

    const [dna, monteCarlo, regime] = await Promise.all([
      this.getPortfolioDNA(weighted),
      this.getMonteCarlo(weighted, horizon),
      this.getVolatilityRegime(weighted),
    ]);

    const behavior = this.getBehavior(events);

    return {
      dna,
      monteCarlo,
      regime,
      behavior,
      totalValue,
      holdingsCount: weighted.length,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const portfolioAnalyticsService = new PortfolioAnalyticsService();
export { HORIZON_PRESETS, BENCHMARK_SYMBOL };
export type { HorizonKey };
