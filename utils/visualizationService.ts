import { ChartData, ChartType, DEFAULT_STYLE, VisualizationConfig } from '@/types/visualization';
import { GoogleGenAI } from '@google/genai';
import { Holding } from '../contexts/HoldingsContext';
import { ImageGenerationRequest, imageGenerationService } from './imageGenerationService';
import { ComprehensivePortfolioContext } from './portfolioContextService';
import { visualizationIntentService } from './visualizationIntentService';

const API_KEY = 'AIzaSyCnxv_KQwefJ5ZmtjiuSR3pUboHzvIN_78';
const genAI = new GoogleGenAI({ apiKey: API_KEY });

export class VisualizationService {
  /**
   * Generate visualization using comprehensive portfolio context and AI intent classification
   */
  async generateVisualizationWithContext(
    prompt: string,
    portfolioContext: ComprehensivePortfolioContext
  ): Promise<VisualizationConfig> {
    try {
      // Classify the user's intent
      const intent = await visualizationIntentService.classifyPrompt(prompt);

      // Generate appropriate visualization based on intent
      if (intent.primaryType === 'chart' && intent.chartSubtype) {
        return this.generateChartVisualization(intent.chartSubtype, portfolioContext, prompt);
      } else if (intent.primaryType === 'infographic') {
        // For now, use a chart as placeholder - infographic templates will be added later
        return this.generateChartVisualization('pie', portfolioContext, prompt);
      } else {
        // Default to allocation chart
        return this.generateChartVisualization('pie', portfolioContext, prompt);
      }
    } catch (error) {
      console.error('Error generating visualization with context:', error);
      // Fallback to simple holdings-based generation
      return this.parseVisualizationRequest(prompt, portfolioContext.holdings);
    }
  }

  /**
   * Generate chart visualization based on type and context
   */
  private generateChartVisualization(
    chartType: ChartType,
    context: ComprehensivePortfolioContext,
    prompt: string
  ): VisualizationConfig {
    const { holdings, metrics, insights } = context;

    switch (chartType) {
      case 'pie':
      case 'donut':
        return this.generatePortfolioAllocation(context);
      case 'bar':
        return this.generatePerformanceComparison(holdings);
      case 'line':
      case 'area':
        return this.generateValueOverTime(holdings);
      case 'heatmap':
        return this.generateDiversificationHeatmap(context);
      case 'treemap':
        return this.generateTreemapAllocation(context);
      default:
        return this.generatePortfolioAllocation(context);
    }
  }

  /**
   * Generate portfolio allocation visualization with context
   */
  private generatePortfolioAllocation(context: ComprehensivePortfolioContext): VisualizationConfig {
    const { holdings, metrics } = context;
    
    const labels = holdings.map(h => h.ticker);
    const values = holdings.map(h => h.totalValue);

    return {
      type: 'pie',
      title: 'Portfolio Allocation',
      description: `Distribution of your ${holdings.length} holdings worth $${metrics.totalValue.toFixed(2)}`,
      data: {
        labels,
        datasets: [{
          label: 'Portfolio Value',
          data: values,
          backgroundColor: DEFAULT_STYLE.colorPalette,
          borderColor: DEFAULT_STYLE.colorPalette.map(c => c),
          borderWidth: 2
        }]
      },
      style: DEFAULT_STYLE,
      insights: [
        `Portfolio contains ${holdings.length} holdings worth $${metrics.totalValue.toFixed(2)}`,
        `Performance: ${metrics.totalGainLossPercentage >= 0 ? '+' : ''}${metrics.totalGainLossPercentage.toFixed(1)}%`,
        `Risk Level: ${metrics.riskLevel}`,
        `Diversification Score: ${(metrics.diversificationScore * 100).toFixed(0)}%`,
        `Top Performer: ${metrics.topPerformers[0]?.ticker || 'N/A'}`
      ]
    };
  }

