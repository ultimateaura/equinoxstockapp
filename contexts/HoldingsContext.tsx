import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../config/firebase';
import { logoService } from '../utils/logoService';
import { stockApiService } from '../utils/stockApi';
import { tradeEventsService } from '../utils/tradeEventsService';
import { useAuth } from './AuthContext';

export interface PurchaseLot {
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
}

export interface Holding {
  ticker: string;
  companyName: string;
  purchaseLots?: PurchaseLot[];
  currentPrice: number;
  addedAt: string;
  image: string;
  // Date fields for time-based analysis
  firstPurchaseDate?: string; // Date of the earliest purchase
  lastPurchaseDate?: string; // Date of the most recent purchase
  // Legacy fields for backward compatibility
  quantity?: number;
  purchasePrice?: number;
}

interface HoldingsContextType {
  holdings: Holding[];
  addHolding: (holding: Omit<Holding, 'addedAt'>) => void;
  addPurchaseLot: (ticker: string, lot: PurchaseLot) => void;
  removeHolding: (ticker: string) => void;
  updateHolding: (holding: Holding) => void;
  deleteHolding: (ticker: string) => void;
  getHolding: (ticker: string) => Holding | undefined;
  getTotalQuantity: (ticker: string) => number;
  getAveragePurchasePrice: (ticker: string) => number;
  calculateTotalValue: () => number;
  calculateTotalGainLoss: () => number;
  calculateTotalGainLossPercentage: () => number;
  getTimeBasedData: (ticker?: string) => any[];
  mergeDuplicateHoldings: () => void;
  refreshPrices: () => Promise<void>;
}

const HoldingsContext = createContext<HoldingsContextType | undefined>(undefined);

export const useHoldings = () => {
  const context = useContext(HoldingsContext);
  if (!context) {
    throw new Error('useHoldings must be used within a HoldingsProvider');
  }
  return context;
};

interface HoldingsProviderProps {
  children: React.ReactNode;
}

