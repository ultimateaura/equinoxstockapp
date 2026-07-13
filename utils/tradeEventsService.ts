/**
 * tradeEventsService.ts - Persist trade events to Firestore (no React).
 * Used by HoldingsContext on mutations and by TradeEventsContext for reads.
 */

import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { marketDataService } from './marketDataService';
import { dailyReturns } from './quant/indicators';
import type { TradeEvent, TradeEventMarketContext, TradeEventType } from '../contexts/TradeEventsContext';

async function snapshotMarketContext(
  ticker: string,
  portfolioDailyReturn = 0
): Promise<TradeEventMarketContext> {
  try {
    const [spyHistory, tickerHistory] = await Promise.all([
      marketDataService.getDailyHistory('SPY', 30),
      marketDataService.getDailyHistory(ticker, 30),
    ]);
    const spyR = dailyReturns(spyHistory.bars.map((b) => b.close));
    const holdR = dailyReturns(tickerHistory.bars.map((b) => b.close));
    const spyDaily = spyR.length ? spyR[spyR.length - 1] : 0;
    const holdDaily = holdR.length ? holdR[holdR.length - 1] : 0;
    const regime: 'calm' | 'turbulent' = Math.abs(spyDaily) > 0.015 ? 'turbulent' : 'calm';
    return {
      spyDailyReturn: spyDaily,
      holdingDailyReturn: holdDaily,
      portfolioDailyReturn,
      regime,
    };
  } catch {
    return {
      spyDailyReturn: 0,
      holdingDailyReturn: 0,
      portfolioDailyReturn,
      regime: 'calm',
    };
  }
}

export async function logTradeEvent(input: {
  userId: string;
  type: TradeEventType;
  ticker: string;
  quantity: number;
  price: number;
  portfolioDailyReturn?: number;
}): Promise<TradeEvent | null> {
  if (!input.userId || !db) return null;
  const id = `${Date.now()}_${input.ticker}_${input.type}`;
  const marketContext = await snapshotMarketContext(
    input.ticker,
    input.portfolioDailyReturn ?? 0
  );
  const event: TradeEvent = {
    id,
    userId: input.userId,
    type: input.type,
    ticker: input.ticker.toUpperCase(),
    quantity: input.quantity,
    price: input.price,
    timestamp: new Date().toISOString(),
    marketContext,
  };
  try {
    await setDoc(doc(db, 'users', input.userId, 'trade_events', id), event);
    return event;
  } catch (err) {
    console.warn('Failed to log trade event:', (err as Error)?.message);
    return null;
  }
}

export const tradeEventsService = { logTradeEvent };
