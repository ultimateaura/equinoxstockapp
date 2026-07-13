import VisualizeScreen from '@/app/visualize';
import { AddHoldingModal } from '@/components/AddHoldingModal';
import { EditPlanModal } from '@/components/EditPlanModal';
import { HoldingCard } from '@/components/HoldingCard';
import { PortfolioOptimizationCard } from '@/components/PortfolioOptimizationCard';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useHoldings } from '@/contexts/HoldingsContext';
import { InvestmentPlan, useInvestmentPlans } from '@/contexts/InvestmentPlansContext';
import { formatCurrency } from '@/utils/formatCurrency';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

export default function PortfolioScreen() {
  const { favoriteStocks } = useFavorites();
  const { 
    holdings, 
    calculateTotalValue, 
    calculateTotalGainLoss, 
    calculateTotalGainLossPercentage 
  } = useHoldings();
  const { plans, addPlan, updatePlan, deletePlan } = useInvestmentPlans();

  const [showAddHolding, setShowAddHolding] = useState(false);
  const [showEditPlan, setShowEditPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);
  const [visualizations, setVisualizations] = useState<any[]>([]);

  // Function to add a new visualization
  const addVisualization = (visualization: any) => {
    setVisualizations(prev => [...prev, visualization]);
  };

  // Calculate portfolio metrics from actual holdings
  const totalValue = calculateTotalValue();
  const totalGainLoss = calculateTotalGainLoss();
  const totalGainLossPercentage = calculateTotalGainLossPercentage();

  // Generate pie chart data from actual holdings
  const generatePortfolioPieData = () => {
    if (holdings.length === 0) return [];
    
    const colors = ['#4A9EFF', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'];
    
    return holdings.map((holding, index) => {
      const totalQuantity = holding.purchaseLots?.reduce((sum: number, lot: any) => sum + lot.quantity, 0) || holding.quantity || 0;
      const totalValue = totalQuantity * holding.currentPrice;
      
      return {
        value: totalValue,
        color: colors[index % colors.length],
        text: holding.ticker,
        label: holding.ticker,
        labelTextStyle: { color: '#C9D1D9', fontSize: 12 }
      };
    });
  };

  const portfolioPieData = generatePortfolioPieData();

  // Remove sample pie data; use real holdings only

  // Store context when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      const storePortfolioContext = async () => {
        try {
          const context = {
            screen: 'portfolio',
            data: {
              totalValue,
              totalGainLoss,
              totalGainLossPercentage,
              holdings: holdings.map(holding => {
                const totalQuantity = holding.purchaseLots?.reduce((sum: number, lot: any) => sum + lot.quantity, 0) || holding.quantity || 0;
                const avgPrice = totalQuantity > 0 
                  ? (holding.purchaseLots?.reduce((sum: number, lot: any) => sum + (lot.quantity * lot.purchasePrice), 0) || 0) / totalQuantity 
                  : holding.purchasePrice || 0;
                
                return {
                  ticker: holding.ticker,
                  companyName: holding.companyName,
                  quantity: totalQuantity,
                  averagePurchasePrice: avgPrice,
                  currentPrice: holding.currentPrice,
                  totalValue: totalQuantity * holding.currentPrice,
                  gainLoss: (holding.currentPrice - avgPrice) * totalQuantity,
                  gainLossPercentage: ((holding.currentPrice - avgPrice) / avgPrice) * 100,
                };
              }),
            },
            suggestion: holdings.length > 0 
              ? `Your portfolio has a total value of ${formatCurrency(totalValue)} with a ${totalGainLoss >= 0 ? 'gain' : 'loss'} of ${formatCurrency(Math.abs(totalGainLoss))} (${totalGainLossPercentage.toFixed(2)}%). I can help you analyze your holdings, suggest portfolio optimizations, or answer questions about your investments.`
              : 'You haven\'t added any holdings yet. I can help you understand how to build and track your investment portfolio. What would you like to know?',
          };
          await AsyncStorage.setItem('aiContext', JSON.stringify(context));
        } catch (error) {
          console.error('Error storing portfolio context:', error);
        }
      };

      storePortfolioContext();
    }, [holdings, totalValue, totalGainLoss, totalGainLossPercentage])
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Portfolio</Text>
          <Text style={styles.headerSubtitle}>Track your investments</Text>
        </View>
        <TouchableOpacity style={styles.avatarButton}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>K</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Portfolio Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Total Portfolio Value</Text>
        <Text style={styles.summaryValue}>{formatCurrency(totalValue)}</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryChange}>
            {totalGainLoss >= 0 ? '+' : ''}{formatCurrency(totalGainLoss)} ({totalGainLossPercentage >= 0 ? '+' : ''}{totalGainLossPercentage.toFixed(2)}%)
          </Text>
          <Text style={styles.summaryPeriod}>Today</Text>
        </View>

       
      </View>

      {/* Quant Portfolio Optimizer */}
      {holdings.length >= 2 && (
        <View style={styles.plansSection}>
          <PortfolioOptimizationCard
            holdings={holdings.map((h) => {
              const totalQuantity =
                h.purchaseLots?.reduce((sum: number, lot: any) => sum + lot.quantity, 0) ||
                h.quantity ||
                0;
              return { ticker: h.ticker, value: totalQuantity * h.currentPrice };
            })}
          />
        </View>
      )}

      {/* Investment Plans Section */}
      <View style={styles.plansSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Investment Plans</Text>
          <TouchableOpacity onPress={() => {
            setSelectedPlan(null);
            setShowEditPlan(true);
          }}>
            <Text style={styles.moreText}>Add</Text>
          </TouchableOpacity>
        </View>
        
        {plans.length > 0 ? (
          plans.map(plan => {
            const progress = plan.targetAmount > 0 
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
            <Text style={styles.emptyPlansSubtext}>
              Tap "Add" to create your first investment goal
            </Text>
          </View>
        )}
      </View>

      {/* Holdings Section */}
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
            renderItem={({ item }) => (
              <HoldingCard
                ticker={item.ticker}
                companyName={item.companyName}
                purchaseLots={item.purchaseLots || []}
                currentPrice={item.currentPrice}
                image={item.image}
                onRemove={() => {
                  // Handle remove holding
                }}
              />
            )}
            style={styles.holdingsList}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyHoldings}>
            <Text style={styles.emptyTitle}>No Holdings Yet</Text>
            <Text style={styles.emptyDescription}>
              Add your actual investments from your brokerage account to track performance
            </Text>
            <TouchableOpacity 
              style={styles.addFirstButton}
              onPress={() => setShowAddHolding(true)}
            >
              <Text style={styles.addFirstButtonText}>Add Your First Holding</Text>
            </TouchableOpacity>
          </View>
        )}

         {/* Inline AI Visualization Screen (embedded) */}
         <View style={{ marginTop: 10 }}>
           <VisualizeScreen embedded />
         </View>

        {/* Visualizations Gallery */}
        {visualizations.length > 0 && (
          <View style={styles.visualizationsSection}>
            <Text style={styles.sectionTitle}>Your Visualizations</Text>
            <FlatList
              data={visualizations}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <View style={styles.visualizationCard}>
                  <Text style={styles.visualizationTitle}>{item.title}</Text>
                  <Text style={styles.visualizationDescription}>{item.description}</Text>
                </View>
              )}
              contentContainerStyle={styles.visualizationsList}
            />
          </View>
        )}
      </View>


      {/* Add Holding Modal */}
      <AddHoldingModal
        visible={showAddHolding}
        onDismiss={() => setShowAddHolding(false)}
      />

      {/* Edit Plan Modal */}
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
        onDelete={selectedPlan ? async () => {
          await deletePlan(selectedPlan.id);
        } : undefined}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e22',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#17bf2d',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ffffff',
    fontFamily: 'Poppins',
  },
  avatarButton: {
    marginLeft: 20,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#17bf2d',
    fontFamily: 'Poppins',
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
    color: '#17bf2d',
    fontFamily: 'Poppins',
  },
  summaryPeriod: {
    fontSize: 14,
    color: '#b8b8d2',
    fontFamily: 'Poppins',
  },
  visualizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#17bf2d',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 15,
  },
  visualizeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Poppins',
    marginLeft: 8,
  },
  assetAllocationSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  createVisualizationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2e',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  createVisualizationText: {
    color: '#17bf2d',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Poppins',
    marginLeft: 6,
  },
  pieChartContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  centerLabel: {
    alignItems: 'center',
  },
  centerLabelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
  },
  centerLabelSubtext: {
    fontSize: 12,
    color: '#b8b8d2',
    fontFamily: 'Poppins',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 15,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#b8b8d2',
    fontFamily: 'Poppins',
  },
  visualizationsSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  visualizationsList: {
    paddingHorizontal: 0,
  },
  visualizationCard: {
    backgroundColor: '#2a2a2e',
    borderRadius: 12,
    padding: 15,
    marginRight: 15,
    width: 200,
    borderLeftWidth: 4,
    borderLeftColor: '#17bf2d',
  },
  visualizationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  visualizationDescription: {
    fontSize: 12,
    color: '#b8b8d2',
    fontFamily: 'Poppins',
  },
  plansSection: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  plansContainer: {
    width: '100%',
  },
  chartContainer: {
    width: '100%',
    backgroundColor: '#2a2a2e',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
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
  chartTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    fontFamily: 'Poppins',
    marginBottom: 20,
  },
  pieChartWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  holdingsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  holdingsList: {
    maxHeight: 300,
  },
  emptyHoldings: {
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
    marginBottom: 8,
  },
  emptyPlansSubtext: {
    fontSize: 14,
    color: '#b8b8d2',
    fontFamily: 'Poppins',
    textAlign: 'center',
  },
});