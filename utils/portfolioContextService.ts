import { Holding } from '../contexts/HoldingsContext';
import { InvestmentPlan } from '../contexts/InvestmentPlansContext';

export interface EnrichedHolding extends Holding {
  // Calculated financial metrics
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercentage: number;
  totalQuantity: number;
  averagePurchasePrice: number;
  // Market data
  sector?: string;
  marketCap?: number;
  volatility?: number;
  beta?: number;
  peRatio?: number;
  dividendYield?: number;
  performance?: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  };
}

export interface PortfolioMetrics {
  totalValue: number;
  totalGainLoss: number;
  totalGainLossPercentage: number;
  diversificationScore: number;
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  sectorAllocation: Record<string, number>;
  topPerformers: EnrichedHolding[];
  underperformers: EnrichedHolding[];
  correlationMatrix?: number[][];
  sharpeRatio?: number;
  maxDrawdown?: number;
  volatility?: number;
}

export interface GoalProgress {
  plan: InvestmentPlan;
  percentComplete: number;
  projectedCompletion: Date;
  monthlyContribution: number;
  onTrack: boolean;
}

export interface ComprehensivePortfolioContext {
  holdings: EnrichedHolding[];
  investmentPlans: InvestmentPlan[];
  metrics: PortfolioMetrics;
  goals: {
    planProgress: GoalProgress[];
    overallOnTrack: boolean;
    projectedCompletion: Date;
  };
  insights: string[];
  generatedAt: string;
  // Added summaries for AI consumption
  netGain: number;
  netGainPercentage: number;
  investmentGoalsSummary: Array<{
    planId: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    percentComplete: number;
    projectedCompletion: string;
    onTrack: boolean;
  }>;
  holdingsSummary: Array<{
    ticker: string;
    companyName?: string;
    totalQuantity: number;
    averagePurchasePrice: number;
    currentPrice: number;
    totalValue: number;
    totalGainLoss: number;
    totalGainLossPercentage: number;
  }>;
}

export class PortfolioContextService {
  /**
   * Build comprehensive portfolio context from holdings and investment plans
   */
  buildContext(holdings: Holding[], investmentPlans: InvestmentPlan[]): ComprehensivePortfolioContext | null {
    try {
      // Return null if no holdings
      if (!holdings || holdings.length === 0) {
        return null;
      }
      
      const enrichedHoldings = this.enrichHoldings(holdings);
      
      // Validate enriched holdings have values
      const hasValidData = enrichedHoldings.some(h => h.totalValue > 0);
      if (!hasValidData) {
        console.warn(' Warning: All holdings have zero value. Check if currentPrice is set properly.');
        console.warn('Enriched holdings:', enrichedHoldings.map(h => ({
          ticker: h.ticker,
          totalValue: h.totalValue,
          totalCost: h.totalCost,
          currentPrice: h.currentPrice
        })));
      }
      
      const metrics = this.calculateMetrics(enrichedHoldings);
      const goals = this.calculateGoalProgress(investmentPlans || [], metrics.totalValue);
      const insights = this.generateInsights(enrichedHoldings, metrics, goals);

      const holdingsSummary = enrichedHoldings.map(h => ({
        ticker: h.ticker,
        companyName: (h as any).companyName,
        totalQuantity: h.totalQuantity,
        averagePurchasePrice: h.averagePurchasePrice,
        currentPrice: h.currentPrice || 0,
        totalValue: h.totalValue,
        totalGainLoss: h.totalGainLoss,
        totalGainLossPercentage: h.totalGainLossPercentage,
      }));

      const investmentGoalsSummary = (goals.planProgress || []).map(g => ({
        planId: g.plan.id,
        name: g.plan.name,
        targetAmount: g.plan.targetAmount,
        currentAmount: g.plan.currentAmount,
        percentComplete: g.percentComplete,
        projectedCompletion: g.projectedCompletion.toISOString(),
        onTrack: g.onTrack,
      }));

      const context = {
        holdings: enrichedHoldings,
        investmentPlans: investmentPlans || [],
        metrics,
        goals,
        insights,
        generatedAt: new Date().toISOString(),
        netGain: metrics.totalGainLoss,
        netGainPercentage: metrics.totalGainLossPercentage,
        investmentGoalsSummary,
        holdingsSummary,
      };

      return context;
    } catch (error) {
      console.error('Error building portfolio context:', error);
      return null;
    }
  }

