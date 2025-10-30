import { GoogleGenAI } from '@google/genai';
import { NewsItem } from '../components/NewsCard';
import Constants from 'expo-constants';
import { CompanyTickerMappingService } from './companyTickerMapping';
import { dataFetcherService, FetchedData } from './dataFetcherService';
import { queryRouterService, QueryRoutingDecision } from './queryRouterService';

const API_KEY = (Constants.expoConfig?.extra as any)?.GEMINI_API_KEY || '';
const genAI = new GoogleGenAI({ apiKey: API_KEY });

interface EnrichedContext {
  originalContext: any;
  additionalData?: {
    stockQuotes?: any[];
    news?: NewsItem[];
    marketData?: any;
  };
  dataSources: string[];
  routingDecision?: QueryRoutingDecision;
  fetchedData?: FetchedData;
}

/**
 * AI Service - Handles AI conversation and context management
 * 
 * ARCHITECTURE:
 * - Query Router Service: Classifies queries and determines data needs
 * - Data Fetcher Service: Fetches real-time stock/news data
 * - AI Service: Enriches context and generates AI responses
 * - AI Screen: Displays data cards (StockCard/NewsCard) before AI response
 * 
 * SEPARATION OF CONCERNS:
 * - Real-time data → StockCard/NewsCard (visual display)
 * - Analysis/insights → AI text response (interpretation)
 * - AI never provides current prices/quotes (cards do that)
 */
export class AIService {

