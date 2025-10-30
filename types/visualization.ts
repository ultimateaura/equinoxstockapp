export interface VisualizationStyle {
  // Theme & Colors
  theme: 'light' | 'dark' | 'neon' | 'pastel' | 'professional' | 'custom';
  colorPalette: string[];
  useGradients: boolean;
  
  // Chart Appearance
  chartStyle: '2d' | '3d';
  borderRadius: number;
  shadows: boolean;
  shadowIntensity: 'subtle' | 'medium' | 'strong';
  transparency: number;
  
  // Text & Labels
  fontFamily: 'modern' | 'classic' | 'handwritten' | 'monospace';
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  showLabels: boolean;
  showLegend: boolean;
  showValues: boolean;
  showPercentages: boolean;
  labelPosition: 'inside' | 'outside' | 'callout';
  numberFormat: 'full' | 'abbreviated' | 'compact';
  
  // Background
  backgroundColor: string;
  backgroundGradient?: { from: string; to: string; direction: 'vertical' | 'horizontal' };
  gridStyle: 'dotted' | 'dashed' | 'solid' | 'none';
  gridColor: string;
  
  // Layout
  size: 'compact' | 'standard' | 'large' | 'fullscreen';
  aspectRatio: 'square' | 'wide' | 'tall' | 'auto';
  padding: 'tight' | 'normal' | 'spacious';
  
  // Animation
  animationSpeed: 'instant' | 'fast' | 'smooth' | 'slow';
  animationStyle: 'linear' | 'ease' | 'bounce' | 'elastic';
  enableAnimations: boolean;
  
  // Interactive
  enableHover: boolean;
  enableZoom: boolean;
  enableDrillDown: boolean;
  tooltipStyle: 'minimal' | 'detailed' | 'rich';
}

export interface PresetStyle {
  name: string;
  description: string;
  style: VisualizationStyle;
  thumbnail?: string;
}

export type ChartType = 'pie' | 'line' | 'bar' | 'scatter' | 'heatmap' | 'waterfall' | 'gauge' | 'area' | 'donut' | 'treemap' | 'sankey' | 'radar' | 'bubble' | 'funnel';

export type VisualizationType = 'chart' | 'infographic' | 'illustration' | 'dashboard' | 'report';

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }>;
}

export interface VisualizationConfig {
  type: ChartType;
  title: string;
  description?: string;
  data: ChartData;
  style: VisualizationStyle;
  insights?: string[];
  generatedImage?: any; // Generated image data
  imagePrompt?: string; // Prompt used to generate the image
}

export interface SavedVisualization {
  id: string;
  config: VisualizationConfig;
  prompt: string;
  createdAt: string;
  thumbnail?: string;
}

export interface InfographicConfig {
  type: 'portfolio-summary' | 'investment-journey' | 'goal-progress' | 'risk-profile' | 'diversification';
  title: string;
  description?: string;
  data: any;
  template: string;
  generatedAt: string;
}

export interface IllustrationConfig {
  prompt: string;
  imageUrl: string;
  description: string;
  metadata: {
    generatedBy: 'gemini' | 'svg' | 'template';
    tier: 1 | 2 | 3;
    generatedAt: string;
  };
}

