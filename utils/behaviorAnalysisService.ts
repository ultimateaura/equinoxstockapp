/**
 * behaviorAnalysisService.ts - Statistical pattern detection on logged trades.
 * Non-judgmental framing: self-awareness, not criticism.
 */

import { TradeEvent } from '../contexts/TradeEventsContext';
import {
  BehaviorAnalysisResult,
  BehaviorPattern,
} from './quant/types';

const UNLOCK_MONTHS = 3;
const UNLOCK_EVENTS = 5;

function monthsBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
}

function detectPanicSelling(events: TradeEvent[]): BehaviorPattern | null {
  const sells = events.filter((e) => e.type === 'SELL' || e.type === 'REMOVE_HOLDING');
  if (sells.length < 2) return null;

  const panic = sells.filter(
    (e) =>
      e.marketContext.holdingDailyReturn < -0.05 ||
      (e.marketContext.regime === 'turbulent' && e.marketContext.holdingDailyReturn < -0.02)
  );
  if (panic.length < 2) return null;
  const ratio = panic.length / sells.length;
  if (ratio < 0.4) return null;

  return {
    type: 'panic_selling',
    label: 'Selling into dips',
    explanation: `You tend to sell after sharp drops — ${panic.length} of ${sells.length} sells happened during dips or turbulent days. That is common; noticing it is the first step.`,
    evidenceCount: panic.length,
    severity: ratio > 0.7 ? 'high' : 'medium',
  };
}

function detectDipBuying(events: TradeEvent[]): BehaviorPattern | null {
  const buys = events.filter((e) => e.type === 'BUY' || e.type === 'ADD_LOT');
  if (buys.length < 2) return null;

  const dips = buys.filter(
    (e) =>
      e.marketContext.holdingDailyReturn < -0.02 ||
      e.marketContext.spyDailyReturn < -0.015
  );
  if (dips.length < 2) return null;
  const ratio = dips.length / buys.length;
  if (ratio < 0.35) return null;

  return {
    type: 'dip_buying',
    label: 'Buying the dip',
    explanation: `${dips.length} of your ${buys.length} buys came after down days — you often step in when prices soften.`,
    evidenceCount: dips.length,
    severity: 'low',
  };
}

function detectMomentumChasing(events: TradeEvent[]): BehaviorPattern | null {
  const buys = events.filter((e) => e.type === 'BUY' || e.type === 'ADD_LOT');
  if (buys.length < 2) return null;

  const chase = buys.filter((e) => e.marketContext.holdingDailyReturn > 0.03);
  if (chase.length < 2) return null;
  const ratio = chase.length / buys.length;
  if (ratio < 0.35) return null;

  return {
    type: 'momentum_chasing',
    label: 'Chasing recent winners',
    explanation: `${chase.length} of ${buys.length} buys happened after strong up days. Momentum can work — just know you are leaning into it.`,
    evidenceCount: chase.length,
    severity: ratio > 0.6 ? 'medium' : 'low',
  };
}

function detectOverconcentration(events: TradeEvent[]): BehaviorPattern | null {
  const adds = events.filter((e) => e.type === 'BUY' || e.type === 'ADD_LOT');
  if (adds.length < 3) return null;

  const byTicker: Record<string, TradeEvent[]> = {};
  for (const e of adds) {
    if (!byTicker[e.ticker]) byTicker[e.ticker] = [];
    byTicker[e.ticker].push(e);
  }

  for (const [ticker, list] of Object.entries(byTicker)) {
    if (list.length < 3) continue;
    const sorted = [...list].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    for (let i = 0; i <= sorted.length - 3; i++) {
      const window = sorted.slice(i, i + 3);
      const days =
        (new Date(window[2].timestamp).getTime() - new Date(window[0].timestamp).getTime()) /
        (1000 * 60 * 60 * 24);
      if (days <= 30) {
        return {
          type: 'overconcentration',
          label: 'Stacking into one name',
          explanation: `You added to ${ticker} at least 3 times within a month. Concentration can amplify both gains and losses.`,
          evidenceCount: window.length,
          severity: 'medium',
        };
      }
    }
  }
  return null;
}

