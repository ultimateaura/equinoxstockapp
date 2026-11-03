/**
 * marketDataService.ts - Daily historical price provider for the quant engine.
 *
 * Why this exists: Finnhub's free tier no longer serves candle/history data, but
 * every quant indicator needs a price series.
 *
 * Source: the Yahoo Finance chart API (v8). It returns daily OHLCV as clean JSON
 * for both stocks and ETFs (incl. our SPY benchmark), needs no API key, and is
 * not behind a bot wall (unlike Stooq, which now serves a JS challenge instead of
 * CSV). We cache for 24h and fall back to the existing Finnhub path if Yahoo is
 * unavailable (e.g. CORS on web). The rest of the app depends on this module, not
 * on a specific vendor, so the source can be swapped without touching quant code.
 */

import { PriceBar } from './quant/types';
import { cacheService } from './cacheService';
import { stockApiService } from './stockApi';
import { proxyFetch } from './apiProxy';

const YAHOO_HOSTS = [
  'https://query1.finance.yahoo.com/v8/finance/chart/',
  'https://query2.finance.yahoo.com/v8/finance/chart/',
];
// Alpha Vantage via the API proxy, which adds the key server-side.
const ALPHA_VANTAGE_PATH = '/alphavantage';
const CACHE_MS = 24 * 60 * 60 * 1000; // 24h
const HISTORY_CACHE_PREFIX = 'mds:hist:';

/** Symbol used as the market benchmark for beta and relative performance. */
export const BENCHMARK_SYMBOL = 'SPY';

export interface HistoryResult {
  symbol: string;
  bars: PriceBar[];
  source: 'yahoo' | 'alphavantage' | 'finnhub' | 'cache';
}

class MarketDataService {
  /**
   * Get daily price bars for a symbol, newest last. Tries cache -> Yahoo ->
   * Finnhub. Returns an empty array (never throws) so callers can degrade
   * gracefully.
   */
  async getDailyHistory(symbol: string, lookbackDays = 400): Promise<HistoryResult> {
    const sym = symbol.toUpperCase();
    const cacheKey = `${HISTORY_CACHE_PREFIX}${sym}`;

    const cached = await cacheService.getCache<PriceBar[]>(cacheKey);
    if (cached && cached.length > 0) {
      return { symbol: sym, bars: this.trim(cached, lookbackDays), source: 'cache' };
    }

    // Primary: Yahoo Finance chart API (unlimited, no key)
    const yahooBars = await this.fetchFromYahoo(sym);
    if (yahooBars.length > 0) {
      await cacheService.setCache(cacheKey, yahooBars, CACHE_MS);
      return { symbol: sym, bars: this.trim(yahooBars, lookbackDays), source: 'yahoo' };
    }

    // Fallback 1: Alpha Vantage (keyed; free tier = 25 requests/day, so this is
    // a backup only, protected by the 24h cache above).
    const avBars = await this.fetchFromAlphaVantage(sym);
    if (avBars.length > 0) {
      await cacheService.setCache(cacheKey, avBars, CACHE_MS);
      return { symbol: sym, bars: this.trim(avBars, lookbackDays), source: 'alphavantage' };
    }

    // Fallback 2: Finnhub candle endpoint (may be premium-gated)
    const finnhubBars = await this.fetchFromFinnhub(sym);
    if (finnhubBars.length > 0) {
      await cacheService.setCache(cacheKey, finnhubBars, CACHE_MS);
      return { symbol: sym, bars: this.trim(finnhubBars, lookbackDays), source: 'finnhub' };
    }

    return { symbol: sym, bars: [], source: 'cache' };
  }

  /** Convenience: just the closing prices, oldest -> newest. */
  async getCloses(symbol: string, lookbackDays = 400): Promise<number[]> {
    const { bars } = await this.getDailyHistory(symbol, lookbackDays);
    return bars.map((b) => b.close);
  }

  /** Fetch the benchmark (SPY) closes for beta / relative-return calculations. */
  async getBenchmarkCloses(lookbackDays = 400): Promise<number[]> {
    return this.getCloses(BENCHMARK_SYMBOL, lookbackDays);
  }

