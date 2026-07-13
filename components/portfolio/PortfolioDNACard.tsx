import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { PortfolioDNA } from '@/utils/quant/types';
import { QuantCredibilityFooter } from './QuantCredibilityFooter';

interface PortfolioDNACardProps {
  dna: PortfolioDNA | null;
  loading?: boolean;
}

export const PortfolioDNACard: React.FC<PortfolioDNACardProps> = ({ dna, loading }) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="dna" size={18} color="#17bf2d" />
        <Text style={styles.title}>Portfolio DNA</Text>
      </View>

      {loading && !dna ? (
        <ActivityIndicator color="#17bf2d" style={{ marginVertical: 16 }} />
      ) : !dna ? (
        <Text style={styles.empty}>
          Add at least two holdings with enough price history to see how they move together.
        </Text>
      ) : (
        <>
          <Text style={styles.styleLine}>
            Style:{' '}
            <Text style={styles.styleValue}>
              {dna.dominantStyle.charAt(0).toUpperCase() + dna.dominantStyle.slice(1)}
            </Text>
          </Text>

          {dna.components.map((c, i) => {
            const top = Object.entries(c.loadings)
              .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
              .slice(0, 2)
              .map(([t]) => t);
            const pct = Math.round(c.varianceExplained * 100);
            return (
              <View key={`${c.label}-${i}`} style={styles.row}>
                <View style={styles.rowTop}>
                  <Text style={styles.compLabel} numberOfLines={1}>
                    {c.label}
                  </Text>
                  <Text style={styles.pct}>{pct}%</Text>
                </View>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${Math.min(100, pct)}%` }]} />
                </View>
                <Text style={styles.drivers}>Driven by {top.join(', ') || '—'}</Text>
              </View>
            );
          })}

          {dna.plainLabels.slice(0, 2).map((line, i) => (
            <Text key={i} style={styles.insight}>
              {line}
            </Text>
          ))}
        </>
      )}

      <QuantCredibilityFooter
        method="PCA decomposition"
        explanation="We build a correlation matrix of your holdings’ daily returns, then use principal component analysis (linear algebra) to find the main themes that explain how they move together."
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
    lineHeight: 20,
  },
  styleLine: {
    color: '#b8b8d2',
    fontSize: 13,
    fontFamily: 'Poppins',
    marginBottom: 12,
  },
  styleValue: {
    color: '#17bf2d',
    fontWeight: '600',
  },
  row: {
    marginBottom: 12,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  compLabel: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Poppins',
    marginRight: 8,
  },
  pct: {
    color: '#17bf2d',
    fontWeight: '600',
    fontFamily: 'Poppins',
    fontSize: 13,
  },
  barBg: {
    height: 6,
    backgroundColor: '#1a1a2e',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#4A9EFF',
    borderRadius: 3,
  },
  drivers: {
    marginTop: 4,
    fontSize: 11,
    color: '#8a8a9a',
    fontFamily: 'Poppins',
  },
  insight: {
    fontSize: 12,
    color: '#C9D1D9',
    fontFamily: 'Poppins',
    marginTop: 4,
    lineHeight: 18,
  },
});
