import { NewsItem } from '../components/NewsCard';
import { StockQuote } from '../types/stock';
import { newsService } from './newsService';
import { QueryRoutingDecision } from './queryRouterService';
import { stockApiService } from './stockApi';

export interface FetchedData {
  stocks: StockQuote[];
  news: NewsItem[];
  dataSource: 'finnhub' | 'cache' | 'none';
  errors: string[];
  fetchTime: number;
}

export class DataFetcherService {
  private readonly TIMEOUT_MS = 5000; // 5 seconds max per request

  /**
   * Fetch data based on routing decision
   */
  async fetchData(decision: QueryRoutingDecision): Promise<FetchedData> {
    const startTime = Date.now();
    const { category, tickers } = decision;
    
    const result: FetchedData = {
      stocks: [],
      news: [],
      dataSource: 'none',
      errors: [],
      fetchTime: 0
    };

    // If no tickers, return empty data
    if (tickers.length === 0) {
      result.fetchTime = Date.now() - startTime;
      return result;
    }

    try {
      // Determine what to fetch based on category
      const fetchPromises: Promise<any>[] = [];
      
      if (category === 'stock_data' || category === 'both') {
        fetchPromises.push(this.fetchStockData(tickers));
      }
      
      if (category === 'news' || category === 'both') {
        fetchPromises.push(this.fetchNewsData(tickers));
      }

      // If neither category, return empty data
      if (fetchPromises.length === 0) {
        result.fetchTime = Date.now() - startTime;
        return result;
      }

      // Execute all fetches in parallel with timeout
      const results = await Promise.allSettled(
        fetchPromises.map(promise => 
          Promise.race([
            promise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Request timeout')), this.TIMEOUT_MS)
            )
          ])
        )
      );

      // Process results
      results.forEach((result_promise, index) => {
        if (result_promise.status === 'fulfilled') {
          const data = result_promise.value;
          if (data.stocks) {
            result.stocks = data.stocks;
            result.dataSource = 'finnhub';
          }
          if (data.news) {
            result.news = data.news;
            result.dataSource = 'finnhub';
          }
        } else {
          const error = result_promise.reason;
          result.errors.push(`Fetch ${index + 1} failed: ${error.message || error}`);
        }
      });

    } catch (error) {
      result.errors.push(`General fetch error: ${error.message || error}`);
    }

    result.fetchTime = Date.now() - startTime;
    return result;
  }

  /**
   * Fetch stock data for multiple tickers
   */
  private async fetchStockData(tickers: string[]): Promise<{ stocks: StockQuote[] }> {
    const stocks: StockQuote[] = [];
    
    // Fetch all tickers in parallel
    const stockPromises = tickers.map(async (ticker) => {
      try {
        const response = await stockApiService.getStockQuote(ticker);
        if (response.success && response.data) {
          return response.data;
        }
        return null;
      } catch (error) {
        console.error(`Error fetching stock data for ${ticker}:`, error);
        return null;
      }
    });

    const stockResults = await Promise.all(stockPromises);
    
    // Filter out null results
    stockResults.forEach(stock => {
      if (stock) {
        stocks.push(stock);
      }
    });

    return { stocks };
  }

  /**
   * Fetch news data for multiple tickers
   */
  private async fetchNewsData(tickers: string[]): Promise<{ news: NewsItem[] }> {
    const allNews: NewsItem[] = [];
    
    // Fetch news for each ticker in parallel
    const newsPromises = tickers.map(async (ticker) => {
      try {
        const news = await newsService.getCompanyNews(ticker);
        return news;
      } catch (error) {
        console.error(`Error fetching news for ${ticker}:`, error);
        return [];
      }
    });

    const newsResults = await Promise.all(newsPromises);
    
    // Flatten and deduplicate news
    newsResults.forEach(news => {
      allNews.push(...news);
    });

    // Remove duplicates based on headline
    const uniqueNews = allNews.filter((item, index, self) => 
      index === self.findIndex(t => t.headline === item.headline)
    );

    // Sort by datetime (most recent first) and limit to 10
    uniqueNews.sort((a, b) => b.datetime - a.datetime);
    
    return { news: uniqueNews.slice(0, 10) };
  }

  /**
   * Get a summary of what was fetched
   */
  getFetchSummary(data: FetchedData): string {
    const parts: string[] = [];
    
    if (data.stocks.length > 0) {
      parts.push(`${data.stocks.length} stock${data.stocks.length === 1 ? '' : 's'}`);
    }
    
    if (data.news.length > 0) {
      parts.push(`${data.news.length} news article${data.news.length === 1 ? '' : 's'}`);
    }
    
    if (parts.length === 0) {
      return 'No data fetched';
    }
    
    const summary = `Fetched ${parts.join(' and ')}`;
    
    if (data.errors.length > 0) {
      return `${summary} (${data.errors.length} error${data.errors.length === 1 ? '' : 's'})`;
    }
    
    return summary;
  }

  /**
   * Check if the fetch was successful
   */
  isSuccessful(data: FetchedData): boolean {
    return (data.stocks.length > 0 || data.news.length > 0) && data.errors.length === 0;
  }

  /**
   * Check if there were any errors
   */
  hasErrors(data: FetchedData): boolean {
    return data.errors.length > 0;
  }

  /**
   * Get error messages for display
   */
  getErrorMessages(data: FetchedData): string[] {
    return data.errors;
  }
}

export const dataFetcherService = new DataFetcherService();
