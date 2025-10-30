import { GoogleGenAI } from '@google/genai';
import { ChartType, VisualizationType } from '../types/visualization';
import { ComprehensivePortfolioContext } from './portfolioContextService';
import Constants from 'expo-constants';

const API_KEY = (Constants.expoConfig?.extra as any)?.GEMINI_API_KEY || '';
const genAI = new GoogleGenAI({ apiKey: API_KEY });

export interface VisualizationSuggestion {
  type: VisualizationType;
  chartSubtype?: ChartType;
  title: string;
  description: string;
  reason: string;
  confidenceScore: number;
  preview?: string;
}

export class VisualizationSuggestionService {
  /**
   * Generate AI-powered visualization suggestions based on portfolio context
   */
  async generateSuggestions(context: ComprehensivePortfolioContext): Promise<VisualizationSuggestion[]> {
    try {
      const prompt = this.buildSuggestionPrompt(context);
      
      const result = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      const responseText = result.text || '';
      console.log('Suggestion response:', responseText);

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('No JSON found in suggestion response, using fallback');
        return this.generateFallbackSuggestions(context);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.suggestions || this.generateFallbackSuggestions(context);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return this.generateFallbackSuggestions(context);
    }
  }

  /**
   * Build prompt for AI suggestion generation
   */
  private buildSuggestionPrompt(context: ComprehensivePortfolioContext): string {
    const { holdings, metrics, goals, insights } = context;

    return `You are a financial visualization expert. Analyze this portfolio and suggest 3-5 visualizations.

Portfolio Summary:
- Total Value: $${metrics.totalValue.toFixed(2)}
- Gain/Loss: ${metrics.totalGainLossPercentage.toFixed(1)}%
- Holdings: ${holdings.length} stocks
- Sectors: ${Object.keys(metrics.sectorAllocation).join(', ')}
- Risk Level: ${metrics.riskLevel}
- Diversification Score: ${metrics.diversificationScore.toFixed(2)}
- Top Performer: ${metrics.topPerformers[0]?.ticker || 'N/A'}
- Investment Plans: ${context.investmentPlans.length}

Key Insights:
${insights.slice(0, 3).map(i => `- ${i}`).join('\n')}

Suggest 3-5 visualizations that would be most valuable for this portfolio. Respond with ONLY valid JSON:

{
  "suggestions": [
    {
      "type": "chart",
      "chartSubtype": "pie",
      "title": "Portfolio Allocation",
      "description": "See how your investments are distributed",
      "reason": "Your portfolio has ${holdings.length} holdings across ${Object.keys(metrics.sectorAllocation).length} sectors",
      "confidenceScore": 0.95
    }
  ]
}

Types: chart, infographic, illustration, dashboard
Chart subtypes: pie, line, bar, heatmap, treemap, sankey, waterfall, radar, bubble, donut, area`;
  }

  /**
   * Generate fallback suggestions based on portfolio characteristics
   */
  private generateFallbackSuggestions(context: ComprehensivePortfolioContext): VisualizationSuggestion[] {
    const suggestions: VisualizationSuggestion[] = [];
    const { holdings, metrics, investmentPlans } = context;

    // Always suggest allocation
    suggestions.push({
      type: 'chart',
      chartSubtype: holdings.length > 10 ? 'treemap' : 'pie',
      title: 'Portfolio Allocation',
      description: `See how your ${holdings.length} investments are distributed`,
      reason: holdings.length > 10 
        ? 'Treemap is ideal for visualizing many holdings hierarchically'
        : 'Pie chart clearly shows allocation across your holdings',
      confidenceScore: 0.95
    });

    // Suggest performance comparison
    if (holdings.length > 1) {
      suggestions.push({
        type: 'chart',
        chartSubtype: 'bar',
        title: 'Performance Comparison',
        description: 'Compare gains and losses across your holdings',
        reason: 'Quickly identify your best and worst performers',
        confidenceScore: 0.90
      });
    }

    // Suggest diversification analysis if concentrated
    if (metrics.diversificationScore < 0.5) {
      suggestions.push({
        type: 'chart',
        chartSubtype: 'heatmap',
        title: 'Diversification Analysis',
        description: 'Visualize sector concentration and risk',
        reason: `Your diversification score is ${(metrics.diversificationScore * 100).toFixed(0)}% - see where to improve`,
        confidenceScore: 0.85
      });
    }

    // Suggest goal progress if plans exist
    if (investmentPlans.length > 0) {
      suggestions.push({
        type: 'infographic',
        title: 'Investment Goals Progress',
        description: 'Track progress toward your financial goals',
        reason: `You have ${investmentPlans.length} active investment plan${investmentPlans.length > 1 ? 's' : ''}`,
        confidenceScore: 0.88
      });
    }

    // Suggest risk assessment if high risk
    if (metrics.riskLevel === 'aggressive') {
      suggestions.push({
        type: 'chart',
        chartSubtype: 'radar',
        title: 'Risk Profile',
        description: 'Understand your portfolio risk across multiple dimensions',
        reason: 'Your portfolio has aggressive risk characteristics',
        confidenceScore: 0.82
      });
    }

    // Suggest dashboard for comprehensive view
    suggestions.push({
      type: 'dashboard',
      title: 'Portfolio Dashboard',
      description: 'Complete overview with key metrics and insights',
      reason: 'Get a comprehensive view of your entire portfolio at a glance',
      confidenceScore: 0.80
    });

    return suggestions.slice(0, 5);
  }

  /**
   * Get quick visualization options (no AI call)
   */
  getQuickSuggestions(numHoldings: number, hasPlans: boolean): VisualizationSuggestion[] {
    return [
      {
        type: 'chart',
        chartSubtype: 'pie',
        title: 'Portfolio Allocation',
        description: 'See your investment distribution',
        reason: 'Most popular visualization for portfolio overview',
        confidenceScore: 0.95
      },
      {
        type: 'chart',
        chartSubtype: 'bar',
        title: 'Performance Comparison',
        description: 'Compare your holdings',
        reason: 'Identify top and bottom performers',
        confidenceScore: 0.90
      },
      {
        type: 'chart',
        chartSubtype: 'line',
        title: 'Value Over Time',
        description: 'Track portfolio growth',
        reason: 'See your investment journey',
        confidenceScore: 0.85
      }
    ];
  }
}

export const visualizationSuggestionService = new VisualizationSuggestionService();
