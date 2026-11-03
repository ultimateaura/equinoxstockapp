import {
    APIResponse,
    HistoricalPrice,
    SearchResult,
    StockDetails,
    StockQuote
} from '@/types/stock';
import axios, { AxiosInstance } from 'axios';
import { proxyAuthHeaders, proxyUrl } from './apiProxy';
import { cacheService } from './cacheService';
import { errorHandler } from './errorHandler';
import { logoService } from './logoService';

class StockApiService {
  private api: AxiosInstance;
  private readonly timeout = 10000; // 10 seconds
  private profileAllowed: boolean = true;

  constructor() {
    // Finnhub goes through the API proxy, which holds the key server-side.
    this.api = axios.create({
      timeout: this.timeout,
    });

    // Add request interceptor for the proxy URL, auth and logging
    this.api.interceptors.request.use(
      async (config) => {
        // Resolved per request so a missing proxy URL or signed-out user fails
        // that call with a clear message instead of crashing at import time.
        config.baseURL = proxyUrl('/finnhub');
        config.headers.set(await proxyAuthHeaders());
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('API Error:', error.response?.status, error.message);
        return Promise.reject(error);
      }
    );
  }

  // Search stocks with caching
  async searchStocks(query: string): Promise<APIResponse<SearchResult[]>> {
    try {
      // Check cache first (but skip cache for now to ensure fresh filtering)
      // const cachedResults = await cacheService.getSearchCache(query);
      // if (cachedResults) {
      //   return {
      //     success: true,
      //     data: cachedResults,
      //     cached: true,
      //     timestamp: Date.now(),
      //   };
      // }

      // Make API call with retry logic
      const results = await errorHandler.retryWithBackoff(async () => {
        const response = await this.api.get('/search', {
          params: {
            q: query,
          },
        });

        console.log('Search API Response:', JSON.stringify(response.data, null, 2));

        // Check for demo API key
        if (response.data && response.data.error) {
          console.log('Demo API key detected, falling back to local data');
          throw new Error('Demo API key - using fallback data');
        }

        // Finnhub response format
        if (!response.data || !response.data.result) {
          throw new Error('No stocks found');
        }

        const searchResults = response.data.result;
        
        if (searchResults.length === 0) {
          throw new Error('No stocks found');
        }

        // Filter to ONLY show US listings (no international exchanges)
        const usOnlyResults = searchResults.filter((result: any) => {
          const symbol = result.symbol || '';
          
          // Only keep US listings (no suffix at all)
          const isUSListing = !symbol.includes('.') && 
                             !symbol.includes('-') && 
                             !symbol.includes('_') &&
                             symbol.length <= 5 && // Most US tickers are 1-5 characters
                             /^[A-Z]+$/.test(symbol); // Only uppercase letters
          
          return isUSListing;
        });

        // If no US results, return empty array instead of international stocks
        if (usOnlyResults.length === 0) {
          return [];
        }
        
        // Return US-only results, limit to 10 for performance
        return usOnlyResults.slice(0, 10);
      });

      // Process and enhance results
      const enhancedResults = await this.enhanceSearchResults(results);

      // Cache the results
      await cacheService.setSearchCache(query, enhancedResults);

      return {
        success: true,
        data: enhancedResults,
        cached: false,
        timestamp: Date.now(),
      };

    } catch (error) {
      console.error('Search stocks error:', error);
      return {
        success: false,
        error: errorHandler.getUserFriendlyMessage(error),
      };
    }
  }

