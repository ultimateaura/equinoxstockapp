import { GoogleGenAI } from '@google/genai';
import { Holding } from '../contexts/HoldingsContext';

const API_KEY = 'AIzaSyCnxv_KQwefJ5ZmtjiuSR3pUboHzvIN_78';
const genAI = new GoogleGenAI({ apiKey: API_KEY });

export interface ImageGenerationRequest {
  prompt: string;
  portfolioContext: {
    holdings: Holding[];
    totalValue: number;
    totalGainLoss: number;
    totalGainLossPercentage: number;
  };
  visualizationType: 'chart' | 'infographic' | 'dashboard' | 'summary';
}

export interface GeneratedImage {
  url: string;
  prompt: string;
  description: string;
  metadata: {
    width: number;
    height: number;
    format: string;
    generatedAt: string;
    model?: string;
    revisedPrompt?: string;
    isPlaceholder?: boolean;
    billingLimitReached?: boolean;
    safetyRatings?: any[];
  };
}

export class ImageGenerationService {
  private geminiAvailable: boolean | null = null;
  private lastAvailabilityCheck: number = 0;
  private readonly AVAILABILITY_CHECK_INTERVAL = 60000; // 1 minute

  /**
   * Safely encode SVG to base64, handling Unicode characters
   */
  private encodeSVGToBase64(svgString: string): string {
    try {
      // Remove any invalid characters and normalize whitespace
      const cleanSvg = svgString
        .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Remove control characters
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      // For React Native, use URL encoding instead of base64 to avoid Unicode issues
      return encodeURIComponent(cleanSvg);
    } catch (error) {
      console.error('Error encoding SVG:', error);
      // Ultimate fallback: return a simple valid SVG
      const fallbackSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#1a1a1a"/><text x="200" y="200" text-anchor="middle" fill="#17bf2d" font-size="20">Visualization</text></svg>';
      return encodeURIComponent(fallbackSvg);
    }
  }

  /**
   * Create data URI from SVG string
   */
  private createSVGDataUri(svgString: string): string {
    try {
      // Use URL encoding for React Native (avoids btoa Unicode issues)
      const encoded = this.encodeSVGToBase64(svgString);
      return `data:image/svg+xml;charset=utf-8,${encoded}`;
    } catch (error) {
      console.error('Error creating SVG data URI:', error);
      // Return a simple fallback
      return 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22400%22%20height%3D%22400%22%3E%3Crect%20width%3D%22400%22%20height%3D%22400%22%20fill%3D%22%231a1a1a%22%2F%3E%3C%2Fsvg%3E';
    }
  }

  /**
   * Check if Gemini image generation is available
   * Caches result for 1 minute to avoid excessive API calls
   */
  async checkGeminiAvailability(): Promise<boolean> {
    const now = Date.now();
    
    // Return cached result if recent
    if (this.geminiAvailable !== null && (now - this.lastAvailabilityCheck) < this.AVAILABILITY_CHECK_INTERVAL) {
      return this.geminiAvailable;
    }

    try {
      // Try different model names in order of preference
      const modelNames = [
        "gemini-2.5-flash",  // Latest stable
        "gemini-2.5-flash-image-preview",  // Preview with image
        "gemini-2.0-flash-exp",  // Fallback experimental
      ];
      
      for (const modelName of modelNames) {
        try {
          const testResponse = await genAI.models.generateContent({
            model: modelName,
            contents: "test"
          });
          
          this.geminiAvailable = true;
          this.lastAvailabilityCheck = now;
          return true;
        } catch (modelError) {
          continue;
        }
      }
      
      // All models failed
      throw new Error('All Gemini models unavailable');
    } catch (error) {
      this.geminiAvailable = false;
      this.lastAvailabilityCheck = now;
      return false;
    }
  }

  /**
   * Generate image with two-tier strategy
   * Tier 1: Rich SVG visualization (primary - fast and reliable)
   * Tier 2: Template-based (fallback)
   * 
   * Note: Gemini does not support native image generation via API.
   * For AI-generated images, Imagen 3 API would be required (paid service).
   */
  async generateImageWithFallback(prompt: string, portfolioData?: any, intent?: any): Promise<GeneratedImage> {
    
    // Tier 1: Generate rich SVG visualization (primary method)
    try {
      const svgImage = await this.generateRichSVGVisualization(prompt, portfolioData, undefined, intent);
      return svgImage;
    } catch (error) {
      // SVG generation failed, falling back to template
    }

    // Tier 2: Template-based fallback
    return this.generateTemplateBased(prompt);
  }

