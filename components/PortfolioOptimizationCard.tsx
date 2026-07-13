import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { recommendationService } from '../utils/recommendationService';
import { OptimizationResult } from '../utils/quant/types';

interface PortfolioOptimizationCardProps {
  /** Current holdings with their current market value. */
  holdings: { ticker: string; value: number }[];
}

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

export const PortfolioOptimizationCard: React.FC<PortfolioOptimizationCardProps> = ({
  holdings,
}) => {
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [tooFew, setTooFew] = useState(false);

  useEffect(() => {
    const total = holdings.reduce((a, b) => a + b.value, 0);
    const weighted = holdings
      .filter((h) => h.value > 0)
      .map((h) => ({ ticker: h.ticker, weight: total > 0 ? h.value / total : 0 }));

    if (weighted.length < 2) {
      setTooFew(true);
      return;
    }
    setTooFew(false);

    let active = true;
    setLoading(true);
    recommendationService
      .getPortfolioOptimization(weighted)
      .then((r) => active && setResult(r))
      .catch(() => active && setResult(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [holdings.map((h) => `${h.ticker}:${h.value.toFixed(0)}`).join(',')]);

  if (tooFew) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="scale-balance" size={18} color="#17bf2d" />
          <Text style={styles.title}>Portfolio Optimizer</Text>
        </View>
        <Text style={styles.note}>
          Add at least two holdings to see optimized allocations.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="scale-balance" size={18} color="#17bf2d" />
        <Text style={styles.title}>Portfolio Optimizer</Text>
        <Text style={styles.subtitle}>Modern Portfolio Theory</Text>
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#17bf2d" size="small" />
          <Text style={styles.note}>Running optimization...</Text>
        </View>
      ) : !result ? (
        <Text style={styles.note}>
          Not enough price history for your holdings to optimize yet.
        </Text>
      ) : (
        <>
          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Exp. return</Text>
              <Text style={styles.metricValue}>{pct(result.expectedAnnualReturn)}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Exp. risk</Text>
              <Text style={styles.metricValue}>{pct(result.expectedAnnualVolatility)}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Sharpe</Text>
              <Text style={styles.metricValue}>{result.sharpeRatio.toFixed(2)}</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Suggested vs current allocation</Text>
          {result.tickers.map((t, i) => {
            const current = result.currentWeights[i];
            const suggested = result.suggestedWeights[i];
            const diff = suggested - current;
            return (
              <View key={t} style={styles.allocRow}>
                <Text style={styles.allocTicker}>{t}</Text>
                <View style={styles.allocBars}>
                  <View style={styles.barTrack}>
                    <View style={[styles.barCurrent, { width: `${current * 100}%` }]} />
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barSuggested, { width: `${suggested * 100}%` }]} />
                  </View>
                </View>
                <View style={styles.allocNums}>
                  <Text style={styles.allocPct}>{pct(suggested)}</Text>
                  <Text
                    style={[
                      styles.allocDiff,
                      { color: diff >= 0 ? '#17bf2d' : '#ef4444' },
                    ]}
                  >
                    {diff >= 0 ? '+' : ''}
                    {(diff * 100).toFixed(1)}
                  </Text>
                </View>
              </View>
            );
          })}

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#5a5a72' }]} />
              <Text style={styles.legendText}>Current</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#17bf2d' }]} />
              <Text style={styles.legendText}>Suggested</Text>
            </View>
          </View>

          <Text style={styles.note}>
            These weights maximize historical return per unit of risk (Sharpe
            ratio) by accounting for how your holdings move together. Past results
            do not guarantee the future. Recommendation, not financial advice.
          </Text>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#26262b',
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#3a3a3e',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  title: { color: '#ffffff', fontFamily: 'Poppins', fontWeight: '600', fontSize: 15 },
  subtitle: { color: '#8a8aa3', fontFamily: 'Poppins', fontSize: 11, marginLeft: 'auto' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1c1c20',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  metric: { alignItems: 'center', flex: 1 },
  metricLabel: { color: '#8a8aa3', fontFamily: 'Poppins', fontSize: 11, marginBottom: 4 },
  metricValue: { color: '#ffffff', fontFamily: 'Poppins', fontWeight: '700', fontSize: 16 },
  sectionLabel: {
    color: '#b8b8d2',
    fontFamily: 'Poppins',
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 10,
  },
  allocRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  allocTicker: {
    color: '#ffffff',
    fontFamily: 'Poppins',
    fontWeight: '600',
    fontSize: 12,
    width: 52,
  },
  allocBars: { flex: 1, gap: 3 },
  barTrack: {
    height: 7,
    backgroundColor: '#1a1a1e',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barCurrent: { height: 7, backgroundColor: '#5a5a72', borderRadius: 4 },
  barSuggested: { height: 7, backgroundColor: '#17bf2d', borderRadius: 4 },
  allocNums: { width: 56, alignItems: 'flex-end' },
  allocPct: { color: '#ffffff', fontFamily: 'Poppins', fontSize: 12, fontWeight: '600' },
  allocDiff: { fontFamily: 'Poppins', fontSize: 11 },
  legend: { flexDirection: 'row', gap: 16, marginTop: 4, marginBottom: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: '#8a8aa3', fontFamily: 'Poppins', fontSize: 11 },
  note: {
    color: '#6f6f85',
    fontFamily: 'Poppins',
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 16,
    marginTop: 4,
  },
});