// Preset styles
export const PRESET_STYLES: PresetStyle[] = [
  {
    name: 'Minimalist',
    description: 'Clean and simple',
    style: {
      theme: 'light',
      colorPalette: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'],
      useGradients: false,
      chartStyle: '2d',
      borderRadius: 4,
      shadows: false,
      shadowIntensity: 'subtle',
      transparency: 1,
      fontFamily: 'modern',
      fontSize: 'medium',
      showLabels: true,
      showLegend: true,
      showValues: false,
      showPercentages: true,
      labelPosition: 'outside',
      numberFormat: 'abbreviated',
      backgroundColor: '#ffffff',
      gridStyle: 'none',
      gridColor: '#e5e7eb',
      size: 'standard',
      aspectRatio: 'square',
      padding: 'normal',
      animationSpeed: 'fast',
      animationStyle: 'ease',
      enableAnimations: true,
      enableHover: true,
      enableZoom: false,
      enableDrillDown: false,
      tooltipStyle: 'minimal'
    }
  },
  {
    name: 'Bold',
    description: 'Vibrant and eye-catching',
    style: {
      theme: 'neon',
      colorPalette: ['#ff006e', '#fb5607', '#ffbe0b', '#8338ec', '#3a86ff'],
      useGradients: false,
      chartStyle: '3d',
      borderRadius: 12,
      shadows: true,
      shadowIntensity: 'strong',
      transparency: 0.9,
      fontFamily: 'modern',
      fontSize: 'large',
      showLabels: true,
      showLegend: true,
      showValues: true,
      showPercentages: true,
      labelPosition: 'callout',
      numberFormat: 'full',
      backgroundColor: '#1a1a2e',
      gridStyle: 'dotted',
      gridColor: '#16213e',
      size: 'large',
      aspectRatio: 'wide',
      padding: 'spacious',
      animationSpeed: 'smooth',
      animationStyle: 'bounce',
      enableAnimations: true,
      enableHover: true,
      enableZoom: true,
      enableDrillDown: true,
      tooltipStyle: 'rich'
    }
  },
  {
    name: 'Professional',
    description: 'Corporate and polished',
    style: {
      theme: 'professional',
      colorPalette: ['#1e3a8a', '#1e40af', '#1d4ed8', '#2563eb', '#3b82f6'],
      useGradients: false,
      chartStyle: '2d',
      borderRadius: 6,
      shadows: true,
      shadowIntensity: 'subtle',
      transparency: 1,
      fontFamily: 'classic',
      fontSize: 'medium',
      showLabels: true,
      showLegend: true,
      showValues: true,
      showPercentages: true,
      labelPosition: 'outside',
      numberFormat: 'full',
      backgroundColor: '#f9fafb',
      gridStyle: 'solid',
      gridColor: '#d1d5db',
      size: 'standard',
      aspectRatio: 'wide',
      padding: 'normal',
      animationSpeed: 'fast',
      animationStyle: 'ease',
      enableAnimations: true,
      enableHover: true,
      enableZoom: false,
      enableDrillDown: false,
      tooltipStyle: 'detailed'
    }
  },
  {
    name: 'Dark Mode',
    description: 'Easy on the eyes',
    style: {
      theme: 'dark',
      colorPalette: ['#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9'],
      useGradients: false,
      chartStyle: '2d',
      borderRadius: 8,
      shadows: true,
      shadowIntensity: 'medium',
      transparency: 0.95,
      fontFamily: 'modern',
      fontSize: 'medium',
      showLabels: true,
      showLegend: true,
      showValues: true,
      showPercentages: true,
      labelPosition: 'outside',
      numberFormat: 'abbreviated',
      backgroundColor: '#1e1e22',
      backgroundGradient: { from: '#1e1e22', to: '#2a2a2e', direction: 'vertical' },
      gridStyle: 'dashed',
      gridColor: '#3a3a3e',
      size: 'standard',
      aspectRatio: 'square',
      padding: 'normal',
      animationSpeed: 'smooth',
      animationStyle: 'ease',
      enableAnimations: true,
      enableHover: true,
      enableZoom: true,
      enableDrillDown: false,
      tooltipStyle: 'detailed'
    }
  },
  {
    name: 'Pastel',
    description: 'Soft and gentle',
    style: {
      theme: 'pastel',
      colorPalette: ['#fecaca', '#fed7aa', '#fde68a', '#d9f99d', '#a7f3d0'],
      useGradients: false,
      chartStyle: '2d',
      borderRadius: 16,
      shadows: false,
      shadowIntensity: 'subtle',
      transparency: 0.85,
      fontFamily: 'modern',
      fontSize: 'medium',
      showLabels: true,
      showLegend: true,
      showValues: false,
      showPercentages: true,
      labelPosition: 'inside',
      numberFormat: 'compact',
      backgroundColor: '#fef3c7',
      gridStyle: 'none',
      gridColor: '#fde68a',
      size: 'standard',
      aspectRatio: 'square',
      padding: 'spacious',
      animationSpeed: 'slow',
      animationStyle: 'ease',
      enableAnimations: true,
      enableHover: true,
      enableZoom: false,
      enableDrillDown: false,
      tooltipStyle: 'minimal'
    }
  }
];

export const DEFAULT_STYLE: VisualizationStyle = PRESET_STYLES[3].style; // Dark Mode as default