export const HoldingsProvider: React.FC<HoldingsProviderProps> = ({ children }) => {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Safely access auth context
  let user = null;
  try {
    const authContext = useAuth();
    user = authContext.user;
  } catch (error) {
    // Auth context not available yet
  }

  // Load holdings from Firestore when user changes
  useEffect(() => {
    if (!user) {
      setHoldings([]);
      setLoading(false);
      return;
    }

    // Check if Firestore is properly configured
    if (!db) {
      setHoldings([]);
      setLoading(false);
      return;
    }

    try {
      const holdingsRef = doc(db, 'users', user.uid);
      
      const unsubscribe = onSnapshot(holdingsRef, async (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const loadedHoldings = data.holdings || [];
          setHoldings(loadedHoldings);
          
          // Auto-merge duplicates after loading
          if (loadedHoldings.length > 0) {
            await autoMergeDuplicates(loadedHoldings);
          }
        } else {
          setHoldings([]);
        }
        setLoading(false);
      }, (error) => {
        console.error('Error loading holdings from Firestore, using local storage:', error);
        setHoldings([]);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up Firestore listener:', error);
      setHoldings([]);
      setLoading(false);
    }
  }, [user]);

  const saveHoldingsToFirestore = async (holdings: Holding[]) => {
    if (!user || !db) return;
    
    try {
      await setDoc(doc(db, 'users', user.uid), {
        holdings: holdings
      }, { merge: true });
    } catch (error) {
      console.error('Error saving holdings to Firestore:', error);
      // Continue without crashing
    }
  };

  const addHolding = async (holding: Omit<Holding, 'addedAt'>) => {
    const newHolding: Holding = {
      ...holding,
      addedAt: new Date().toISOString(),
    };
    const updatedHoldings = [...holdings, newHolding];
    setHoldings(updatedHoldings);
    await saveHoldingsToFirestore(updatedHoldings);
  };

  // Helper function to calculate date fields for a holding
  const calculateDateFields = (purchaseLots: PurchaseLot[]) => {
    if (!purchaseLots || purchaseLots.length === 0) {
      return { firstPurchaseDate: undefined, lastPurchaseDate: undefined };
    }
    
    const dates = purchaseLots.map(lot => new Date(lot.purchaseDate));
    const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());
    
    return {
      firstPurchaseDate: sortedDates[0].toISOString(),
      lastPurchaseDate: sortedDates[sortedDates.length - 1].toISOString()
    };
  };

  const addPurchaseLot = async (ticker: string, lot: PurchaseLot) => {
    const existingHolding = holdings.find(h => h.ticker === ticker);
    const eventType = existingHolding ? 'ADD_LOT' : 'BUY';

    if (existingHolding) {
      // Add to existing holding
      const updatedPurchaseLots = [...(existingHolding.purchaseLots || []), lot];
      const dateFields = calculateDateFields(updatedPurchaseLots);
      
      const updatedHolding = {
        ...existingHolding,
        purchaseLots: updatedPurchaseLots,
        ...dateFields
      };
      const updatedHoldings = holdings.map(h => 
        h.ticker === ticker ? updatedHolding : h
      );
      setHoldings(updatedHoldings);
      await saveHoldingsToFirestore(updatedHoldings);
    } else {
      // Create new holding with this lot
      // We'll fetch the stock data here to populate the holding properly
      try {
        const quoteResponse = await stockApiService.getStockQuote(ticker);
        const profileResponse = await stockApiService.getStockProfile(ticker);
        
        const stockData = quoteResponse.success ? quoteResponse.data : null;
        const profileData = profileResponse.success ? profileResponse.data : null;
        
        const companyName = profileData?.name || ticker;
        const currentPrice = stockData?.regularMarketPrice || 0;
        
        // Get logo
        const logoUrl = await logoService.getStockLogo(ticker, companyName);
        
        const dateFields = calculateDateFields([lot]);
        const newHolding: Holding = {
          ticker,
          companyName,
          purchaseLots: [lot],
          currentPrice,
          addedAt: new Date().toISOString(),
          image: logoUrl,
          ...dateFields
        };
        const updatedHoldings = [...holdings, newHolding];
        setHoldings(updatedHoldings);
        await saveHoldingsToFirestore(updatedHoldings);
      } catch (error) {
        console.error('Error fetching stock data for new holding:', error);
        // Create holding with minimal data if API fails
        const dateFields = calculateDateFields([lot]);
        const newHolding: Holding = {
          ticker,
          companyName: ticker,
          purchaseLots: [lot],
          currentPrice: 0,
          addedAt: new Date().toISOString(),
          image: '',
          ...dateFields
        };
        const updatedHoldings = [...holdings, newHolding];
        setHoldings(updatedHoldings);
        await saveHoldingsToFirestore(updatedHoldings);
      }
    }

    // Fire-and-forget behavior ledger (does not block holdings save)
    if (user?.uid) {
      tradeEventsService
        .logTradeEvent({
          userId: user.uid,
          type: eventType,
          ticker,
          quantity: lot.quantity,
          price: lot.purchasePrice,
        })
        .catch(() => {});
    }
  };

  // Automatically merge duplicates when holdings are loaded
  const autoMergeDuplicates = async (holdingsToMerge: Holding[]) => {
    const tickerMap = new Map<string, Holding>();
    
    holdingsToMerge.forEach(holding => {
      if (tickerMap.has(holding.ticker)) {
        // Merge with existing holding
        const existing = tickerMap.get(holding.ticker)!;
        
        // Convert old structure to new structure if needed
        const existingLots = existing.purchaseLots && Array.isArray(existing.purchaseLots) 
          ? existing.purchaseLots 
          : existing.quantity && existing.purchasePrice 
            ? [{ quantity: existing.quantity, purchasePrice: existing.purchasePrice, purchaseDate: existing.addedAt }]
            : [];
            
        const holdingLots = holding.purchaseLots && Array.isArray(holding.purchaseLots)
          ? holding.purchaseLots
          : holding.quantity && holding.purchasePrice
            ? [{ quantity: holding.quantity, purchasePrice: holding.purchasePrice, purchaseDate: holding.addedAt }]
            : [];
        
        const allLots = [...existingLots, ...holdingLots];
        const dateFields = calculateDateFields(allLots);
        
        const mergedHolding: Holding = {
          ...existing,
          purchaseLots: allLots,
          companyName: existing.companyName || holding.companyName,
          image: existing.image || holding.image,
          ...dateFields
        };
        tickerMap.set(holding.ticker, mergedHolding);
      } else {
        // Convert old structure to new structure if needed
        const convertedLots = holding.purchaseLots && Array.isArray(holding.purchaseLots)
          ? holding.purchaseLots
          : holding.quantity && holding.purchasePrice
            ? [{ quantity: holding.quantity, purchasePrice: holding.purchasePrice, purchaseDate: holding.addedAt }]
            : [];
        
        const dateFields = calculateDateFields(convertedLots);
        
        const convertedHolding: Holding = {
          ...holding,
          purchaseLots: convertedLots,
          ...dateFields
        };
        tickerMap.set(holding.ticker, convertedHolding);
      }
    });
    
    const mergedHoldings = Array.from(tickerMap.values());
    
    // Only update if there were actually duplicates to merge
    if (mergedHoldings.length !== holdingsToMerge.length) {
      setHoldings(mergedHoldings);
      await saveHoldingsToFirestore(mergedHoldings);
      return true; // Indicates that merging occurred
    }
    return false; // No merging needed
  };

  const mergeDuplicateHoldings = async () => {
    const tickerMap = new Map<string, Holding>();
    
    holdings.forEach(holding => {
      if (tickerMap.has(holding.ticker)) {
        // Merge with existing holding
        const existing = tickerMap.get(holding.ticker)!;
        
        // Convert old structure to new structure if needed
        const existingLots = existing.purchaseLots && Array.isArray(existing.purchaseLots) 
          ? existing.purchaseLots 
          : existing.quantity && existing.purchasePrice 
            ? [{ quantity: existing.quantity, purchasePrice: existing.purchasePrice, purchaseDate: existing.addedAt }]
            : [];
            
        const holdingLots = holding.purchaseLots && Array.isArray(holding.purchaseLots)
          ? holding.purchaseLots
          : holding.quantity && holding.purchasePrice
            ? [{ quantity: holding.quantity, purchasePrice: holding.purchasePrice, purchaseDate: holding.addedAt }]
            : [];
        
        const allLots = [...existingLots, ...holdingLots];
        const dateFields = calculateDateFields(allLots);
        
        const mergedHolding: Holding = {
          ...existing,
          purchaseLots: allLots,
          companyName: existing.companyName || holding.companyName,
          image: existing.image || holding.image,
          ...dateFields
        };
        tickerMap.set(holding.ticker, mergedHolding);
      } else {
        // Convert old structure to new structure if needed
        const convertedLots = holding.purchaseLots && Array.isArray(holding.purchaseLots)
          ? holding.purchaseLots
          : holding.quantity && holding.purchasePrice
            ? [{ quantity: holding.quantity, purchasePrice: holding.purchasePrice, purchaseDate: holding.addedAt }]
            : [];
        
        const dateFields = calculateDateFields(convertedLots);
        
        const convertedHolding: Holding = {
          ...holding,
          purchaseLots: convertedLots,
          ...dateFields
        };
        tickerMap.set(holding.ticker, convertedHolding);
      }
    });
    
    const mergedHoldings = Array.from(tickerMap.values());
    setHoldings(mergedHoldings);
    await saveHoldingsToFirestore(mergedHoldings);
  };

  const removeHolding = async (ticker: string) => {
    const existing = holdings.find((h) => h.ticker === ticker);
    const qty =
      existing?.purchaseLots?.reduce((s, l) => s + l.quantity, 0) ||
      existing?.quantity ||
      0;
    const price = existing?.currentPrice || 0;
    const updatedHoldings = holdings.filter(holding => holding.ticker !== ticker);
    setHoldings(updatedHoldings);
    await saveHoldingsToFirestore(updatedHoldings);
    if (user?.uid && existing) {
      tradeEventsService
        .logTradeEvent({
          userId: user.uid,
          type: 'REMOVE_HOLDING',
          ticker,
          quantity: qty,
          price,
        })
        .catch(() => {});
    }
  };

  const updateHolding = async (updatedHolding: Holding) => {
    const updatedHoldings = holdings.map(holding => 
      holding.ticker === updatedHolding.ticker ? updatedHolding : holding
    );
    setHoldings(updatedHoldings);
    await saveHoldingsToFirestore(updatedHoldings);
  };

  const deleteHolding = async (ticker: string) => {
    const existing = holdings.find((h) => h.ticker === ticker);
    const qty =
      existing?.purchaseLots?.reduce((s, l) => s + l.quantity, 0) ||
      existing?.quantity ||
      0;
    const price = existing?.currentPrice || 0;
    const updatedHoldings = holdings.filter(holding => holding.ticker !== ticker);
    setHoldings(updatedHoldings);
    await saveHoldingsToFirestore(updatedHoldings);
    if (user?.uid && existing) {
      tradeEventsService
        .logTradeEvent({
          userId: user.uid,
          type: 'SELL',
          ticker,
          quantity: qty,
          price,
        })
        .catch(() => {});
    }
  };

  const getHolding = (ticker: string) => {
    return holdings.find(holding => holding.ticker === ticker);
  };

  const getTotalQuantity = (ticker: string) => {
    const holding = holdings.find(h => h.ticker === ticker);
    if (!holding) return 0;
    if (!holding.purchaseLots || !Array.isArray(holding.purchaseLots)) {
      // Handle old structure - if it has quantity and purchasePrice, convert to new structure
      if (holding.quantity && holding.purchasePrice) {
        return holding.quantity;
      }
      return 0;
    }
    return holding.purchaseLots.reduce((sum, lot) => sum + lot.quantity, 0);
  };

  const getAveragePurchasePrice = (ticker: string) => {
    const holding = holdings.find(h => h.ticker === ticker);
    if (!holding) return 0;
    
    if (!holding.purchaseLots || !Array.isArray(holding.purchaseLots)) {
      // Handle old structure
      if (holding.purchasePrice) {
        return holding.purchasePrice;
      }
      return 0;
    }
    
    if (holding.purchaseLots.length === 0) return 0;
    
    const totalCost = holding.purchaseLots.reduce((sum, lot) => 
      sum + (lot.quantity * lot.purchasePrice), 0
    );
    const totalQuantity = getTotalQuantity(ticker);
    return totalQuantity > 0 ? totalCost / totalQuantity : 0;
  };

  const calculateTotalValue = () => {
    return holdings.reduce((sum, holding) => {
      const totalQuantity = getTotalQuantity(holding.ticker);
      return sum + (totalQuantity * holding.currentPrice);
    }, 0);
  };

  const calculateTotalGainLoss = () => {
    return holdings.reduce((sum, holding) => {
      const totalQuantity = getTotalQuantity(holding.ticker);
      const currentValue = totalQuantity * holding.currentPrice;
      
      let costBasis = 0;
      if (holding.purchaseLots && Array.isArray(holding.purchaseLots)) {
        costBasis = holding.purchaseLots.reduce((lotSum, lot) => 
          lotSum + (lot.quantity * lot.purchasePrice), 0
        );
      } else if (holding.quantity && holding.purchasePrice) {
        // Handle old structure
        costBasis = holding.quantity * holding.purchasePrice;
      }
      
      return sum + (currentValue - costBasis);
    }, 0);
  };

  const calculateTotalGainLossPercentage = () => {
    const totalCostBasis = holdings.reduce((sum, holding) => {
      if (holding.purchaseLots && Array.isArray(holding.purchaseLots)) {
        return sum + holding.purchaseLots.reduce((lotSum, lot) => 
          lotSum + (lot.quantity * lot.purchasePrice), 0
        );
      } else if (holding.quantity && holding.purchasePrice) {
        // Handle old structure
        return sum + (holding.quantity * holding.purchasePrice);
      }
      return sum;
    }, 0);
    const totalGainLoss = calculateTotalGainLoss();
    return totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;
  };

  // Get time-based data for charts
  const getTimeBasedData = (ticker?: string) => {
    const targetHoldings = ticker ? holdings.filter(h => h.ticker === ticker) : holdings;
    
    return targetHoldings.map(holding => {
      const purchaseLots = holding.purchaseLots || [];
      const timeData = purchaseLots.map(lot => ({
        date: new Date(lot.purchaseDate),
        quantity: lot.quantity,
        price: lot.purchasePrice,
        value: lot.quantity * lot.purchasePrice,
        ticker: holding.ticker,
        companyName: holding.companyName
      })).sort((a, b) => a.date.getTime() - b.date.getTime());

      return {
        ticker: holding.ticker,
        companyName: holding.companyName,
        currentPrice: holding.currentPrice,
        firstPurchaseDate: holding.firstPurchaseDate,
        lastPurchaseDate: holding.lastPurchaseDate,
        addedAt: holding.addedAt,
        timeData
      };
    });
  };

  // Refresh current prices for all holdings
  const refreshPrices = async () => {
    if (holdings.length === 0) {
      return;
    }
    
    try {
      const updatedHoldings = await Promise.all(
        holdings.map(async (holding) => {
          try {
            const quoteResponse = await stockApiService.getStockQuote(holding.ticker);
            
            if (quoteResponse.success && quoteResponse.data) {
              const newPrice = quoteResponse.data.regularMarketPrice || holding.currentPrice;
              
              return {
                ...holding,
                currentPrice: newPrice
              };
            } else {
              console.warn(`⚠️ Failed to fetch price for ${holding.ticker}, keeping old price`);
              return holding;
            }
          } catch (error) {
            console.error(`❌ Error fetching price for ${holding.ticker}:`, error);
            return holding;
          }
        })
      );

      setHoldings(updatedHoldings);
      await saveHoldingsToFirestore(updatedHoldings);
    } catch (error) {
      console.error('❌ Error refreshing prices:', error);
    }
  };

  const value: HoldingsContextType = {
    holdings,
    addHolding,
    addPurchaseLot,
    removeHolding,
    updateHolding,
    deleteHolding,
    getHolding,
    getTotalQuantity,
    getAveragePurchasePrice,
    calculateTotalValue,
    calculateTotalGainLoss,
    calculateTotalGainLossPercentage,
    getTimeBasedData,
    mergeDuplicateHoldings,
    refreshPrices,
  };

  return (
    <HoldingsContext.Provider value={value}>
      {children}
    </HoldingsContext.Provider>
  );
};
