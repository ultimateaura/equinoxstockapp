import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { recommendationService } from '../utils/recommendationService';
import { StockRecommendation } from '../utils/quant/types';

interface TopPicksScreenerProps {
  /** Candidate universe to rank. */
  tickers: string[];
  topN?: number;
  onSelect: (ticker: string) => void;
}

const SIGNAL_COLORS: Record<string, string> = {
  Buy: '#17bf2d',
  Hold: '#f5a623',
  Watch: '#8a8aa3',
};

function scoreColor(score: number): string {
  if (score >= 65) return '#17bf2d';
  if (score >= 45) return '#f5a623';
  return '#ef4444';
}

export const TopPicksScreener: React.FC<TopPicksScreenerProps> = ({
  tickers,
  topN = 5,
  onSelect,
}) => {
  const [picks, setPicks] = useState<StockRecommendation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tickers.length === 0) return;
    let active = true;
    setLoading(true);
    // De-dupe and cap the universe so the screener stays fast.
    const universe = Array.from(new Set(tickers.map((t) => t.toUpperCase()))).slice(0, 20);
    recommendationService
      .rankUniverse(universe, topN)
      .then((r) => active && setPicks(r))
      .catch(() => active && setPicks([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [tickers.join(','), topN]);

  if (tickers.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="trophy-outline" size={18} color="#17bf2d" />
        <Text style={styles.title}>Top Picks for You</Text>
        <Text style={styles.subtitle}>ranked by quant + ML score</Text>
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#17bf2d" size="small" />
          <Text style={styles.loadingText}>Scoring stocks...</Text>
        </View>
      ) : picks.length === 0 ? (
        <Text style={styles.loadingText}>No scorable stocks right now.</Text>
      ) : (
        picks.map((p, i) => (
          <TouchableOpacity
            key={p.ticker}
            style={styles.row}
            onPress={() => onSelect(p.ticker)}
          >
            <Text style={styles.rank}>{i + 1}</Text>
            <View style={styles.rowMain}>
              <Text style={styles.ticker}>{p.ticker}</Text>
              {!!p.companyName && (
                <Text style={styles.company} numberOfLines={1}>
                  {p.companyName}
                </Text>
              )}
            </View>
            <View style={[styles.signalBadge, { backgroundColor: SIGNAL_COLORS[p.signal] }]}>
              <Text style={styles.signalText}>{p.signal}</Text>
            </View>
            <Text style={[styles.score, { color: scoreColor(p.score) }]}>{p.score}</Text>
          </TouchableOpacity>
        ))
      )}

      <Text style={styles.disclaimer}>
        Algorithmic ranking for education, not financial advice.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#26262b',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3a3a3e',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  title: { color: '#ffffff', fontFamily: 'Poppins', fontWeight: '600', fontSize: 15 },
  subtitle: { color: '#8a8aa3', fontFamily: 'Poppins', fontSize: 11, marginLeft: 'auto' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  loadingText: { color: '#b8b8d2', fontFamily: 'Poppins', fontSize: 12.5, paddingVertical: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#33333a',
  },
  rank: {
    color: '#8a8aa3',
    fontFamily: 'Poppins',
    fontWeight: '700',
    fontSize: 14,
    width: 22,
  },
  rowMain: { flex: 1 },
  ticker: { color: '#ffffff', fontFamily: 'Poppins', fontWeight: '600', fontSize: 14 },
  company: { color: '#8a8aa3', fontFamily: 'Poppins', fontSize: 11 },
  signalBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginRight: 10 },
  signalText: { color: '#0e0e10', fontFamily: 'Poppins', fontWeight: '700', fontSize: 11 },
  score: { fontFamily: 'Poppins', fontWeight: '800', fontSize: 18, width: 34, textAlign: 'right' },
  disclaimer: {
    color: '#6f6f85',
    fontFamily: 'Poppins',
    fontStyle: 'italic',
    fontSize: 10,
    marginTop: 8,
  },
});
