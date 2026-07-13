import { getFinnhubApiKey } from './env';
import { NewsItem } from '../components/NewsCard';
import { CompanyTickerMappingService } from './companyTickerMapping';

const FINNHUB_API_KEY = getFinnhubApiKey() || 'demo';
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

export interface FinnhubNewsResponse {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

class NewsService {
  private truncate(text: string, max = 160): string {
    if (!text) return '';
    const t = text.trim();
    return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
  }

  private cleanCompanyCore(name: string): string {
    return (name || '')
      .replace(/\b(incorporated|inc\.?|corp\.?|corporation|company|co\.?|llc|ltd\.?|limited|the)\b/gi, '')
      .replace(/[^a-z0-9 ]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private headlineMatchesCompany(headline: string, companyName: string): boolean {
    if (!headline || !companyName) return false;
    const h = headline.toLowerCase();
    const core = this.cleanCompanyCore(companyName).toLowerCase();
    if (!core) return false;
    // Require phrase match or at least two core tokens matched
    if (h.includes(core)) return true;
    const tokens = core.split(' ').filter(Boolean);
    const matches = tokens.filter(t => h.includes(t)).length;
    return matches >= Math.min(2, tokens.length);
  }
  /**
   * Get general market news
   */
  async getGeneralNews(): Promise<NewsItem[]> {
    try {
      const response = await fetch(
        `${FINNHUB_BASE_URL}/news?category=general&token=${FINNHUB_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: FinnhubNewsResponse[] = await response.json();
      
      return data.slice(0, 10).map(this.transformNewsItem);
    } catch (error) {
      console.error('Error fetching general news:', error);
      return this.getFallbackNews();
    }
  }

  /**
   * Get company-specific news
   */
  async getCompanyNews(symbol: string): Promise<NewsItem[]> {
    try {
      const response = await fetch(
        `${FINNHUB_BASE_URL}/company-news?symbol=${symbol}&from=${this.getDateString(-7)}&to=${this.getDateString(0)}&token=${FINNHUB_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: FinnhubNewsResponse[] = await response.json();

      const symbolUpper = (symbol || '').toUpperCase();
      const companyName = CompanyTickerMappingService.findCompanyName(symbolUpper) || '';

      const filteredStrict = data.filter((item) => {
        const headline = item.headline || '';
        const relatedCsv = (item.related || '');
        const relatedTickers = relatedCsv.split(',').map(s => s.trim().toUpperCase());
        const tickerRegex = new RegExp(`(^|[^A-Z])${symbolUpper}([^A-Z]|$)`, 'i');
        const hasTickerWord = tickerRegex.test(headline);
        const relatedHasTicker = relatedTickers.includes(symbolUpper);
        const companyMatch = this.headlineMatchesCompany(headline, companyName);
        return hasTickerWord || relatedHasTicker || companyMatch;
      });

      const chosen = filteredStrict.length > 0 ? filteredStrict : data.filter(item => (item.related || '').split(',').includes(symbolUpper));
      const limited = (chosen.length > 0 ? chosen : data).slice(0, 5);
      const results = limited.map(it => {
        const base = this.transformNewsItem(it);
        return { ...base, summary: this.truncate(base.summary, 160) };
      });

      return results;
    } catch (error) {
      console.error(`Error fetching news for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Get trending news (most popular)
   */
  async getTrendingNews(): Promise<NewsItem[]> {
    try {
      const response = await fetch(
        `${FINNHUB_BASE_URL}/news?category=general&token=${FINNHUB_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: FinnhubNewsResponse[] = await response.json();
      
      // Sort by datetime (most recent first) and take top 8
      return data
        .sort((a, b) => b.datetime - a.datetime)
        .slice(0, 8)
        .map(this.transformNewsItem);
    } catch (error) {
      console.error('Error fetching trending news:', error);
      return this.getFallbackNews();
    }
  }

  /**
   * Transform Finnhub news response to our NewsItem format
   */
  private transformNewsItem = (item: FinnhubNewsResponse): NewsItem => {
    return {
      id: item.id,
      headline: item.headline,
      summary: item.summary || '',
      url: item.url,
      source: item.source,
      datetime: item.datetime,
      related: item.related || 'Market News',
      image: item.image || undefined,
    };
  };

  /**
   * Get date string for API calls (YYYY-MM-DD format)
   */
  private getDateString(daysOffset: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0];
  }

  /**
   * Fallback news when API fails
   */
  private getFallbackNews(): NewsItem[] {
    return [
      {
        id: 1,
        headline: 'Market Update: Stocks Show Mixed Signals',
        summary: 'Major indices displayed mixed performance as investors weigh economic indicators and corporate earnings.',
        url: 'https://example.com/news/1',
        source: 'Financial Times',
        datetime: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        related: 'S&P 500',
      },
      {
        id: 2,
        headline: 'Tech Sector Leads Market Gains',
        summary: 'Technology stocks outperformed other sectors following positive earnings reports from major tech companies.',
        url: 'https://example.com/news/2',
        source: 'Reuters',
        datetime: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
        related: 'NASDAQ',
      },
      {
        id: 3,
        headline: 'Federal Reserve Maintains Interest Rates',
        summary: 'The Federal Reserve kept interest rates unchanged, citing stable economic conditions and inflation targets.',
        url: 'https://example.com/news/3',
        source: 'Bloomberg',
        datetime: Math.floor(Date.now() / 1000) - 10800, // 3 hours ago
        related: 'Fed Policy',
      },
      {
        id: 4,
        headline: 'Energy Sector Sees Volatility',
        summary: 'Oil and gas stocks experienced significant price movements amid changing global energy dynamics.',
        url: 'https://example.com/news/4',
        source: 'MarketWatch',
        datetime: Math.floor(Date.now() / 1000) - 14400, // 4 hours ago
        related: 'Energy',
      },
    ];
  }
}

export const newsService = new NewsService();
