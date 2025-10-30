import { EnrichedHolding, PortfolioMetrics } from './portfolioContextService';

export interface RebalancingRecommendation {
  action: 'buy' | 'sell' | 'hold';
  ticker: string;
  currentAllocation: number;
  targetAllocation: number;
  amountToAdjust: number;
  reason: string;
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high';
  riskScore: number; // 0-100
  factors: {
    volatility: number;
    concentration: number;
    sectorRisk: number;
    marketExposure: number;
  };
  recommendations: string[];
}

export class PortfolioAnalysisService {
  /**
   * Calculate comprehensive risk score
   */
  calculateRiskScore(holdings: EnrichedHolding[], metrics: PortfolioMetrics): RiskAssessment {
    // Calculate individual risk factors
    const volatilityRisk = this.calculateVolatilityRisk(holdings);
    const concentrationRisk = this.calculateConcentrationRisk(holdings);
    const sectorRisk = this.calculateSectorRisk(metrics.sectorAllocation);
    const marketExposure = this.calculateMarketExposure(holdings);

    // Weighted risk score
    const riskScore = (
      volatilityRisk * 0.3 +
      concentrationRisk * 0.3 +
      sectorRisk * 0.25 +
      marketExposure * 0.15
    );

    const overallRisk = riskScore < 33 ? 'low' : riskScore < 66 ? 'medium' : 'high';

    const recommendations = this.generateRiskRecommendations(
      riskScore,
      { volatility: volatilityRisk, concentration: concentrationRisk, sectorRisk, marketExposure }
    );

    return {
      overallRisk,
      riskScore,
      factors: {
        volatility: volatilityRisk,
        concentration: concentrationRisk,
        sectorRisk,
        marketExposure
      },
      recommendations
    };
  }

  /**
   * Generate rebalancing recommendations
   */
  generateRebalancingRecommendations(
    holdings: EnrichedHolding[],
    metrics: PortfolioMetrics
  ): RebalancingRecommendation[] {
    const recommendations: RebalancingRecommendation[] = [];
    const totalValue = metrics.totalValue;

    // Target allocation: diversified across sectors
    const targetSectorAllocation = this.calculateTargetSectorAllocation(metrics.sectorAllocation);

    // Check each holding
    holdings.forEach(holding => {
      const currentAllocation = holding.totalValue / totalValue;
      const sector = holding.sector || 'Unknown';
      const targetAllocation = targetSectorAllocation[sector] / holdings.filter(h => h.sector === sector).length;

      const difference = currentAllocation - targetAllocation;

      if (Math.abs(difference) > 0.05) { // 5% threshold
        recommendations.push({
          action: difference > 0 ? 'sell' : 'buy',
          ticker: holding.ticker,
          currentAllocation: currentAllocation * 100,
          targetAllocation: targetAllocation * 100,
          amountToAdjust: Math.abs(difference * totalValue),
          reason: difference > 0
            ? `Overweight in ${holding.ticker}. Consider reducing position.`
            : `Underweight in ${holding.ticker}. Consider increasing position.`
        });
      }
    });

    return recommendations.slice(0, 5); // Top 5 recommendations
  }

  /**
   * Calculate diversification metrics
   */
  calculateDiversificationMetrics(holdings: EnrichedHolding[], sectorAllocation: Record<string, number>) {
    const numHoldings = holdings.length;
    const numSectors = Object.keys(sectorAllocation).length;

    // Herfindahl-Hirschman Index (HHI) for concentration
    const hhi = Object.values(sectorAllocation).reduce((sum, allocation) => {
      return sum + (allocation * allocation);
    }, 0);

    // Normalize HHI to 0-1 scale (1 = perfectly diversified)
    const diversificationIndex = 1 - hhi;

    return {
      numHoldings,
      numSectors,
      hhi,
      diversificationIndex,
      isWellDiversified: diversificationIndex > 0.6 && numSectors >= 4
    };
  }

