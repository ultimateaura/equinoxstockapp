import { cacheService } from './cacheService';

class LogoService {
  private readonly FALLBACK_LOGO = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjMTYxQjIyIi8+Cjx0ZXh0IHg9IjI1IiB5PSIzNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSIjMjJDNTVFIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn5KIPPCvdGV4dD4KPC9zdmc+';
  private readonly CLEARBIT_BASE_URL = 'https://logo.clearbit.com';

  // Get fallback logo for companies when Finnhub doesn't have logo
  private getFallbackLogo(symbol: string, companyName: string): string {
    // Use a simple emoji-based logo system with data URIs
    const companyLogos: { [key: string]: string } = {
      'AAPL': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjMDAwMDAwIi8+Cjx0ZXh0IHg9IjI1IiB5PSIzNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn5qOPC90ZXh0Pgo8L3N2Zz4=',
      'MSFT': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjMDA3OEQ0Ii8+Cjx0ZXh0IHg9IjI1IiB5PSIzNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn5qPPC90ZXh0Pgo8L3N2Zz4=',
      'GOOGL': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjNDI4NUY0Ii8+Cjx0ZXh0IHg9IjI1IiB5PSIzNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn4+NDPC90ZXh0Pgo8L3N2Zz4=',
      'GOOG': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjNDI4NUY0Ii8+Cjx0ZXh0IHg9IjI1IiB5PSIzNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn4+NDPC90ZXh0Pgo8L3N2Zz4=',
      'AMZN': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjRkY5OTAwIi8+Cjx0ZXh0IHg9IjI1IiB5PSIzNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn5q6PC90ZXh0Pgo8L3N2Zz4=',
      'TSLA': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjQ0MwMDAwIi8+Cjx0ZXh0IHg9IjI1IiB5PSIzNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn5qRPC90ZXh0Pgo8L3N2Zz4=',
      'META': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjMTg3N0YyIi8+Cjx0ZXh0IHg9IjI1IiB5PSIzNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn5qQPC90ZXh0Pgo8L3N2Zz4=',
      'NVDA': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjNzZCODAwIi8+Cjx0ZXh0IHg9IjI1IiB5PSIzNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn5qOPC90ZXh0Pgo8L3N2Zz4=',
      'WMT': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjMDA0QzkxIi8+Cjx0ZXh0IHg9IjI1IiB5PSIzNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn5qQPC90ZXh0Pgo8L3N2Zz4=',
      'JPM': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjMDA2NkJCMiIvPgo8dGV4dCB4PSIyNSIgeT0iMzUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyNCIgZmlsbD0iI0ZGRkZGRiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+amjwvdGV4dD4KPC9zdmc+',
      'JNJ': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjMDA2NkJCMiIvPgo8dGV4dCB4PSIyNSIgeT0iMzUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyNCIgZmlsbD0iI0ZGRkZGRiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+UijwvdGV4dD4KPC9zdmc+',
      'V': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjMTQzNENCIi8+Cjx0ZXh0IHg9IjI1IiB5PSIzNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn5KTPC90ZXh0Pgo8L3N2Zz4=',
      'PG': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjMDAzREE1Ii8+Cjx0ZXh0IHg9IjI1IiB5PSIzNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn5q4PC90ZXh0Pgo8L3N2Zz4=',
      'UNH': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjMDBBOEUxIi8+Cjx0ZXh0IHg9IjI1IiB5PSIzNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn5qZPC90ZXh0Pgo8L3N2Zz4=',
      'HD': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjRjk2MzAyIi8+Cjx0ZXh0IHg9IjI1IiB5PSIzNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn5qoPC90ZXh0Pgo8L3N2Zz4=',
    };

    // Return specific logo for known companies, or generic fallback
    return companyLogos[symbol] || this.FALLBACK_LOGO;
  }

  // Get logo URL from Finnhub with caching
  async getLogoUrl(companyName: string, website?: string): Promise<string> {
    // For backward compatibility, this method now uses getStockLogo
    // Since we don't have a symbol here, we'll return the fallback
    return this.getFallbackLogo('', companyName);
  }

  // Get logo URL for stock symbol using Clearbit API
  async getStockLogo(symbol: string, companyName: string, website?: string): Promise<string> {
    // Validate input
    if (!symbol || typeof symbol !== 'string') {
      console.warn('Invalid symbol provided to getStockLogo:', symbol);
      return this.getFallbackLogo('', companyName);
    }

    const normalizedSymbol = symbol.toUpperCase().trim();

    // Check cache first
    const cachedLogo = await cacheService.getLogoCache(normalizedSymbol);
    if (cachedLogo) {
      return cachedLogo;
    }

    // Try Clearbit API for logo
    try {
      // First try to get domain from company name or symbol
      const domain = this.getCompanyDomain(normalizedSymbol, companyName, website);
      
      if (domain) {
        const logoUrl = `${this.CLEARBIT_BASE_URL}/${domain}`;
        
        // Test if the logo exists by making a HEAD request
        const response = await fetch(logoUrl, { 
          method: 'HEAD',
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });
        
        if (response.ok) {
          console.log(`✓ Found Clearbit logo for ${normalizedSymbol}:`, logoUrl);
          await cacheService.setLogoCache(normalizedSymbol, logoUrl);
          return logoUrl;
        } else {
          console.log(`Clearbit returned ${response.status} for ${normalizedSymbol} with domain ${domain}`);
        }
      }
    } catch (error) {
      console.log(`Clearbit logo fetch failed for ${normalizedSymbol}:`, error);
    }

    // If Clearbit doesn't work, return fallback
    const fallbackLogo = this.getFallbackLogo(normalizedSymbol, companyName);
    console.log(`⚠ Using fallback logo for ${normalizedSymbol}:`, fallbackLogo);
    await cacheService.setLogoCache(normalizedSymbol, fallbackLogo);
    return fallbackLogo;
  }

