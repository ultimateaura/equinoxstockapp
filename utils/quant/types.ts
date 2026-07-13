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

/** One principal component for Portfolio DNA. */
export interface PortfolioDNAComponent {
  label: string;
  /** Fraction of total variance explained (0-1). */
  varianceExplained: number;
  /** Loading of each ticker on this component. */
  loadings: Record<string, number>;
  /** Correlation of PC scores with the market (SPY), if available. */
  marketCorr?: number;
}

/** Portfolio DNA — PCA / factor decomposition of holding co-movement. */
export interface PortfolioDNA {
  components: PortfolioDNAComponent[];
  /** Herfindahl index of weights (1 = fully concentrated). */
  concentrationRisk: number;
  dominantStyle: 'growth' | 'balanced' | 'defensive';
  plainLabels: string[];
  tickers: string[];
  method: string;
}

/** Forward Monte Carlo projection of portfolio value. */
export interface MonteCarloResult {
  currentValue: number;
  horizonDays: number;
  numPaths: number;
  muDaily: number;
  sigmaDaily: number;
  /** Percentile series including day 0 (current value). */
  p10: number[];
  p50: number[];
  p90: number[];
  finalP10: number;
  finalP50: number;
  finalP90: number;
  method: string;
  disclaimer: string;
}

export type RegimeLabel = 'calm' | 'turbulent';

/** Volatility regime diagnosis (HMM or percentile fallback). */
export interface VolatilityRegimeResult {
  current: RegimeLabel;
  method: 'hmm' | 'percentile';
  calmAnnualVol: number;
  turbulentAnnualVol: number;
  /** Last ~90 trading days of regime labels for timeline UI. */
  timeline: RegimeLabel[];
  pastTurbulentEpisodes: number;
  avgPortfolioReturnInTurbulence: number | null;
  avgMarketReturnInTurbulence: number;
  worstPortfolioReturnInTurbulence: number | null;
  plainSummary: string;
}

export type BehaviorPatternType =
  | 'panic_selling'
  | 'dip_buying'
  | 'momentum_chasing'
  | 'overconcentration'
  | 'inactivity_in_turbulence';

export interface BehaviorPattern {
  type: BehaviorPatternType;
  label: string;
  explanation: string;
  evidenceCount: number;
  severity: 'low' | 'medium' | 'high';
}

export interface BehaviorAnalysisResult {
  patterns: BehaviorPattern[];
  confidence: number;
  dataMonths: number;
  eventCount: number;
  unlocked: boolean;
  progressMessage: string;
}

/** Full portfolio intelligence snapshot for UI + LLM. */
export interface PortfolioIntelligenceSnapshot {
  dna: PortfolioDNA | null;
  monteCarlo: MonteCarloResult | null;
  regime: VolatilityRegimeResult | null;
  behavior: BehaviorAnalysisResult | null;
  totalValue: number;
  holdingsCount: number;
  generatedAt: string;
}