  /**
   * Generate diversification heatmap (placeholder)
   */
  private generateDiversificationHeatmap(context: ComprehensivePortfolioContext): VisualizationConfig {
    const { holdings, metrics } = context;
    
    // For now, show as bar chart of sector allocation
    const sectors = Object.keys(metrics.sectorAllocation);
    const values = Object.values(metrics.sectorAllocation);

    return {
      type: 'bar',
      title: 'Sector Diversification',
      description: 'Distribution across sectors',
      data: {
        labels: sectors,
        datasets: [{
          label: 'Sector Value',
          data: values,
          backgroundColor: DEFAULT_STYLE.colorPalette,
          borderColor: DEFAULT_STYLE.colorPalette.map(c => c),
          borderWidth: 2
        }]
      },
      style: DEFAULT_STYLE,
      insights: [
        `Portfolio spread across ${sectors.length} sectors`,
        `Diversification Score: ${(metrics.diversificationScore * 100).toFixed(0)}%`,
        ...context.insights.slice(0, 2)
      ]
    };
  }

  /**
   * Generate treemap allocation (placeholder - shown as pie)
   */
  private generateTreemapAllocation(context: ComprehensivePortfolioContext): VisualizationConfig {
    // For now, use pie chart
    return this.generatePortfolioAllocation(context);
  }

  /**
   * Generate image-based visualization using DALL-E
   * This replaces the JSON-based chart generation with pure image generation
   */
  async parseVisualizationRequest(
    prompt: string,
    holdings: Holding[]
  ): Promise<VisualizationConfig> {
    try {
      // Create a simple fallback visualization that will be replaced by the image
      const fallbackConfig = this.createFallbackVisualization(prompt, holdings);
      
      // The actual image generation will be handled by the image generation service
      // This method now just provides a basic chart structure as fallback
      return fallbackConfig;
    } catch (error) {
      console.error('Error in visualization request:', error);
      return this.createFallbackVisualization(prompt, holdings);
    }
  }


  /**
   * Generate portfolio allocation data
   */
  private generatePortfolioAllocationData(holdings: Holding[]): ChartData {
    const labels = holdings.map(h => h.ticker);
    const values = holdings.map(h => {
      const quantity = h.purchaseLots?.reduce((sum, lot) => sum + lot.quantity, 0) || h.quantity || 0;
      return quantity * h.currentPrice;
    });

    return {
      labels,
      datasets: [{
        label: 'Portfolio Value',
        data: values,
        backgroundColor: DEFAULT_STYLE.colorPalette,
        borderColor: DEFAULT_STYLE.colorPalette.map(c => c),
        borderWidth: 2
      }]
    };
  }


  /**
   * Create a fallback visualization based on prompt keywords
   */
  private createFallbackVisualization(prompt: string, holdings: Holding[]): VisualizationConfig {
    const lower = prompt.toLowerCase();
    
    // Determine chart type based on keywords
    let chartType: ChartType = 'pie';
    if (lower.includes('line') || lower.includes('time') || lower.includes('trend') || lower.includes('performance')) {
      chartType = 'line';
    } else if (lower.includes('bar') || lower.includes('compare') || lower.includes('comparison')) {
      chartType = 'bar';
    } else if (lower.includes('donut') || lower.includes('ring')) {
      chartType = 'donut';
    } else if (lower.includes('area')) {
      chartType = 'area';
    }
    
    // Generate basic data
    const labels = holdings.map(h => h.ticker);
    const values = holdings.map(h => {
      const quantity = h.purchaseLots?.reduce((sum, lot) => sum + lot.quantity, 0) || 0;
      return quantity * h.currentPrice;
    });
    
    // Calculate total value for insights
    const totalValue = values.reduce((sum, val) => sum + val, 0);
    const topHolding = values.indexOf(Math.max(...values));
    
    return {
      type: chartType,
      title: `Portfolio ${chartType === 'pie' ? 'Allocation' : chartType === 'line' ? 'Performance' : 'Comparison'}`,
      description: `Generated based on your request: ${prompt}`,
      data: {
        labels,
        datasets: [{
          label: 'Portfolio Value',
          data: values,
          backgroundColor: DEFAULT_STYLE.colorPalette,
          borderColor: DEFAULT_STYLE.colorPalette.map(c => c),
          borderWidth: 2
        }]
      },
      style: DEFAULT_STYLE,
      insights: [
        `Generated ${chartType} chart based on your request`,
        `Portfolio contains ${holdings.length} holdings worth $${totalValue.toFixed(2)}`,
        `Top holding: ${labels[topHolding]} (${((values[topHolding] / totalValue) * 100).toFixed(1)}%)`,
        'This is a fallback visualization due to AI parsing issues'
      ]
    };
  }

