/**
 * Shared types for the quantitative + ML recommendation engine.
 *
 * The engine has three layers:
 *  1. indicators.ts   - raw math on a price series (returns, volatility, RSI...)
 *  2. factorModel.ts  - turns indicators into named "factors" and a 0-100 score
 *  3. mlModel.ts      - a learned model that scores the same features
 * recommendationService.ts blends (2) and (3) into a single StockRecommendation.
 */

export type Signal = 'Buy' | 'Hold' | 'Watch';

/**
 * A single daily price bar. Mirrors types/stock.ts HistoricalPrice but kept
 * minimal so the quant layer never depends on the network layer.
 */
export interface PriceBar {
  date: string;
  close: number;
  high: number;
  low: number;
  volume: number;
}

/**
 * The five interpretable factors we score every stock on. Each is a percentile
 * in 0-100 where higher = more attractive (already direction-adjusted, e.g. for
 * "lowVolatility" a calm stock scores high).
 */
export interface FactorScores {
  momentum: number;       // recent trailing return strength
  trend: number;          // price above its moving averages / golden cross
  value: number;          // cheap on fundamentals (low P/E, P/B)
  lowVolatility: number;  // calmer = higher score
  quality: number;        // steadier returns, smaller drawdowns
}

/** Plain-English explanation of one factor for the UI. */
export interface FactorReason {
  factor: keyof FactorScores;
  score: number;
  label: string;       // e.g. "Momentum"
  explanation: string; // beginner-friendly sentence
}

/** Output of the learned model. */
export interface MLPrediction {
  /** Probability (0-1) the stock outperforms the benchmark over the horizon. */
  probability: number;
  /** Same thing scaled to 0-100 for display. */
  score: number;
  /** Which input features pushed the prediction up the most. */
  topFeatures: { name: string; contribution: number }[];
  /** 'mlp' when the trained net ran, 'unavailable' when we fell back. */
  source: 'mlp' | 'logistic' | 'unavailable';
}

/** The final per-stock result shown in the UI. */
export interface StockRecommendation {
  ticker: string;
  companyName?: string;
  signal: Signal;
  /** Blended 0-100 score (classical + ML). */
  score: number;
  classicalScore: number;
  mlScore: number | null;
  confidence: number; // 0-100, how strongly the inputs agree
  factors: FactorScores;
  reasons: FactorReason[];
  ml?: MLPrediction;
  dataQuality: 'full' | 'partial' | 'insufficient';
  asOf: string;
  disclaimer: string;
}

/** Result of portfolio optimization. */
export interface OptimizationResult {
  tickers: string[];
  currentWeights: number[];
  suggestedWeights: number[];
  expectedAnnualReturn: number;
  expectedAnnualVolatility: number;
  sharpeRatio: number;
  /** The min-variance portfolio for reference. */
  minVarianceVolatility: number;
}