  // Get company profile information
  async getStockProfile(symbol: string): Promise<APIResponse<any>> {
    try {
      // Check cache first
      const cachedProfile = await cacheService.getCache(`profile_${symbol}`);
      if (cachedProfile) {
        return {
          success: true,
          data: cachedProfile,
          cached: true,
          timestamp: Date.now(),
        };
      }

      // Make API call to get company profile
      const response = await this.api.get('/stock/profile2', {
        params: {
          symbol: symbol.toUpperCase(),
        },
      });

      if (!response.data || !response.data.name) {
        throw new Error('Company profile not found');
      }

      const profileData = {
        name: response.data.name,
        ticker: response.data.ticker,
        country: response.data.country,
        industry: response.data.finnhubIndustry,
        logo: response.data.logo,
        weburl: response.data.weburl,
        marketCapitalization: response.data.marketCapitalization,
      };

      // Cache for 24 hours since company info doesn't change often
      await cacheService.setCache(`profile_${symbol}`, profileData, 24 * 60 * 60 * 1000);

      return {
        success: true,
        data: profileData,
        cached: false,
        timestamp: Date.now(),
      };

    } catch (error: any) {
      if (error?.response?.status === 401) {
        this.profileAllowed = false;
        console.warn('Finnhub profile endpoint returned 401. Disabling further profile requests for this session.');
      } else {
        console.error(`Failed to fetch profile for ${symbol}:`, error);
      }
      return {
        success: false,
        error: errorHandler.getUserFriendlyMessage(error),
      };
    }
  }

