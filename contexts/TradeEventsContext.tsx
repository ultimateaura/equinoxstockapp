import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { db } from '../config/firebase';
import { tradeEventsService } from '../utils/tradeEventsService';
import { useAuth } from './AuthContext';

export type TradeEventType = 'BUY' | 'SELL' | 'ADD_LOT' | 'REMOVE_HOLDING';

export interface TradeEventMarketContext {
  spyDailyReturn: number;
  holdingDailyReturn: number;
  portfolioDailyReturn: number;
  regime: 'calm' | 'turbulent';
}

export interface TradeEvent {
  id: string;
  userId: string;
  type: TradeEventType;
  ticker: string;
  quantity: number;
  price: number;
  timestamp: string;
  marketContext: TradeEventMarketContext;
}

interface TradeEventsContextType {
  events: TradeEvent[];
  loading: boolean;
  logTradeEvent: (input: {
    type: TradeEventType;
    ticker: string;
    quantity: number;
    price: number;
    portfolioDailyReturn?: number;
  }) => Promise<void>;
}

const TradeEventsContext = createContext<TradeEventsContextType | undefined>(undefined);

export const useTradeEvents = () => {
  const ctx = useContext(TradeEventsContext);
  if (!ctx) {
    throw new Error('useTradeEvents must be used within a TradeEventsProvider');
  }
  return ctx;
};

export const useTradeEventsOptional = (): TradeEventsContextType => {
  const ctx = useContext(TradeEventsContext);
  if (ctx) return ctx;
  return {
    events: [],
    loading: false,
    logTradeEvent: async () => {},
  };
};

export const TradeEventsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<TradeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !db) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'users', user.uid, 'trade_events'),
      orderBy('timestamp', 'desc'),
      limit(500)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: TradeEvent[] = [];
        snap.forEach((d) => list.push(d.data() as TradeEvent));
        setEvents(list);
        setLoading(false);
      },
      (err) => {
        console.warn('trade_events listen failed:', err?.message);
        setLoading(false);
      }
    );
    return unsub;
  }, [user?.uid]);

  const logTradeEvent = useCallback(
    async (input: {
      type: TradeEventType;
      ticker: string;
      quantity: number;
      price: number;
      portfolioDailyReturn?: number;
    }) => {
      if (!user) return;
      await tradeEventsService.logTradeEvent({
        userId: user.uid,
        ...input,
      });
    },
    [user]
  );

  return (
    <TradeEventsContext.Provider value={{ events, loading, logTradeEvent }}>
      {children}
    </TradeEventsContext.Provider>
  );
};
