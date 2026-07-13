import VisualizeScreen from '@/app/visualize';
import { AddHoldingModal } from '@/components/AddHoldingModal';
import { EditPlanModal } from '@/components/EditPlanModal';
import { HoldingCard } from '@/components/HoldingCard';
import { PortfolioOptimizationCard } from '@/components/PortfolioOptimizationCard';
import { BehaviorPatternsCard } from '@/components/portfolio/BehaviorPatternsCard';
import { MonteCarloSimulatorCard } from '@/components/portfolio/MonteCarloSimulatorCard';
import { PortfolioDNACard } from '@/components/portfolio/PortfolioDNACard';
import { PortfolioExplainerCard } from '@/components/portfolio/PortfolioExplainerCard';
import { PortfolioHubHeader } from '@/components/portfolio/PortfolioHubHeader';
import { VolatilityRegimeCard } from '@/components/portfolio/VolatilityRegimeCard';
import { useAuth } from '@/contexts/AuthContext';
import { useHoldings } from '@/contexts/HoldingsContext';
import { InvestmentPlan, useInvestmentPlans } from '@/contexts/InvestmentPlansContext';
import { usePortfolioAnalytics } from '@/hooks/usePortfolioAnalytics';
import { formatCurrency } from '@/utils/formatCurrency';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