  /**
   * Create default portfolio allocation visualization
   */
  private createDefaultVisualization(holdings: Holding[]): VisualizationConfig {
    return {
      type: 'pie',
      title: 'Portfolio Allocation',
      description: 'Distribution of your portfolio by stock value',
      data: this.generatePortfolioAllocationData(holdings),
      style: DEFAULT_STYLE,
      insights: [
        `You have ${holdings.length} different holdings in your portfolio`,
        'Diversification helps reduce risk',
        'Consider rebalancing if any single holding exceeds 30% of your portfolio'
      ]
    };
  }

  /**
   * Create a performance visualization using time-based data
   */
  createPerformanceVisualization(holdings: Holding[]): VisualizationConfig {
    // Generate time-based data for performance chart
    const allPurchases = holdings.flatMap(holding => 
      (holding.purchaseLots || []).map(lot => ({
        date: new Date(lot.purchaseDate),
        value: lot.quantity * lot.purchasePrice,
        ticker: holding.ticker,
        companyName: holding.companyName
      }))
    ).sort((a, b) => a.date.getTime() - b.date.getTime());

    // Group by date and calculate cumulative values
    const dateMap = new Map<string, number>();
    allPurchases.forEach(purchase => {
      const dateStr = purchase.date.toISOString().split('T')[0];
      const currentValue = dateMap.get(dateStr) || 0;
      dateMap.set(dateStr, currentValue + purchase.value);
    });

    let cumulativeValue = 0;
    const performanceData = Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dailyValue]) => {
        cumulativeValue += dailyValue;
        return {
          x: date,
          y: cumulativeValue
        };
      });

    if (performanceData.length === 0) {
      return this.createDefaultVisualization(holdings);
    }

    const labels = performanceData.map(d => d.x);
    const values = performanceData.map(d => d.y);

    return {
      type: 'line',
      title: 'Portfolio Performance Over Time',
      description: 'Cumulative portfolio value based on purchase history',
      data: {
        labels,
        datasets: [{
          label: 'Portfolio Value',
          data: values,
          backgroundColor: DEFAULT_STYLE.colorPalette[0],
          borderColor: DEFAULT_STYLE.colorPalette[0],
          borderWidth: 3
        }]
      },
      style: DEFAULT_STYLE,
      insights: [
        `Current portfolio value: $${values[values.length - 1].toFixed(2)}`,
        `Started tracking: ${labels[0]}`,
        `Total purchases: ${allPurchases.length}`
      ]
    };
  }

  /**
   * Generate custom visualization with AI-generated image using DALL-E
   */
  async generateCustomVisualization(
    prompt: string,
    holdings: Holding[],
    includeImage: boolean = true
  ): Promise<VisualizationConfig & { generatedImage?: any }> {
    try {
      // Create a basic fallback chart config
      const fallbackConfig = this.createFallbackVisualization(prompt, holdings);
      
      if (!includeImage) {
        return fallbackConfig;
      }

      // Generate portfolio context for image generation
      const totalValue = holdings.reduce((sum, holding) => {
        const quantity = holding.purchaseLots?.reduce((sum, lot) => sum + lot.quantity, 0) || 0;
        return sum + (quantity * holding.currentPrice);
      }, 0);

      const totalGainLoss = holdings.reduce((sum, holding) => {
        const quantity = holding.purchaseLots?.reduce((sum, lot) => sum + lot.quantity, 0) || 0;
        const currentValue = quantity * holding.currentPrice;
        const costBasis = holding.purchaseLots?.reduce((sum, lot) => 
          sum + (lot.quantity * lot.purchasePrice), 0) || 0;
        return sum + (currentValue - costBasis);
      }, 0);

      const totalGainLossPercentage = totalValue > 0 ? (totalGainLoss / totalValue) * 100 : 0;

      // Create image generation request
      const imageRequest: ImageGenerationRequest = {
        prompt,
        portfolioContext: {
          holdings,
          totalValue,
          totalGainLoss,
          totalGainLossPercentage
        },
        visualizationType: this.determineVisualizationType(prompt)
      };

      // Generate the image using DALL-E
      const customVisualization = await imageGenerationService.generateCustomVisualization(imageRequest);

      return {
        ...fallbackConfig,
        generatedImage: customVisualization.generatedImage,
        imagePrompt: customVisualization.imagePrompt
      };
    } catch (error) {
      console.error('Error generating DALL-E visualization:', error);
      // Fallback to basic chart
      return this.createFallbackVisualization(prompt, holdings);
    }
  }

  /**
   * Determine visualization type from prompt
   */
  private determineVisualizationType(prompt: string): 'chart' | 'infographic' | 'dashboard' | 'summary' {
    const lower = prompt.toLowerCase();
    
    if (lower.includes('infographic') || lower.includes('poster') || lower.includes('banner')) {
      return 'infographic';
    }
    if (lower.includes('dashboard') || lower.includes('overview') || lower.includes('summary')) {
      return 'dashboard';
    }
    if (lower.includes('summary') || lower.includes('report')) {
      return 'summary';
    }
    
    return 'chart';
  }

  /**
   * Generate performance comparison visualization
   */
  generatePerformanceComparison(holdings: Holding[]): VisualizationConfig {
    const labels = holdings.map(h => h.ticker);
    const gainLossData = holdings.map(h => {
      const quantity = h.purchaseLots?.reduce((sum, lot) => sum + lot.quantity, 0) || h.quantity || 0;
      const avgPurchasePrice = h.purchaseLots 
        ? h.purchaseLots.reduce((sum, lot) => sum + (lot.quantity * lot.purchasePrice), 0) / h.purchaseLots.reduce((sum, lot) => sum + lot.quantity, 0)
        : h.purchasePrice || 0;
      const currentValue = quantity * h.currentPrice;
      const costBasis = quantity * avgPurchasePrice;
      return ((currentValue - costBasis) / costBasis) * 100;
    });

    return {
      type: 'bar',
      title: 'Performance Comparison',
      description: 'Gain/Loss percentage for each holding',
      data: {
        labels,
        datasets: [{
          label: 'Gain/Loss %',
          data: gainLossData,
          backgroundColor: gainLossData.map(val => val >= 0 ? '#22c55e' : '#ff6b6b'),
          borderColor: gainLossData.map(val => val >= 0 ? '#16a34a' : '#dc2626'),
          borderWidth: 2
        }]
      },
      style: DEFAULT_STYLE,
      insights: [
        `Best performer: ${labels[gainLossData.indexOf(Math.max(...gainLossData))]} (+${Math.max(...gainLossData).toFixed(2)}%)`,
        `Worst performer: ${labels[gainLossData.indexOf(Math.min(...gainLossData))]} (${Math.min(...gainLossData).toFixed(2)}%)`,
        'Past performance does not guarantee future results'
      ]
    };
  }

  /**
   * Generate portfolio value over time (requires historical data)
   */
  generateValueOverTime(holdings: Holding[]): VisualizationConfig {
    // For now, create sample data based on purchase dates
    const dates: string[] = [];
    const values: number[] = [];

    // Get all purchase dates
    holdings.forEach(h => {
      if (h.purchaseLots) {
        h.purchaseLots.forEach(lot => {
          const date = new Date(lot.purchaseDate).toLocaleDateString();
          if (!dates.includes(date)) {
            dates.push(date);
          }
        });
      }
    });

    // Sort dates
    dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    // Calculate cumulative value at each date
    dates.forEach(date => {
      let totalValue = 0;
      holdings.forEach(h => {
        if (h.purchaseLots) {
          h.purchaseLots.forEach(lot => {
            if (new Date(lot.purchaseDate).toLocaleDateString() <= date) {
              totalValue += lot.quantity * h.currentPrice;
            }
          });
        }
      });
      values.push(totalValue);
    });

    return {
      type: 'line',
      title: 'Portfolio Value Over Time',
      description: 'How your portfolio value has grown',
      data: {
        labels: dates,
        datasets: [{
          label: 'Portfolio Value',
          data: values,
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderColor: '#22c55e',
          borderWidth: 3
        }]
      },
      style: DEFAULT_STYLE,
      insights: [
        `Current portfolio value: $${values[values.length - 1].toFixed(2)}`,
        `Started tracking: ${dates[0]}`,
        'Consistent investing leads to long-term growth'
      ]
    };
  }
}

export const visualizationService = new VisualizationService();

