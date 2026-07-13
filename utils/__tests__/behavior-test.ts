/**
 * Unit tests for behavior pattern detection on trade events.
 */

import { analyzeBehavior } from '../behaviorAnalysisService';
import { TradeEvent } from '../../contexts/TradeEventsContext';

function evt(
  partial: Partial<TradeEvent> & Pick<TradeEvent, 'type' | 'ticker' | 'timestamp'>
): TradeEvent {
  return {
    id: partial.id ?? `${partial.timestamp}_${partial.ticker}`,
    userId: 'u1',
    quantity: 10,
    price: 100,
    marketContext: {
      spyDailyReturn: 0,
      holdingDailyReturn: 0,
      portfolioDailyReturn: 0,
      regime: 'calm',
      ...partial.marketContext,
    },
    ...partial,
  };
}

describe('behaviorAnalysisService', () => {
  test('locked with few events', () => {
    const result = analyzeBehavior([
      evt({ type: 'BUY', ticker: 'AAPL', timestamp: new Date().toISOString() }),
    ]);
    expect(result.unlocked).toBe(false);
    expect(result.patterns.length).toBe(0);
    expect(result.progressMessage.length).toBeGreaterThan(0);
  });

  test('detects panic selling when unlocked', () => {
    const base = new Date();
    base.setMonth(base.getMonth() - 4);
    const events: TradeEvent[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i * 20);
      events.push(
        evt({
          type: 'SELL',
          ticker: 'AAPL',
          timestamp: d.toISOString(),
          marketContext: {
            spyDailyReturn: -0.02,
            holdingDailyReturn: -0.06,
            portfolioDailyReturn: -0.04,
            regime: 'turbulent',
          },
        })
      );
    }
    // add a couple buys so event mix is realistic
    events.push(
      evt({
        type: 'BUY',
        ticker: 'MSFT',
        timestamp: new Date(base.getTime() + 5 * 86400000).toISOString(),
      })
    );

    const result = analyzeBehavior(events);
    expect(result.unlocked).toBe(true);
    expect(result.patterns.some((p) => p.type === 'panic_selling')).toBe(true);
  });

  test('detects dip buying', () => {
    const base = new Date();
    base.setMonth(base.getMonth() - 5);
    const events: TradeEvent[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i * 25);
      events.push(
        evt({
          type: 'BUY',
          ticker: 'QQQ',
          timestamp: d.toISOString(),
          marketContext: {
            spyDailyReturn: -0.02,
            holdingDailyReturn: -0.03,
            portfolioDailyReturn: -0.02,
            regime: 'calm',
          },
        })
      );
    }
    const result = analyzeBehavior(events);
    expect(result.unlocked).toBe(true);
    expect(result.patterns.some((p) => p.type === 'dip_buying')).toBe(true);
  });
});