  private trim(bars: PriceBar[], lookbackDays: number): PriceBar[] {
    if (bars.length <= lookbackDays) return bars;
    return bars.slice(bars.length - lookbackDays);
  }

  /**
   * Yahoo chart API. Response shape:
   *   chart.result[0].timestamp: number[] (unix seconds)
   *   chart.result[0].indicators.quote[0]: { open, high, low, close, volume }[]
   * We request ~2 years so there is enough history for 200-day averages and
   * 12-month momentum.
   */
  private async fetchFromYahoo(symbol: string): Promise<PriceBar[]> {
    const path = `${encodeURIComponent(symbol)}?range=2y&interval=1d`;
    for (const host of YAHOO_HOSTS) {
      try {
        const res = await fetch(`${host}${path}`, {
          headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
        });
        if (!res.ok) {
          console.warn(`Yahoo ${symbol} HTTP ${res.status} via ${host}`);
          continue;
        }
        const json: any = await res.json();
        const result = json?.chart?.result?.[0];
        const timestamps: number[] = result?.timestamp;
        const quote = result?.indicators?.quote?.[0];
        if (!Array.isArray(timestamps) || !quote) {
          console.warn(`Yahoo ${symbol} returned no series via ${host}`);
          continue;
        }

        const bars: PriceBar[] = [];
        for (let i = 0; i < timestamps.length; i++) {
          const close = quote.close?.[i];
          if (close == null || !isFinite(close)) continue; // skip gaps/holidays
          bars.push({
            date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
            high: quote.high?.[i] ?? close,
            low: quote.low?.[i] ?? close,
            close,
            volume: quote.volume?.[i] ?? 0,
          });
        }
        if (bars.length > 0) return bars;
      } catch (err) {
        console.warn(`Yahoo fetch failed for ${symbol} via ${host}:`, (err as Error)?.message);
      }
    }
    return [];
  }

  /**
   * Alpha Vantage TIME_SERIES_DAILY (JSON). Free tier is 25 requests/day and
   * 1 request/second, so we only call this when Yahoo fails and rely on the 24h
   * cache to avoid burning through the daily quota. A rate-limit response comes
   * back as an "Information"/"Note" field (not price data), which we detect.
   */
  private async fetchFromAlphaVantage(symbol: string): Promise<PriceBar[]> {
    try {
      const res = await proxyFetch(
        `${ALPHA_VANTAGE_PATH}?function=TIME_SERIES_DAILY` +
          `&symbol=${encodeURIComponent(symbol)}&outputsize=full`
      );
      if (!res.ok) {
        console.warn(`AlphaVantage ${symbol} HTTP ${res.status}`);
        return [];
      }
      const json: any = await res.json();

      if (json?.Information || json?.Note) {
        console.warn(
          `AlphaVantage rate-limited for ${symbol}: ${json.Information || json.Note}`
        );
        return [];
      }

      const series = json?.['Time Series (Daily)'];
      if (!series || typeof series !== 'object') return [];

      const bars: PriceBar[] = Object.keys(series)
        .sort() // dates ascending -> oldest first
        .map((date) => {
          const row = series[date];
          const close = parseFloat(row['4. close']);
          return {
            date,
            high: parseFloat(row['2. high']) || close,
            low: parseFloat(row['3. low']) || close,
            close,
            volume: parseFloat(row['5. volume']) || 0,
          } as PriceBar;
        })
        .filter((b) => isFinite(b.close));

      return bars;
    } catch (err) {
      console.warn(`AlphaVantage fetch failed for ${symbol}:`, (err as Error)?.message);
      return [];
    }
  }

  /** Fallback to the existing Finnhub candle path in stockApi. */
  private async fetchFromFinnhub(symbol: string): Promise<PriceBar[]> {
    try {
      const res = await stockApiService.getHistoricalPrices(symbol, '1y');
      if (!res.success || !res.data) return [];
      return res.data.map((p) => ({
        date: p.date,
        high: p.high,
        low: p.low,
        close: p.close,
        volume: p.volume,
      })) as PriceBar[];
    } catch {
      return [];
    }
  }
}

export const marketDataService = new MarketDataService();