  // Get multiple company profiles at once
  async getBatchProfiles(symbols: string[]): Promise<APIResponse<{ [symbol: string]: any }>> {
    try {
      const results: { [symbol: string]: any } = {};
      
      // Process symbols in batches of 5 to avoid rate limits
      const batchSize = 5;
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (symbol) => {
          try {
            const profileResponse = await this.getStockProfile(symbol);
            if (profileResponse.success && profileResponse.data) {
              results[symbol] = profileResponse.data;
            }
          } catch (error) {
            console.log(`Failed to fetch profile for ${symbol}`);
          }
        });
        
        await Promise.all(batchPromises);
        
        // Add delay between batches
        if (i + batchSize < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      return {
        success: true,
        data: results,
        cached: false,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Batch profiles error:', error);
      return {
        success: false,
        error: errorHandler.getUserFriendlyMessage(error),
      };
    }
  }

  // Get stock quote with caching
  async getStockQuote(symbol: string): Promise<APIResponse<StockQuote>> {
    try {
      // Check cache first
      const cachedQuote = await cacheService.getQuoteCache(symbol);
      if (cachedQuote) {
        return {
          success: true,
          data: cachedQuote,
          cached: true,
          timestamp: Date.now(),
        };
      }

      // Fetch quote (and profile only if allowed) in parallel
      const promises: Promise<any>[] = [
        errorHandler.retryWithBackoff(async () => {
          const response = await this.api.get(`/quote`, {
            params: { symbol: symbol.toUpperCase() },
          });
          
          if (!response.data || response.data.c === null || response.data.c === undefined) {
            throw new Error('Stock not found');
          }
          
          return response.data;
        })
      ];
      if (this.profileAllowed) {
        promises.push(this.getStockProfile(symbol));
      }
      const results = await Promise.allSettled(promises);

      const quoteResult = results[0];
      const quoteData = quoteResult.status === 'fulfilled' ? quoteResult.value : null;
      const profileResult = this.profileAllowed ? results[1] : undefined;
      const profileData =
        profileResult && profileResult.status === 'fulfilled' && profileResult.value.success
          ? profileResult.value.data
          : null;

      if (!quoteData) {
        throw new Error('Stock not found');
      }

      // Convert Finnhub format to our format with actual company names
      const quote = {
        symbol: symbol.toUpperCase(),
        shortName: profileData?.name || symbol.toUpperCase(),
        longName: profileData?.name || symbol.toUpperCase(),
        currency: 'USD',
        regularMarketPrice: Number(quoteData.c) || 0, // current price
        regularMarketChange: Number(quoteData.c) - Number(quoteData.pc) || 0, // current - previous close
        regularMarketChangePercent: Number(quoteData.dp) || 0, // daily change percent
        regularMarketVolume: Number(quoteData.v) || 0, // volume
        marketCap: profileData?.marketCapitalization || 0,
        previousClose: Number(quoteData.pc) || 0, // previous close
        open: Number(quoteData.o) || 0, // open
        dayLow: Number(quoteData.l) || 0, // low
        dayHigh: Number(quoteData.h) || 0, // high
        fiftyTwoWeekLow: 0, // Not available in quote endpoint
        fiftyTwoWeekHigh: 0, // Not available in quote endpoint
        averageVolume: 0,
        priceHint: 2,
      };

      // Cache the quote
      await cacheService.setQuoteCache(symbol, quote);

      return {
        success: true,
        data: quote,
        cached: false,
        timestamp: Date.now(),
      };

    } catch (error) {
      console.error('Get stock quote error:', error);
      return {
        success: false,
        error: errorHandler.getUserFriendlyMessage(error),
      };
    }
  }

  // Get stock details with caching
  async getStockDetails(symbol: string): Promise<APIResponse<StockDetails>> {
    try {
      // Check cache first
      const cachedDetails = await cacheService.getDetailsCache(symbol);
      if (cachedDetails) {
        return {
          success: true,
          data: cachedDetails,
          cached: true,
          timestamp: Date.now(),
        };
      }

      // Make API call with retry logic
      const details = await errorHandler.retryWithBackoff(async () => {
        const response = await this.api.get(`/market/v2/get-quotes`, {
          params: {
            symbols: symbol.toUpperCase(),
          },
        });

        if (!response.data?.quoteResponse?.result?.[0]) {
          throw new Error('Stock not found');
        }

        return response.data.quoteResponse.result[0];
      });

      // Cache the details
      await cacheService.setDetailsCache(symbol, details);

      return {
        success: true,
        data: details,
        cached: false,
        timestamp: Date.now(),
      };

    } catch (error) {
      console.error('Get stock details error:', error);
      return {
        success: false,
        error: errorHandler.getUserFriendlyMessage(error),
      };
    }
  }

  // Get historical prices with caching (Finnhub /stock/candle)
  async getHistoricalPrices(
    symbol: string,
    period: string = '1mo'
  ): Promise<APIResponse<HistoricalPrice[]>> {
    try {
      // Check cache first
      const cachedPrices = await cacheService.getHistoricalCache(symbol, period);
      if (cachedPrices) {
        return {
          success: true,
          data: cachedPrices,
          cached: true,
          timestamp: Date.now(),
        };
      }

      // Map period to days
      const periodToDays: Record<string, number> = {
        '1mo': 30,
        '3mo': 90,
        '6mo': 180,
        '1y': 365,
      };
      const days = periodToDays[period] || 30;
      const to = Math.floor(Date.now() / 1000);
      const from = to - days * 24 * 60 * 60;

      // Make API call with retry logic
      const prices = await errorHandler.retryWithBackoff(async () => {
        const response = await this.api.get('/stock/candle', {
          params: {
            symbol: symbol.toUpperCase(),
            resolution: 'D',
            from,
            to,
          },
        });

        const data = response.data;
        if (!data || data.s !== 'ok' || !Array.isArray(data.t) || data.t.length === 0) {
          throw new Error('Historical data not found');
        }

        const timestamps: number[] = data.t || [];
        const opens: number[] = data.o || [];
        const highs: number[] = data.h || [];
        const lows: number[] = data.l || [];
        const closes: number[] = data.c || [];
        const volumes: number[] = data.v || [];

        return timestamps.map((ts, i) => ({
          date: new Date(ts * 1000).toISOString().split('T')[0],
          open: Number(opens[i]) || 0,
          high: Number(highs[i]) || 0,
          low: Number(lows[i]) || 0,
          close: Number(closes[i]) || 0,
          volume: Number(volumes[i]) || 0,
          adjustedClose: Number(closes[i]) || 0,
        })) as HistoricalPrice[];
      });

      // Cache the prices
      await cacheService.setHistoricalCache(symbol, period, prices);

      return {
        success: true,
        data: prices,
        cached: false,
        timestamp: Date.now(),
      };

    } catch (error) {
      console.error('Get historical prices error:', error);
      return {
        success: false,
        error: errorHandler.getUserFriendlyMessage(error),
      };
    }
  }

  // Enhance search results with logos and prices
  private async enhanceSearchResults(results: any[]): Promise<SearchResult[]> {
    const enhancedResults: SearchResult[] = [];
    
    // Extract symbols for batch quote fetching with null safety
    const symbols = results
      .map(result => result?.symbol)
      .filter(symbol => symbol && typeof symbol === 'string' && symbol.trim() !== '');
    console.log('Fetching batch quotes for symbols:', symbols);
    
    // Get batch quotes for all symbols
    const batchQuotesResponse = await this.getBatchQuotes(symbols);
    const batchQuotes = batchQuotesResponse.success ? batchQuotesResponse.data || {} : {};

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      
      // Skip invalid results
      if (!result || typeof result !== 'object') {
        console.log('Skipping invalid result:', result);
        continue;
      }
      
      // Double-check: Skip international stocks
      const symbol = result.symbol || '';
      if (symbol.includes('.') || symbol.includes('-') || symbol.includes('_') || symbol.length > 5 || !/^[A-Z]+$/.test(symbol)) {
        console.log('Skipping international stock:', symbol);
        continue;
      }
      
      try {
        console.log('Processing Finnhub result:', result);
        
        // Finnhub format: { symbol: "AAPL", description: "Apple Inc", type: "Common Stock", displaySymbol: "AAPL" }
        const symbol = result.symbol || 'UNKNOWN';
        const name = result.description || result.displaySymbol || 'Unknown Company';
        const type = result.type || 'EQUITY';
        const region = 'US'; // Finnhub doesn't provide region in search
        const currency = 'USD';
        
        console.log(`Processing stock: ${symbol} - ${name}`);
        
        // Get logo URL with error handling
        let logoUrl;
        try {
          logoUrl = await logoService.getStockLogo(symbol, name);
        } catch (error) {
          console.log(`Failed to get logo for ${symbol}:`, error);
          logoUrl = undefined;
        }

        // Get price data from batch quotes or cache
        let priceData = { price: 0, change: 0, changePercent: 0 };
        
        if (batchQuotes[symbol] && batchQuotes[symbol].regularMarketPrice && batchQuotes[symbol].regularMarketPrice > 0) {
          // Use batch quote data
          priceData = {
            price: Number(batchQuotes[symbol].regularMarketPrice) || 0,
            change: Number(batchQuotes[symbol].regularMarketChange) || 0,
            changePercent: Number(batchQuotes[symbol].regularMarketChangePercent) || 0,
          };
        } else {
          // Check cache as fallback
          const cachedQuote = await cacheService.getQuoteCache(symbol);
          if (cachedQuote && cachedQuote.regularMarketPrice && cachedQuote.regularMarketPrice > 0) {
            priceData = {
              price: Number(cachedQuote.regularMarketPrice) || 0,
              change: Number(cachedQuote.regularMarketChange) || 0,
              changePercent: Number(cachedQuote.regularMarketChangePercent) || 0,
            };
          }
        }

        const enhancedResult = {
          symbol: symbol,
          shortName: name,
          longName: name,
          exchange: 'NASDAQ', // Alpha Vantage doesn't provide exchange in search
          type: type || 'EQUITY',
          region: region || 'US',
          currency: currency || 'USD',
          marketState: 'REGULAR',
          quoteType: 'EQUITY',
          triggerable: true,
          customPriceAlertConfidence: 'HIGH',
          regularMarketPrice: priceData.price,
          regularMarketChange: priceData.change,
          regularMarketChangePercent: priceData.changePercent,
          regularMarketTime: new Date().toISOString(),
          marketCap: 0,
          logoUrl,
        };
        
        console.log(`Final result for ${symbol}:`, {
          symbol: enhancedResult.symbol,
          shortName: enhancedResult.shortName,
          price: enhancedResult.regularMarketPrice
        });
        
        enhancedResults.push(enhancedResult);
      } catch (error) {
        console.error('Error enhancing search result:', error);
        // Add result without logo if enhancement fails
        const symbol = result.symbol || 'UNKNOWN';
        const name = result.description || result.displaySymbol || 'Unknown';
        
        enhancedResults.push({
          symbol: symbol,
          shortName: name,
          longName: name,
          exchange: 'NASDAQ',
          type: result.type || 'EQUITY',
          region: 'US',
          currency: 'USD',
          marketState: 'REGULAR',
          quoteType: 'EQUITY',
          triggerable: true,
          customPriceAlertConfidence: 'HIGH',
          regularMarketPrice: 0,
          regularMarketChange: 0,
          regularMarketChangePercent: 0,
          regularMarketTime: new Date().toISOString(),
          marketCap: 0,
          logoUrl: undefined,
        });
      }
    }

    return enhancedResults;
  }

