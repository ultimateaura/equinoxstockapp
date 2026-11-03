import { aiService } from './aiService';
import { getGeminiClient } from './geminiClient';


export interface QueryRoutingDecision {
  category: 'stock_data' | 'news' | 'both' | 'neither';
  tickers: string[];
  confidence: number;
  reasoning: string;
}

export class QueryRouterService {

  /**
   * Classify and route user query using Gemini
   */
  async classifyAndRoute(query: string, context?: any): Promise<QueryRoutingDecision> {
    try {
      // First extract tickers using existing logic as fallback
      const fallbackTickers = aiService.extractTickers(query, context);
      
      // Use Gemini for intelligent classification
      const classification = await this.classifyWithGemini(query);
      
      // Extract tickers from the query (use fallback if Gemini didn't find any)
      const tickers = classification.tickers.length > 0 ? classification.tickers : fallbackTickers;
      
      return {
        category: classification.category,
        tickers,
        confidence: classification.confidence,
        reasoning: classification.reasoning
      };
    } catch (error) {
      console.error('Error in query classification:', error);
      
      // Fallback to regex-based classification
      return this.fallbackClassification(query, context);
    }
  }

  /**
   * Use Gemini to classify the query
   */
  private async classifyWithGemini(query: string): Promise<QueryRoutingDecision> {
    const prompt = `You are a query classifier for a stock portfolio app. Classify the user's query into ONE category:

- "stock_data": User wants real-time stock prices, quotes, or trading data
- "news": User wants recent news articles about stocks or companies  
- "both": User wants both stock data AND news
- "neither": General questions, portfolio analysis, education, or casual conversation

Examples:
- "What's the price of Apple?" → stock_data
- "Any news about Tesla?" → news
- "Tell me about Microsoft stock and recent news" → both
- "How do I diversify my portfolio?" → neither
- "What does P/E ratio mean?" → neither

User query: "${query}"

Also extract any stock tickers mentioned (like AAPL, MSFT, GOOGL) or company names (like Apple, Microsoft, Google).

Respond with ONLY a JSON object:
{
  "category": "stock_data" | "news" | "both" | "neither",
  "tickers": ["AAPL", "MSFT"],
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;

    const result = await getGeminiClient().models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    const text = result.text ?? "";
    
    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Gemini response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      category: parsed.category || 'neither',
      tickers: parsed.tickers || [],
      confidence: parsed.confidence || 0.5,
      reasoning: parsed.reasoning || 'Fallback classification'
    };
  }

  /**
   * Fallback to regex-based classification if Gemini fails
   */
  private fallbackClassification(query: string, context?: any): QueryRoutingDecision {
    const lowerQuery = query.toLowerCase();
    
    // Extract tickers using existing logic
    const tickers = aiService.extractTickers(query, context);
    
    // Simple regex-based classification
    let category: 'stock_data' | 'news' | 'both' | 'neither' = 'neither';
    let confidence = 0.3; // Lower confidence for fallback
    
    // News queries
    if (lowerQuery.match(/news (about|on|for|regarding)|what.*news|any news|latest news|recent news|tell me about.*news/)) {
      category = 'news';
      confidence = 0.6;
    }
    // Stock data queries
    else if (lowerQuery.match(/price|quote|value|worth|trading at|current price|stock price|how much|what.*trading/)) {
      category = 'stock_data';
      confidence = 0.6;
    }
    // Both queries
    else if (lowerQuery.match(/stock.*news|news.*stock|both|and.*news|and.*price/)) {
      category = 'both';
      confidence = 0.7;
    }
    // If we found tickers but no clear category, assume stock data
    else if (tickers.length > 0) {
      category = 'stock_data';
      confidence = 0.4;
    }
    
    return {
      category,
      tickers,
      confidence,
      reasoning: 'Fallback regex-based classification'
    };
  }

  /**
   * Check if the routing decision is confident enough to proceed
   */
  isConfidentEnough(decision: QueryRoutingDecision): boolean {
    return decision.confidence >= 0.4;
  }

  /**
   * Get a user-friendly explanation of what will be fetched
   */
  getFetchExplanation(decision: QueryRoutingDecision): string {
    const { category, tickers } = decision;
    
    if (tickers.length === 0) {
      return 'No specific stocks mentioned';
    }
    
    const tickerList = tickers.join(', ');
    
    switch (category) {
      case 'stock_data':
        return `Fetching real-time data for ${tickerList}`;
      case 'news':
        return `Fetching recent news for ${tickerList}`;
      case 'both':
        return `Fetching stock data and news for ${tickerList}`;
      default:
        return 'No data fetching needed';
    }
  }
}

export const queryRouterService = new QueryRouterService();
