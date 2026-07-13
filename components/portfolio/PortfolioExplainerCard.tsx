import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { PortfolioExplanation } from '@/utils/portfolioExplainerService';
import { QuantCredibilityFooter } from './QuantCredibilityFooter';

interface PortfolioExplainerCardProps {
  explanation: PortfolioExplanation | null;
  loading: boolean;
  onRefresh: () => void;
}

export const PortfolioExplainerCard: React.FC<PortfolioExplainerCardProps> = ({
  explanation,
  loading,
  onRefresh,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <MaterialCommunityIcons name="text-box-outline" size={18} color="#17bf2d" />
          <Text style={styles.title}>In plain English</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} disabled={loading} hitSlop={8}>
          <MaterialCommunityIcons
            name="refresh"
            size={20}
            color={loading ? '#555' : '#17bf2d'}
          />
        </TouchableOpacity>
      </View>

      {loading && !explanation ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#17bf2d" />
          <Text style={styles.loadingText}>Reading your portfolio…</Text>
        </View>
      ) : (
        <Text style={styles.body}>
          {explanation?.text ??
            'Add holdings from your brokerage to get a plain-English picture of your portfolio.'}
        </Text>
      )}

      {explanation?.generatedAt ? (
        <Text style={styles.meta}>
          Last updated {new Date(explanation.generatedAt).toLocaleString()} · Explained by AI
          using your portfolio data
        </Text>
      ) : null}

      <QuantCredibilityFooter
        method="LLM narrative on structured quant outputs"
        explanation="We feed your Portfolio DNA, what-if ranges, and regime stats into an AI model that rewrites them in beginner-friendly language. Numbers come from on-device math first — the AI only describes them."
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#2a2a2e',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#17bf2d',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Poppins',
  },
  body: {
    fontSize: 14,
    color: '#C9D1D9',
    fontFamily: 'Poppins',
    lineHeight: 22,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  loadingText: {
    color: '#b8b8d2',
    fontFamily: 'Poppins',
    fontSize: 13,
  },
  meta: {
    marginTop: 10,
    fontSize: 11,
    color: '#8a8a9a',
    fontFamily: 'Poppins',
  },
});
