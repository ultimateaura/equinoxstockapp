import { VisualizationConfig } from '@/types/visualization';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

export interface ExportOptions {
  format: 'png' | 'jpg' | 'pdf' | 'svg';
  quality: 'standard' | 'hd' | 'print';
  includeWatermark: boolean;
  customResolution?: {
    width: number;
    height: number;
  };
}

export interface ShareOptions {
  platforms: ('instagram' | 'twitter' | 'linkedin' | 'facebook' | 'whatsapp')[];
  includeCaption: boolean;
  customCaption?: string;
}

export class ExportService {
  /**
   * Export visualization as image
   */
  async exportAsImage(
    config: VisualizationConfig,
    options: ExportOptions
  ): Promise<string> {
    try {
      // In a real implementation, you would:
      // 1. Render the chart to a canvas
      // 2. Convert to image format
      // 3. Apply quality settings
      // 4. Add watermark if requested
      
      const fileName = `visualization_${Date.now()}.${options.format}`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      // For now, create a placeholder file
      // In a real app, you'd use a chart rendering library like react-native-chart-kit
      // or react-native-svg to generate the actual image
      await FileSystem.writeAsStringAsync(fileUri, 'placeholder image data');
      
      return fileUri;
    } catch (error) {
      console.error('Error exporting image:', error);
      throw new Error('Failed to export visualization');
    }
  }

  /**
   * Export visualization as PDF
   */
  async exportAsPDF(
    config: VisualizationConfig,
    options: ExportOptions
  ): Promise<string> {
    try {
      const fileName = `visualization_${Date.now()}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      // In a real implementation, you would:
      // 1. Generate PDF with chart and metadata
      // 2. Include title, description, and insights
      // 3. Add timestamp and source information
      
      await FileSystem.writeAsStringAsync(fileUri, 'placeholder PDF data');
      
      return fileUri;
    } catch (error) {
      console.error('Error exporting PDF:', error);
      throw new Error('Failed to export PDF');
    }
  }

  /**
   * Export visualization as SVG
   */
  async exportAsSVG(
    config: VisualizationConfig,
    options: ExportOptions
  ): Promise<string> {
    try {
      const fileName = `visualization_${Date.now()}.svg`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      // Generate SVG markup for the chart
      const svgContent = this.generateSVG(config);
      await FileSystem.writeAsStringAsync(fileUri, svgContent);
      
      return fileUri;
    } catch (error) {
      console.error('Error exporting SVG:', error);
      throw new Error('Failed to export SVG');
    }
  }

  /**
   * Save to device gallery
   */
  async saveToGallery(fileUri: string): Promise<void> {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to save to gallery');
        return;
      }

      await MediaLibrary.saveToLibraryAsync(fileUri);
      Alert.alert('Success', 'Visualization saved to gallery');
    } catch (error) {
      console.error('Error saving to gallery:', error);
      Alert.alert('Error', 'Failed to save to gallery');
    }
  }

  /**
   * Share visualization
   */
  async shareVisualization(
    fileUri: string,
    config: VisualizationConfig,
    options: ShareOptions
  ): Promise<void> {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (!isAvailable) {
        Alert.alert('Sharing not available', 'Sharing is not available on this device');
        return;
      }

      const shareOptions = {
        mimeType: this.getMimeType(fileUri),
        dialogTitle: 'Share Visualization',
        UTI: this.getUTI(fileUri)
      };

      await Sharing.shareAsync(fileUri, shareOptions);
    } catch (error) {
      console.error('Error sharing visualization:', error);
      Alert.alert('Error', 'Failed to share visualization');
    }
  }

  /**
   * Share to specific social platform
   */
  async shareToSocial(
    fileUri: string,
    platform: string,
    caption?: string
  ): Promise<void> {
    try {
      const shareUrl = this.getSocialShareUrl(platform, caption);
      
      if (shareUrl) {
        // In a real implementation, you would use platform-specific sharing APIs
        await Sharing.shareAsync(shareUrl);
      } else {
        await Sharing.shareAsync(fileUri);
      }
    } catch (error) {
      console.error('Error sharing to social:', error);
      Alert.alert('Error', 'Failed to share to social media');
    }
  }

  /**
   * Generate social media optimized versions
   */
  async generateSocialFormats(
    config: VisualizationConfig,
    platforms: string[]
  ): Promise<{ [platform: string]: string }> {
    const formats: { [platform: string]: string } = {};

    for (const platform of platforms) {
      const dimensions = this.getSocialDimensions(platform);
      const fileName = `visualization_${platform}_${Date.now()}.png`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      // Generate platform-specific format
      await FileSystem.writeAsStringAsync(fileUri, `placeholder for ${platform}`);
      formats[platform] = fileUri;
    }

    return formats;
  }

  /**
   * Generate SVG markup for the chart
   */
  private generateSVG(config: VisualizationConfig): string {
    const { title, data, style } = config;
    const width = 800;
    const height = 600;

    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Background
    svg += `<rect width="${width}" height="${height}" fill="${style.backgroundColor}"/>`;
    
    // Title
    svg += `<text x="${width/2}" y="30" text-anchor="middle" font-family="${style.fontFamily}" font-size="20" fill="#ffffff">${title}</text>`;
    
    // Chart content based on type
    if (config.type === 'pie') {
      this.generatePieSVG(svg, data, style, width, height);
    } else if (config.type === 'bar') {
      this.generateBarSVG(svg, data, style, width, height);
    } else if (config.type === 'line') {
      this.generateLineSVG(svg, data, style, width, height);
    }
    
    svg += '</svg>';
    return svg;
  }

  private generatePieSVG(svg: string, data: any, style: any, width: number, height: number): string {
    // Simplified pie chart generation
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;
    
    let currentAngle = 0;
    const total = data.datasets[0].data.reduce((sum: number, value: number) => sum + value, 0);
    
    data.labels.forEach((label: string, index: number) => {
      const value = data.datasets[0].data[index];
      const angle = (value / total) * 360;
      
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      
      const x1 = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
      const y1 = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
      const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
      const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180);
      
      const largeArcFlag = angle > 180 ? 1 : 0;
      const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
      
      const color = Array.isArray(data.datasets[0].backgroundColor) 
        ? data.datasets[0].backgroundColor[index] 
        : style.colorPalette[index % style.colorPalette.length];
      
      svg += `<path d="${pathData}" fill="${color}" stroke="#ffffff" stroke-width="2"/>`;
      
      currentAngle += angle;
    });
    
    return svg;
  }

  private generateBarSVG(svg: string, data: any, style: any, width: number, height: number): string {
    // Simplified bar chart generation
    const barWidth = width / data.labels.length * 0.8;
    const maxValue = Math.max(...data.datasets[0].data);
    
    data.labels.forEach((label: string, index: number) => {
      const value = data.datasets[0].data[index];
      const barHeight = (value / maxValue) * (height - 100);
      const x = (index * width) / data.labels.length + (width / data.labels.length - barWidth) / 2;
      const y = height - barHeight - 50;
      
      const color = Array.isArray(data.datasets[0].backgroundColor) 
        ? data.datasets[0].backgroundColor[index] 
        : style.colorPalette[index % style.colorPalette.length];
      
      svg += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}"/>`;
    });
    