  /**
   * Enrich holdings with additional data
   */
  private enrichHoldings(holdings: Holding[]): EnrichedHolding[] {
    return holdings.map(holding => {
      // Calculate total quantity and average purchase price
      let totalQuantity = 0;
      let totalCost = 0;

      if (holding.purchaseLots && holding.purchaseLots.length > 0) {
        // Use purchase lots
        holding.purchaseLots.forEach(lot => {
          totalQuantity += lot.quantity || 0;
          totalCost += (lot.quantity || 0) * (lot.purchasePrice || 0);
        });
      } else {
        // Use legacy fields
        totalQuantity = holding.quantity || 0;
        totalCost = (holding.quantity || 0) * (holding.purchasePrice || 0);
      }

      const currentPrice = holding.currentPrice || 0;
      const totalValue = totalQuantity * currentPrice;
      const totalGainLoss = totalValue - totalCost;
      const totalGainLossPercentage = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
      const averagePurchasePrice = totalQuantity > 0 ? (totalCost / totalQuantity) : 0;

      // Log warning if current price is missing or zero
      if (currentPrice === 0) {
        console.warn(`⚠️ Warning: ${holding.ticker} has currentPrice = 0. This will result in zero value.`);
      }

      // Calculate performance based on gain/loss percentage
      const yearly = totalGainLossPercentage;
      const daily = yearly / 365;
      const weekly = daily * 7;
      const monthly = daily * 30;

      return {
        ...holding,
        totalValue,
        totalCost,
        totalGainLoss,
        totalGainLossPercentage,
        totalQuantity,
        averagePurchasePrice,
        sector: this.getSectorFromTicker(holding.ticker),
        marketCap: this.estimateMarketCap(holding.ticker),
        volatility: this.estimateVolatility(holding.ticker),
        beta: this.estimateBeta(holding.ticker),
        peRatio: this.estimatePERatio(holding.ticker),
        dividendYield: this.estimateDividendYield(holding.ticker),
        performance: { daily, weekly, monthly, yearly }
      };
    });
  }

  /**
   * Calculate comprehensive portfolio metrics
   */
  private calculateMetrics(holdings: EnrichedHolding[]): PortfolioMetrics {
    const totalValue = holdings.reduce((sum, h) => sum + (h.totalValue || 0), 0);
    const totalCost = holdings.reduce((sum, h) => sum + (h.totalCost || 0), 0);
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercentage = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    // Calculate sector allocation
    const sectorAllocation = this.calculateSectorAllocation(holdings);
    
    // Calculate diversification score (0-1, higher is better)
    const diversificationScore = this.calculateDiversificationScore(holdings, sectorAllocation);
    
    // Determine risk level
    const riskLevel = this.determineRiskLevel(holdings, diversificationScore);
    
    // Find top and underperformers
    const sortedByPerformance = [...holdings].sort((a, b) => 
      (b.totalGainLossPercentage || 0) - (a.totalGainLossPercentage || 0)
    );
    
    const topPerformers = sortedByPerformance.slice(0, 3);
    const underperformers = sortedByPerformance.slice(-3).reverse();

    // Calculate additional metrics
    const volatility = this.calculatePortfolioVolatility(holdings);
    const sharpeRatio = this.calculateSharpeRatio(totalGainLossPercentage, volatility);
    const maxDrawdown = this.calculateMaxDrawdown(holdings);

    return {
      totalValue,
      totalGainLoss,
      totalGainLossPercentage,
      diversificationScore,
      riskLevel,
      sectorAllocation,
      topPerformers,
      underperformers,
      volatility,
      sharpeRatio,
      maxDrawdown
    };
  }

  /**
   * Calculate goal progress for investment plans
   */
  private calculateGoalProgress(plans: InvestmentPlan[], currentValue: number): {
    planProgress: GoalProgress[];
    overallOnTrack: boolean;
    projectedCompletion: Date;
  } {
    const planProgress: GoalProgress[] = plans.map(plan => {
      const percentComplete = plan.targetAmount > 0 ? (currentValue / plan.targetAmount) * 100 : 0;
      const remainingAmount = Math.max(0, plan.targetAmount - currentValue);
      // Estimate monthly contribution based on current progress
      const monthlyContribution = 0; // Not tracked in current InvestmentPlan interface
      const monthsToComplete = remainingAmount > 0 && monthlyContribution > 0
        ? Math.ceil(remainingAmount / monthlyContribution)
        : 12; // Default to 1 year if no monthly contribution
      
      const projectedCompletion = new Date();
      projectedCompletion.setMonth(projectedCompletion.getMonth() + monthsToComplete);
      
      return {
        plan,
        percentComplete: Math.min(percentComplete, 100),
        projectedCompletion,
        monthlyContribution,
        onTrack: percentComplete >= 50 || monthsToComplete <= 12
      };
    });

    const overallOnTrack = planProgress.every(p => p.onTrack);
    const avgCompletion = planProgress.reduce((sum, p) => 
      sum + p.projectedCompletion.getTime(), 0) / planProgress.length;
    const projectedCompletion = new Date(avgCompletion);

    return {
      planProgress,
      overallOnTrack,
      projectedCompletion
    };
  }

