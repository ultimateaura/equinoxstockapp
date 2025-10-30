// Stock API Response Types
export interface StockQuote {
  symbol: string;
  shortName: string;
  longName: string;
  currency: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  marketCap: number;
  previousClose: number;
  open: number;
  dayLow: number;
  dayHigh: number;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  averageVolume: number;
  priceHint: number;
}

export interface StockDetails {
  symbol: string;
  shortName: string;
  longName: string;
  currency: string;
  sector: string;
  industry: string;
  website: string;
  city: string;
  state: string;
  country: string;
  fullTimeEmployees: number;
  marketCap: number;
  enterpriseValue: number;
  trailingPE: number;
  forwardPE: number;
  pegRatio: number;
  beta: number;
  bookValue: number;
  priceToBook: number;
  dividendRate: number;
  dividendYield: number;
  payoutRatio: number;
  trailingAnnualDividendRate: number;
  trailingAnnualDividendYield: number;
  fiveYearAvgDividendYield: number;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  averageVolume: number;
  averageVolume10days: number;
  averageVolume30days: number;
  twoHundredDayAverage: number;
  fiftyDayAverage: number;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  priceHint: number;
  previousClose: number;
  open: number;
  dayLow: number;
  dayHigh: number;
}

export interface HistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose: number;
}

export interface SearchResult {
  symbol: string;
  shortName: string;
  longName: string;
  exchange: string;
  type: string;
  region: string;
  currency: string;
  marketState: string;
  quoteType: string;
  triggerable: boolean;
  customPriceAlertConfidence: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketTime: string;
  marketCap: number;
  logoUrl?: string;
}

// API Response Wrapper
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  timestamp?: number;
}

// Cache Metadata
export interface CacheMetadata {
  timestamp: number;
  expiresAt: number;
  data: any;
}

// Cache Keys
export const CACHE_KEYS = {
  SEARCH: 'search:',
  QUOTE: 'quote:',
  DETAILS: 'details:',
  HISTORICAL: 'historical:',
  LOGO: 'logo:',
} as const;

// Cache Expiration Times (in milliseconds)
export const CACHE_EXPIRY = {
  SEARCH: 30 * 60 * 1000, // 30 minutes
  QUOTE: 5 * 60 * 1000,   // 5 minutes
  DETAILS: 60 * 60 * 1000, // 1 hour
  HISTORICAL: 24 * 60 * 60 * 1000, // 24 hours
  LOGO: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;

// Error Types
export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}
