import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { VolatilityRegimeResult } from '@/utils/quant/types';
import { QuantCredibilityFooter } from './QuantCredibilityFooter';

interface VolatilityRegimeCardProps {
  regime: VolatilityRegimeResult | null;
  loading?: boolean;
}

function pct(x: number | null): string {
  if (x == null || !isFinite(x)) return '—';
  return `${(x * 100).toFixed(1)}%`;
}

export const VolatilityRegimeCard: React.FC<VolatilityRegimeCardProps> = ({
  regime,
  loading,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="chart-bell-curve-cumulative" size={18} color="#17bf2d" />
        <Text style={styles.title}>Market Mood</Text>
      </View>

      {loading && !regime ? (
        <ActivityIndicator color="#17bf2d" style={{ marginVertical: 16 }} />
      ) : !regime ? (
        <Text style={styles.empty}>Need more market history to classify calm vs turbulent.</Text>
      ) : (
        <>
          <View
            style={[
              styles.badge,
              regime.current === 'turbulent' ? styles.turbulent : styles.calm,
            ]}
          >
            <MaterialCommunityIcons
              name={regime.current === 'turbulent' ? 'weather-lightning' : 'weather-sunny'}
              size={18}
              color={regime.current === 'turbulent' ? '#F59E0B' : '#17bf2d'}
            />
            <Text
              style={[
                styles.badgeText,
                { color: regime.current === 'turbulent' ? '#F59E0B' : '#17bf2d' },
              ]}
            >
              {regime.current === 'turbulent' ? 'Turbulent' : 'Calm'} right now
            </Text>
          </View>

          <Text style={styles.summary}>{regime.plainSummary}</Text>

          <View style={styles.timeline}>
            {regime.timeline.slice(-60).map((label, i) => (
              <View
                key={i}
                style={[
                  styles.tick,
                  { backgroundColor: label === 'turbulent' ? '#F59E0B' : '#17bf2d55' },
                ]}
              />
            ))}
          </View>
          <Text style={styles.timelineLabel}>Last ~60 trading days</Text>

          {regime.pastTurbulentEpisodes > 0 ? (
            <View style={styles.statsBox}>
              <Text style={styles.statsTitle}>In past similar rough patches</Text>
              <Text style={styles.statLine}>
                Episodes analyzed: {regime.pastTurbulentEpisodes}
              </Text>
              <Text style={styles.statLine}>
                Avg market move: {pct(regime.avgMarketReturnInTurbulence)}
              </Text>
              <Text style={styles.statLine}>
                Avg your portfolio:{' '}
                {pct(regime.avgPortfolioReturnInTurbulence)}
              </Text>
              {regime.worstPortfolioReturnInTurbulence != null ? (
                <Text style={styles.statLine}>
                  Worst episode for you: {pct(regime.worstPortfolioReturnInTurbulence)}
                </Text>
              ) : null}
            </View>
          ) : null}
        </>
      )}

      <QuantCredibilityFooter
        method={
          regime?.method === 'hmm'
            ? 'Hidden Markov Model (2-state)'
            : 'Volatility clustering (percentile)'
        }
        explanation="We classify markets as calm or turbulent by looking at how bumpy daily returns have been — using a Hidden Markov Model when it converges, otherwise rolling volatility percentiles. Then we compare how your portfolio behaved in past turbulent stretches."
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
  empty: {
    color: '#b8b8d2',
    fontSize: 13,
    fontFamily: 'Poppins',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 10,
  },
  calm: {
    backgroundColor: '#17bf2d22',
  },
  turbulent: {
    backgroundColor: '#F59E0B22',
  },
  badgeText: {
    fontFamily: 'Poppins',
    fontWeight: '600',
    fontSize: 14,
  },
  summary: {
    color: '#C9D1D9',
    fontSize: 13,
    fontFamily: 'Poppins',
    marginBottom: 12,
    lineHeight: 20,
  },
  timeline: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 4,
    overflow: 'hidden',
    gap: 1,
  },
  tick: {
    flex: 1,
    borderRadius: 1,
  },
  timelineLabel: {
    marginTop: 4,
    fontSize: 10,
    color: '#8a8a9a',
    fontFamily: 'Poppins',
  },
  statsBox: {
    marginTop: 12,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 12,
  },
  statsTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Poppins',
    marginBottom: 6,
  },
  statLine: {
    color: '#b8b8d2',
    fontSize: 12,
    fontFamily: 'Poppins',
    marginTop: 2,
  },
});