  /**
   * Tier 1: Generate with Gemini (with retry logic)
   */
  private async generateWithGemini(prompt: string, retries: number = 2): Promise<GeneratedImage> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }

        const response = await genAI.models.generateContent({
          model: "gemini-2.5-flash-image-preview",
          contents: prompt,
        });

        if (!response.candidates || !response.candidates[0] || !response.candidates[0].content) {
          throw new Error('No content generated by Gemini');
        }

        const content = response.candidates[0].content;
        
        if (!content.parts) {
          throw new Error('No parts found in Gemini response');
        }
        
        // Look for image data
        for (const part of content.parts) {
          if (part.inlineData) {
            const imageData = part.inlineData.data;
            const mimeType = part.inlineData.mimeType || 'image/png';
            const imageUrl = `data:${mimeType};base64,${imageData}`;

            return {
              url: imageUrl,
              prompt,
              description: `AI-generated visualization: ${prompt.substring(0, 100)}`,
              metadata: {
                width: 1024,
                height: 1024,
                format: mimeType.split('/')[1] || 'png',
                generatedAt: new Date().toISOString(),
                model: 'gemini-2.5-flash-preview',
                safetyRatings: (response.candidates[0] as any).safetyRatings || []
              }
            };
          }
        }

        throw new Error('No image data found in Gemini response');
      } catch (error) {
        if (attempt === retries) {
          throw error; // Final attempt failed
        }
      }
    }

    throw new Error('All retry attempts failed');
  }

  /**
   * Tier 2: Generate rich SVG visualization with portfolio data
   */
  private async generateRichSVGVisualization(
    prompt: string, 
    portfolioData?: any, 
    chartType?: string,
    intent?: any
  ): Promise<GeneratedImage> {
    let svgContent: string;

    // Normalize portfolio data structure
    const normalizedData = this.normalizePortfolioData(portfolioData);
    
    // Determine type from intent first, then chartType param, then infer from prompt
    let typeToUse: string;
    
    if (intent) {
      // If we have intent information, use it intelligently
      if (intent.primaryType === 'illustration') {
        // Illustrations need CUSTOM creative visualization
        svgContent = await this.createCustomIllustration(prompt, normalizedData, intent);
        
        const svgDataUri = this.createSVGDataUri(svgContent);
        return {
          url: svgDataUri,
          prompt,
          description: `Custom illustration: ${prompt.substring(0, 100)}`,
          metadata: {
            width: 1024,
            height: 1024,
            format: 'svg',
            generatedAt: new Date().toISOString(),
            model: 'custom-illustration-svg',
            isPlaceholder: false
          }
        };
      } else if (intent.primaryType === 'infographic' || intent.primaryType === 'report') {
        // Infographics and reports get dashboard-style visualization
        typeToUse = 'dashboard';
      } else if (intent.primaryType === 'dashboard') {
        typeToUse = 'dashboard';
      } else if (intent.chartSubtype) {
        // If chart type is specified in intent, use it
        typeToUse = intent.chartSubtype;
      } else {
        // Fallback to inferring from prompt
        typeToUse = chartType || this.inferChartTypeFromPrompt(prompt);
      }
    } else {
      // No intent info, use traditional logic
      typeToUse = chartType || this.inferChartTypeFromPrompt(prompt);
    }

    switch (typeToUse) {
      case 'pie':
      case 'donut':
        svgContent = this.createDataDrivenPieChart(normalizedData);
        break;
      case 'line':
      case 'area':
        svgContent = this.createDataDrivenLineChart(normalizedData);
        break;
      case 'bar':
        svgContent = this.createDataDrivenBarChart(normalizedData);
        break;
      case 'treemap':
      case 'heatmap':
      case 'radar':
      case 'bubble':
        // For advanced charts, create a dashboard with multiple views
        svgContent = this.createDataDrivenDashboard(normalizedData);
        break;
      default:
        svgContent = this.createDataDrivenPieChart(normalizedData);
    }

    const svgDataUri = this.createSVGDataUri(svgContent);

    return {
      url: svgDataUri,
      prompt,
      description: `Data-driven SVG visualization: ${prompt.substring(0, 100)}`,
      metadata: {
        width: 1024,
        height: 1024,
        format: 'svg',
        generatedAt: new Date().toISOString(),
        model: 'rich-svg-tier-2',
        isPlaceholder: false
      }
    };
  }

  /**
   * Normalize portfolio data from ComprehensivePortfolioContext to flat structure
   */
  private normalizePortfolioData(portfolioData?: any): any {
    if (!portfolioData) {
      console.warn('⚠️ No portfolio data provided to normalize');
      return null;
    }

    // Check if it's already normalized (has flat structure)
    if (portfolioData.totalValue !== undefined && portfolioData.holdings) {
      return portfolioData;
    }

    // Check if it's ComprehensivePortfolioContext structure (has metrics)
    if (portfolioData.metrics && portfolioData.holdings) {
      const normalized = {
        holdings: portfolioData.holdings,
        totalValue: portfolioData.metrics.totalValue || 0,
        totalGainLoss: portfolioData.metrics.totalGainLoss || 0,
        totalGainLossPercentage: portfolioData.metrics.totalGainLossPercentage || 0,
        metrics: portfolioData.metrics,
        investmentPlans: portfolioData.investmentPlans || [],
        insights: portfolioData.insights || []
      };
      
      return normalized;
    }

    // Unknown structure, log warning and return as is
    console.warn('⚠️ Unknown portfolio data structure, returning as-is');
    return portfolioData;
  }

  /**
   * Infer chart type from prompt keywords
   */
  private inferChartTypeFromPrompt(prompt: string): string {
    const lower = prompt.toLowerCase();
    
    if (lower.includes('pie') || lower.includes('allocation') || lower.includes('distribution')) {
      return 'pie';
    } else if (lower.includes('line') || lower.includes('performance') || lower.includes('time') || lower.includes('trend')) {
      return 'line';
    } else if (lower.includes('bar') || lower.includes('comparison') || lower.includes('compare')) {
      return 'bar';
    } else if (lower.includes('treemap') || lower.includes('hierarchical')) {
      return 'treemap';
    } else if (lower.includes('heatmap') || lower.includes('correlation')) {
      return 'heatmap';
    } else if (lower.includes('radar') || lower.includes('risk profile')) {
      return 'radar';
    } else if (lower.includes('bubble')) {
      return 'bubble';
    } else {
      return 'pie'; // Default to pie chart
    }
  }

  /**
   * Tier 3: Template-based visualization
   */
  private generateTemplateBased(prompt: string): GeneratedImage {
    const svgContent = this.createDefaultChartSVG();
    const svgDataUri = this.createSVGDataUri(svgContent);

    return {
      url: svgDataUri,
      prompt,
      description: `Template visualization: ${prompt.substring(0, 100)}`,
      metadata: {
        width: 1024,
        height: 1024,
        format: 'svg',
        generatedAt: new Date().toISOString(),
        model: 'template-tier-3',
        isPlaceholder: true
      }
    };
  }

  /**
   * Create data-driven pie chart SVG
   */
  private createDataDrivenPieChart(portfolioData?: any): string {
    // Use actual portfolio data if available
    if (!portfolioData || !portfolioData.holdings || portfolioData.holdings.length === 0) {
      return this.createPieChartSVG(); // Fall back to template
    }

    const holdings = portfolioData.holdings.slice(0, 5); // Top 5 holdings
    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0'];
    
    let svg = `
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1a1a1a;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#2d2d2d;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="1024" height="1024" fill="url(#bg)"/>
        
        <text x="512" y="80" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="32" font-weight="bold">Portfolio Allocation</text>
        <text x="512" y="120" text-anchor="middle" fill="#b8b8d2" font-family="Arial" font-size="18">Total Value: $${portfolioData.totalValue?.toFixed(2) || '0.00'}</text>
        <text x="512" y="150" text-anchor="middle" fill="${(portfolioData.totalGainLossPercentage || 0) >= 0 ? '#4CAF50' : '#ff6b6b'}" font-family="Arial" font-size="16" font-weight="bold">
          ${(portfolioData.totalGainLossPercentage || 0) >= 0 ? '+' : ''}${(portfolioData.totalGainLossPercentage || 0).toFixed(2)}% Overall Return
        </text>
        
        <g transform="translate(512, 400)">`;

    // Calculate angles for pie slices
    const total = holdings.reduce((sum: number, h: any) => sum + (h.totalValue || 0), 0);
    let currentAngle = 0;

    holdings.forEach((holding: any, index: number) => {
      const value = holding.totalValue || 0;
      const percentage = total > 0 ? (value / total) * 100 : 0;
      const angle = (percentage / 100) * 360;
      const endAngle = currentAngle + angle;
      
      // Calculate path for pie slice
      const startX = 200 * Math.cos((currentAngle - 90) * Math.PI / 180);
      const startY = 200 * Math.sin((currentAngle - 90) * Math.PI / 180);
      const endX = 200 * Math.cos((endAngle - 90) * Math.PI / 180);
      const endY = 200 * Math.sin((endAngle - 90) * Math.PI / 180);
      const largeArc = angle > 180 ? 1 : 0;

      svg += `
          <path d="M 0,0 L ${startX},${startY} A 200,200 0 ${largeArc},1 ${endX},${endY} Z" 
                fill="${colors[index % colors.length]}" stroke="#ffffff" stroke-width="2"/>`;

      // Add label
      const labelAngle = currentAngle + angle / 2;
      const labelX = 130 * Math.cos((labelAngle - 90) * Math.PI / 180);
      const labelY = 130 * Math.sin((labelAngle - 90) * Math.PI / 180);
      svg += `
          <text x="${labelX}" y="${labelY}" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="14" font-weight="bold">
            ${holding.ticker} ${percentage.toFixed(0)}%
          </text>`;

      currentAngle = endAngle;
    });

    svg += `
        </g>
        
        <g transform="translate(50, 700)">`;

    // Add legend
    holdings.forEach((holding: any, index: number) => {
      svg += `
          <rect x="0" y="${index * 30}" width="20" height="20" fill="${colors[index % colors.length]}"/>
          <text x="30" y="${index * 30 + 15}" fill="#ffffff" font-family="Arial" font-size="14">
            ${holding.companyName || holding.ticker} - $${holding.totalValue?.toFixed(2) || '0.00'}
          </text>`;
    });

    svg += `
        </g>
        
        <text x="512" y="1000" text-anchor="middle" fill="#666666" font-family="Arial" font-size="12">
          Generated by AI • ${new Date().toLocaleDateString()}
        </text>
      </svg>`;

    return svg;
  }

  /**
   * Create data-driven line chart SVG
   */
  private createDataDrivenLineChart(portfolioData?: any): string {
    if (!portfolioData || !portfolioData.holdings || portfolioData.holdings.length === 0) {
      return this.createLineChartSVG();
    }

    const holdings = portfolioData.holdings.slice(0, 5);
    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0'];
    
    // Create synthetic performance data for demonstration
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    
    let svg = `
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1a1a1a;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#2d2d2d;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="1024" height="1024" fill="url(#bg)"/>
        
        <text x="512" y="60" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="32" font-weight="bold">Portfolio Performance</text>
        <text x="512" y="100" text-anchor="middle" fill="#b8b8d2" font-family="Arial" font-size="16">6-Month Trend</text>
        
        <!-- Chart area -->
        <rect x="100" y="150" width="824" height="600" fill="none" stroke="#444444" stroke-width="2"/>
        
        <!-- Y-axis labels -->
        <text x="90" y="160" text-anchor="end" fill="#b8b8d2" font-family="Arial" font-size="12">High</text>
        <text x="90" y="450" text-anchor="end" fill="#b8b8d2" font-family="Arial" font-size="12">Mid</text>
        <text x="90" y="740" text-anchor="end" fill="#b8b8d2" font-family="Arial" font-size="12">Low</text>
        
        <!-- X-axis labels -->`;
    
    months.forEach((month, i) => {
      const x = 150 + (i * 140);
      svg += `<text x="${x}" y="770" text-anchor="middle" fill="#b8b8d2" font-family="Arial" font-size="14">${month}</text>`;
    });
    
    // Draw lines for each holding
    holdings.forEach((holding: any, holdingIndex: number) => {
      const gainLoss = holding.totalGainLossPercentage || 0;
      const baseY = 450;
      const points: string[] = [];
      
      // Generate synthetic trend line
      for (let i = 0; i < 6; i++) {
        const x = 150 + (i * 140);
        const variation = (Math.random() - 0.5) * 100;
        const y = baseY - (gainLoss * 2) - variation;
        points.push(`${x},${Math.max(150, Math.min(750, y))}`);
      }
      
      svg += `
        <polyline points="${points.join(' ')}" fill="none" stroke="${colors[holdingIndex]}" stroke-width="3"/>`;
      
      // Add dots at each point
      points.forEach(point => {
        const [x, y] = point.split(',');
        svg += `<circle cx="${x}" cy="${y}" r="5" fill="${colors[holdingIndex]}"/>`;
      });
    });
    
    // Legend
    svg += `<g transform="translate(100, 800)">`;
    holdings.forEach((holding: any, index: number) => {
      const x = index * 180;
      svg += `
        <rect x="${x}" y="0" width="15" height="15" fill="${colors[index]}"/>
        <text x="${x + 20}" y="12" fill="#ffffff" font-family="Arial" font-size="14">${holding.ticker}</text>`;
    });
    svg += `</g>`;
    
    svg += `
        <text x="512" y="1000" text-anchor="middle" fill="#666666" font-family="Arial" font-size="12">
          Generated by AI • Based on Portfolio Data
        </text>
      </svg>`;
    
    return svg;
  }

  /**
   * Create data-driven bar chart SVG
   */
  private createDataDrivenBarChart(portfolioData?: any): string {
    // Use actual portfolio data if available
    if (!portfolioData || !portfolioData.holdings || portfolioData.holdings.length === 0) {
      return this.createBarChartSVG();
    }

    const holdings = portfolioData.holdings.slice(0, 6);
    const maxGainLoss = Math.max(...holdings.map((h: any) => Math.abs(h.totalGainLossPercentage || 0)));

    let svg = `
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1a1a1a;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#2d2d2d;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="1024" height="1024" fill="url(#bg)"/>
        
        <text x="512" y="60" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="32" font-weight="bold">Performance Comparison</text>
        
        <rect x="100" y="100" width="824" height="600" fill="none" stroke="#444444" stroke-width="2"/>`;

    holdings.forEach((holding: any, index: number) => {
      const gainLoss = holding.totalGainLossPercentage || 0;
      const barHeight = Math.abs(gainLoss) / maxGainLoss * 250;
      const barY = gainLoss >= 0 ? 400 - barHeight : 400;
      const color = gainLoss >= 0 ? '#4CAF50' : '#ff6b6b';
      const x = 150 + index * 130;

      svg += `
        <rect x="${x}" y="${barY}" width="80" height="${barHeight}" fill="${color}"/>
        <text x="${x + 40}" y="${barY - 10}" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="12" font-weight="bold">
          ${gainLoss >= 0 ? '+' : ''}${gainLoss.toFixed(1)}%
        </text>
        <text x="${x + 40}" y="720" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="14">
          ${holding.ticker}
        </text>`;
    });

    svg += `
        <line x1="100" y1="400" x2="924" y2="400" stroke="#ffffff" stroke-width="2"/>
        
        <text x="512" y="1000" text-anchor="middle" fill="#666666" font-family="Arial" font-size="12">
          Generated by AI • ${new Date().toLocaleDateString()}
        </text>
      </svg>`;

    return svg;
  }

  /**
   * Create custom illustration based on creative prompt
   * Uses AI to interpret the metaphor and generate appropriate SVG
   */
  private async createCustomIllustration(prompt: string, portfolioData?: any, intent?: any): Promise<string> {
    if (!portfolioData || !portfolioData.holdings || portfolioData.holdings.length === 0) {
      return this.createDefaultChartSVG();
    }

    try {
      // Use Gemini to understand the creative metaphor and generate SVG instructions
      const analysisPrompt = `Analyze this creative visualization request and provide SVG generation instructions.

User request: "${prompt}"

Portfolio data:
- Holdings: ${portfolioData.holdings.map((h: any) => `${h.ticker} ($${h.totalValue?.toFixed(0)})`).join(', ')}
- Total Value: $${portfolioData.totalValue?.toFixed(2)}
- Total Gain/Loss: ${portfolioData.totalGainLossPercentage?.toFixed(2)}%

Respond with a JSON object containing SVG generation instructions:
{
  "visualMetaphor": "description of the creative concept (e.g., 'solar system where planets are stocks')",
  "mappings": [
    {
      "ticker": "AAPL",
      "element": "description of visual element (e.g., 'large planet close to sun')",
      "size": "relative size based on value (small/medium/large)",
      "position": "position description",
      "color": "hex color"
    }
  ],
  "layout": "overall layout description",
  "style": "artistic style notes"
}`;

      const result = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: 'user', parts: [{ text: analysisPrompt }] }]
      });

      const responseText = result.text || '';

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const instructions = JSON.parse(jsonMatch[0]);
        
        // Generate SVG based on instructions
        return this.generateSVGFromInstructions(instructions, portfolioData, prompt);
      }
    } catch (error) {
      // AI analysis failed, using pattern-based generation
    }

    // Fallback: Pattern-based custom illustration
    return this.generatePatternBasedIllustration(prompt, portfolioData);
  }

  /**
   * Generate SVG from AI instructions
   */
  private generateSVGFromInstructions(instructions: any, portfolioData: any, prompt: string): string {
    const { visualMetaphor, mappings, layout, style } = instructions;
    
    // Check for specific metaphors
    const lowerMetaphor = visualMetaphor.toLowerCase();
    
    if (lowerMetaphor.includes('solar system') || lowerMetaphor.includes('planet')) {
      return this.createSolarSystemVisualization(mappings, portfolioData);
    } else if (lowerMetaphor.includes('garden') || lowerMetaphor.includes('flower') || lowerMetaphor.includes('tree')) {
      return this.createGardenVisualization(mappings, portfolioData);
    } else if (lowerMetaphor.includes('ocean') || lowerMetaphor.includes('sea') || lowerMetaphor.includes('fish')) {
      return this.createOceanVisualization(mappings, portfolioData);
    } else if (lowerMetaphor.includes('city') || lowerMetaphor.includes('building') || lowerMetaphor.includes('skyline')) {
      return this.createCityVisualization(mappings, portfolioData);
    } else if (lowerMetaphor.includes('constellation') || lowerMetaphor.includes('star')) {
      return this.createConstellationVisualization(mappings, portfolioData);
    }
    
    // Default creative layout
    return this.createGenericCreativeVisualization(mappings, portfolioData, visualMetaphor);
  }

  /**
   * Create solar system visualization
   */
  private createSolarSystemVisualization(mappings: any[], portfolioData: any): string {
    const holdings = portfolioData.holdings.slice(0, 8); // Max 8 planets
    const totalValue = portfolioData.totalValue || 1;
    
    let svg = `
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="sunGrad">
            <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#FFA500;stop-opacity:1" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <!-- Space background -->
        <rect width="1024" height="1024" fill="#0a0a1a"/>
        
        <!-- Stars -->`;
    
    // Add random stars
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const size = Math.random() * 2 + 0.5;
      svg += `<circle cx="${x}" cy="${y}" r="${size}" fill="#ffffff" opacity="${Math.random() * 0.5 + 0.3}"/>`;
    }
    
    svg += `
        <!-- Sun (center - represents total portfolio) -->
        <circle cx="512" cy="512" r="60" fill="url(#sunGrad)" filter="url(#glow)"/>
        <text x="512" y="520" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="16" font-weight="bold">PORTFOLIO</text>
        <text x="512" y="540" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="12">$${portfolioData.totalValue?.toFixed(0)}</text>
        
        <!-- Title -->
        <text x="512" y="50" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="32" font-weight="bold">Portfolio Solar System</text>
        <text x="512" y="80" text-anchor="middle" fill="#b8b8d2" font-family="Arial" font-size="14">Each planet represents a stock in your portfolio</text>`;
    
    // Planet colors
    const planetColors = ['#8B7355', '#FFA500', '#4169E1', '#DC143C', '#DAA520', '#4682B4', '#00CED1', '#9370DB'];
    
    // Draw planets (stocks) in orbits
    holdings.forEach((holding: any, index: number) => {
      const percentage = (holding.totalValue || 0) / totalValue;
      const orbit = 150 + (index * 50); // Distance from sun
      const angle = (index / holdings.length) * Math.PI * 2;
      const x = 512 + Math.cos(angle) * orbit;
      const y = 512 + Math.sin(angle) * orbit;
      
      // Planet size based on portfolio percentage
      const minSize = 15;
      const maxSize = 40;
      const size = minSize + (percentage * (maxSize - minSize) * 5);
      const actualSize = Math.min(maxSize, Math.max(minSize, size));
      
      const color = planetColors[index % planetColors.length];
      const gainLoss = holding.totalGainLossPercentage || 0;
      const ringColor = gainLoss >= 0 ? '#4CAF50' : '#ff6b6b';
      
      // Orbit circle
      svg += `<circle cx="512" cy="512" r="${orbit}" fill="none" stroke="#ffffff" stroke-width="0.5" opacity="0.2"/>`;
      
      // Planet
      svg += `<circle cx="${x}" cy="${y}" r="${actualSize}" fill="${color}" stroke="${ringColor}" stroke-width="2"/>`;
      
      // Label
      svg += `
        <text x="${x}" y="${y - actualSize - 5}" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="12" font-weight="bold">${holding.ticker}</text>
        <text x="${x}" y="${y - actualSize - 20}" text-anchor="middle" fill="${ringColor}" font-family="Arial" font-size="10">${gainLoss >= 0 ? '+' : ''}${gainLoss.toFixed(1)}%</text>`;
    });
    
    svg += `
        <!-- Legend -->
        <text x="50" y="950" fill="#b8b8d2" font-family="Arial" font-size="12">Planet size = Portfolio allocation</text>
        <text x="50" y="970" fill="#b8b8d2" font-family="Arial" font-size="12">Ring color = Performance (Green: gain, Red: loss)</text>
        
        <text x="512" y="1000" text-anchor="middle" fill="#666666" font-family="Arial" font-size="12">
          Your Investment Universe • ${new Date().toLocaleDateString()}
        </text>
      </svg>`;
    
    return svg;
  }

  /**
   * Pattern-based illustration generation (fallback)
   */
  private generatePatternBasedIllustration(prompt: string, portfolioData: any): string {
    const lower = prompt.toLowerCase();
    
    // Detect common creative patterns
    if (lower.includes('solar') || lower.includes('planet') || lower.includes('space') || lower.includes('universe')) {
      return this.createSolarSystemVisualization([], portfolioData);
    } else if (lower.includes('garden') || lower.includes('flower') || lower.includes('tree') || lower.includes('grow')) {
      return this.createGardenVisualization([], portfolioData);
    } else if (lower.includes('city') || lower.includes('building') || lower.includes('skyline')) {
      return this.createCityVisualization([], portfolioData);
    } else if (lower.includes('ocean') || lower.includes('sea') || lower.includes('wave') || lower.includes('fish')) {
      return this.createOceanVisualization([], portfolioData);
    } else if (lower.includes('star') || lower.includes('constellation') || lower.includes('galaxy')) {
      return this.createConstellationVisualization([], portfolioData);
    }
    
    // Default to dashboard if no pattern matches
    return this.createDataDrivenDashboard(portfolioData);
  }

  /**
   * Create garden/growth visualization
   */
  private createGardenVisualization(mappings: any[], portfolioData: any): string {
    const holdings = portfolioData.holdings.slice(0, 8);
    
    let svg = `
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <!-- Sky background -->
        <defs>
          <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#87CEEB;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#E0F6FF;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="1024" height="1024" fill="url(#skyGrad)"/>
        
        <!-- Ground -->
        <rect x="0" y="800" width="1024" height="224" fill="#8B7355"/>
        <rect x="0" y="750" width="1024" height="50" fill="#90EE90"/>
        
        <!-- Title -->
        <text x="512" y="60" text-anchor="middle" fill="#2F4F2F" font-family="Arial, sans-serif" font-size="32" font-weight="bold">Investment Garden</text>
        <text x="512" y="90" text-anchor="middle" fill="#666666" font-family="Arial" font-size="14">Watch your investments grow</text>`;
    
    // Draw flowers/plants (stocks)
    holdings.forEach((holding: any, index: number) => {
      const x = 130 + (index * 110);
      const gainLoss = holding.totalGainLossPercentage || 0;
      
      // Stem height based on performance
      const baseHeight = 100;
      const growthHeight = Math.max(-50, Math.min(150, gainLoss * 3));
      const stemHeight = baseHeight + growthHeight;
      const stemY = 750 - stemHeight;
      
      const flowerColor = gainLoss >= 0 ? '#FF69B4' : '#DDA0DD';
      
      // Stem
      svg += `<rect x="${x - 3}" y="${stemY}" width="6" height="${stemHeight}" fill="#228B22"/>`;
      
      // Flower
      const petalCount = 6;
      for (let i = 0; i < petalCount; i++) {
        const angle = (i / petalCount) * Math.PI * 2;
        const petalX = x + Math.cos(angle) * 20;
        const petalY = stemY + Math.sin(angle) * 20;
        svg += `<circle cx="${petalX}" cy="${petalY}" r="15" fill="${flowerColor}"/>`;
      }
      
      // Center
      svg += `<circle cx="${x}" cy="${stemY}" r="12" fill="#FFD700"/>`;
      
      // Label
      svg += `
        <text x="${x}" y="${stemY - 35}" text-anchor="middle" fill="#2F4F2F" font-family="Arial" font-size="12" font-weight="bold">${holding.ticker}</text>
        <text x="${x}" y="${stemY - 20}" text-anchor="middle" fill="${gainLoss >= 0 ? '#228B22' : '#DC143C'}" font-family="Arial" font-size="11">${gainLoss >= 0 ? '+' : ''}${gainLoss.toFixed(1)}%</text>`;
    });
    
    svg += `
        <text x="512" y="1000" text-anchor="middle" fill="#666666" font-family="Arial" font-size="12">
          Cultivating Wealth • ${new Date().toLocaleDateString()}
        </text>
      </svg>`;
    
    return svg;
  }

  /**
   * Create city/skyline visualization
   */
  private createCityVisualization(mappings: any[], portfolioData: any): string {
    const holdings = portfolioData.holdings.slice(0, 10);
    const totalValue = portfolioData.totalValue || 1;
    
    let svg = `
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <!-- Sky -->
        <defs>
          <linearGradient id="cityGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#16213e;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="1024" height="1024" fill="url(#cityGrad)"/>
        
        <!-- Stars -->`;
    
    for (let i = 0; i < 30; i++) {
      svg += `<circle cx="${Math.random() * 1024}" cy="${Math.random() * 400}" r="1.5" fill="#ffffff" opacity="0.8"/>`;
    }
    
    svg += `
        <!-- Title -->
        <text x="512" y="60" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="32" font-weight="bold">Portfolio Skyline</text>
        <text x="512" y="90" text-anchor="middle" fill="#b8b8d2" font-family="Arial" font-size="14">Building your financial future</text>
        
        <!-- Ground -->
        <rect x="0" y="850" width="1024" height="174" fill="#1a1a1a"/>`;
    
    // Buildings (stocks)
    holdings.forEach((holding: any, index: number) => {
      const percentage = (holding.totalValue || 0) / totalValue;
      const width = 70;
      const x = 50 + (index * 95);
      
      // Building height based on value
      const minHeight = 100;
      const maxHeight = 600;
      const height = minHeight + (percentage * maxHeight * 5);
      const actualHeight = Math.min(maxHeight, Math.max(minHeight, height));
      const y = 850 - actualHeight;
      
      const gainLoss = holding.totalGainLossPercentage || 0;
      const buildingColor = gainLoss >= 0 ? '#4CAF50' : '#ff6b6b';
      
      // Building
      svg += `<rect x="${x}" y="${y}" width="${width}" height="${actualHeight}" fill="${buildingColor}" stroke="#ffffff" stroke-width="2"/>`;
      
      // Windows
      for (let row = 0; row < Math.floor(actualHeight / 40); row++) {
        for (let col = 0; col < 4; col++) {
          const wx = x + 10 + (col * 15);
          const wy = y + 20 + (row * 40);
          svg += `<rect x="${wx}" y="${wy}" width="8" height="12" fill="#FFD700" opacity="0.8"/>`;
        }
      }
      
      // Label
      svg += `
        <text x="${x + width / 2}" y="${y - 10}" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="11" font-weight="bold">${holding.ticker}</text>
        <text x="${x + width / 2}" y="${y - 25}" text-anchor="middle" fill="${buildingColor}" font-family="Arial" font-size="10">${gainLoss >= 0 ? '+' : ''}${gainLoss.toFixed(1)}%</text>`;
    });
    
    svg += `
        <text x="512" y="1000" text-anchor="middle" fill="#666666" font-family="Arial" font-size="12">
          Your Financial Empire • ${new Date().toLocaleDateString()}
        </text>
      </svg>`;
    
    return svg;
  }

  /**
   * Placeholder for ocean visualization
   */
  private createOceanVisualization(mappings: any[], portfolioData: any): string {
    // For now, return creative dashboard
    return this.createDataDrivenDashboard(portfolioData);
  }

  /**
   * Placeholder for constellation visualization
   */
  private createConstellationVisualization(mappings: any[], portfolioData: any): string {
    // For now, return creative dashboard
    return this.createDataDrivenDashboard(portfolioData);
  }

  /**
   * Generic creative visualization
   */
  private createGenericCreativeVisualization(mappings: any[], portfolioData: any, metaphor: string): string {
    // For now, return creative dashboard
    return this.createDataDrivenDashboard(portfolioData);
  }

  /**
   * Create data-driven dashboard SVG
   */
  private createDataDrivenDashboard(portfolioData?: any): string {
    if (!portfolioData || !portfolioData.holdings || portfolioData.holdings.length === 0) {
      return this.createDefaultChartSVG();
    }

    const holdings = portfolioData.holdings.slice(0, 4);
    const totalValue = portfolioData.totalValue || 0;
    const totalGainLoss = portfolioData.totalGainLoss || 0;
    const totalGainLossPercentage = portfolioData.totalGainLossPercentage || 0;
    const metrics = portfolioData.metrics || {};
    
    const gainColor = totalGainLoss >= 0 ? '#4CAF50' : '#ff6b6b';
    const gainSign = totalGainLoss >= 0 ? '+' : '';
    
    let svg = `
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#0f0f1e;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1a1a2e;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1e1e2e;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#2a2a3e;stop-opacity:1" />
          </linearGradient>
        </defs>
        
        <rect width="1024" height="1024" fill="url(#bg)"/>
        
        <!-- Header -->
        <text x="512" y="60" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="36" font-weight="bold">Portfolio Dashboard</text>
        <text x="512" y="95" text-anchor="middle" fill="#b8b8d2" font-family="Arial" font-size="16">${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</text>
        
        <!-- Total Value Card -->
        <rect x="50" y="120" width="460" height="140" rx="12" fill="url(#cardBg)" stroke="#3a3a5a" stroke-width="2"/>
        <text x="280" y="155" text-anchor="middle" fill="#b8b8d2" font-family="Arial" font-size="14">TOTAL VALUE</text>
        <text x="280" y="205" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="42" font-weight="bold">$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</text>
        <text x="280" y="240" text-anchor="middle" fill="${gainColor}" font-family="Arial" font-size="18" font-weight="bold">${gainSign}$${Math.abs(totalGainLoss).toFixed(2)} (${gainSign}${totalGainLossPercentage.toFixed(2)}%)</text>
        
        <!-- Holdings Count Card -->
        <rect x="530" y="120" width="220" height="140" rx="12" fill="url(#cardBg)" stroke="#3a3a5a" stroke-width="2"/>
        <text x="640" y="155" text-anchor="middle" fill="#b8b8d2" font-family="Arial" font-size="14">HOLDINGS</text>
        <text x="640" y="210" text-anchor="middle" fill="#17bf2d" font-family="Arial, sans-serif" font-size="48" font-weight="bold">${holdings.length}</text>
        
        <!-- Risk Level Card -->
        <rect x="770" y="120" width="220" height="140" rx="12" fill="url(#cardBg)" stroke="#3a3a5a" stroke-width="2"/>
        <text x="880" y="155" text-anchor="middle" fill="#b8b8d2" font-family="Arial" font-size="14">RISK LEVEL</text>
        <text x="880" y="210" text-anchor="middle" fill="#ffa500" font-family="Arial, sans-serif" font-size="24" font-weight="bold">${metrics.riskLevel || 'Moderate'}</text>
        
        <!-- Holdings List -->
        <text x="50" y="310" fill="#ffffff" font-family="Arial, sans-serif" font-size="22" font-weight="bold">Top Holdings</text>`;
    
    holdings.forEach((holding: any, index: number) => {
      const y = 350 + (index * 130);
      const value = holding.totalValue || 0;
      const gainLoss = holding.totalGainLossPercentage || 0;
      const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
      const holdingColor = gainLoss >= 0 ? '#4CAF50' : '#ff6b6b';
      
      svg += `
        <rect x="50" y="${y}" width="924" height="110" rx="10" fill="url(#cardBg)" stroke="#3a3a5a" stroke-width="2"/>
        
        <!-- Ticker -->
        <text x="80" y="${y + 35}" fill="#ffffff" font-family="Arial, sans-serif" font-size="24" font-weight="bold">${holding.ticker}</text>
        <text x="80" y="${y + 60}" fill="#b8b8d2" font-family="Arial" font-size="14">${holding.companyName || holding.ticker}</text>
        
        <!-- Value -->
        <text x="500" y="${y + 40}" fill="#b8b8d2" font-family="Arial" font-size="12">VALUE</text>
        <text x="500" y="${y + 70}" fill="#ffffff" font-family="Arial, sans-serif" font-size="20" font-weight="bold">$${value.toFixed(2)}</text>
        
        <!-- Percentage of Portfolio -->
        <text x="680" y="${y + 40}" fill="#b8b8d2" font-family="Arial" font-size="12">ALLOCATION</text>
        <text x="680" y="${y + 70}" fill="#17bf2d" font-family="Arial, sans-serif" font-size="20" font-weight="bold">${percentage.toFixed(1)}%</text>
        
        <!-- Gain/Loss -->
        <text x="840" y="${y + 40}" fill="#b8b8d2" font-family="Arial" font-size="12">RETURN</text>
        <text x="840" y="${y + 70}" fill="${holdingColor}" font-family="Arial, sans-serif" font-size="20" font-weight="bold">${gainLoss >= 0 ? '+' : ''}${gainLoss.toFixed(2)}%</text>`;
    });
    
    svg += `
        <!-- Footer -->
        <text x="512" y="1000" text-anchor="middle" fill="#666666" font-family="Arial" font-size="12">
          Generated by AI • Powered by Real Portfolio Data
        </text>
      </svg>`;
    
    return svg;
  }

  /**
   * Generate a detailed image prompt based on user request and portfolio context
   */
  async generateImagePrompt(request: ImageGenerationRequest): Promise<string> {
    try {
      const portfolioSummary = this.createPortfolioSummary(request.portfolioContext);
      
      const systemPrompt = `Create a concise DALL-E prompt for a ${request.visualizationType} image about this portfolio:

${portfolioSummary}

User wants: "${request.prompt}"

Generate a short, specific prompt (under 200 words) that describes:
- Chart type and layout
- Key financial data to show
- Professional style and colors
- Any specific symbols or indicators

Keep it concise but descriptive for accurate image generation.`;

      const result = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: 'user', parts: [{ text: systemPrompt }] }]
      });

      const generatedPrompt = result.text || this.createFallbackPrompt(request);
      
      // Ensure prompt is under 4000 characters
      const maxLength = 4000;
      const finalPrompt = generatedPrompt.length > maxLength 
        ? generatedPrompt.substring(0, maxLength - 3) + '...'
        : generatedPrompt;
        
      return finalPrompt;
    } catch (error) {
      console.error('Error generating image prompt:', error);
      return this.createFallbackPrompt(request);
    }
  }

  /**
   * Generate an image using Gemini 2.5 Flash native image generation
   */
  async generateImage(prompt: string): Promise<GeneratedImage> {
    try {
      // Use Gemini 2.5 Flash native image generation
      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash-image-preview",
        contents: prompt,
      });

      if (!response.candidates || !response.candidates[0] || !response.candidates[0].content) {
        throw new Error('No content generated by Gemini');
      }

      const content = response.candidates[0].content;
      
      if (!content.parts) {
        throw new Error('No parts found in Gemini response');
      }
      
      // Look for image data in the response parts
      for (const part of content.parts) {
        if (part.inlineData) {
          const imageData = part.inlineData.data;
          const mimeType = part.inlineData.mimeType || 'image/png';
          
          // Convert base64 image data to data URI
          const imageUrl = `data:${mimeType};base64,${imageData}`;

          return {
            url: imageUrl,
            prompt,
            description: `AI-generated visualization: ${prompt}`,
            metadata: {
              width: 1024,
              height: 1024,
              format: mimeType.split('/')[1] || 'png',
              generatedAt: new Date().toISOString(),
              model: 'gemini-2.5-flash-preview',
              safetyRatings: (response.candidates[0] as any).safetyRatings || []
            }
          };
        }
      }

      // If no image data found, check for text response
      for (const part of content.parts) {
        if (part.text) {
          // Gemini returned text instead of image
        }
      }

      throw new Error('No image data found in Gemini response');
      
    } catch (error) {
      console.error('Error generating image with Gemini:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // Check for specific error types
      if (error instanceof Error) {
        if (error.message.includes('quota') || error.message.includes('exceeded') || error.message.includes('limit')) {
          console.warn('⚠️ Gemini API quota exceeded. Using enhanced SVG visualization instead.');
        } else if (error.message.includes('billed users') || error.message.includes('not available') || error.message.includes('model not found')) {
          console.warn('⚠️ Gemini image generation not available. Using enhanced SVG visualization instead.');
        } else if (error.message.includes('API key')) {
          console.warn('⚠️ Invalid API key. Using enhanced SVG visualization instead.');
        } else {
          console.warn('⚠️ Unknown Gemini error. Using enhanced SVG visualization instead.');
        }
      }
      
      // Fallback to enhanced placeholder
      return this.generateEnhancedPlaceholder(prompt);
    }
  }


  /**
   * Generate a complete visualization with both chart and image
   */
  async generateCustomVisualization(request: ImageGenerationRequest): Promise<{
    chartConfig: any;
    imagePrompt: string;
    generatedImage?: GeneratedImage;
  }> {
    try {
      // Generate the image prompt
      const imagePrompt = await this.generateImagePrompt(request);
      
      // Generate the chart configuration
      const chartConfig = this.generateChartConfig(request);
      
      // Try to generate the image
      let generatedImage: GeneratedImage | undefined;
      try {
        generatedImage = await this.generateImage(imagePrompt);
      } catch (imageError) {
        console.warn('Image generation failed, using chart only:', imageError);
      }

      const result = {
        chartConfig,
        imagePrompt,
        generatedImage
      };
      
      return result;
    } catch (error) {
      console.error('Error generating custom visualization:', error);
      throw error;
    }
  }

  /**
   * Create a concise portfolio summary for context
   */
  private createPortfolioSummary(context: ImageGenerationRequest['portfolioContext']): string {
    const { holdings, totalValue, totalGainLoss, totalGainLossPercentage } = context;
    
    const topHoldings = holdings
      .sort((a, b) => {
        const aValue = (a.purchaseLots?.reduce((sum: number, lot: any) => sum + lot.quantity, 0) || 0) * a.currentPrice;
        const bValue = (b.purchaseLots?.reduce((sum: number, lot: any) => sum + lot.quantity, 0) || 0) * b.currentPrice;
        return bValue - aValue;
      })
      .slice(0, 3); // Only top 3 holdings to keep it concise

    return `Portfolio: $${(totalValue/1000).toFixed(1)}k (${totalGainLossPercentage > 0 ? '+' : ''}${totalGainLossPercentage.toFixed(1)}%) | ${holdings.length} stocks | Top: ${topHoldings.map(h => h.ticker).join(', ')}`;
  }

  /**
   * Create a fallback prompt if AI generation fails
   */
  private createFallbackPrompt(request: ImageGenerationRequest): string {
    const { prompt, portfolioContext, visualizationType } = request;
    const { totalValue, totalGainLossPercentage } = portfolioContext;
    
    return `Professional ${visualizationType}: ${prompt}. Portfolio: $${(totalValue/1000).toFixed(1)}k (${totalGainLossPercentage > 0 ? '+' : ''}${totalGainLossPercentage.toFixed(1)}%). Financial charts, green/red colors, clean design.`;
  }

  /**
   * Generate chart configuration based on request
   */
  private generateChartConfig(request: ImageGenerationRequest): any {
    const { prompt, portfolioContext } = request;
    const { holdings } = portfolioContext;
    
    // This would generate the actual chart configuration
    // For now, return a basic structure
    return {
      type: 'line',
      title: `Custom Visualization: ${prompt}`,
      data: {
        labels: holdings.map(h => h.ticker),
        datasets: [{
          label: 'Portfolio Value',
          data: holdings.map(h => {
            const quantity = h.purchaseLots?.reduce((sum: number, lot: any) => sum + lot.quantity, 0) || 0;
            return quantity * h.currentPrice;
          })
        }]
      }
    };
  }

  /**
   * Generate a placeholder image (for development/testing)
   */
  private async generatePlaceholderImage(prompt: string): Promise<GeneratedImage> {
    // This is a placeholder implementation
    // In a real app, you would integrate with an actual image generation API
    
    // Create a simple base64 encoded PNG placeholder
    // This is a 1x1 pixel PNG with the app's theme colors
    const base64PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    // For now, let's use a simple colored rectangle as a placeholder
    // In a real implementation, you would generate an actual chart image
    const placeholderUrl = `data:image/png;base64,${base64PNG}`;
    
    // Create a more sophisticated placeholder using a simple HTML canvas approach
    // Since we can't use canvas in React Native, let's use a different approach
    const simplePlaceholder = this.createSimplePlaceholder(prompt);
    
    return {
      url: simplePlaceholder,
      prompt,
      description: `AI Generated: ${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}`,
      metadata: {
        width: 800,
        height: 600,
        format: 'png',
        generatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Generate an enhanced placeholder that looks like a real visualization
   */
  private generateEnhancedPlaceholder(prompt: string): GeneratedImage {
    // Create a sophisticated SVG that looks like a real financial chart
    const svgContent = this.createFinancialVisualizationSVG(prompt);
    const svgDataUri = this.createSVGDataUri(svgContent);
    
    return {
      url: svgDataUri,
      prompt,
      description: `AI-generated visualization: ${prompt}`,
      metadata: {
        width: 1024,
        height: 1024,
        format: 'svg',
        generatedAt: new Date().toISOString(),
        model: 'enhanced-placeholder',
        isPlaceholder: true
      }
    };
  }

  /**
   * Create a sophisticated SVG that looks like a real financial visualization
   */
  private createFinancialVisualizationSVG(prompt: string): string {
    const isPieChart = prompt.toLowerCase().includes('pie') || prompt.toLowerCase().includes('allocation');
    const isLineChart = prompt.toLowerCase().includes('line') || prompt.toLowerCase().includes('time') || prompt.toLowerCase().includes('performance');
    const isBarChart = prompt.toLowerCase().includes('bar') || prompt.toLowerCase().includes('comparison');
    
    if (isPieChart) {
      return this.createPieChartSVG();
    } else if (isLineChart) {
      return this.createLineChartSVG();
    } else if (isBarChart) {
      return this.createBarChartSVG();
    } else {
      return this.createDefaultChartSVG();
    }
  }

  private createPieChartSVG(): string {
    return `
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1a1a1a;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#2d2d2d;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="1024" height="1024" fill="url(#bg)"/>
        
        <!-- Title -->
        <text x="512" y="80" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="32" font-weight="bold">Portfolio Allocation</text>
        
        <!-- Pie Chart -->
        <g transform="translate(512, 400)">
          <!-- AAPL slice -->
          <path d="M 0,0 L 200,0 A 200,200 0 0,1 141.42,141.42 Z" fill="#4CAF50" stroke="#ffffff" stroke-width="2"/>
          <text x="100" y="-20" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="16" font-weight="bold">AAPL 35%</text>
          
          <!-- MSFT slice -->
          <path d="M 0,0 L 141.42,141.42 A 200,200 0 0,1 0,200 Z" fill="#2196F3" stroke="#ffffff" stroke-width="2"/>
          <text x="70" y="100" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="16" font-weight="bold">MSFT 25%</text>
          
          <!-- GOOGL slice -->
          <path d="M 0,0 L 0,200 A 200,200 0 0,1 -141.42,141.42 Z" fill="#FF9800" stroke="#ffffff" stroke-width="2"/>
          <text x="-70" y="100" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="16" font-weight="bold">GOOGL 20%</text>
          
          <!-- TSLA slice -->
          <path d="M 0,0 L -141.42,141.42 A 200,200 0 0,1 -200,0 Z" fill="#E91E63" stroke="#ffffff" stroke-width="2"/>
          <text x="-100" y="-20" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="16" font-weight="bold">TSLA 20%</text>
        </g>
        
        <!-- Legend -->
        <g transform="translate(50, 700)">
          <rect x="0" y="0" width="20" height="20" fill="#4CAF50"/>
          <text x="30" y="15" fill="#ffffff" font-family="Arial" font-size="14">Apple Inc. (AAPL)</text>
          
          <rect x="0" y="30" width="20" height="20" fill="#2196F3"/>
          <text x="30" y="45" fill="#ffffff" font-family="Arial" font-size="14">Microsoft Corp. (MSFT)</text>
          
          <rect x="0" y="60" width="20" height="20" fill="#FF9800"/>
          <text x="30" y="75" fill="#ffffff" font-family="Arial" font-size="14">Alphabet Inc. (GOOGL)</text>
          
          <rect x="0" y="90" width="20" height="20" fill="#E91E63"/>
          <text x="30" y="105" fill="#ffffff" font-family="Arial" font-size="14">Tesla Inc. (TSLA)</text>
        </g>
        
        <!-- Generated by AI -->
        <text x="512" y="1000" text-anchor="middle" fill="#666666" font-family="Arial" font-size="12">Generated by AI • ${new Date().toLocaleDateString()}</text>
      </svg>
    `;
  }

  private createLineChartSVG(): string {
    return `
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1a1a1a;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#2d2d2d;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#4CAF50;stop-opacity:0.8" />
            <stop offset="100%" style="stop-color:#2196F3;stop-opacity:0.8" />
          </linearGradient>
        </defs>
        <rect width="1024" height="1024" fill="url(#bg)"/>
        
        <!-- Title -->
        <text x="512" y="60" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="32" font-weight="bold">Portfolio Performance</text>
        
        <!-- Chart Area -->
        <rect x="100" y="100" width="824" height="600" fill="none" stroke="#444444" stroke-width="2"/>
        
        <!-- Grid Lines -->
        <g stroke="#333333" stroke-width="1" opacity="0.5">
          <line x1="100" y1="200" x2="924" y2="200"/>
          <line x1="100" y1="300" x2="924" y2="300"/>
          <line x1="100" y1="400" x2="924" y2="400"/>
          <line x1="100" y1="500" x2="924" y2="500"/>
          <line x1="100" y1="600" x2="924" y2="600"/>
        </g>
        
        <!-- Performance Line -->
        <polyline points="150,550 250,520 350,480 450,420 550,380 650,350 750,320 850,300" 
                  fill="none" stroke="url(#lineGrad)" stroke-width="4"/>
        
        <!-- Data Points -->
        <circle cx="150" cy="550" r="6" fill="#4CAF50"/>
        <circle cx="250" cy="520" r="6" fill="#4CAF50"/>
        <circle cx="350" cy="480" r="6" fill="#4CAF50"/>
        <circle cx="450" cy="420" r="6" fill="#4CAF50"/>
        <circle cx="550" cy="380" r="6" fill="#4CAF50"/>
        <circle cx="650" cy="350" r="6" fill="#4CAF50"/>
        <circle cx="750" cy="320" r="6" fill="#4CAF50"/>
        <circle cx="850" cy="300" r="6" fill="#4CAF50"/>
        
        <!-- Y-axis Labels -->
        <text x="80" y="210" text-anchor="end" fill="#ffffff" font-family="Arial" font-size="12">$80K</text>
        <text x="80" y="310" text-anchor="end" fill="#ffffff" font-family="Arial" font-size="12">$60K</text>
        <text x="80" y="410" text-anchor="end" fill="#ffffff" font-family="Arial" font-size="12">$40K</text>
        <text x="80" y="510" text-anchor="end" fill="#ffffff" font-family="Arial" font-size="12">$20K</text>
        <text x="80" y="610" text-anchor="end" fill="#ffffff" font-family="Arial" font-size="12">$0</text>
        
        <!-- X-axis Labels -->
        <text x="150" y="650" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="12">Jan</text>
        <text x="250" y="650" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="12">Feb</text>
        <text x="350" y="650" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="12">Mar</text>
        <text x="450" y="650" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="12">Apr</text>
        <text x="550" y="650" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="12">May</text>
        <text x="650" y="650" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="12">Jun</text>
        <text x="750" y="650" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="12">Jul</text>
        <text x="850" y="650" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="12">Aug</text>
        
        <!-- Performance Stats -->
        <g transform="translate(100, 750)">
          <text x="0" y="0" fill="#4CAF50" font-family="Arial" font-size="24" font-weight="bold">+24.5%</text>
          <text x="0" y="30" fill="#ffffff" font-family="Arial" font-size="16">Total Return</text>
          <text x="200" y="0" fill="#2196F3" font-family="Arial" font-size="24" font-weight="bold">$12,450</text>
          <text x="200" y="30" fill="#ffffff" font-family="Arial" font-size="16">Total Gain</text>
        </g>
        
        <!-- Generated by AI -->
        <text x="512" y="1000" text-anchor="middle" fill="#666666" font-family="Arial" font-size="12">Generated by AI • ${new Date().toLocaleDateString()}</text>
      </svg>
    `;
  }

  private createBarChartSVG(): string {
    return `
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1a1a1a;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#2d2d2d;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="1024" height="1024" fill="url(#bg)"/>
        
        <!-- Title -->
        <text x="512" y="60" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="32" font-weight="bold">Stock Performance Comparison</text>
        
        <!-- Chart Area -->
        <rect x="100" y="100" width="824" height="600" fill="none" stroke="#444444" stroke-width="2"/>
        
        <!-- Bars -->
        <rect x="150" y="400" width="80" height="200" fill="#4CAF50"/>
        <text x="190" y="390" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="12" font-weight="bold">+15.2%</text>
        <text x="190" y="720" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="14">AAPL</text>
        
        <rect x="280" y="350" width="80" height="250" fill="#2196F3"/>
        <text x="320" y="340" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="12" font-weight="bold">+22.8%</text>
        <text x="320" y="720" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="14">MSFT</text>
        
        <rect x="410" y="300" width="80" height="300" fill="#FF9800"/>
        <text x="450" y="290" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="12" font-weight="bold">+28.5%</text>
        <text x="450" y="720" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="14">GOOGL</text>
        
        <rect x="540" y="450" width="80" height="150" fill="#E91E63"/>
        <text x="580" y="440" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="12" font-weight="bold">+8.3%</text>
        <text x="580" y="720" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="14">TSLA</text>
        
        <rect x="670" y="380" width="80" height="220" fill="#9C27B0"/>
        <text x="710" y="370" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="12" font-weight="bold">+18.7%</text>
        <text x="710" y="720" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="14">NVDA</text>
        
        <rect x="800" y="420" width="80" height="180" fill="#00BCD4"/>
        <text x="840" y="410" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="12" font-weight="bold">+12.1%</text>
        <text x="840" y="720" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="14">AMZN</text>
        
        <!-- Y-axis Labels -->
        <text x="80" y="120" text-anchor="end" fill="#ffffff" font-family="Arial" font-size="12">30%</text>
        <text x="80" y="220" text-anchor="end" fill="#ffffff" font-family="Arial" font-size="12">20%</text>
        <text x="80" y="320" text-anchor="end" fill="#ffffff" font-family="Arial" font-size="12">10%</text>
        <text x="80" y="420" text-anchor="end" fill="#ffffff" font-family="Arial" font-size="12">0%</text>
        <text x="80" y="520" text-anchor="end" fill="#ffffff" font-family="Arial" font-size="12">-10%</text>
        <text x="80" y="620" text-anchor="end" fill="#ffffff" font-family="Arial" font-size="12">-20%</text>
        
        <!-- Generated by AI -->
        <text x="512" y="1000" text-anchor="middle" fill="#666666" font-family="Arial" font-size="12">Generated by AI • ${new Date().toLocaleDateString()}</text>
      </svg>
    `;
  }

  private createDefaultChartSVG(): string {
    return `
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1a1a1a;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#2d2d2d;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="1024" height="1024" fill="url(#bg)"/>
        
        <!-- Title -->
        <text x="512" y="100" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="36" font-weight="bold">Portfolio Dashboard</text>
        
        <!-- Main Chart Area -->
        <rect x="100" y="150" width="824" height="500" fill="none" stroke="#444444" stroke-width="2" rx="10"/>
        
        <!-- Chart Content -->
        <g transform="translate(200, 200)">
          <!-- Sample data visualization -->
          <rect x="0" y="0" width="100" height="80" fill="#4CAF50" rx="5"/>
          <text x="50" y="45" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="14" font-weight="bold">AAPL</text>
          <text x="50" y="60" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="12">+15.2%</text>
          
          <rect x="120" y="0" width="100" height="120" fill="#2196F3" rx="5"/>
          <text x="170" y="45" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="14" font-weight="bold">MSFT</text>
          <text x="170" y="60" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="12">+22.8%</text>
          
          <rect x="240" y="0" width="100" height="100" fill="#FF9800" rx="5"/>
          <text x="290" y="45" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="14" font-weight="bold">GOOGL</text>
          <text x="290" y="60" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="12">+18.5%</text>
          
          <rect x="360" y="0" width="100" height="60" fill="#E91E63" rx="5"/>
          <text x="410" y="45" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="14" font-weight="bold">TSLA</text>
          <text x="410" y="60" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="12">+8.3%</text>
        </g>
        
        <!-- Stats -->
        <g transform="translate(100, 750)">
          <text x="0" y="0" fill="#4CAF50" font-family="Arial" font-size="28" font-weight="bold">+18.7%</text>
          <text x="0" y="25" fill="#ffffff" font-family="Arial" font-size="16">Total Return</text>
          
          <text x="200" y="0" fill="#2196F3" font-family="Arial" font-size="28" font-weight="bold">$24,500</text>
          <text x="200" y="25" fill="#ffffff" font-family="Arial" font-size="16">Total Value</text>
          
          <text x="400" y="0" fill="#FF9800" font-family="Arial" font-size="28" font-weight="bold">$3,850</text>
          <text x="400" y="25" fill="#ffffff" font-family="Arial" font-size="16">Total Gain</text>
        </g>
        
        <!-- Generated by AI -->
        <text x="512" y="1000" text-anchor="middle" fill="#666666" font-family="Arial" font-size="12">Generated by AI • ${new Date().toLocaleDateString()}</text>
      </svg>
    `;
  }

  /**
   * Create a simple placeholder using a different approach
   */
  private createSimplePlaceholder(prompt: string): string {
    // Create a simple SVG that will be handled by our custom component
    const canvas = `
      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="800" height="600" fill="#1a1a1a"/>
        <rect x="50" y="50" width="700" height="500" fill="#2d3748" rx="12"/>
        <text x="400" y="280" text-anchor="middle" fill="#68d391" font-family="Arial" font-size="24" font-weight="bold">
          AI Generated Visualization
        </text>
        <text x="400" y="320" text-anchor="middle" fill="#b8b8d2" font-family="Arial" font-size="16">
          ${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}
        </text>
        <circle cx="400" cy="400" r="60" fill="#68d391" opacity="0.3"/>
        <circle cx="400" cy="400" r="40" fill="#68d391" opacity="0.6"/>
        <circle cx="400" cy="400" r="20" fill="#68d391"/>
        <text x="400" y="480" text-anchor="middle" fill="#b8b8d2" font-family="Arial" font-size="12">
          Generated at ${new Date().toLocaleTimeString()}
        </text>
      </svg>
    `;
    
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(canvas)}`;
  }

  /**
   * Generate a data-driven visualization using canvas or SVG
   */
  async generateDataVisualization(request: ImageGenerationRequest): Promise<GeneratedImage> {
    try {
      // This would create an actual data visualization
      // For now, return a placeholder
      const prompt = await this.generateImagePrompt(request);
      
      return {
        url: `https://via.placeholder.com/800x600/2d3748/68d391?text=${encodeURIComponent('Data Visualization')}`,
        prompt,
        description: 'Data-driven visualization generated from portfolio',
        metadata: {
          width: 800,
          height: 600,
          format: 'png',
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error generating data visualization:', error);
      throw error;
    }
  }
}

export const imageGenerationService = new ImageGenerationService();
