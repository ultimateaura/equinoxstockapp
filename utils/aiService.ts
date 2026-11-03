import { NewsItem } from '../components/NewsCard';
import { getGeminiClient } from './geminiClient';
import { CompanyTickerMappingService } from './companyTickerMapping';
import { dataFetcherService, FetchedData } from './dataFetcherService';
import { queryRouterService, QueryRoutingDecision } from './queryRouterService';
import { recommendationService } from './recommendationService';
import { StockRecommendation } from './quant/types';


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
  recommendations?: StockRecommendation[];
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

      // Attach the quant + ML recommendation(s) so the AI explains (not invents)
      // the signal. Limit to a few tickers to keep latency reasonable.
      const recTickers = (
        routingDecision.tickers.length > 0
          ? routingDecision.tickers
          : baseContext?.data?.ticker
          ? [baseContext.data.ticker]
          : []
      ).slice(0, 3);

      if (recTickers.length > 0) {
        const recs = await Promise.all(
          recTickers.map((t: string) =>
            recommendationService.getRecommendation(t).catch(() => null)
          )
        );
        const valid = recs.filter(
          (r): r is StockRecommendation => !!r && r.dataQuality !== 'insufficient'
        );
        if (valid.length > 0) {
          enrichedContext.recommendations = valid;
          enrichedContext.dataSources.push('Quant + ML Model');
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

      const result = await getGeminiClient().models.generateContent({
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
    
    const recommendationsBlock = this.buildRecommendationsBlock(enrichedContext);

    let instruction = `You are the explainer for an algorithmic stock recommendation engine.
The app computes its OWN Buy/Hold/Watch signal using quantitative factors plus an
on-device machine-learning model. Your job is to translate that math into plain,
beginner-friendly language - NOT to produce your own independent rating.

**CRITICAL RULES**:
1. NEVER provide current stock prices, quotes, or real-time data (cards show those)
2. If a quant + ML signal is provided below, EXPLAIN it: what the score and factors mean, why the signal is what it is. Do NOT contradict it or invent a different buy/sell call.
3. Always frame output as a "recommendation, not financial advice"
4. Translate jargon (momentum, volatility, Sharpe, beta) into simple terms a beginner understands
5. Keep responses concise (2-4 sentences) unless the user asks to go deeper
6. If no signal is provided, give general education only - never a personalized buy/sell call
${recommendationsBlock}

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
   * Format the quant + ML recommendation(s) into the system prompt so the model
   * can explain them in plain language.
   */
  private buildRecommendationsBlock(enrichedContext: EnrichedContext): string {
    const recs = enrichedContext.recommendations;
    if (!recs || recs.length === 0) return '';

    const lines = recs.map((r) => {
      const factorBits = (Object.keys(r.factors) as (keyof typeof r.factors)[])
        .map((k) => `${k}=${Math.round(r.factors[k])}`)
        .join(', ');
      const mlBit =
        r.mlScore != null && r.ml
          ? ` ML score ${r.mlScore} (${Math.round(r.ml.probability * 100)}% chance it beats the market over ~1 month).`
          : '';
      return `- ${r.ticker}: signal ${r.signal}, blended score ${r.score}/100 (factor model ${r.classicalScore}, confidence ${r.confidence}%). Factors [0-100, higher=better]: ${factorBits}.${mlBit}`;
    });

    return `

**QUANT + ML SIGNAL (explain this, do not override it)**:
${lines.join('\n')}`;
  }

  /**
   * Generate proactive suggestions based on context
   */
  async generateSuggestions(context: any): Promise<string[]> {
    const suggestions: string[] = [];
    
    if (context.screen === 'stock-detail') {
      suggestions.push(
        "Explain this stock's quant + ML signal",
        "Why did the model give this score?",
        "What do the momentum and volatility factors mean here?",
        "What are the risks I should consider?"
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