function detectInactivityInTurbulence(events: TradeEvent[]): BehaviorPattern | null {
  if (events.length < 5) return null;
  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const first = new Date(sorted[0].timestamp);
  const last = new Date(sorted[sorted.length - 1].timestamp);
  if (monthsBetween(first, last) < 2) return null;

  // Find gaps > 21 days that overlap turbulent market context on nearby events
  let longGaps = 0;
  for (let i = 1; i < sorted.length; i++) {
    const gapDays =
      (new Date(sorted[i].timestamp).getTime() - new Date(sorted[i - 1].timestamp).getTime()) /
      (1000 * 60 * 60 * 24);
    if (
      gapDays > 21 &&
      (sorted[i].marketContext.regime === 'turbulent' ||
        sorted[i - 1].marketContext.regime === 'turbulent' ||
        sorted[i].marketContext.portfolioDailyReturn < -0.05)
    ) {
      longGaps++;
    }
  }
  if (longGaps < 1) return null;

  return {
    type: 'inactivity_in_turbulence',
    label: 'Sitting out rough patches',
    explanation:
      'During some turbulent stretches you paused trading for weeks. Doing nothing can be wise — just confirm it is intentional, not freeze.',
    evidenceCount: longGaps,
    severity: 'low',
  };
}

/**
 * Analyze trade events for beginner-friendly behavior patterns.
 */
export function analyzeBehavior(events: TradeEvent[]): BehaviorAnalysisResult {
  const eventCount = events.length;
  if (eventCount === 0) {
    return {
      patterns: [],
      confidence: 0,
      dataMonths: 0,
      eventCount: 0,
      unlocked: false,
      progressMessage:
        'Keep logging buys and sells — we will spot your investing patterns after a few months.',
    };
  }

  const timestamps = events.map((e) => new Date(e.timestamp).getTime());
  const earliest = new Date(Math.min(...timestamps));
  const latest = new Date(Math.max(...timestamps));
  const dataMonths = monthsBetween(earliest, latest);

  const unlocked = dataMonths >= UNLOCK_MONTHS && eventCount >= UNLOCK_EVENTS;

  if (!unlocked) {
    const monthsLeft = Math.max(0, UNLOCK_MONTHS - dataMonths);
    const eventsLeft = Math.max(0, UNLOCK_EVENTS - eventCount);
    return {
      patterns: [],
      confidence: 0,
      dataMonths,
      eventCount,
      unlocked: false,
      progressMessage: `Keep using Equinox — ${eventCount} of ${UNLOCK_EVENTS} events logged${
        monthsLeft > 0 ? `, ~${monthsLeft.toFixed(1)} months to go` : ''
      }${eventsLeft > 0 && monthsLeft <= 0 ? ` (${eventsLeft} more events needed)` : ''}.`,
    };
  }

  const detectors = [
    detectPanicSelling,
    detectDipBuying,
    detectMomentumChasing,
    detectOverconcentration,
    detectInactivityInTurbulence,
  ];
  const patterns: BehaviorPattern[] = [];
  for (const d of detectors) {
    const p = d(events);
    if (p) patterns.push(p);
  }

  const confidence = Math.min(100, 40 + eventCount * 4 + dataMonths * 5);

  return {
    patterns,
    confidence,
    dataMonths,
    eventCount,
    unlocked: true,
    progressMessage:
      patterns.length === 0
        ? 'No strong repeating patterns yet — your activity looks fairly balanced.'
        : `Found ${patterns.length} pattern${patterns.length === 1 ? '' : 's'} from ${eventCount} logged trades.`,
  };
}

export const behaviorAnalysisService = {
  analyze: analyzeBehavior,
};