export default function PortfolioScreen() {
  const {
    holdings,
    calculateTotalValue,
    calculateTotalGainLoss,
    calculateTotalGainLossPercentage,
  } = useHoldings();
  const { plans, addPlan, updatePlan, deletePlan } = useInvestmentPlans();
  const {
    snapshot,
    explanation,
    loading,
    explaining,
    horizon,
    setHorizon,
    refresh,
  } = usePortfolioAnalytics();

  const [showAddHolding, setShowAddHolding] = useState(false);
  const [showEditPlan, setShowEditPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const { userProfile, user } = useAuth();
  const userInitial = (() => {
    const name = userProfile?.name || user?.displayName || '';
    return name ? name.charAt(0).toUpperCase() : 'U';
  })();

  const totalValue = calculateTotalValue();
  const totalGainLoss = calculateTotalGainLoss();
  const totalGainLossPercentage = calculateTotalGainLossPercentage();

  useFocusEffect(
    useCallback(() => {
      // Hook already publishes aiContext; refresh keeps data warm when returning
      if (holdings.length > 0 && !snapshot) {
        refresh(false);
      }
    }, [holdings.length, snapshot, refresh])
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <PortfolioHubHeader
        regime={snapshot?.regime?.current}
        userInitial={userInitial}
      />

      {/* At-a-glance summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Total Portfolio Value</Text>
        <Text style={styles.summaryValue}>{formatCurrency(totalValue)}</Text>
        <View style={styles.summaryRow}>
          <Text
            style={[
              styles.summaryChange,
              { color: totalGainLoss >= 0 ? '#17bf2d' : '#EF4444' },
            ]}
          >
            {totalGainLoss >= 0 ? '+' : ''}
            {formatCurrency(totalGainLoss)} ({totalGainLossPercentage >= 0 ? '+' : ''}
            {totalGainLossPercentage.toFixed(2)}%)
          </Text>
          <Text style={styles.summaryPeriod}>All time P/L</Text>
        </View>
        <Text style={styles.thirdPartyNote}>
          External interpreter — add holdings from your brokerage. Equinox does not execute trades.
        </Text>
      </View>

      {holdings.length === 0 ? (
        <View style={styles.emptyHoldings}>
          <Text style={styles.emptyTitle}>Connect your portfolio</Text>
          <Text style={styles.emptyDescription}>
            Add holdings from your brokerage account so Equinox can explain them with portfolio DNA,
            what-if ranges, and market regimes — math beginners rarely see, in plain English.
          </Text>
          <TouchableOpacity style={styles.addFirstButton} onPress={() => setShowAddHolding(true)}>
            <Text style={styles.addFirstButtonText}>Add Your First Holding</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <PortfolioExplainerCard
            explanation={explanation}
            loading={explaining || loading}
            onRefresh={() => refresh(true)}
          />

          <PortfolioDNACard dna={snapshot?.dna ?? null} loading={loading} />

          <MonteCarloSimulatorCard
            result={snapshot?.monteCarlo ?? null}
            horizon={horizon}
            onHorizonChange={setHorizon}
            loading={loading}
          />

          <VolatilityRegimeCard regime={snapshot?.regime ?? null} loading={loading} />

          <BehaviorPatternsCard behavior={snapshot?.behavior ?? null} />
        </>
      )}

      {/* Compact holdings */}
      <View style={styles.holdingsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Holdings</Text>
          <TouchableOpacity onPress={() => setShowAddHolding(true)}>
            <Text style={styles.moreText}>Add</Text>
          </TouchableOpacity>
        </View>

        {holdings.length > 0 ? (
          <FlatList
            data={holdings}
            keyExtractor={(item) => item.ticker}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <HoldingCard
                ticker={item.ticker}
                companyName={item.companyName}
                purchaseLots={item.purchaseLots || []}
                currentPrice={item.currentPrice}
                image={item.image}
                onRemove={() => {}}
              />
            )}
          />
        ) : null}
      </View>

      {/* Advanced (collapsed) */}
      <TouchableOpacity
        style={styles.advancedToggle}
        onPress={() => setAdvancedOpen((o) => !o)}
      >
        <Text style={styles.sectionTitle}>Advanced</Text>
        <MaterialCommunityIcons
          name={advancedOpen ? 'chevron-up' : 'chevron-down'}
          size={22}
          color="#b8b8d2"
        />
      </TouchableOpacity>

      {advancedOpen && (
        <View style={styles.advancedBody}>
          {holdings.length >= 2 && (
            <View style={styles.plansSection}>
              <PortfolioOptimizationCard
                holdings={holdings.map((h) => {
                  const totalQuantity =
                    h.purchaseLots?.reduce((sum, lot) => sum + lot.quantity, 0) ||
                    h.quantity ||
                    0;
                  return { ticker: h.ticker, value: totalQuantity * h.currentPrice };
                })}
              />
            </View>
          )}

          <View style={styles.plansSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Investment Plans</Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedPlan(null);
                  setShowEditPlan(true);
                }}
              >
                <Text style={styles.moreText}>Add</Text>
              </TouchableOpacity>
            </View>

            {plans.length > 0 ? (
              plans.map((plan) => {
                const progress =
                  plan.targetAmount > 0
                    ? Math.min((plan.currentAmount / plan.targetAmount) * 100, 100)
                    : 0;
                return (
                  <TouchableOpacity
                    key={plan.id}
                    style={styles.planItem}
                    onPress={() => {
                      setSelectedPlan(plan);
                      setShowEditPlan(true);
                    }}
                  >
                    <View style={styles.planHeader}>
                      <Text style={styles.planName}>{plan.name}</Text>
                      <Text style={styles.planProgress}>{progress.toFixed(0)}%</Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${progress}%` }]} />
                    </View>
                    <Text style={styles.planAmount}>
                      {formatCurrency(plan.currentAmount)} of {formatCurrency(plan.targetAmount)}
                    </Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyPlans}>
                <Text style={styles.emptyPlansText}>No investment plans yet</Text>
              </View>
            )}
          </View>

          <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
            <VisualizeScreen embedded />
          </View>
        </View>
      )}

      <View style={{ height: 100 }} />

      <AddHoldingModal
        visible={showAddHolding}
        onDismiss={() => setShowAddHolding(false)}
      />

      <EditPlanModal
        visible={showEditPlan}
        plan={selectedPlan}
        onDismiss={() => {
          setShowEditPlan(false);
          setSelectedPlan(null);
        }}
        onSave={async (name, targetAmount, currentAmount) => {
          if (selectedPlan) {
            await updatePlan(selectedPlan.id, name, targetAmount, currentAmount);
          } else {
            await addPlan(name, targetAmount, currentAmount);
          }
        }}
        onDelete={
          selectedPlan
            ? async () => {
                await deletePlan(selectedPlan.id);
              }
            : undefined
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e22',
  },
  summaryCard: {
    margin: 20,
    marginTop: 20,
    backgroundColor: '#2a2a2e',
    borderRadius: 12,
    padding: 20,
  },
  summaryTitle: {
    fontSize: 16,
    color: '#b8b8d2',
    fontFamily: 'Poppins',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryChange: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Poppins',
  },
  summaryPeriod: {
    fontSize: 14,
    color: '#b8b8d2',
    fontFamily: 'Poppins',
  },
  thirdPartyNote: {
    marginTop: 12,
    fontSize: 11,
    color: '#8a8a9a',
    fontFamily: 'Poppins',
    lineHeight: 16,
  },
  holdingsSection: {
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#ffffff',
    fontFamily: 'Poppins',
  },
  moreText: {
    fontSize: 14,
    color: '#17bf2d',
    fontFamily: 'Poppins',
  },
  emptyHoldings: {
    marginHorizontal: 20,
    backgroundColor: '#2a2a2e',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
    marginBottom: 10,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#b8b8d2',
    fontFamily: 'Poppins',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  addFirstButton: {
    backgroundColor: '#17bf2d',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
  },
  advancedToggle: {
    marginHorizontal: 20,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a2a2e',
    borderRadius: 12,
    padding: 16,
  },
  advancedBody: {
    marginTop: 8,
  },
  plansSection: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  planItem: {
    backgroundColor: '#2a2a2e',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    fontFamily: 'Poppins',
  },
  planProgress: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#17bf2d',
    fontFamily: 'Poppins',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#1a1a2e',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#17bf2d',
    borderRadius: 3,
  },
  planAmount: {
    fontSize: 12,
    color: '#b8b8d2',
    fontFamily: 'Poppins',
  },
  emptyPlans: {
    backgroundColor: '#2a2a2e',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  emptyPlansText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    fontFamily: 'Poppins',
  },
});
