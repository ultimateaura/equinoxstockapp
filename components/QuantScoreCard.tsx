import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { recommendationService } from '../utils/recommendationService';
import { FactorScores, StockRecommendation } from '../utils/quant/types';

interface QuantScoreCardProps {
  ticker: string;
  companyName?: string;
}

const SIGNAL_COLORS: Record<string, string> = {
  Buy: '#17bf2d',
  Hold: '#f5a623',
  Watch: '#8a8aa3',
};

const FACTOR_LABELS: Record<keyof FactorScores, string> = {
  momentum: 'Momentum',
  trend: 'Trend',
  value: 'Value',
  lowVolatility: 'Stability',
  quality: 'Quality',
};

const FEATURE_LABELS: Record<string, string> = {
  mom3: '3-month return',
  mom6: '6-month return',
  mom12: '12-month return',
  volAnn: 'Volatility',
  rsi14: 'RSI (momentum)',
  priceToSMA50: 'Price vs 50-day avg',
  priceToSMA200: 'Price vs 200-day avg',
  maxDD: 'Max drawdown',
  beta: 'Market sensitivity',
  relReturn6: 'Return vs market',
  pe: 'P/E ratio',
  pb: 'Price/book',
};

function scoreColor(score: number): string {
  if (score >= 65) return '#17bf2d';
  if (score >= 45) return '#f5a623';
  return '#ef4444';
}