  /**
   * Generate AI-powered insights
   */
  private generateInsights(
    holdings: EnrichedHolding[], 
    metrics: PortfolioMetrics, 
    goals: { planProgress: GoalProgress[]; overallOnTrack: boolean }
  ): string[] {
    const insights: string[] = [];

    // Diversification insights
    if (metrics.diversificationScore < 0.3) {
      insights.push("Your portfolio is highly concentrated. Consider diversifying across more sectors.");
    } else if (metrics.diversificationScore > 0.7) {
      insights.push("Great diversification! Your portfolio is well-balanced across sectors.");
    }

    // Performance insights
    if (metrics.totalGainLossPercentage > 20) {
      insights.push(`Excellent performance! Your portfolio is up ${metrics.totalGainLossPercentage.toFixed(1)}%.`);
    } else if (metrics.totalGainLossPercentage < -10) {
      insights.push("Consider reviewing your holdings. Your portfolio is down significantly.");
    }

    // Risk insights
    if (metrics.riskLevel === 'aggressive' && metrics.volatility && metrics.volatility > 0.3) {
      insights.push("High volatility detected. Consider adding some stable investments for balance.");
    }

    // Goal insights
    if (goals.overallOnTrack) {
      insights.push("You're on track to meet your investment goals! Keep up the great work.");
    } else {
      insights.push("Consider increasing your monthly contributions to stay on track with your goals.");
    }

    // Sector insights
    const topSector = Object.entries(metrics.sectorAllocation)
      .sort(([,a], [,b]) => b - a)[0];
    if (topSector && topSector[1] > 0.4) {
      insights.push(`${topSector[0]} represents ${(topSector[1] * 100).toFixed(0)}% of your portfolio. Consider diversifying.`);
    }

    return insights;
  }

  // Helper methods for data enrichment
  private getSectorFromTicker(ticker: string): string {
    const sectorMap: Record<string, string> = {
      'AAPL': 'Technology',
      'MSFT': 'Technology',
      'GOOGL': 'Technology',
      'AMZN': 'Consumer Discretionary',
      'TSLA': 'Consumer Discretionary',
      'META': 'Technology',
      'NVDA': 'Technology',
      'NFLX': 'Communication Services',
      'DIS': 'Communication Services',
      'JPM': 'Financials',
      'BAC': 'Financials',
      'WMT': 'Consumer Staples',
      'PG': 'Consumer Staples',
      'JNJ': 'Healthcare',
      'PFE': 'Healthcare',
      'XOM': 'Energy',
      'CVX': 'Energy'
    };
    return sectorMap[ticker] || 'Unknown';
  }

  private estimateMarketCap(ticker: string): number {
    // Simplified market cap estimation based on ticker
    const estimates: Record<string, number> = {
      'AAPL': 3000000000000,
      'MSFT': 2800000000000,
      'GOOGL': 1800000000000,
      'AMZN': 1500000000000,
      'TSLA': 800000000000,
      'META': 700000000000,
      'NVDA': 1200000000000
    };
    return estimates[ticker] || 10000000000; // Default 10B
  }

  private estimateVolatility(ticker: string): number {
    // Simplified volatility estimation (0-1 scale)
    const volatilities: Record<string, number> = {
      'AAPL': 0.25,
      'MSFT': 0.22,
      'GOOGL': 0.28,
      'AMZN': 0.35,
      'TSLA': 0.65,
      'META': 0.45,
      'NVDA': 0.55
    };
    return volatilities[ticker] || 0.3;
  }