  /**
   * Extract stock tickers from query - enhanced with company name mapping
   */
  extractTickers(query: string, context?: any): string[] {
    const tickers: string[] = [];
    
    // First check if there's a ticker in the context (user is viewing a stock)
    if (context?.screen === 'stock-detail' && context?.data?.ticker) {
      tickers.push(context.data.ticker);
    }
    
    // Only look for tickers in very specific contexts where they're likely to be mentioned
    const lowerQuery = query.toLowerCase();
    
    // Look for explicit ticker mentions with stock-related keywords
    const tickerContexts = [
      // "AAPL stock", "Apple (AAPL)", "ticker AAPL", "symbol AAPL"
      /\b([A-Z]{1,5})\s+(?:stock|ticker|symbol|shares?|shares? of|price|quote|value|trading|investing|buying|selling|holding|owning|purchased|bought|sold)\b/gi,
      // "stock AAPL", "ticker AAPL", "symbol AAPL"
      /\b(?:stock|ticker|symbol|shares?|shares? of|price|quote|value|trading|investing|buying|selling|holding|owning|purchased|bought|sold)\s+([A-Z]{1,5})\b/gi,
      // "Apple (AAPL)", "Microsoft (MSFT)", "Google (GOOGL)"
      /\b[A-Za-z\s]+\(([A-Z]{1,5})\)/g,
      // "AAPL, MSFT, GOOGL" in lists
      /\b([A-Z]{1,5})(?:\s*,\s*[A-Z]{1,5})*\b/g
    ];
    
    // Look for company names with stock-related keywords
    const companyContexts = [
      // "Apple stock", "Microsoft shares", "Google price"
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:stock|ticker|symbol|shares?|shares? of|price|quote|value|trading|investing|buying|selling|holding|owning|purchased|bought|sold)\b/gi,
      // "stock Apple", "shares Microsoft", "price Google"
      /\b(?:stock|ticker|symbol|shares?|shares? of|price|quote|value|trading|investing|buying|selling|holding|owning|purchased|bought|sold)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/gi,
      // "Apple Inc", "Microsoft Corporation", "Google LLC"
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Inc|Corporation|Corp|Company|Co|LLC|Ltd|Limited)\b/gi,
      // "How is Apple doing?", "What about Microsoft?", "Tell me about Google"
      /\b(?:how|what|tell me about|about|info on|information on|details on)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/gi
    ];
    
    // Only extract if the query contains stock-related terms
    const hasStockContext = lowerQuery.match(/\b(?:stock|ticker|symbol|shares?|price|quote|value|trading|investing|buying|selling|holding|owning|purchased|bought|sold|portfolio|investment|market|trading|invest|buy|sell|hold|own|purchase|bought|sold|apple|microsoft|google|amazon|tesla|meta|netflix|nvidia|intel|amd|nike|adobe|salesforce|uber|lyft|spotify|twitter|linkedin|youtube|facebook|instagram|whatsapp|snapchat|tiktok|zoom|slack|dropbox|airbnb|uber|lyft|doordash|grubhub|paypal|square|stripe|coinbase|robinhood|webull|fidelity|vanguard|schwab|etrade|ameritrade|td ameritrade|charles schwab|fidelity investments|vanguard group|blackrock|state street|goldman sachs|morgan stanley|jpmorgan|jpm|bank of america|wells fargo|citigroup|citi|us bank|pnc|truist|regions|huntington|keybank|comerica|m&t bank|first citizens|citizens bank|capital one|discover|american express|visa|mastercard|american express|amex)\b/);
    
    if (hasStockContext) {
      // Extract direct ticker symbols
      for (const pattern of tickerContexts) {
        const matches = query.matchAll(pattern);
        for (const match of matches) {
          const ticker = match[1] || match[0];
          if (ticker && this.isValidTicker(ticker)) {
            tickers.push(ticker);
          }
        }
      }
      
      // Extract company names and convert to tickers
      for (const pattern of companyContexts) {
        const matches = query.matchAll(pattern);
        for (const match of matches) {
          const companyName = match[1] || match[0];
          if (companyName && this.isValidCompanyName(companyName)) {
            const ticker = CompanyTickerMappingService.findTicker(companyName);
            if (ticker && !tickers.includes(ticker)) {
              tickers.push(ticker);
            }
          }
        }
      }
    }

    return [...new Set(tickers)]; // Remove duplicates
  }

  /**
   * Validate if a string looks like a real stock ticker
   */
  private isValidTicker(ticker: string): boolean {
    // Must be 1-5 uppercase letters
    if (!/^[A-Z]{1,5}$/.test(ticker)) {
      return false;
    }
    
    // Filter out common words that aren't tickers
    const commonWords = [
      'I', 'A', 'THE', 'AND', 'OR', 'BUT', 'FOR', 'TO', 'OF', 'IN', 'ON', 'AT', 'BY',
      'AI', 'IS', 'AS', 'IT', 'BE', 'AN', 'US', 'MY', 'WE', 'SO', 'UP', 'NO', 'IF',
      'DO', 'GO', 'HE', 'ME', 'OK', 'OH', 'AM', 'PM', 'VS', 'VIA', 'PER', 'USD', 'EUR',
      'BUY', 'SELL', 'HOLD', 'WHAT', 'WHEN', 'WHERE', 'WHY', 'HOW', 'CAN', 'WILL',
      'SHOULD', 'COULD', 'WOULD', 'MUST', 'MIGHT', 'MAY', 'SHALL', 'HAVE', 'HAS',
      'HAD', 'WAS', 'WERE', 'BEEN', 'BEING', 'HERE', 'THERE', 'THEN', 'THAN', 'THIS',
      'THAT', 'THEY', 'THEM', 'THEIR', 'THESE', 'THOSE', 'YOUR', 'YOURS', 'OUR', 'OURS',
      'HERS', 'HIS', 'ITS', 'WHO', 'WHOM', 'WHOSE', 'WHICH', 'EACH', 'EVERY', 'ALL',
      'SOME', 'ANY', 'MANY', 'MOST', 'FEW', 'LITTLE', 'MUCH', 'MORE', 'LESS', 'MOST',
      'LEAST', 'BOTH', 'EITHER', 'NEITHER', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE',
      'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'FIRST', 'SECOND', 'THIRD', 'LAST',
      'NEXT', 'PREVIOUS', 'CURRENT', 'PAST', 'FUTURE', 'TODAY', 'YESTERDAY', 'TOMORROW',
      'NOW', 'LATER', 'EARLY', 'LATE', 'SOON', 'AGAIN', 'ALWAYS', 'NEVER', 'OFTEN',
      'SOMETIMES', 'USUALLY', 'RARELY', 'SELDOM', 'ALREADY', 'YET', 'STILL', 'JUST',
      'ONLY', 'EVEN', 'ALSO', 'TOO', 'VERY', 'QUITE', 'RATHER', 'PRETTY', 'FAIRLY',
      'REALLY', 'TRULY', 'ACTUALLY', 'FINALLY', 'SUDDENLY', 'IMMEDIATELY', 'QUICKLY',
      'SLOWLY', 'CAREFULLY', 'CLEARLY', 'EASILY', 'HARD', 'DIFFICULT', 'SIMPLE',
      'COMPLEX', 'IMPORTANT', 'NECESSARY', 'POSSIBLE', 'IMPOSSIBLE', 'LIKELY',
      'UNLIKELY', 'CERTAIN', 'UNCERTAIN', 'SURE', 'UNSURE', 'READY', 'BUSY',
      'FREE', 'AVAILABLE', 'UNAVAILABLE', 'OPEN', 'CLOSED', 'FULL', 'EMPTY',
      'NEW', 'OLD', 'YOUNG', 'BIG', 'SMALL', 'LARGE', 'TINY', 'HUGE', 'LONG',
      'SHORT', 'TALL', 'WIDE', 'NARROW', 'DEEP', 'SHALLOW', 'HIGH', 'LOW',
      'FAR', 'NEAR', 'CLOSE', 'DISTANT', 'INSIDE', 'OUTSIDE', 'ABOVE', 'BELOW',
      'OVER', 'UNDER', 'BEFORE', 'AFTER', 'DURING', 'WHILE', 'UNTIL', 'SINCE',
      'BECAUSE', 'ALTHOUGH', 'THOUGH', 'UNLESS', 'IF', 'WHEN', 'WHERE', 'WHY',
      'HOW', 'WHAT', 'WHO', 'WHOM', 'WHOSE', 'WHICH', 'THAT', 'THIS', 'THESE',
      'THOSE', 'I', 'YOU', 'HE', 'SHE', 'IT', 'WE', 'THEY', 'ME', 'HIM', 'HER',
      'US', 'THEM', 'MY', 'YOUR', 'HIS', 'HER', 'ITS', 'OUR', 'THEIR', 'MINE',
      'YOURS', 'HERS', 'OURS', 'THEIRS', 'MYSELF', 'YOURSELF', 'HIMSELF',
      'HERSELF', 'ITSELF', 'OURSELVES', 'YOURSELVES', 'THEMSELVES'
    ];
    
    return !commonWords.includes(ticker);
  }

  /**
   * Validate if a string looks like a company name
   */
  private isValidCompanyName(companyName: string): boolean {
    // Must be at least 2 characters and start with uppercase
    if (!/^[A-Z][a-z]+/.test(companyName)) {
      return false;
    }
    
    // Check if it's a known company
    return CompanyTickerMappingService.isKnownCompany(companyName);
  }

  /**
   * Enrich context with real-time data using intelligent routing
   */
  async enrichContext(query: string, baseContext: any): Promise<EnrichedContext> {
    const enrichedContext: EnrichedContext = {
      originalContext: baseContext,
      dataSources: []
    };

    try {
      // Use Query Router Service for ALL classification
      const routingDecision = await queryRouterService.classifyAndRoute(query, baseContext);
      enrichedContext.routingDecision = routingDecision;

      // Fetch data based on routing decision
      if (routingDecision.category !== 'neither' && routingDecision.tickers.length > 0) {
        const fetchedData = await dataFetcherService.fetchData(routingDecision);
        enrichedContext.fetchedData = fetchedData;
        
        // Add to context for AI to reference
        if (fetchedData.stocks.length > 0) {
          enrichedContext.additionalData = {
            ...enrichedContext.additionalData,
            stockQuotes: fetchedData.stocks
          };
          enrichedContext.dataSources.push('Real-time Stock Data');
        }
        
        if (fetchedData.news.length > 0) {
          enrichedContext.additionalData = {
            ...enrichedContext.additionalData,
            news: fetchedData.news
          };
          enrichedContext.dataSources.push('Recent News');
        }
      }
      
      // Add screen-specific context markers
      if (baseContext.screen === 'portfolio') {
        enrichedContext.dataSources.push('Portfolio Holdings');
      } else if (baseContext.screen === 'discover') {
        enrichedContext.dataSources.push('Stock Discovery');
      }
      
    } catch (error) {
      console.error('Error enriching context:', error);
      // Minimal fallback - just use base context
    }

    return enrichedContext;
  }


  /**
   * Get enriched context with news data for external use
   */
  async getEnrichedContext(query: string, baseContext: any): Promise<EnrichedContext> {
    return await this.enrichContext(query, baseContext);
  }

  /**
   * Generate AI response with enriched context
   */
  async generateResponse(
    query: string,
    conversationHistory: Array<{ role: string; content: string }>,
    context: any
  ): Promise<string> {
    try {
      const enrichedContext = await this.enrichContext(query, context);
      // Build system instruction with enriched data
      const systemInstruction = this.buildSystemInstruction(enrichedContext);

      // Build conversation history
      const messages = conversationHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      // Add current query
      messages.push({
        role: 'user',
        parts: [{ text: query }]
      });

      const result = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: 'user', parts: [{ text: systemInstruction + '\n\n' + query }] }],
        config: {
          maxOutputTokens: 2000,
          temperature: 0.7,
        }
      });
      const response = result.text ?? "";

      // Add data sources footer if any were used
      if (enrichedContext.dataSources.length > 0) {
        return response + `\n\n*Data sources: ${enrichedContext.dataSources.join(', ')}*`;
      }

      return response;
    } catch (error) {
      console.error('Error generating AI response:', error);
      throw error;
    }
  }

  /**
   * Build comprehensive system instruction
   */
  private buildSystemInstruction(enrichedContext: EnrichedContext): string {
    const baseContext = enrichedContext.originalContext;
    
    let instruction = `You are a knowledgeable stock market advisor. 

**CRITICAL RULES**:
1. NEVER provide current stock prices, quotes, or real-time data
2. Real-time data is shown in StockCards and NewsCards above your response
3. Your role is to ANALYZE and INTERPRET the data shown in cards
4. Provide insights, context, recommendations, and education
5. Reference the cards naturally: "As shown in the data above..." or "Based on the current price..."
6. Keep responses concise (2-3 sentences max)

**CONTEXT**:
- Screen: ${baseContext.screen}
- User is ${baseContext.screen === 'portfolio' ? 'viewing their portfolio' : 
            baseContext.screen === 'discover' ? 'discovering stocks' : 
            baseContext.screen === 'stock-detail' ? `viewing ${baseContext.data?.ticker}` : 
            'in general conversation'}

${enrichedContext.fetchedData?.stocks && enrichedContext.fetchedData.stocks.length > 0 ? 
  `**STOCK DATA DISPLAYED**: ${enrichedContext.fetchedData.stocks.map(s => s.symbol).join(', ')} - data shown in cards above` : ''}

${enrichedContext.fetchedData?.news && enrichedContext.fetchedData.news.length > 0 ? 
  `**NEWS DISPLAYED**: ${enrichedContext.fetchedData.news.length} articles shown in cards above` : ''}

**YOUR RESPONSE SHOULD**:
- Interpret trends and implications
- Provide investment perspective
- Offer actionable insights
- Explain complex concepts if needed
- NEVER repeat data from cards`;

    return instruction;
  }

  /**
   * Generate proactive suggestions based on context
   */
  async generateSuggestions(context: any): Promise<string[]> {
    const suggestions: string[] = [];
    
    if (context.screen === 'stock-detail') {
      suggestions.push(
        "What's your analysis of this stock?",
        "Should I buy, hold, or sell?",
        "What are the risks I should consider?",
        "How does this fit in a diversified portfolio?"
      );
    } else if (context.screen === 'portfolio') {
      suggestions.push(
        "How's my portfolio diversification?",
        "What should I rebalance?",
        "Am I taking too much risk?",
        "What stocks should I consider adding?"
      );
    } else if (context.screen === 'discover') {
      suggestions.push(
        "What makes this a good investment?",
        "What are the key risks?",
        "How does this compare to competitors?",
        "What's the long-term outlook?"
      );
    } else {
      suggestions.push(
        "What should I know about investing?",
        "How do I build a balanced portfolio?",
        "What's a good strategy for beginners?",
        "Explain diversification"
      );
    }
    
    return suggestions;
  }

  /**
   * Generate educational tips based on user behavior
   */
  generateEducationalTip(context: any): string {
    const tips = [
      "💡 Tip: Diversification helps reduce risk by spreading investments across different sectors and asset classes.",
      "💡 Tip: Past performance doesn't guarantee future results. Always do your own research.",
      "💡 Tip: Consider your investment timeline. Long-term investing can help smooth out market volatility.",
      "💡 Tip: Regular portfolio rebalancing helps maintain your desired asset allocation.",
      "💡 Tip: Understanding a company's fundamentals is key to making informed investment decisions.",
      "💡 Tip: Market timing is difficult. Consider a consistent investment strategy instead.",
      "💡 Tip: Keep emotions in check. Fear and greed can lead to poor investment decisions.",
      "💡 Tip: Stay informed but avoid information overload. Focus on quality sources.",
    ];

    return tips[Math.floor(Math.random() * tips.length)];
  }
}

export const aiService = new AIService();