export const QuantScoreCard: React.FC<QuantScoreCardProps> = ({ ticker, companyName }) => {
  const [rec, setRec] = useState<StockRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    recommendationService
      .getRecommendation(ticker, companyName)
      .then((r) => active && setRec(r))
      .catch(() => active && setRec(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [ticker, companyName]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#17bf2d" />
        <Text style={styles.loadingText}>Running quant + ML models...</Text>
      </View>
    );
  }

  if (!rec || rec.dataQuality === 'insufficient') {
    return (
      <View style={[styles.container, styles.centered]}>
        <MaterialCommunityIcons name="chart-line-variant" size={28} color="#8a8aa3" />
        <Text style={styles.loadingText}>
          {rec?.disclaimer || 'Not enough price history to score this stock yet.'}
        </Text>
      </View>
    );
  }

  const signalColor = SIGNAL_COLORS[rec.signal] || '#8a8aa3';

  return (
    <View style={styles.container}>
      {/* Header: signal + blended score */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="brain" size={20} color="#17bf2d" />
          <Text style={styles.title}>Quant + ML Signal</Text>
        </View>
        <View style={[styles.signalBadge, { backgroundColor: signalColor }]}>
          <Text style={styles.signalText}>{rec.signal}</Text>
        </View>
      </View>

      {/* Big blended score */}
      <View style={styles.scoreRow}>
        <Text style={[styles.bigScore, { color: scoreColor(rec.score) }]}>{rec.score}</Text>
        <Text style={styles.scoreOutOf}>/ 100</Text>
        <View style={styles.subScores}>
          <Text style={styles.subScoreText}>Factor model: {rec.classicalScore}</Text>
          <Text style={styles.subScoreText}>
            ML model: {rec.mlScore ?? 'n/a'}
            {rec.ml ? ` (${Math.round(rec.ml.probability * 100)}% beat-market)` : ''}
          </Text>
          <Text style={styles.subScoreText}>Confidence: {rec.confidence}%</Text>
        </View>
      </View>

      {/* Factor bars */}
      <View style={styles.factors}>
        {(Object.keys(rec.factors) as (keyof FactorScores)[]).map((f) => (
          <View key={f} style={styles.factorRow}>
            <Text style={styles.factorLabel}>{FACTOR_LABELS[f]}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${rec.factors[f]}%`, backgroundColor: scoreColor(rec.factors[f]) },
                ]}
              />
            </View>
            <Text style={styles.factorValue}>{Math.round(rec.factors[f])}</Text>
          </View>
        ))}
      </View>

      {/* Top reasons */}
      <View style={styles.reasons}>
        {rec.reasons.map((r) => (
          <View key={r.factor} style={styles.reasonRow}>
            <MaterialCommunityIcons
              name="circle-medium"
              size={18}
              color={scoreColor(r.score)}
            />
            <Text style={styles.reasonText}>
              <Text style={styles.reasonLabel}>{r.label}: </Text>
              {r.explanation}
            </Text>
          </View>
        ))}
      </View>

      {/* Expandable: how we calculated this */}
      <TouchableOpacity style={styles.expandBtn} onPress={() => setExpanded((e) => !e)}>
        <Text style={styles.expandText}>
          {expanded ? 'Hide' : 'How we calculated this'}
        </Text>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#17bf2d"
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.details}>
          <Text style={styles.detailsParagraph}>
            We pull about a year of daily prices and compute classic indicators
            (momentum, trend vs moving averages, volatility, drawdown, valuation).
            Those become five factor scores that are blended into the factor-model
            score.
          </Text>
          <Text style={styles.detailsParagraph}>
            Separately, an on-device neural network reads the same data and
            estimates the chance this stock beats the market (SPY) over the next
            ~month. The final score is the average of both.
          </Text>
          {rec.ml && rec.ml.topFeatures.length > 0 && (
            <>
              <Text style={styles.detailsHeading}>What the ML model weighed most:</Text>
              {rec.ml.topFeatures.map((tf) => (
                <Text key={tf.name} style={styles.detailsBullet}>
                  - {FEATURE_LABELS[tf.name] || tf.name}{' '}
                  ({tf.contribution >= 0 ? '+' : ''}
                  {(tf.contribution * 100).toFixed(1)} pts)
                </Text>
              ))}
            </>
          )}
        </View>
      )}

      <Text style={styles.disclaimer}>{rec.disclaimer}</Text>
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
  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  loadingText: {
    color: '#b8b8d2',
    marginTop: 10,
    fontFamily: 'Poppins',
    fontSize: 13,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: '#ffffff', fontFamily: 'Poppins', fontWeight: '600', fontSize: 15 },
  signalBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 14 },
  signalText: { color: '#0e0e10', fontWeight: '700', fontFamily: 'Poppins', fontSize: 13 },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16 },
  bigScore: { fontSize: 48, fontWeight: '800', fontFamily: 'Poppins', lineHeight: 52 },
  scoreOutOf: { color: '#8a8aa3', fontSize: 16, marginLeft: 4, marginBottom: 8 },
  subScores: { marginLeft: 'auto', alignItems: 'flex-end' },
  subScoreText: { color: '#b8b8d2', fontSize: 11, fontFamily: 'Poppins', marginBottom: 2 },
  factors: { marginBottom: 14 },
  factorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  factorLabel: { color: '#b8b8d2', fontSize: 12, fontFamily: 'Poppins', width: 78 },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#1a1a1e',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: 4 },
  factorValue: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Poppins',
    width: 28,
    textAlign: 'right',
  },
  reasons: { marginBottom: 10 },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  reasonText: { color: '#d6d6e6', fontSize: 12.5, fontFamily: 'Poppins', flex: 1, lineHeight: 18 },
  reasonLabel: { color: '#ffffff', fontWeight: '600' },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  expandText: { color: '#17bf2d', fontSize: 13, fontFamily: 'Poppins', fontWeight: '500' },
  details: {
    backgroundColor: '#1c1c20',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  detailsParagraph: {
    color: '#b8b8d2',
    fontSize: 12,
    fontFamily: 'Poppins',
    lineHeight: 18,
    marginBottom: 8,
  },
  detailsHeading: { color: '#ffffff', fontSize: 12.5, fontFamily: 'Poppins', fontWeight: '600', marginBottom: 4 },
  detailsBullet: { color: '#b8b8d2', fontSize: 12, fontFamily: 'Poppins', marginBottom: 2 },
  disclaimer: {
    color: '#6f6f85',
    fontSize: 10.5,
    fontFamily: 'Poppins',
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 15,
  },
});