    return svg;
  }

  private generateLineSVG(svg: string, data: any, style: any, width: number, height: number): string {
    // Simplified line chart generation
    const maxValue = Math.max(...data.datasets[0].data);
    const minValue = Math.min(...data.datasets[0].data);
    const range = maxValue - minValue;
    
    let pathData = '';
    data.datasets[0].data.forEach((value: number, index: number) => {
      const x = (index * width) / (data.datasets[0].data.length - 1);
      const y = height - 50 - ((value - minValue) / range) * (height - 100);
      
      if (index === 0) {
        pathData += `M ${x} ${y}`;
      } else {
        pathData += ` L ${x} ${y}`;
      }
    });
    
    const color = style.colorPalette[0];
    svg += `<path d="${pathData}" stroke="${color}" stroke-width="3" fill="none"/>`;
    
    return svg;
  }

  /**
   * Get MIME type for file
   */
  private getMimeType(fileUri: string): string {
    if (fileUri.endsWith('.png')) return 'image/png';
    if (fileUri.endsWith('.jpg') || fileUri.endsWith('.jpeg')) return 'image/jpeg';
    if (fileUri.endsWith('.pdf')) return 'application/pdf';
    if (fileUri.endsWith('.svg')) return 'image/svg+xml';
    return 'application/octet-stream';
  }

  /**
   * Get UTI for file
   */
  private getUTI(fileUri: string): string {
    if (fileUri.endsWith('.png')) return 'public.png';
    if (fileUri.endsWith('.jpg') || fileUri.endsWith('.jpeg')) return 'public.jpeg';
    if (fileUri.endsWith('.pdf')) return 'com.adobe.pdf';
    if (fileUri.endsWith('.svg')) return 'public.svg-image';
    return 'public.data';
  }

  /**
   * Get social share URL
   */
  private getSocialShareUrl(platform: string, caption?: string): string | null {
    const encodedCaption = caption ? encodeURIComponent(caption) : '';
    
    switch (platform) {
      case 'twitter':
        return `https://twitter.com/intent/tweet?text=${encodedCaption}`;
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${encodedCaption}`;
      case 'linkedin':
        return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedCaption}`;
      default:
        return null;
    }
  }

  /**
   * Get social media dimensions
   */
  private getSocialDimensions(platform: string): { width: number; height: number } {
    switch (platform) {
      case 'instagram':
        return { width: 1080, height: 1080 }; // Square
      case 'twitter':
        return { width: 1200, height: 675 }; // 16:9
      case 'linkedin':
        return { width: 1200, height: 627 }; // 1.91:1
      case 'facebook':
        return { width: 1200, height: 630 }; // 1.91:1
      default:
        return { width: 800, height: 600 };
    }
  }

  /**
   * Generate export preview
   */
  generateExportPreview(config: VisualizationConfig, format: string): string {
    return `Preview of ${config.title} as ${format.toUpperCase()}`;
  }

  /**
   * Get export file size estimate
   */
  getFileSizeEstimate(format: string, quality: string): string {
    const baseSizes: { [key: string]: { [quality: string]: string } } = {
      png: { standard: '500KB', hd: '2MB', print: '5MB' },
      jpg: { standard: '200KB', hd: '800KB', print: '2MB' },
      pdf: { standard: '1MB', hd: '3MB', print: '8MB' },
      svg: { standard: '50KB', hd: '100KB', print: '200KB' }
    };

    return baseSizes[format]?.[quality] || 'Unknown';
  }
}

export const exportService = new ExportService();