  private estimateBeta(ticker: string): number {
    const betas: Record<string, number> = {
      'AAPL': 1.2,
      'MSFT': 0.9,
      'GOOGL': 1.1,
      'AMZN': 1.3,
      'TSLA': 2.1,
      'META': 1.4,
      'NVDA': 1.6
    };
    return betas[ticker] || 1.0;
  }

  private estimatePERatio(ticker: string): number {
    const peRatios: Record<string, number> = {
      'AAPL': 28,
      'MSFT': 32,
      'GOOGL': 25,
      'AMZN': 45,
      'TSLA': 60,
      'META': 22,
      'NVDA': 35
    };
    return peRatios[ticker] || 20;
  }

  private estimateDividendYield(ticker: string): number {
    const yields: Record<string, number> = {
      'AAPL': 0.0044,
      'MSFT': 0.0071,
      'GOOGL': 0.0,
      'AMZN': 0.0,
      'TSLA': 0.0,
      'META': 0.0,
      'NVDA': 0.0003
    };
    return yields[ticker] || 0.02;
  }


  private calculateSectorAllocation(holdings: EnrichedHolding[]): Record<string, number> {
    const totalValue = holdings.reduce((sum, h) => sum + (h.totalValue || 0), 0);
    const sectorValues: Record<string, number> = {};

    holdings.forEach(holding => {
      const sector = holding.sector || 'Unknown';
      sectorValues[sector] = (sectorValues[sector] || 0) + (holding.totalValue || 0);
    });

    const allocation: Record<string, number> = {};
    Object.entries(sectorValues).forEach(([sector, value]) => {
      allocation[sector] = totalValue > 0 ? value / totalValue : 0;
    });

    return allocation;
  }

  private calculateDiversificationScore(holdings: EnrichedHolding[], sectorAllocation: Record<string, number>): number {
    const sectors = Object.keys(sectorAllocation);
    const numSectors = sectors.length;
    const numHoldings = holdings.length;

    // Base score from number of sectors
    let score = Math.min(numSectors / 5, 1); // Max 1.0 for 5+ sectors

    // Penalty for concentration
    const maxAllocation = Math.max(...Object.values(sectorAllocation));
    if (maxAllocation > 0.5) {
      score *= 0.5; // Heavy penalty for >50% in one sector
    } else if (maxAllocation > 0.3) {
      score *= 0.8; // Moderate penalty for >30% in one sector
    }

    // Bonus for number of holdings
    if (numHoldings >= 10) {
      score *= 1.2;
    } else if (numHoldings >= 5) {
      score *= 1.1;
    }

    return Math.min(score, 1.0);
  }

  private determineRiskLevel(holdings: EnrichedHolding[], diversificationScore: number): 'conservative' | 'moderate' | 'aggressive' {
    const avgVolatility = holdings.reduce((sum, h) => sum + (h.volatility || 0.3), 0) / holdings.length;
    const avgBeta = holdings.reduce((sum, h) => sum + (h.beta || 1.0), 0) / holdings.length;

    if (avgVolatility < 0.25 && avgBeta < 1.0 && diversificationScore > 0.6) {
      return 'conservative';
    } else if (avgVolatility > 0.4 || avgBeta > 1.5 || diversificationScore < 0.3) {
      return 'aggressive';
    } else {
      return 'moderate';
    }
  }

  private calculatePortfolioVolatility(holdings: EnrichedHolding[]): number {
    const weights = holdings.map(h => h.totalValue);
    const totalValue = weights.reduce((sum, w) => sum + w, 0);
    const normalizedWeights = weights.map(w => w / totalValue);

    let portfolioVariance = 0;
    holdings.forEach((holding, i) => {
      const weight = normalizedWeights[i];
      const volatility = holding.volatility || 0.3;
      portfolioVariance += (weight * weight * volatility * volatility);
    });

    return Math.sqrt(portfolioVariance);
  }

  private calculateSharpeRatio(returnPercentage: number, volatility: number): number {
    const riskFreeRate = 0.02; // Assume 2% risk-free rate
    return volatility > 0 ? (returnPercentage / 100 - riskFreeRate) / volatility : 0;
  }

  private calculateMaxDrawdown(holdings: EnrichedHolding[]): number {
    // Simplified max drawdown calculation
    const totalGainLossPercentage = holdings.reduce((sum, h) => sum + (h.totalGainLossPercentage || 0), 0) / holdings.length;
    return Math.max(0, -totalGainLossPercentage * 0.3); // Assume 30% of gain as max drawdown
  }
}

export const portfolioContextService = new PortfolioContextService();