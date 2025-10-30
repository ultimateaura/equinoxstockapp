
import { ConversationHistory } from '@/components/ConversationHistory';
import { NewsCard } from '@/components/NewsCard';
import { StockCard } from '@/components/StockCard';
import { useAIConversation } from '@/contexts/AIConversationContext';
import { useHoldings } from '@/contexts/HoldingsContext';
import { useInvestmentPlans } from '@/contexts/InvestmentPlansContext';
import { ChatMessage as ServiceChatMessage } from '@/utils/aiConversationService';
import { aiService } from '@/utils/aiService';
import { CompanyTickerMappingService } from '@/utils/companyTickerMapping';
import { ComprehensivePortfolioContext, portfolioContextService } from '@/utils/portfolioContextService';
import { stockApiService } from '@/utils/stockApi';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GoogleGenAI } from "@google/genai";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { FlatList, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';

interface ContextInfo {
  screen: string;
  data: any;
  suggestion: string;
}

// Use the ChatMessage type from the service
type ChatMessage = ServiceChatMessage;

export default function AIScreen() {
  const ai = new GoogleGenAI({apiKey: 'AIzaSyCnxv_KQwefJ5ZmtjiuSR3pUboHzvIN_78'});
  const { currentConversation, conversations, saveMessage, startNewConversation, updateConversationContext, loadUserConversations, loadConversation, error: conversationError, clearError } = useAIConversation();
  const [message, setMessage] = React.useState("");
  const [chat, setChat] = React.useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showConversationHistory, setShowConversationHistory] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [educationalTip, setEducationalTip] = React.useState<string>('');
  const [aiContext, setAiContext] = React.useState<ContextInfo>({
    screen: 'general',
    data: null,
    suggestion: 'Hello! I\'m your personal stock advisor. How can I help you with your investments today?'
  });
  const [manuallySelectedConversation, setManuallySelectedConversation] = React.useState(false);
  const params = useLocalSearchParams();
  const { holdings } = ((): any => {
    try { return useHoldings(); } catch { return { holdings: [] }; }
  })();
  const { plans } = ((): any => {
    try { return useInvestmentPlans(); } catch { return { plans: [] }; }
  })();

  const buildPortfolioContext = React.useCallback((): ComprehensivePortfolioContext | null => {
    try {
      return portfolioContextService.buildContext(holdings || [], plans || []);
    } catch {
      return null;
    }
  }, [holdings, plans]);
  
  const buildContextIntro = React.useCallback((ctx: ContextInfo): string => {
    if (!ctx) return 'Let\'s chat about investing. I\'ll analyze based on any cards shown above.';
    switch (ctx.screen) {
      case 'portfolio':
        return 'Context set to Portfolio. I\'ll analyze diversification, risk, and rebalancing based on your holdings.';
      case 'trending':
      case 'discover':
        return 'Context set to Discover. Ask about any stock; I\'ll fetch quotes/news and analyze.';
      case 'stock-detail': {
        const t = ctx.data?.ticker ? ` ${ctx.data.ticker}` : '';
        return `Context set to Stock Detail${t}. I\'ll analyze using the data shown above.`;
      }
      case 'news-article': {
        const r = ctx.data?.related ? ` about ${ctx.data.related}` : '';
        return `Context set to News Article${r}. I\'ll explain implications and next steps.`;
      }
      case 'account':
      case 'settings':
        return 'Context set to Account. I can help with settings and general investing guidance.';
      case 'home':
      case 'index':
        return 'Context set to Home. Ask about trending themes or stocks; I\'ll analyze using live cards.';
      default:
        return 'Context updated. I\'ll analyze based on the cards shown above.';
    }
  }, []);
  
  // Load context and conversation history on screen focus
  useFocusEffect(
    React.useCallback(() => {
      const loadContextAndHistory = async () => {
        // Don't reload if user manually selected a conversation
        if (manuallySelectedConversation) {
          return;
        }
        
        // Firebase permissions are handled by the conversation context
        // No need to test permissions here as it interferes with conversation state
        
        // Only load conversations if we don't have any loaded yet
        if (conversations.length === 0) {
          await loadUserConversations();
        }
        
        // Check for new context from AsyncStorage (from tab navigation)
        let newContext = null;
        try {
          const storedContext = await AsyncStorage.getItem('aiContext');
          if (storedContext) {
            newContext = JSON.parse(storedContext);
            // Clear the stored context after using it
            await AsyncStorage.removeItem('aiContext');
          }
        } catch (error) {
          console.error('Error loading context from AsyncStorage:', error);
        }
        
        // Check if params.context was passed (when clicking AI button in discover)
        if (!newContext && params.context) {
          try {
            newContext = JSON.parse(params.context as string);
          } catch (error) {
            console.error('Error parsing context from params:', error);
          }
        }
        
        if (currentConversation && currentConversation.messages && currentConversation.messages.length > 0) {
          // Load existing conversation messages - only if it would not drop local state
          setChat(prev => {
            if (!prev || currentConversation.messages.length >= prev.length) {
              return currentConversation.messages;
            }
            return prev;
          });
          
          // Merge portfolio context only when on portfolio screen
          const mergedContext = ((): any => {
            const base = newContext || currentConversation.context;
            if ((base?.screen === 'portfolio' || base?.screen === 'home') && base) {
              const portfolioCtx = buildPortfolioContext();
              return {
                ...base,
                data: { ...(base?.data || {}), portfolio: portfolioCtx }
              };
            }
            return base;
          })();

          // Update context if we have new context from screen switch
          const isDifferentContext = !!newContext && JSON.stringify(newContext) !== JSON.stringify(currentConversation.context || {});
          if (isDifferentContext) {
            setAiContext(mergedContext);
            // Update the conversation context without creating a new conversation
            await updateConversationContext(mergedContext);
            // Append a fresh context intro message for this visit
            const intro: ChatMessage = {
              sender: 'ai' as const,
              text: buildContextIntro(mergedContext),
              timestamp: new Date()
            };
            setChat(prev => [...prev, intro]);
            await saveMessage(intro);
            } else {
            setAiContext(mergedContext);
          }
          
          // Load suggestions based on context
          const contextSuggestions = await aiService.generateSuggestions(newContext || currentConversation.context);
          setSuggestions(contextSuggestions);
          
          // Generate educational tip
          const tip = await aiService.generateEducationalTip(newContext || currentConversation.context);
          setEducationalTip(tip);
        } else if (newContext && !currentConversation) {
          // Only start new conversation if we have new context AND no existing conversation
          const mergedContext = ((): any => {
            if (newContext?.screen === 'portfolio' || newContext?.screen === 'home') {
              const portfolioCtx = buildPortfolioContext();
              return { ...newContext, data: { ...(newContext.data || {}), portfolio: portfolioCtx } };
            }
            return newContext;
          })();
          setAiContext(mergedContext);
          await startNewConversation(newContext);
          
          // Load suggestions based on context
          const contextSuggestions = await aiService.generateSuggestions(newContext);
          setSuggestions(contextSuggestions);
          
          // Generate educational tip
          const tip = await aiService.generateEducationalTip(newContext);
          setEducationalTip(tip);
          
          // Set initial AI message for new context and save it
              const initialMessage: ChatMessage = {
                sender: 'ai' as const,
            text: buildContextIntro(mergedContext),
                timestamp: new Date()
              };
              setChat([initialMessage]);
              
          // Save the initial message to the conversation
          await saveMessage(initialMessage);
        } else if (!currentConversation) {
          // Only create a new conversation if we truly don't have one and no new context
          const defaultContext = {
            screen: 'general',
            data: null,
            suggestion: 'Hello! I\'m your personal stock advisor. How can I help you with your investments today?'
          };
          const portfolioCtx = buildPortfolioContext();
          const mergedDefault: any = { ...defaultContext, data: { portfolio: portfolioCtx } };
          setAiContext(mergedDefault);
          await startNewConversation(defaultContext);
          
          // Load suggestions based on context
          const contextSuggestions = await aiService.generateSuggestions(defaultContext);
          setSuggestions(contextSuggestions);
          
          // Generate educational tip
          const tip = await aiService.generateEducationalTip(defaultContext);
          setEducationalTip(tip);
          
          // Set initial AI message and save it
              const initialMessage: ChatMessage = {
                sender: 'ai' as const,
            text: buildContextIntro(mergedDefault as any),
                timestamp: new Date()
              };
              setChat([initialMessage]);
              
          // Save the initial message to the conversation
          await saveMessage(initialMessage);
        }
      };
      
      loadContextAndHistory();
    }, [currentConversation, conversations.length, manuallySelectedConversation, params.context])
  );
  
  
  // Parse context from state (used in system instruction)
  const context = aiContext;

  // Handle conversation history
  const handleSelectConversation = async (conversation: any) => {
    try {
      // Set flag to prevent useFocusEffect from overriding
      setManuallySelectedConversation(true);
      
      // Load the freshest conversation from Firebase and use it
      const fresh = await loadConversation(conversation.id);
      const convToUse = fresh || conversation;
      
      // Convert messages to proper format with Date objects
      const formattedMessages = convToUse.messages.map((msg: any) => ({
        ...msg,
        timestamp: msg.timestamp instanceof Date 
          ? msg.timestamp 
          : msg.timestamp?.toDate 
            ? msg.timestamp.toDate() 
            : new Date(msg.timestamp)
      }));
      
      setChat(formattedMessages);
      setAiContext(convToUse.context || {
        screen: 'general',
        data: null,
        suggestion: 'How can I help you with your investments today?'
      });
      setShowConversationHistory(false);
    } catch (error) {
      console.error('Error loading conversation:', error);
      alert('Failed to load conversation. Please try again.');
    }
  };

  const handleNewConversation = async () => {
    try {
      // Reset the manual selection flag
      setManuallySelectedConversation(false);
      
      // Clear current conversation and start fresh
      await startNewConversation(aiContext);
      setChat([{
        sender: 'ai' as const,
        text: aiContext.suggestion,
        timestamp: new Date()
      }]);
      setShowConversationHistory(false);
    } catch (error) {
      console.error('Error starting new conversation:', error);
    }
  };

  const handleShowConversationHistory = () => {
    setShowConversationHistory(true);
  };

  const handleCloseConversationHistory = () => {
    setShowConversationHistory(false);
  };
  
  // Function to detect and fetch stock data from text - enhanced with company name mapping
  const detectAndFetchStocks = async (text: string) => {
    // Only look for tickers in very specific contexts where they're likely to be mentioned
    const lowerText = text.toLowerCase();
    
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
    
    // Only extract if the text contains stock-related terms
    const hasStockContext = lowerText.match(/\b(?:stock|ticker|symbol|shares?|price|quote|value|trading|investing|buying|selling|holding|owning|purchased|bought|sold|portfolio|investment|market|trading|invest|buy|sell|hold|own|purchase|bought|sold|apple|microsoft|google|amazon|tesla|meta|netflix|nvidia|intel|amd|nike|adobe|salesforce|uber|lyft|spotify|twitter|linkedin|youtube|facebook|instagram|whatsapp|snapchat|tiktok|zoom|slack|dropbox|airbnb|uber|lyft|doordash|grubhub|paypal|square|stripe|coinbase|robinhood|webull|fidelity|vanguard|schwab|etrade|ameritrade|td ameritrade|charles schwab|fidelity investments|vanguard group|blackrock|state street|goldman sachs|morgan stanley|jpmorgan|jpm|bank of america|wells fargo|citigroup|citi|us bank|pnc|truist|regions|huntington|keybank|comerica|m&t bank|first citizens|citizens bank|capital one|discover|american express|visa|mastercard|american express|amex)\b/);
    
    let uniqueTickers: string[] = [];
    
    if (hasStockContext) {
      // Extract direct ticker symbols
      for (const pattern of tickerContexts) {
        const matches = [...text.matchAll(pattern)];
        for (const match of matches) {
          const ticker = match[1] || match[0];
          if (ticker && isValidTicker(ticker)) {
            uniqueTickers.push(ticker);
          }
        }
      }
      
      // Extract company names and convert to tickers
      for (const pattern of companyContexts) {
        const matches = [...text.matchAll(pattern)];
        for (const match of matches) {
          const companyName = match[1] || match[0];
          if (companyName && isValidCompanyName(companyName)) {
            const ticker = CompanyTickerMappingService.findTicker(companyName);
            if (ticker && !uniqueTickers.includes(ticker)) {
              uniqueTickers.push(ticker);
            }
          }
        }
      }
      
      uniqueTickers = [...new Set(uniqueTickers)]; // Remove duplicates
    }
    
    // Helper function to validate tickers
    function isValidTicker(ticker: string): boolean {
      // Must be 1-5 uppercase letters
      if (!/^[A-Z]{1,5}$/.test(ticker)) {
        return false;
      }
      
      // Filter out common words that aren't tickers
      const commonWords = new Set([
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
      ]);
      
      return !commonWords.has(ticker);
    }
    
    // Helper function to validate company names
    function isValidCompanyName(companyName: string): boolean {
      // Must be at least 2 characters and start with uppercase
      if (!/^[A-Z][a-z]+/.test(companyName)) {
        return false;
      }
      
      // Check if it's a known company
      return CompanyTickerMappingService.isKnownCompany(companyName);
    }
    
    const stocks = [];
    for (const ticker of uniqueTickers) {
      try {
        // Fetch both quote and profile data in parallel
        const [quoteResponse, profileResponse] = await Promise.all([
          stockApiService.getStockQuote(ticker),
          stockApiService.getStockProfile(ticker)
        ]);
        
        
        if (quoteResponse.success && quoteResponse.data) {
          const quote = quoteResponse.data;
          const profile = profileResponse.success && profileResponse.data ? profileResponse.data : null;
          
          stocks.push({
            ticker: ticker,
            companyName: profile?.name || ticker, // Use company name from profile if available
            price: quote.regularMarketPrice || 0,
            priceChange: quote.regularMarketChange || 0,
            priceChangePercent: quote.regularMarketChangePercent || 0,
          });
        }
      } catch (error) {
        // Could not fetch data for ticker
      }
    }
    
    return stocks;
  };

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;
    
    const userMessage: ChatMessage = { 
      sender: 'user' as const, 
      text: message,
      timestamp: new Date()
    };
    
    // Update local state first
    setChat(prev => [...prev, userMessage]);
    
    // Save user message to Firebase
    await saveMessage(userMessage);
    
    setMessage("");
    setIsLoading(true);
    
    try {
      // Use the new routing system to get enriched context
      const enrichedContext = await aiService.enrichContext(message, context);
      
      // Display fetched data cards immediately if available
      if (enrichedContext.fetchedData && (enrichedContext.fetchedData.stocks.length > 0 || enrichedContext.fetchedData.news.length > 0)) {
        const dataMessage: ChatMessage = {
          sender: 'ai' as const,
          text: `Fetching data for your query...`,
          stocks: enrichedContext.fetchedData.stocks.length > 0 ? enrichedContext.fetchedData.stocks.map(stock => ({
            ticker: stock.symbol || 'UNKNOWN',
            companyName: stock.longName || stock.shortName || 'Unknown Company',
            price: stock.regularMarketPrice || 0,
            priceChange: stock.regularMarketChange || 0,
            priceChangePercent: stock.regularMarketChangePercent || 0
          })) : undefined,
          news: enrichedContext.fetchedData.news.length > 0 ? enrichedContext.fetchedData.news : undefined,
          timestamp: new Date()
        };
        
        setChat(prev => [...prev, dataMessage]);
        await saveMessage(dataMessage);
      }
      
      // Update context if routing decision found new stocks
    let updatedContext = context;
      if (enrichedContext.routingDecision && enrichedContext.routingDecision.tickers.length > 0) {
        const firstTicker = enrichedContext.routingDecision.tickers[0];
        if (firstTicker !== context.data?.ticker) {
          // Find the stock data for the first ticker
          const stockData = enrichedContext.fetchedData?.stocks.find(s => 
            s.symbol === firstTicker
          );
          
          if (stockData) {
      updatedContext = {
        screen: 'stock-detail' as const,
        data: {
                ticker: firstTicker,
                companyName: stockData.longName || stockData.shortName || 'Unknown Company',
                currentPrice: stockData.regularMarketPrice || 0,
                priceChange: stockData.regularMarketChange || 0,
                priceChangePercent: stockData.regularMarketChangePercent || 0,
                volume: stockData.regularMarketVolume || 0,
                marketCap: stockData.marketCap || 0,
                dayHigh: stockData.dayHigh || 0,
                dayLow: stockData.dayLow || 0,
                open: stockData.open || 0,
                previousClose: stockData.previousClose || 0,
          isFavorite: false,
          isHeld: false,
          holdingQuantity: 0,
        },
              suggestion: `You're now viewing ${firstTicker} (${stockData.longName || stockData.shortName || 'Unknown Company'}). Current price: $${(stockData.regularMarketPrice || 0).toFixed(2)} (${(stockData.regularMarketChangePercent || 0) > 0 ? '+' : ''}${(stockData.regularMarketChangePercent || 0).toFixed(2)}%). How can I help you with this stock?`,
      };
      
      // Update the context state
      setAiContext(updatedContext);
          }
        }
      }
      
      // Build enhanced system instruction that references displayed data and forbids model knowledge
      let systemInstruction = `You are a concise stock advisor. Keep responses under 3 sentences. Be brief and direct.

CRITICAL RULES:
1) Do NOT use your own current knowledge or provide real-time quotes. Gemini knowledge may be outdated.
2) Real-time data must come ONLY from cards (StockCard/NewsCard) fetched via Finnhub.
3) Your job is to analyze and recommend (Buy/Hold/Sell, risks, strategy) based on the cards and screen context.
4) If data is missing, request the user to clarify ticker or scope; do not guess.
5) Never restate raw numbers already shown in cards; interpret instead.
6) MAXIMUM 3 sentences.

CONTEXT: ${updatedContext.screen === 'stock-detail' && updatedContext.data?.ticker 
  ? `stock-detail: ${updatedContext.data.ticker} - analyze based on displayed cards`
  : updatedContext.screen === 'home'
  ? `home: trending/favorites - analyze themes and risks`
  : updatedContext.screen === 'portfolio'
  ? `portfolio: diversification, risk, rebalancing`
  : updatedContext.screen === 'trending'
  ? `trending: discovery research, comparisons`
  : updatedContext.screen === 'news-article'
  ? `news-article: ${updatedContext.data?.related || 'market'} - explain implications`
  : updatedContext.screen === 'account'
  ? `account: general investing guidance`
  : 'general: investing questions'}

PORTFOLIO CONTEXT:
${(aiContext?.data as any)?.portfolio ?
  (() => {
    try {
      const p = (aiContext.data as any).portfolio as any;
      const tickers = (p.holdings || []).map((h: any) => h.ticker).slice(0, 10).join(', ');
      return `Holdings: ${tickers}. Total value: $${(p.metrics?.totalValue || 0).toFixed(2)}. Risk: ${p.metrics?.riskLevel || 'n/a'}.`;
    } catch { return 'Available.'; }
  })() : 'Not provided'}

ARTICLE CONTEXT:
${updatedContext.screen === 'news-article' ?
  (() => {
    try {
      const d: any = updatedContext.data || {};
      const excerpt: string = (d.contentSummary || d.summary || '').toString();
      const short = excerpt.length > 800 ? (excerpt.slice(0, 800) + '...') : excerpt;
      return `Headline: ${d.headline || ''}. Source: ${d.source || ''}. Excerpt: ${short}`.trim();
    } catch { return 'Provided'; }
  })() : 'N/A'}
`;

      // Add context about displayed data
      if (enrichedContext.fetchedData?.stocks && enrichedContext.fetchedData.stocks.length > 0) {
        systemInstruction += `\n\n**STOCKS DISPLAYED**: ${enrichedContext.fetchedData.stocks.map(s => s.symbol).join(', ')} - current data shown in StockCards above.`;
      }
      
      if (enrichedContext.fetchedData?.news && enrichedContext.fetchedData.news.length > 0) {
        systemInstruction += `\n\n**NEWS DISPLAYED**: ${enrichedContext.fetchedData.news.length} articles shown in NewsCards above.`;
      }

      // Build conversation history for context - include all messages from current conversation
             const conversationHistory = (Array.isArray(chat) ? chat : []).map(msg => ({
               role: msg?.sender === 'user' ? 'user' : 'model',
               parts: [{ text: String(msg?.text || '') }]
             }));

      // Add the current user message
      conversationHistory.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: conversationHistory,
        config: {
          thinkingConfig: {
            thinkingBudget: 0
          },
          systemInstruction: systemInstruction,
          maxOutputTokens: 150, // Limit response to ~150 tokens (roughly 2-3 sentences)
          temperature: 0.7,
          topP: 0.8,
          topK: 40
        }
      });

      // Create AI response message (no additional data since it's already displayed above)
      const aiMessage: ChatMessage = { 
        sender: 'ai' as const, 
        text: response.text ?? "",
        timestamp: new Date()
      };
      
      // Update local state first
      setChat(prev => [...prev, aiMessage]);
      
      // Save AI message to Firebase (this will update currentConversation)
      await saveMessage(aiMessage);
    } catch (error) {
      console.error('Error in sendMessage:', error);
      const errorMessage: ChatMessage = { 
        sender: 'ai' as const, 
        text: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date()
      };
      setChat(prev => [...prev, errorMessage]);
      
      // Save error message to Firebase with error handling
      try {
        await saveMessage(errorMessage);
      } catch (saveError) {
        console.error('Error saving error message:', saveError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {showConversationHistory && (
        <ConversationHistory
          conversations={conversations}
          currentConversation={currentConversation}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onClose={handleCloseConversationHistory}
        />
      )}
      {/* Header Section */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('@/assets/images/logoImg.png')} 
              style={styles.aiLogo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>AI Advisor</Text>
            <Text style={styles.headerSubtitle}>Your personal stock assistant</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShowConversationHistory} style={styles.historyButton}>
            <MaterialCommunityIcons name="history" size={24} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/ai-settings')} style={styles.settingsButton}>
            <MaterialCommunityIcons name="cog-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.separator} />
      
      {conversationError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Conversation Error: {conversationError}
          </Text>
          <Text style={styles.errorSubtext}>
            There was an issue loading your conversations. Please try again.
          </Text>
            <TouchableOpacity 
              style={styles.errorButton}
              onPress={() => {
                clearError();
                loadUserConversations();
              }}
            >
              <Text style={styles.errorButtonText}>Retry</Text>
            </TouchableOpacity>
        </View>
      )}
      
      <FlatList
        data={chat}
        keyExtractor={(_, idx) => idx.toString()}
        renderItem={({ item }) => (
          <View style={[
            styles.messageContainer,
            item.sender === 'user' ? styles.userMessage : styles.aiMessage
          ]}>
            <Text style={[
              styles.messageText,
              item.sender === 'user' ? styles.userText : styles.aiText
            ]}>
              {item.text}
            </Text>
            
            {/* Display StockCards for detected stocks */}
            {item.sender === 'ai' && item.stocks && item.stocks.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stocksContainer}>
                {item.stocks.map((stock, idx) => (
                  <View key={idx} style={styles.stockCardWrapper}>
                    <StockCard
                      ticker={stock.ticker}
                      companyName={stock.companyName}
                      price={stock.price}
                      priceChange={stock.priceChange}
                      priceChangePercentage={stock.priceChangePercent}
                      image={`https://api.elbstream.com/logos/symbol/${stock.ticker}`}
                    />
                  </View>
                ))}
              </ScrollView>
            )}
            
            {/* Display NewsCards for related news */}
            {item.sender === 'ai' && item.news && item.news.length > 0 && (
              <View style={styles.newsContainer}>
                <Text style={styles.newsSectionTitle}>📰 Related News</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.newsScrollView}>
                  {item.news.map((newsItem, idx) => (
                    <View key={idx} style={styles.newsCardWrapper}>
                      <NewsCard
                        news={{
                          ...newsItem,
                          id: idx // Add required id property as number
                        }}
                        onPress={(news) => {
                          try {
                            router.push({ pathname: '/(tabs)/news-article', params: { news: JSON.stringify(news) } });
                          } catch (err) {
                            Linking.openURL(news.url).catch(() => {});
                          }
                        }}
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}
        style={styles.chatList}
        contentContainerStyle={styles.chatContent}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
      />
      
      {isLoading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>AI is thinking...</Text>
        </View>
      )}
      
      <View style={styles.inputContainer}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Ask about stocks or investing..."
          placeholderTextColor="#6E7681"
          style={styles.textInput}
          multiline
          disabled={isLoading}
          onSubmitEditing={() => sendMessage(message)}
          blurOnSubmit={false}
        />
        <Pressable 
          style={[styles.sendButton, isLoading && styles.disabledButton]}
          onPress={() => sendMessage(message)}
          disabled={isLoading}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e22',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#17bf2d',
  },
  backButton: {
    marginRight: 15,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  aiLogo: {
    width: 30,
    height: 30,
    tintColor: '#17bf2d',
  },
  headerText: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyButton: {
    padding: 8,
    marginRight: 5,
  },
  settingsButton: {
    padding: 8,
    marginLeft: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ffffff',
    fontFamily: 'Poppins',
  },
  separator: {
    height: 1,
    backgroundColor: '#3a3a3e',
    marginBottom: 20,
    marginHorizontal: 20,
  },
  chatList: {
    flex: 1,
    marginBottom: 20,
  },
  chatContent: {
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  messageContainer: {
    marginVertical: 5,
    padding: 12,
    borderRadius: 12,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#00FF88', // Green for user messages
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#161B22', // Dark gray for AI messages
    borderLeftWidth: 3,
    borderLeftColor: '#00FF88', // Green accent border
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Poppins',
  },
  userText: {
    color: '#0D1117', // Dark text on green background
    fontWeight: '500',
  },
  aiText: {
    color: '#C9D1D9', // Light text on dark background
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  loadingText: {
    color: '#00FF88', // Green loading text
    fontStyle: 'italic',
    fontFamily: 'Poppins',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
    backgroundColor: '#0D1117',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#161B22', // Dark input background
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: '#C9D1D9', // Light text
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#21262D', // Subtle border
  },
  sendButton: {
    backgroundColor: '#17bf2d', // Green send button
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  disabledButton: {
    backgroundColor: '#484F58', // Disabled state
  },
  sendButtonText: {
    color: '#0D1117', // Dark text on green button
    fontWeight: 'bold',
    fontFamily: 'Poppins',
  },
  stocksContainer: {
    marginTop: 10,
    maxHeight: 150,
  },
  stockCardWrapper: {
    marginRight: 10,
    width: 250,
  },
  newsContainer: {
    marginTop: 10,
    paddingHorizontal: 5,
  },
  newsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    marginLeft: 5,
  },
  newsScrollView: {
    marginHorizontal: -5,
  },
  newsCardWrapper: {
    marginRight: 10,
    width: 280,
  },
  errorContainer: {
    backgroundColor: '#ff4444',
    padding: 15,
    margin: 20,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff0000',
  },
  errorText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Poppins',
    marginBottom: 5,
  },
  errorSubtext: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Poppins',
    opacity: 0.9,
  },
  errorButton: {
    marginTop: 12,
    backgroundColor: '#17bf2d',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'center',
  },
  errorButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Poppins',
  },
});
