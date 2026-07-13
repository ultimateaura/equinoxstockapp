/**
 * portfolioExplainerService.ts - Plain-English portfolio narrative via Gemini.
 * Caches in Firestore users/{uid}/portfolio_insights/latest for 24h.
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';
import { db } from '../config/firebase';
import { getGeminiApiKey } from './env';
import { PortfolioIntelligenceSnapshot } from './quant/types';

const CACHE_MS = 24 * 60 * 60 * 1000;

export interface PortfolioExplanation {
  text: string;
  generatedAt: string;
  holdingsFingerprint: string;
  source: 'cache' | 'gemini' | 'fallback';
}

function fingerprintFromSnapshot(snapshot: PortfolioIntelligenceSnapshot): string {
  return [
    snapshot.holdingsCount,
    Math.round(snapshot.totalValue),
    snapshot.dna?.dominantStyle ?? '',
    snapshot.regime?.current ?? '',
    snapshot.monteCarlo ? Math.round(snapshot.monteCarlo.finalP50) : '',
    snapshot.behavior?.eventCount ?? 0,
  ].join('|');
}

function buildFallback(snapshot: PortfolioIntelligenceSnapshot): string {
  const parts: string[] = [];
  parts.push(
    `Your portfolio is valued around $${snapshot.totalValue.toLocaleString(undefined, {
      maximumFractionDigits: 0,
    })} across ${snapshot.holdingsCount} holding${snapshot.holdingsCount === 1 ? '' : 's'}.`
  );
  if (snapshot.dna?.plainLabels?.length) {
    parts.push(snapshot.dna.plainLabels[0]);
  }
  if (snapshot.regime) {
    parts.push(snapshot.regime.plainSummary);
  }
  if (snapshot.monteCarlo) {
    const { finalP10, finalP90, horizonDays } = snapshot.monteCarlo;
    const months = Math.round(horizonDays / 21);
    parts.push(
      `A what-if simulation over about ${months} month(s) suggests an 80% range roughly between $${Math.round(
        finalP10
      ).toLocaleString()} and $${Math.round(finalP90).toLocaleString()} — illustrative only, not a forecast.`
    );
  }
  parts.push('Not financial advice — Equinox helps you picture your portfolio; it does not execute trades.');
  return parts.join('\n\n');
}

function buildPrompt(snapshot: PortfolioIntelligenceSnapshot): string {
  const payload = {
    totalValue: snapshot.totalValue,
    holdingsCount: snapshot.holdingsCount,
    dna: snapshot.dna
      ? {
          style: snapshot.dna.dominantStyle,
          concentration: snapshot.dna.concentrationRisk,
          components: snapshot.dna.components.map((c) => ({
            label: c.label,
            variancePct: Math.round(c.varianceExplained * 100),
            topLoadings: Object.entries(c.loadings)
              .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
              .slice(0, 3)
              .map(([t, v]) => ({ ticker: t, loading: Number(v.toFixed(3)) })),
          })),
          plainLabels: snapshot.dna.plainLabels,
        }
      : null,
    monteCarlo: snapshot.monteCarlo
      ? {
          horizonDays: snapshot.monteCarlo.horizonDays,
          p10: Math.round(snapshot.monteCarlo.finalP10),
          p50: Math.round(snapshot.monteCarlo.finalP50),
          p90: Math.round(snapshot.monteCarlo.finalP90),
        }
      : null,
    regime: snapshot.regime
      ? {
          current: snapshot.regime.current,
          pastEpisodes: snapshot.regime.pastTurbulentEpisodes,
          avgPortfolioInTurbulence: snapshot.regime.avgPortfolioReturnInTurbulence,
          avgMarketInTurbulence: snapshot.regime.avgMarketReturnInTurbulence,
          summary: snapshot.regime.plainSummary,
        }
      : null,
    behavior: snapshot.behavior
      ? {
          unlocked: snapshot.behavior.unlocked,
          patterns: snapshot.behavior.patterns.map((p) => p.label),
          progress: snapshot.behavior.progressMessage,
        }
      : null,
  };

  return `You are Equinox, a friendly third-party portfolio interpreter for beginners (not a broker).
Write 3 short paragraphs of plain English about THIS user's portfolio using ONLY the numbers in the JSON below.
Rules:
- No jargon without a one-phrase explanation.
- Must cite specific numbers from the JSON (dollar amounts, percents, regime label).
- Supportive tone. Do not recommend specific buy/sell tickers.
- End with a soft reminder this is educational, not financial advice.
JSON:
${JSON.stringify(payload)}`;
}

class PortfolioExplainerService {
  async getExplanation(
    userId: string | null,
    snapshot: PortfolioIntelligenceSnapshot,
    forceRefresh = false
  ): Promise<PortfolioExplanation> {
    const fp = fingerprintFromSnapshot(snapshot);

    if (userId && db && !forceRefresh) {
      try {
        const ref = doc(db, 'users', userId, 'portfolio_insights', 'latest');
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as PortfolioExplanation & { holdingsFingerprint?: string };
          const age = Date.now() - new Date(data.generatedAt).getTime();
          if (
            data.text &&
            age < CACHE_MS &&
            data.holdingsFingerprint === fp
          ) {
            return { ...data, source: 'cache' };
          }
        }
      } catch (err) {
        console.warn('explainer cache read failed:', (err as Error)?.message);
      }
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey || snapshot.holdingsCount === 0) {
      const text = buildFallback(snapshot);
      return {
        text,
        generatedAt: new Date().toISOString(),
        holdingsFingerprint: fp,
        source: 'fallback',
      };
    }

    try {
      const genAI = new GoogleGenAI({ apiKey });
      const result = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: buildPrompt(snapshot) }] }],
        config: {
          maxOutputTokens: 800,
          temperature: 0.5,
        },
      });
      const text = (result.text ?? '').trim() || buildFallback(snapshot);
      const explanation: PortfolioExplanation = {
        text,
        generatedAt: new Date().toISOString(),
        holdingsFingerprint: fp,
        source: 'gemini',
      };

      if (userId && db) {
        try {
          await setDoc(doc(db, 'users', userId, 'portfolio_insights', 'latest'), explanation);
        } catch (err) {
          console.warn('explainer cache write failed:', (err as Error)?.message);
        }
      }
      return explanation;
    } catch (err) {
      console.warn('explainer Gemini failed:', (err as Error)?.message);
      return {
        text: buildFallback(snapshot),
        generatedAt: new Date().toISOString(),
        holdingsFingerprint: fp,
        source: 'fallback',
      };
    }
  }
}

export const portfolioExplainerService = new PortfolioExplainerService();
