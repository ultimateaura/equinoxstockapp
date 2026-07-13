/**
 * usePortfolioAnalytics — loads Portfolio Intelligence snapshot + explainer.
 * Publishes rich aiContext for the Ask AI button.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Holding, useHoldings } from '@/contexts/HoldingsContext';
import { useTradeEventsOptional } from '@/contexts/TradeEventsContext';
import {
  HorizonKey,
  portfolioAnalyticsService,
} from '@/utils/portfolioAnalyticsService';
import {
  PortfolioExplanation,
  portfolioExplainerService,
} from '@/utils/portfolioExplainerService';
import { PortfolioIntelligenceSnapshot } from '@/utils/quant/types';

export interface PortfolioAnalyticsState {
  snapshot: PortfolioIntelligenceSnapshot | null;
  explanation: PortfolioExplanation | null;
  loading: boolean;
  explaining: boolean;
  error: string | null;
  horizon: HorizonKey;
  setHorizon: (h: HorizonKey) => void;
  refresh: (forceExplainer?: boolean) => Promise<void>;
}

function holdingsKey(holdings: Holding[]): string {
  return holdings
    .map((h) => {
      const qty =
        h.purchaseLots?.reduce((s, l) => s + l.quantity, 0) || h.quantity || 0;
      return `${h.ticker}:${qty}:${h.currentPrice}`;
    })
    .sort()
    .join('|');
}

export function usePortfolioAnalytics(): PortfolioAnalyticsState {
  const { holdings } = useHoldings();
  const { events } = useTradeEventsOptional();
  const auth = useAuth();
  const userId = auth.user?.uid ?? null;

  const [snapshot, setSnapshot] = useState<PortfolioIntelligenceSnapshot | null>(null);
  const [explanation, setExplanation] = useState<PortfolioExplanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [horizon, setHorizon] = useState<HorizonKey>('6m');
  const genRef = useRef(0);

  const publishAiContext = useCallback(
    async (snap: PortfolioIntelligenceSnapshot, expl: PortfolioExplanation | null) => {
      try {
        await AsyncStorage.setItem(
          'aiContext',
          JSON.stringify({
            screen: 'portfolio',
            data: {
              intelligence: {
                totalValue: snap.totalValue,
                holdingsCount: snap.holdingsCount,
                dna: snap.dna
                  ? {
                      style: snap.dna.dominantStyle,
                      labels: snap.dna.plainLabels,
                      components: snap.dna.components.map((c) => ({
                        label: c.label,
                        variancePct: Math.round(c.varianceExplained * 100),
                      })),
                    }
                  : null,
                monteCarlo: snap.monteCarlo
                  ? {
                      horizonDays: snap.monteCarlo.horizonDays,
                      p10: snap.monteCarlo.finalP10,
                      p50: snap.monteCarlo.finalP50,
                      p90: snap.monteCarlo.finalP90,
                    }
                  : null,
                regime: snap.regime
                  ? {
                      current: snap.regime.current,
                      summary: snap.regime.plainSummary,
                      pastEpisodes: snap.regime.pastTurbulentEpisodes,
                    }
                  : null,
                behavior: snap.behavior,
                explanation: expl?.text ?? null,
              },
            },
            suggestion:
              'Ask me to explain your Portfolio DNA, what-if ranges, market regime, or investing patterns in plain English.',
          })
        );
      } catch (err) {
        console.warn('Failed to publish aiContext:', (err as Error)?.message);
      }
    },
    []
  );

  const refresh = useCallback(
    async (forceExplainer = false) => {
      const gen = ++genRef.current;
      if (holdings.length === 0) {
        setSnapshot(null);
        setExplanation(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const snap = await portfolioAnalyticsService.getFullSnapshot(
          holdings,
          events,
          horizon
        );
        if (gen !== genRef.current) return;
        setSnapshot(snap);

        setExplaining(true);
        const expl = await portfolioExplainerService.getExplanation(
          userId,
          snap,
          forceExplainer
        );
        if (gen !== genRef.current) return;
        setExplanation(expl);
        await publishAiContext(snap, expl);
      } catch (err) {
        if (gen === genRef.current) {
          setError((err as Error)?.message ?? 'Failed to load portfolio intelligence');
        }
      } finally {
        if (gen === genRef.current) {
          setLoading(false);
          setExplaining(false);
        }
      }
    },
    [holdings, events, horizon, userId, publishAiContext]
  );

  useEffect(() => {
    refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdingsKey(holdings), events.length, horizon]);

  return {
    snapshot,
    explanation,
    loading,
    explaining,
    error,
    horizon,
    setHorizon,
    refresh,
  };
}
