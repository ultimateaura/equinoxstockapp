import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { LineChart } from 'react-native-gifted-charts';
import { formatCurrency } from '@/utils/formatCurrency';
import { HorizonKey } from '@/utils/portfolioAnalyticsService';
import { MonteCarloResult } from '@/utils/quant/types';
import { QuantCredibilityFooter } from './QuantCredibilityFooter';

interface MonteCarloSimulatorCardProps {
  result: MonteCarloResult | null;
  horizon: HorizonKey;
  onHorizonChange: (h: HorizonKey) => void;
  loading?: boolean;
}

const HORIZONS: { key: HorizonKey; label: string }[] = [
  { key: '1m', label: '1M' },
  { key: '3m', label: '3M' },
  { key: '6m', label: '6M' },
  { key: '1y', label: '1Y' },
];

export const MonteCarloSimulatorCard: React.FC<MonteCarloSimulatorCardProps> = ({
  result,
  horizon,
  onHorizonChange,
  loading,
}) => {
  const chartData = useMemo(() => {
    if (!result) return { mid: [], low: [], high: [] };
    const step = Math.max(1, Math.floor(result.p50.length / 40));
    const mid = result.p50
      .filter((_, i) => i % step === 0 || i === result.p50.length - 1)
      .map((v) => ({ value: v }));
    const low = result.p10
      .filter((_, i) => i % step === 0 || i === result.p10.length - 1)
      .map((v) => ({ value: v }));
    const high = result.p90
      .filter((_, i) => i % step === 0 || i === result.p90.length - 1)
      .map((v) => ({ value: v }));
    return { mid, low, high };
  }, [result]);

  const monthsLabel =
    horizon === '1m' ? '1 month' : horizon === '3m' ? '3 months' : horizon === '6m' ? '6 months' : '1 year';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="chart-timeline-variant" size={18} color="#17bf2d" />
        <Text style={styles.title}>What-If Simulator</Text>
      </View>

      <View style={styles.chips}>
        {HORIZONS.map((h) => (
          <TouchableOpacity
            key={h.key}
            style={[styles.chip, horizon === h.key && styles.chipActive]}
            onPress={() => onHorizonChange(h.key)}
          >
            <Text style={[styles.chipText, horizon === h.key && styles.chipTextActive]}>
              {h.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !result ? (
        <ActivityIndicator color="#17bf2d" style={{ marginVertical: 20 }} />
      ) : !result ? (
        <Text style={styles.empty}>
          Add a holding with ~30 days of history to project a range of outcomes.
        </Text>
      ) : (
        <>
          <Text style={styles.copy}>
            If markets behave like the past year, your {formatCurrency(result.currentValue)}{' '}
            portfolio has an 80% chance of landing between{' '}
            <Text style={styles.em}>{formatCurrency(result.finalP10)}</Text> and{' '}
            <Text style={styles.em}>{formatCurrency(result.finalP90)}</Text> in {monthsLabel}.
          </Text>

          <View style={styles.chartWrap}>
            <LineChart
              data={chartData.mid}
              data2={chartData.low}
              data3={chartData.high}
              height={140}
              width={280}
              hideDataPoints
              spacing={6}
              thickness={2}
              thickness2={1}
              thickness3={1}
              color="#17bf2d"
              color2="#4A9EFF55"
              color3="#4A9EFF55"
              hideRules
              yAxisTextStyle={{ color: '#8a8a9a', fontSize: 10 }}
              xAxisLabelTextStyle={{ color: '#8a8a9a', fontSize: 10 }}
              backgroundColor="transparent"
              yAxisColor="#3a3a3e"
              xAxisColor="#3a3a3e"
              noOfSections={3}
            />
          </View>

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Pessimistic</Text>
              <Text style={styles.statVal}>{formatCurrency(result.finalP10)}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Median</Text>
              <Text style={[styles.statVal, { color: '#17bf2d' }]}>
                {formatCurrency(result.finalP50)}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Optimistic</Text>
              <Text style={styles.statVal}>{formatCurrency(result.finalP90)}</Text>
            </View>
          </View>

          <Text style={styles.disclaimer}>{result.disclaimer}</Text>
        </>
      )}

      <QuantCredibilityFooter
        method={result?.method ?? '2,000 Monte Carlo paths'}
        explanation="We estimate your portfolio’s typical daily return and volatility from history, then simulate thousands of random future paths (geometric Brownian motion) to show a realistic range — not a single prediction."
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: '#2a2a2e',
    borderRadius: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Poppins',
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1a1a2e',
  },
  chipActive: {
    backgroundColor: '#17bf2d33',
    borderWidth: 1,
    borderColor: '#17bf2d',
  },
  chipText: {
    color: '#b8b8d2',
    fontSize: 12,
    fontFamily: 'Poppins',
  },
  chipTextActive: {
    color: '#17bf2d',
    fontWeight: '600',
  },
  empty: {
    color: '#b8b8d2',
    fontSize: 13,
    fontFamily: 'Poppins',
    lineHeight: 20,
  },
  copy: {
    color: '#C9D1D9',
    fontSize: 13,
    fontFamily: 'Poppins',
    lineHeight: 20,
    marginBottom: 12,
  },
  em: {
    color: '#ffffff',
    fontWeight: '600',
  },
  chartWrap: {
    alignItems: 'center',
    marginBottom: 8,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#8a8a9a',
    fontFamily: 'Poppins',
  },
  statVal: {
    fontSize: 13,
    color: '#ffffff',
    fontFamily: 'Poppins',
    fontWeight: '600',
    marginTop: 2,
  },
  disclaimer: {
    marginTop: 10,
    fontSize: 10,
    color: '#8a8a9a',
    fontFamily: 'Poppins',
    fontStyle: 'italic',
  },
});