  // Get multiple stock quotes at once (batch request)
  async getBatchQuotes(symbols: string[]): Promise<APIResponse<{ [symbol: string]: any }>> {
    try {
      const results: { [symbol: string]: any } = {};
      
      // Process symbols in batches of 3 to avoid rate limits
      const batchSize = 3;
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (symbol) => {
          try {
            const quoteResponse = await this.getStockQuote(symbol);
            if (quoteResponse.success && quoteResponse.data) {
              results[symbol] = quoteResponse.data;
            }
          } catch (error) {
            console.log(`Failed to fetch quote for ${symbol}`);
          }
        });
        
        await Promise.all(batchPromises);
        
        // Add delay between batches to respect rate limits
        if (i + batchSize < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      return {
        success: true,
        data: results,
        cached: false,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Batch quotes error:', error);
      return {
        success: false,
        error: errorHandler.getUserFriendlyMessage(error),
      };
    }
  }

  // Get API status
  async getApiStatus(): Promise<{ status: string; message: string }> {
    try {
      const response = await this.api.get('/status');
      return {
        status: 'healthy',
        message: 'API is working correctly',
      };
    } catch (error) {
      return {
        status: 'error',
        message: errorHandler.getUserFriendlyMessage(error),
      };
    }
  }

  // Clear all caches
  async clearAllCaches(): Promise<void> {
    await cacheService.clearAllCache();
  }

  // Get cache statistics
  async getCacheStats(): Promise<any> {
    return await cacheService.getCacheInfo();
  }

  // Get trending stocks (dynamic based on volume and price changes)
  async getTrendingStocks(): Promise<APIResponse<SearchResult[]>> {
    try {
      // Check cache first (cache for 10 minutes since trending changes frequently)
      const cachedTrending = await cacheService.getCache<SearchResult[]>('trending_stocks');
      if (cachedTrending) {
        return {
          success: true,
          data: cachedTrending,
          cached: true,
          timestamp: Date.now(),
        };
      }

      // Check cache for stock symbols (cache for 1 hour since symbols don't change often)
      let allSymbols = await cacheService.getCache<string[]>('trending_us_stock_symbols');
      
      if (!allSymbols) {
        try {
          // Fetch US stock symbols dynamically from Finnhub API
          const symbolsResponse = await this.api.get('/stock/symbol', {
            params: {
              exchange: 'US',
            },
          });

          if (!symbolsResponse.data || !Array.isArray(symbolsResponse.data)) {
            throw new Error('Failed to fetch stock symbols from Finnhub');
          }

        // Filter and process symbols
        allSymbols = symbolsResponse.data
          .filter((stock: any) => {
            // Filter criteria for valid US stocks
            return (
              stock.symbol &&
              stock.symbol.length <= 5 && // Reasonable symbol length
              !stock.symbol.includes('.') && // No international symbols
              !stock.symbol.includes('-') && // No special characters
              !stock.symbol.includes('_') && // No underscores
              /^[A-Z]+$/.test(stock.symbol) && // Only uppercase letters
              stock.type === 'Common Stock' && // Only common stocks
              (stock.mic === 'XNAS' || stock.mic === 'XNYS') // NASDAQ or NYSE only
            );
          })
          .map((stock: any) => stock.symbol)
          .slice(0, 25); // Limit to top 100 to avoid API rate limits

          // Cache the symbols for 1 hour
          await cacheService.setCache('trending_us_stock_symbols', allSymbols, 60 * 60 * 1000);
          console.log(`Fetched ${allSymbols.length} US stock symbols for trending analysis`);
        } catch (symbolsError) {
          console.error('Failed to fetch stock symbols, using fallback list:', symbolsError);
          // Fallback to a curated list of major stocks if API fails
          allSymbols = [
            'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 
            'AMD', 'INTC', 'ORCL', 'CRM', 'ADBE', 'PYPL', 'UBER', 'SPOT', 'DIS',
            'SNOW', 'PLTR', 'RBLX', 'COIN', 'HOOD', 'ZM', 'DOCU', 'TWLO', 'SHOP',
            'SQ', 'ROKU', 'PINS', 'SNAP', 'WMT', 'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C',
            'JNJ', 'PFE', 'UNH', 'V', 'MA', 'HD', 'PG', 'KO', 'PEP', 'ABBV', 'LLY', 'AVGO'
          ];
        }
      } else {
        console.log(`Using cached ${allSymbols.length} US stock symbols for trending analysis`);
      }

      // Get real-time data (quotes) for all fetched stocks
      // Note: getStockQuote already fetches profile data internally, so we do NOT fetch profiles again
      const batchQuotesResponse = await this.getBatchQuotes(allSymbols);
      const batchQuotes = batchQuotesResponse.success ? batchQuotesResponse.data || {} : {};

      if (!batchQuotes || Object.keys(batchQuotes).length === 0) {
        console.log('Failed to fetch trending stocks data, using fallback popular stocks');
        // Fall back to a curated list of popular stocks
        const fallbackStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX'];
        const fallbackSearchResults: (SearchResult | null)[] = await Promise.all(
          fallbackStocks.map(async (symbol): Promise<SearchResult | null> => {
            try {
              const profile = await this.getStockProfile(symbol);
              const quote = await this.getStockQuote(symbol);
              if (profile.success && profile.data && quote.success && quote.data) {
                return {
                  symbol: symbol,
                  shortName: profile.data.name || symbol,
                  longName: profile.data.name || symbol,
                  exchange: 'NASDAQ',
                  type: 'EQUITY',
                  region: 'US',
                  currency: 'USD',
                  marketState: 'REGULAR',
                  quoteType: 'EQUITY',
                  triggerable: true,
                  customPriceAlertConfidence: 'HIGH',
                  regularMarketPrice: quote.data.regularMarketPrice,
                  regularMarketChange: quote.data.regularMarketChange,
                  regularMarketChangePercent: quote.data.regularMarketChangePercent,
                  regularMarketTime: new Date().toISOString(),
                  marketCap: profile.data.marketCap || 0,
                  logoUrl: undefined,
                };
              }
            } catch (error) {
              console.log(`Failed to fetch data for ${symbol}:`, error);
            }
            return null;
          })
        );
        const validResults = fallbackSearchResults.filter((s): s is SearchResult => s !== null);
        if (validResults.length > 0) {
          return {
            success: true,
            data: validResults,
            cached: false,
            timestamp: Date.now(),
          };
        }
        throw new Error('Failed to fetch trending stocks data');
      }

      const trendingStocks: SearchResult[] = [];

      // Process each stock and apply trending criteria
      for (const symbol of allSymbols) {
        try {
          if (batchQuotes[symbol]) {
            const quote = batchQuotes[symbol];
            
            // Skip stocks with invalid data
            if (!quote.regularMarketPrice || quote.regularMarketPrice <= 0) {
              continue;
            }

            // Trending criteria:
            // 1. Significant price change (>= 2% up or down)
            // 2. High trading volume (>= 1M shares)
            // 3. Price >= $5 (avoid penny stocks)
            const hasSignificantChange = Math.abs(quote.regularMarketChangePercent || 0) >= 2;
            const hasHighVolume = (quote.regularMarketVolume || 0) >= 1000000;
            const isReasonablePrice = quote.regularMarketPrice >= 5;

            if (hasSignificantChange && hasHighVolume && isReasonablePrice) {
              // Create SearchResult from quote data with actual company names
              const trendingStock: SearchResult = {
                symbol: symbol,
                shortName: quote.shortName || symbol,
                longName: quote.longName || symbol,
                exchange: 'NASDAQ',
                type: 'EQUITY',
                region: 'US',
                currency: 'USD',
                marketState: 'REGULAR',
                quoteType: 'EQUITY',
                triggerable: true,
                customPriceAlertConfidence: 'HIGH',
                regularMarketPrice: quote.regularMarketPrice || 0,
                regularMarketChange: quote.regularMarketChange || 0,
                regularMarketChangePercent: quote.regularMarketChangePercent || 0,
                regularMarketTime: new Date().toISOString(),
                marketCap: quote.marketCap || 0,
                logoUrl: undefined, // Will be filled by logo service
              };

              trendingStocks.push(trendingStock);
            }
          }
        } catch (error) {
          console.log(`Failed to process trending stock ${symbol}:`, error);
        }
      }

      // If we don't have enough trending stocks, fall back to top gainers/losers
      if (trendingStocks.length < 8) {
        console.log('Not enough trending stocks found, falling back to top movers');
        
        // Get all stocks with any significant movement
        const allStocks: SearchResult[] = [];
        for (const symbol of allSymbols) {
          if (batchQuotes[symbol]) {
            const quote = batchQuotes[symbol];
            
            if (quote.regularMarketPrice && quote.regularMarketPrice >= 5) {
              allStocks.push({
                symbol: symbol,
                shortName: quote.shortName || symbol,
                longName: quote.longName || symbol,
                exchange: 'NASDAQ',
                type: 'EQUITY',
                region: 'US',
                currency: 'USD',
                marketState: 'REGULAR',
                quoteType: 'EQUITY',
                triggerable: true,
                customPriceAlertConfidence: 'HIGH',
                regularMarketPrice: quote.regularMarketPrice || 0,
                regularMarketChange: quote.regularMarketChange || 0,
                regularMarketChangePercent: quote.regularMarketChangePercent || 0,
                regularMarketTime: new Date().toISOString(),
                marketCap: quote.marketCap || 0,
                logoUrl: undefined,
              });
            }
          }
        }

        // Sort by absolute price change percentage (biggest movers first)
        allStocks.sort((a, b) => Math.abs(b.regularMarketChangePercent || 0) - Math.abs(a.regularMarketChangePercent || 0));
        
        // Take top 12 stocks
        trendingStocks.push(...allStocks.slice(0, 12));
      }

      // Final sort: prioritize by volume, then by absolute price change
      trendingStocks.sort((a, b) => {
        // First sort by volume (if available), then by price change magnitude
        const volumeA = batchQuotes[a.symbol]?.regularMarketVolume || 0;
        const volumeB = batchQuotes[b.symbol]?.regularMarketVolume || 0;
        
        if (volumeA !== volumeB) {
          return volumeB - volumeA;
        }
        
        // If volumes are similar, sort by price change magnitude
        return Math.abs(b.regularMarketChangePercent || 0) - Math.abs(a.regularMarketChangePercent || 0);
      });

      // Limit to top 15 trending stocks
      const finalTrendingStocks = trendingStocks.slice(0, 15);

      // Cache the results for 10 minutes
      await cacheService.setCache('trending_stocks', finalTrendingStocks, 10 * 60 * 1000);

      return {
        success: true,
        data: finalTrendingStocks,
        cached: false,
        timestamp: Date.now(),
      };

    } catch (error) {
      console.error('Get trending stocks error:', error);
      return {
        success: false,
        error: errorHandler.getUserFriendlyMessage(error),
      };
    }
  }
}

export const stockApiService = new StockApiService();