  // Extract domain from company name, symbol, or website
  private getCompanyDomain(symbol: string, companyName: string, website?: string): string | null {
    // If website is provided, extract domain from it
    if (website) {
      try {
        const url = new URL(website.startsWith('http') ? website : `https://${website}`);
        return url.hostname.replace('www.', '');
      } catch (error) {
        console.log(`Invalid website URL: ${website}`);
      }
    }

    // Map of known companies to their domains
    const knownDomains: { [key: string]: string } = {
      'AAPL': 'apple.com',
      'MSFT': 'microsoft.com',
      'GOOGL': 'google.com',
      'GOOG': 'google.com',
      'AMZN': 'amazon.com',
      'TSLA': 'tesla.com',
      'META': 'meta.com',
      'FB': 'meta.com',
      'NVDA': 'nvidia.com',
      'NFLX': 'netflix.com',
      'DIS': 'disney.com',
      'WMT': 'walmart.com',
      'JPM': 'jpmorganchase.com',
      'JNJ': 'jnj.com',
      'PG': 'pg.com',
      'KO': 'coca-cola.com',
      'PFE': 'pfizer.com',
      'ABBV': 'abbvie.com',
      'V': 'visa.com',
      'MA': 'mastercard.com',
      'HD': 'homedepot.com',
      'UNH': 'unitedhealthgroup.com',
      'BAC': 'bankofamerica.com',
      'XOM': 'exxonmobil.com',
      'CVX': 'chevron.com',
      'ABT': 'abbott.com',
      'TMO': 'thermofisher.com',
      'COST': 'costco.com',
      'DHR': 'danaher.com',
      'VZ': 'verizon.com',
      'ADBE': 'adobe.com',
      'NKE': 'nike.com',
      'CRM': 'salesforce.com',
      'ACN': 'accenture.com',
      'TXN': 'ti.com',
      'QCOM': 'qualcomm.com',
      'AMD': 'amd.com',
      'INTC': 'intel.com',
      'ORCL': 'oracle.com',
      'IBM': 'ibm.com',
      'CSCO': 'cisco.com',
      'NOW': 'servicenow.com',
      'INTU': 'intuit.com',
      'ISRG': 'intuitivesurgical.com',
      'GILD': 'gilead.com',
      'MDT': 'medtronic.com',
      'BMY': 'bms.com',
      'LLY': 'lilly.com',
      'T': 'att.com',
      'CMCSA': 'comcast.com',
      'PEP': 'pepsico.com',
      'WFC': 'wellsfargo.com',
      'USB': 'usbank.com',
      'PNC': 'pnc.com',
      'TGT': 'target.com',
      'LOW': 'lowes.com',
      'SBUX': 'starbucks.com',
      'MCD': 'mcdonalds.com',
      'YUM': 'yum.com',
      'SPOT': 'spotify.com',
      'UBER': 'uber.com',
      'LYFT': 'lyft.com',
      'SQ': 'square.com',
      'PYPL': 'paypal.com',
      'ZM': 'zoom.us',
      'DOCU': 'docusign.com',
      'TWLO': 'twilio.com',
      'OKTA': 'okta.com',
      'CRWD': 'crowdstrike.com',
      'SNOW': 'snowflake.com',
      'PLTR': 'palantir.com',
      'RBLX': 'roblox.com',
      'COIN': 'coinbase.com',
      'HOOD': 'robinhood.com',
    };

    // Check if we have a known domain for this symbol
    if (knownDomains[symbol]) {
      return knownDomains[symbol];
    }

    // Try to generate domain from company name
    if (companyName) {
      // Remove common company suffixes and clean up the name
      let cleanName = companyName
        .toLowerCase()
        .replace(/\s+(inc|incorporated|corp|corporation|llc|ltd|limited|company|co\.?)$/i, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '')
        .trim();

      if (cleanName && cleanName.length > 0) {
        return `${cleanName}.com`;
      }
    }

    return null;
  }

  // Batch get logos for multiple companies
  async getBatchLogos(companies: Array<{ symbol: string; name: string; website?: string }>): Promise<{ [symbol: string]: string }> {
    if (!companies || companies.length === 0) {
      return {};
    }

    // Process logos with error handling for individual failures
    const logoPromises = companies.map(async (company) => {
      try {
        const logoUrl = await this.getStockLogo(company.symbol, company.name, company.website);
        return { symbol: company.symbol, logoUrl, success: true };
      } catch (error) {
        console.error(`Failed to get logo for ${company.symbol}:`, error);
        const fallbackLogo = this.getFallbackLogo(company.symbol, company.name);
        return { symbol: company.symbol, logoUrl: fallbackLogo, success: false };
      }
    });

    const results = await Promise.allSettled(logoPromises);
    
    return results.reduce((acc, result) => {
      if (result.status === 'fulfilled' && result.value) {
        acc[result.value.symbol] = result.value.logoUrl;
      }
      return acc;
    }, {} as { [symbol: string]: string });
  }

  // Clear logo cache
  async clearLogoCache(): Promise<void> {
    // This will be handled by the cache service
    await cacheService.clearAllCache();
  }
}

export const logoService = new LogoService();
