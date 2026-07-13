import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { BehaviorAnalysisResult } from '@/utils/quant/types';
import { QuantCredibilityFooter } from './QuantCredibilityFooter';

interface BehaviorPatternsCardProps {
  behavior: BehaviorAnalysisResult | null;
}

export const BehaviorPatternsCard: React.FC<BehaviorPatternsCardProps> = ({ behavior }) => {
  const unlocked = behavior?.unlocked ?? false;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="brain" size={18} color="#17bf2d" />
        <Text style={styles.title}>Your Patterns</Text>
      </View>

      {!behavior || !unlocked ? (
        <View style={styles.locked}>
          <MaterialCommunityIcons name="lock-outline" size={28} color="#8a8a9a" />
          <Text style={styles.lockedTitle}>Still learning your habits</Text>
          <Text style={styles.lockedBody}>
            {behavior?.progressMessage ??
              'Keep using Equinox — we will spot your investing patterns after a few months of logged trades.'}
          </Text>
          {behavior ? (
            <Text style={styles.progress}>
              {behavior.eventCount} events · {behavior.dataMonths.toFixed(1)} months of history
            </Text>
          ) : null}
        </View>
      ) : behavior.patterns.length === 0 ? (
        <Text style={styles.empty}>{behavior.progressMessage}</Text>
      ) : (
        <>
          <Text style={styles.intro}>{behavior.progressMessage}</Text>
          {behavior.patterns.map((p) => (
            <View key={p.type} style={styles.pattern}>
              <View style={styles.patternHeader}>
                <Text style={styles.patternLabel}>{p.label}</Text>
                <View
                  style={[
                    styles.severity,
                    p.severity === 'high'
                      ? styles.sevHigh
                      : p.severity === 'medium'
                        ? styles.sevMed
                        : styles.sevLow,
                  ]}
                >
                  <Text style={styles.sevText}>{p.severity}</Text>
                </View>
              </View>
              <Text style={styles.patternBody}>{p.explanation}</Text>
            </View>
          ))}
        </>
      )}

      <QuantCredibilityFooter
        method="Statistical pattern detection"
        explanation="When you add or remove holdings, we quietly log the trade with market context. After enough history, we look for repeating tendencies — like selling into dips — using simple statistics, not judgment."
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
  locked: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  lockedTitle: {
    marginTop: 8,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },
  lockedBody: {
    marginTop: 6,
    color: '#b8b8d2',
    fontSize: 13,
    fontFamily: 'Poppins',
    textAlign: 'center',
    lineHeight: 20,
  },
  progress: {
    marginTop: 10,
    fontSize: 11,
    color: '#8a8a9a',
    fontFamily: 'Poppins',
  },
  empty: {
    color: '#b8b8d2',
    fontSize: 13,
    fontFamily: 'Poppins',
  },
  intro: {
    color: '#C9D1D9',
    fontSize: 13,
    fontFamily: 'Poppins',
    marginBottom: 10,
  },
  pattern: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  patternHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  patternLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins',
    flex: 1,
  },
  severity: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sevLow: { backgroundColor: '#17bf2d33' },
  sevMed: { backgroundColor: '#F59E0B33' },
  sevHigh: { backgroundColor: '#EF444433' },
  sevText: {
    fontSize: 10,
    color: '#C9D1D9',
    fontFamily: 'Poppins',
    textTransform: 'uppercase',
  },
  patternBody: {
    color: '#b8b8d2',
    fontSize: 12,
    fontFamily: 'Poppins',
    lineHeight: 18,
  },
});
