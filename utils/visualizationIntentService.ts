import { ChartType, VisualizationType } from '@/types/visualization';
import { getGeminiClient } from './geminiClient';


export interface VisualizationIntent {
  primaryType: VisualizationType;
  chartSubtype?: ChartType;
  dataFocus: string[];
  stylePreference: string;
  suggestedApproach: string;
  confidenceScore: number;
}

export class VisualizationIntentService {
  /**
   * Classify user prompt to determine visualization intent
   */
  async classifyPrompt(prompt: string): Promise<VisualizationIntent> {
    try {
      const systemPrompt = `You are a financial visualization expert. Analyze the user's request and respond with ONLY a JSON object (no markdown, no explanation).

User request: "${prompt}"

IMPORTANT CLASSIFICATION RULES:
- Use 'infographic' for: poster, summary, overview, report, presentation, visual summary, journey, story, snapshot
- Use 'illustration' for: picture, image, creative, artistic, custom, unique, visual representation
- Use 'dashboard' for: dashboard, overview with metrics, comprehensive view, multi-metric, all-in-one
- Use 'chart' ONLY for: specific chart types (pie, line, bar, etc.) or technical data visualization

Examples:
"Create a poster" → infographic
"Show me a visual summary" → infographic  
"Generate an artistic view" → illustration
"I want a creative visualization" → illustration
"Show allocation pie chart" → chart
"Dashboard overview" → dashboard

Determine:
1. primaryType: 'chart', 'infographic', 'illustration', 'dashboard', or 'report'
2. chartSubtype (if primaryType is 'chart'): 'pie', 'line', 'bar', 'heatmap', 'treemap', 'sankey', 'waterfall', 'radar', 'bubble', 'funnel', 'area', 'donut'
3. dataFocus: array of focus areas like 'allocation', 'performance', 'risk', 'diversification', 'timeline', 'comparison', 'goals'
4. stylePreference: 'professional', 'casual', 'minimalist', 'bold', 'artistic'
5. suggestedApproach: brief description of how to visualize this
6. confidenceScore: 0-1 confidence in classification

Respond with valid JSON only:
{
  "primaryType": "infographic",
  "dataFocus": ["allocation", "performance"],
  "stylePreference": "professional",
  "suggestedApproach": "Create a comprehensive visual summary poster",
  "confidenceScore": 0.95
}`;

      const result = await getGeminiClient().models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: 'user', parts: [{ text: systemPrompt }] }]
      });

      const responseText = result.text || '';

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('No JSON found in response, using fallback');
        return this.createFallbackIntent(prompt);
      }

      const intent = JSON.parse(jsonMatch[0]);
      return intent as VisualizationIntent;
    } catch (error) {
      console.error('Error classifying prompt:', error);
      return this.createFallbackIntent(prompt);
    }
  }

  /**
   * Create fallback intent based on keyword matching
   */
  private createFallbackIntent(prompt: string): VisualizationIntent {
    const lower = prompt.toLowerCase();
    
    // Expanded keywords for better non-chart detection
    const infographicKeywords = [
      'infographic', 'poster', 'summary', 'overview', 'presentation',
      'visual summary', 'snapshot', 'report card', 'journey', 'story',
      'visual report', 'one-pager', 'at a glance', 'quick view'
    ];
    
    const illustrationKeywords = [
      'illustration', 'picture', 'image', 'artistic', 'creative',
      'unique', 'custom', 'visual representation', 'drawing',
      'graphic', 'design', 'art', 'stylized', 'beautiful'
    ];
    
    const dashboardKeywords = [
      'dashboard', 'comprehensive', 'all-in-one', 'complete view',
      'full overview', 'metrics view', 'control panel', 'multi-metric'
    ];
    
    // Determine primary type with priority: illustration > infographic > dashboard > report > chart
    let primaryType: VisualizationType = 'chart';
    
    // Check illustration first (most creative)
    if (illustrationKeywords.some(keyword => lower.includes(keyword))) {
      primaryType = 'illustration';
    }
    // Then infographic (visual summary)
    else if (infographicKeywords.some(keyword => lower.includes(keyword))) {
      primaryType = 'infographic';
    }
    // Then dashboard (comprehensive metrics)
    else if (dashboardKeywords.some(keyword => lower.includes(keyword))) {
      primaryType = 'dashboard';
    }
    // Report (formal)
    else if (lower.includes('report')) {
      primaryType = 'report';
    }
    // Only default to chart if no other indicators
    // But check if specific chart types are mentioned
    else if (this.hasChartTypeKeyword(lower)) {
      primaryType = 'chart';
    }
    // If very generic, default to infographic for better visual appeal
    else if (this.isGenericRequest(lower)) {
      primaryType = 'infographic';
    }

    // Determine chart subtype
    let chartSubtype: ChartType | undefined = 'pie';
    if (lower.includes('line') || lower.includes('time') || lower.includes('trend')) {
      chartSubtype = 'line';
    } else if (lower.includes('bar') || lower.includes('compare')) {
      chartSubtype = 'bar';
    } else if (lower.includes('heatmap') || lower.includes('heat map')) {
      chartSubtype = 'heatmap';
    } else if (lower.includes('treemap') || lower.includes('tree map') || lower.includes('hierarchical')) {
      chartSubtype = 'treemap';
    } else if (lower.includes('sankey') || lower.includes('flow')) {
      chartSubtype = 'sankey';
    } else if (lower.includes('waterfall')) {
      chartSubtype = 'waterfall';
    } else if (lower.includes('radar') || lower.includes('spider')) {
      chartSubtype = 'radar';
    } else if (lower.includes('bubble')) {
      chartSubtype = 'bubble';
    } else if (lower.includes('donut')) {
      chartSubtype = 'donut';
    } else if (lower.includes('area')) {
      chartSubtype = 'area';
    }

    // Determine data focus
    const dataFocus: string[] = [];
    if (lower.includes('allocation') || lower.includes('distribution') || lower.includes('pie')) {
      dataFocus.push('allocation');
    }
    if (lower.includes('performance') || lower.includes('gain') || lower.includes('loss') || lower.includes('return')) {
      dataFocus.push('performance');
    }
    if (lower.includes('risk') || lower.includes('volatility')) {
      dataFocus.push('risk');
    }
    if (lower.includes('diversif') || lower.includes('sector')) {
      dataFocus.push('diversification');
    }
    if (lower.includes('time') || lower.includes('history') || lower.includes('trend')) {
      dataFocus.push('timeline');
    }
    if (lower.includes('compare') || lower.includes('versus') || lower.includes('vs')) {
      dataFocus.push('comparison');
    }
    if (lower.includes('goal') || lower.includes('target') || lower.includes('plan')) {
      dataFocus.push('goals');
    }

    // Default to allocation if no focus detected
    if (dataFocus.length === 0) {
      dataFocus.push('allocation');
    }

    // Determine style preference
    let stylePreference = 'professional';
    if (lower.includes('minimal') || lower.includes('simple') || lower.includes('clean')) {
      stylePreference = 'minimalist';
    } else if (lower.includes('bold') || lower.includes('vibrant') || lower.includes('colorful')) {
      stylePreference = 'bold';
    } else if (lower.includes('casual') || lower.includes('friendly')) {
      stylePreference = 'casual';
    } else if (lower.includes('artistic') || lower.includes('creative')) {
      stylePreference = 'artistic';
    }

    return {
      primaryType,
      chartSubtype: primaryType === 'chart' ? chartSubtype : undefined,
      dataFocus,
      stylePreference,
      suggestedApproach: `Create a ${primaryType} focusing on ${dataFocus.join(', ')} with ${stylePreference} styling`,
      confidenceScore: 0.7
    };
  }

  /**
   * Check if prompt mentions specific chart types
   */
  private hasChartTypeKeyword(lower: string): boolean {
    const chartKeywords = [
      'pie chart', 'line chart', 'bar chart', 'graph', 'plot',
      'heatmap', 'treemap', 'sankey', 'waterfall', 'radar',
      'bubble chart', 'scatter', 'histogram'
    ];
    return chartKeywords.some(keyword => lower.includes(keyword));
  }

  /**
   * Check if request is very generic (should default to infographic)
   */
  private isGenericRequest(lower: string): boolean {
    const genericPatterns = [
      'show me', 'visualize', 'display', 'see my', 'view my',
      'generate', 'create', 'make', 'give me'
    ];
    
    // If it's generic AND doesn't mention specific chart types
    const isGeneric = genericPatterns.some(pattern => lower.includes(pattern));
    const hasNoSpecificType = !this.hasChartTypeKeyword(lower);
    
    return isGeneric && hasNoSpecificType && lower.split(' ').length <= 6;
  }

  /**
   * Get recommended visualization types based on data characteristics
   */
  getRecommendations(
    dataCharacteristics: {
      numHoldings: number;
      hasTimeData: boolean;
      hasGoals: boolean;
      diversificationScore: number;
    }
  ): Array<{ type: VisualizationType; chartSubtype?: ChartType; reason: string }> {
    const recommendations: Array<{ type: VisualizationType; chartSubtype?: ChartType; reason: string }> = [];

    // Always recommend allocation
    recommendations.push({
      type: 'chart',
      chartSubtype: dataCharacteristics.numHoldings > 10 ? 'treemap' : 'pie',
      reason: `Best for showing ${dataCharacteristics.numHoldings} holdings distribution`
    });

    // Recommend time-based if data available
    if (dataCharacteristics.hasTimeData) {
      recommendations.push({
        type: 'chart',
        chartSubtype: 'line',
        reason: 'Track portfolio performance over time'
      });
    }

    // Recommend goals visualization if goals exist
    if (dataCharacteristics.hasGoals) {
      recommendations.push({
        type: 'infographic',
        reason: 'Visual progress toward investment goals'
      });
    }

    // Recommend diversification analysis if concentrated
    if (dataCharacteristics.diversificationScore < 0.5) {
      recommendations.push({
        type: 'chart',
        chartSubtype: 'heatmap',
        reason: 'Analyze portfolio concentration and diversification'
      });
    }

    // Always recommend a comprehensive dashboard
    recommendations.push({
      type: 'dashboard',
      reason: 'Complete portfolio overview with multiple metrics'
    });

    return recommendations;
  }
}

export const visualizationIntentService = new VisualizationIntentService();