  /**
   * Calculate correlation between holdings
   */
  calculateCorrelationMatrix(holdings: EnrichedHolding[]): number[][] {
    const n = holdings.length;
    const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1; // Perfect correlation with itself
        } else {
          // Simplified correlation based on sector similarity
          const sameSector = holdings[i].sector === holdings[j].sector;
          matrix[i][j] = sameSector ? 0.7 : 0.3;
        }
      }
    }

    return matrix;
  }

  // Private helper methods

  private calculateVolatilityRisk(holdings: EnrichedHolding[]): number {
    const avgVolatility = holdings.reduce((sum, h) => sum + (h.volatility || 0.3), 0) / holdings.length;
    return Math.min(avgVolatility * 200, 100); // Scale to 0-100
  }

  private calculateConcentrationRisk(holdings: EnrichedHolding[]): number {
    const totalValue = holdings.reduce((sum, h) => sum + h.totalValue, 0);
    const maxHoldingPercentage = Math.max(...holdings.map(h => h.totalValue / totalValue));
    
    // High concentration = high risk
    if (maxHoldingPercentage > 0.5) return 90;
    if (maxHoldingPercentage > 0.3) return 70;
    if (maxHoldingPercentage > 0.2) return 50;
    return 30;
  }

  private calculateSectorRisk(sectorAllocation: Record<string, number>): number {
    const maxSectorAllocation = Math.max(...Object.values(sectorAllocation));
    
    // High sector concentration = high risk
    if (maxSectorAllocation > 0.6) return 85;
    if (maxSectorAllocation > 0.4) return 60;
    if (maxSectorAllocation > 0.3) return 40;
    return 25;
  }

  private calculateMarketExposure(holdings: EnrichedHolding[]): number {
    const avgBeta = holdings.reduce((sum, h) => sum + (h.beta || 1.0), 0) / holdings.length;
    
    // High beta = high market risk
    if (avgBeta > 1.5) return 80;
    if (avgBeta > 1.2) return 60;
    if (avgBeta > 0.8) return 40;
    return 30;
  }

  private generateRiskRecommendations(
    riskScore: number,
    factors: { volatility: number; concentration: number; sectorRisk: number; marketExposure: number }
  ): string[] {
    const recommendations: string[] = [];

    if (riskScore > 70) {
      recommendations.push("Your portfolio has high risk. Consider diversifying to reduce volatility.");
    }

    if (factors.volatility > 60) {
      recommendations.push("High volatility detected. Add stable, low-volatility stocks for balance.");
    }

    if (factors.concentration > 60) {
      recommendations.push("Portfolio is concentrated in few holdings. Spread investments across more assets.");
    }

    if (factors.sectorRisk > 60) {
      recommendations.push("Heavy sector concentration. Diversify across different industries.");
    }

    if (factors.marketExposure > 70) {
      recommendations.push("High market exposure (beta). Consider defensive stocks or bonds.");
    }

    if (recommendations.length === 0) {
      recommendations.push("Portfolio risk is well-managed. Continue monitoring regularly.");
    }

    return recommendations;
  }

  private calculateTargetSectorAllocation(currentAllocation: Record<string, number>): Record<string, number> {
    const sectors = Object.keys(currentAllocation);
    const numSectors = sectors.length;

    // Ideal allocation: balanced across sectors with slight preference for current holdings
    const idealAllocation: Record<string, number> = {};
    const baseAllocation = 1 / Math.max(numSectors, 5); // Assume at least 5 sectors

    sectors.forEach(sector => {
      // Blend current allocation with ideal allocation
      idealAllocation[sector] = (currentAllocation[sector] * 0.6) + (baseAllocation * 0.4);
    });

    // Normalize to sum to 1
    const total = Object.values(idealAllocation).reduce((sum, val) => sum + val, 0);
    Object.keys(idealAllocation).forEach(sector => {
      idealAllocation[sector] /= total;
    });

    return idealAllocation;
  }
}

export const portfolioAnalysisService = new PortfolioAnalysisService();
