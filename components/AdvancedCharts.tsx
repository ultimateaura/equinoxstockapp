import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Circle, G, Path, Rect, Svg, Text as SvgText } from 'react-native-svg';
import { EnrichedHolding } from '../utils/portfolioContextService';

const { width: screenWidth } = Dimensions.get('window');

interface TreemapChartProps {
  holdings: EnrichedHolding[];
  width?: number;
  height?: number;
}

export const TreemapChart: React.FC<TreemapChartProps> = ({ 
  holdings, 
  width = screenWidth - 40, 
  height = 300 
}) => {
  const totalValue = holdings.reduce((sum, h) => sum + (h.totalValue || 0), 0);
  const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#795548'];

  // Calculate treemap rectangles
  const rectangles = calculateTreemapRectangles(holdings, width, height);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Portfolio Allocation (Treemap)</Text>
      <Svg width={width} height={height}>
        {rectangles.map((rect, index) => (
          <G key={index}>
            <Rect
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              fill={colors[index % colors.length]}
              stroke="#fff"
              strokeWidth={1}
            />
            <SvgText
              x={rect.x + rect.width / 2}
              y={rect.y + rect.height / 2}
              fontSize="12"
              fill="white"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {rect.ticker}
            </SvgText>
            <SvgText
              x={rect.x + rect.width / 2}
              y={rect.y + rect.height / 2 + 15}
              fontSize="10"
              fill="white"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {(rect.percentage || 0).toFixed(1)}%
            </SvgText>
          </G>
        ))}
      </Svg>
    </View>
  );
};

interface HeatmapChartProps {
  holdings: EnrichedHolding[];
  width?: number;
  height?: number;
}

export const HeatmapChart: React.FC<HeatmapChartProps> = ({ 
  holdings, 
  width = screenWidth - 40, 
  height = 300 
}) => {
  const cellSize = Math.min(width / holdings.length, height / holdings.length, 40);
  const actualWidth = cellSize * holdings.length;
  const actualHeight = cellSize * holdings.length;

  // Calculate correlation matrix (simplified)
  const correlationMatrix = calculateCorrelationMatrix(holdings);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Correlation Heatmap</Text>
      <Svg width={actualWidth} height={actualHeight}>
        {holdings.map((holding, i) => (
          <G key={i}>
            {holdings.map((_, j) => {
              const correlation = correlationMatrix[i][j];
              const intensity = Math.abs(correlation);
              const color = correlation > 0 
                ? `rgba(76, 175, 80, ${intensity})` 
                : `rgba(244, 67, 54, ${intensity})`;
              
              return (
                <Rect
                  key={`${i}-${j}`}
                  x={j * cellSize}
                  y={i * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill={color}
                  stroke="#fff"
                  strokeWidth={0.5}
                />
              );
            })}
          </G>
        ))}
        
        {/* Labels */}
        {holdings.map((holding, i) => (
          <G key={`label-${i}`}>
            <SvgText
              x={i * cellSize + cellSize / 2}
              y={-5}
              fontSize="10"
              fill="#333"
              textAnchor="middle"
            >
              {holding.ticker}
            </SvgText>
            <SvgText
              x={-5}
              y={i * cellSize + cellSize / 2}
              fontSize="10"
              fill="#333"
              textAnchor="end"
              dominantBaseline="middle"
            >
              {holding.ticker}
            </SvgText>
          </G>
        ))}
      </Svg>
    </View>
  );
};

interface RadarChartProps {
  holdings: EnrichedHolding[];
  width?: number;
  height?: number;
}

export const RadarChart: React.FC<RadarChartProps> = ({ 
  holdings, 
  width = screenWidth - 40, 
  height = 300 
}) => {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 40;
  const metrics = ['Return', 'Risk', 'Volatility', 'Beta', 'Dividend'];
  
  // Calculate average metrics for portfolio
  const avgReturn = holdings.length > 0 ? holdings.reduce((sum, h) => sum + (h.totalGainLossPercentage || 0), 0) / holdings.length : 0;
  const avgRisk = holdings.length > 0 ? holdings.reduce((sum, h) => sum + (h.volatility || 0.3), 0) / holdings.length : 0.3;
  const avgVolatility = avgRisk;
  const avgBeta = holdings.length > 0 ? holdings.reduce((sum, h) => sum + (h.beta || 1.0), 0) / holdings.length : 1.0;
  const avgDividend = holdings.length > 0 ? holdings.reduce((sum, h) => sum + (h.dividendYield || 0), 0) / holdings.length : 0;

  const values = [
    Math.max(0, Math.min(1, (avgReturn + 50) / 100)), // Normalize return
    Math.max(0, Math.min(1, 1 - avgRisk)), // Invert risk (lower is better)
    Math.max(0, Math.min(1, 1 - avgVolatility)), // Invert volatility
    Math.max(0, Math.min(1, 1 - Math.abs(avgBeta - 1))), // Beta closer to 1 is better
    Math.max(0, Math.min(1, avgDividend * 50)) // Scale dividend yield
  ];

  const points = metrics.map((_, i) => {
    const angle = (i * 2 * Math.PI) / metrics.length - Math.PI / 2;
    const value = values[i];
    const x = centerX + Math.cos(angle) * radius * value;
    const y = centerY + Math.sin(angle) * radius * value;
    return { x, y };
  });

  const pathData = points.map((point, i) => 
    `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ') + ' Z';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Portfolio Risk Profile</Text>
      <Svg width={width} height={height}>
        {/* Grid circles */}
        {[0.2, 0.4, 0.6, 0.8, 1.0].map((scale, i) => (
          <Circle
            key={i}
            cx={centerX}
            cy={centerY}
            r={radius * scale}
            fill="none"
            stroke="#e0e0e0"
            strokeWidth={1}
          />
        ))}
        
        {/* Grid lines */}
        {metrics.map((_, i) => {
          const angle = (i * 2 * Math.PI) / metrics.length - Math.PI / 2;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          return (
            <Path
              key={i}
              d={`M ${centerX} ${centerY} L ${x} ${y}`}
              stroke="#e0e0e0"
              strokeWidth={1}
            />
          );
        })}
        
        {/* Data area */}
        <Path
          d={pathData}
          fill="rgba(76, 175, 80, 0.3)"
          stroke="#4CAF50"
          strokeWidth={2}
        />
        
        {/* Data points */}
        {points.map((point, i) => (
          <Circle
            key={i}
            cx={point.x}
            cy={point.y}
            r={4}
            fill="#4CAF50"
          />
        ))}
        
        {/* Labels */}
        {metrics.map((metric, i) => {
          const angle = (i * 2 * Math.PI) / metrics.length - Math.PI / 2;
          const x = centerX + Math.cos(angle) * (radius + 20);
          const y = centerY + Math.sin(angle) * (radius + 20);
          return (
            <SvgText
              key={i}
              x={x}
              y={y}
              fontSize="12"
              fill="#333"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {metric}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
};

interface BubbleChartProps {
  holdings: EnrichedHolding[];
  width?: number;
  height?: number;
}

export const BubbleChart: React.FC<BubbleChartProps> = ({ 
  holdings, 
  width = screenWidth - 40, 
  height = 300 
}) => {
  const margin = 40;
  const chartWidth = width - 2 * margin;
  const chartHeight = height - 2 * margin;

  // Calculate bubble positions and sizes
  const bubbles = holdings.map(holding => {
    const returnValue = holding.totalGainLossPercentage || 0;
    const riskValue = holding.volatility || 0.3;
    const sizeValue = holding.totalValue || 0;
    
    // Normalize values
    const x = margin + (returnValue + 50) / 100 * chartWidth; // -50% to +50% return
    const y = margin + (1 - riskValue) * chartHeight; // Invert risk (lower is higher on chart)
    const radius = Math.max(8, Math.min(30, Math.sqrt(sizeValue) / 100)); // Size based on value
    
    return {
      x: Math.max(margin, Math.min(width - margin, x)),
      y: Math.max(margin, Math.min(height - margin, y)),
      radius,
      holding
    };
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Risk vs Return (Bubble Chart)</Text>
      <Svg width={width} height={height}>
        {/* Axes */}
        <Path
          d={`M ${margin} ${margin} L ${margin} ${height - margin} L ${width - margin} ${height - margin}`}
          stroke="#333"
          strokeWidth={2}
        />
        
        {/* Bubbles */}
        {bubbles.map((bubble, i) => (
          <G key={i}>
            <Circle
              cx={bubble.x}
              cy={bubble.y}
              r={bubble.radius}
              fill="rgba(76, 175, 80, 0.6)"
              stroke="#4CAF50"
              strokeWidth={2}
            />
            <SvgText
              x={bubble.x}
              y={bubble.y}
              fontSize="10"
              fill="white"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {bubble.holding.ticker}
            </SvgText>
          </G>
        ))}
        
        {/* Labels */}
        <SvgText
          x={width / 2}
          y={height - 10}
          fontSize="12"
          fill="#333"
          textAnchor="middle"
        >
          Return %
        </SvgText>
        <SvgText
          x={10}
          y={height / 2}
          fontSize="12"
          fill="#333"
          textAnchor="middle"
          transform={`rotate(-90, 10, ${height / 2})`}
        >
          Risk Level
        </SvgText>
      </Svg>
    </View>
  );
};

// Helper functions
function calculateTreemapRectangles(holdings: EnrichedHolding[], width: number, height: number) {
  const totalValue = holdings.reduce((sum, h) => sum + (h.totalValue || 0), 0);
  const sortedHoldings = [...holdings].sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0));
  
  const rectangles = [];
  let currentX = 0;
  let currentY = 0;
  let currentRowHeight = 0;
  let currentRowWidth = 0;
  
  for (let i = 0; i < sortedHoldings.length; i++) {
    const holding = sortedHoldings[i];
    const holdingValue = holding.totalValue || 0;
    const percentage = totalValue > 0 ? (holdingValue / totalValue) * 100 : 0;
    const rectWidth = totalValue > 0 ? (holdingValue / totalValue) * width : 0;
    const rectHeight = Math.max(30, rectWidth * 0.6); // Maintain aspect ratio
    
    rectangles.push({
      x: currentX,
      y: currentY,
      width: rectWidth,
      height: rectHeight,
      ticker: holding.ticker,
      percentage
    });
    
    currentX += rectWidth;
    currentRowHeight = Math.max(currentRowHeight, rectHeight);
    
    // Start new row if needed
    if (currentX >= width || i === sortedHoldings.length - 1) {
      currentY += currentRowHeight + 5;
      currentX = 0;
      currentRowHeight = 0;
    }
  }
  
  return rectangles;
}

function calculateCorrelationMatrix(holdings: EnrichedHolding[]): number[][] {
  const n = holdings.length;
  const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1; // Perfect correlation with itself
      } else {
        // Simplified correlation based on sector similarity
        const sameSector = holdings[i].sector === holdings[j].sector;
        const performanceSimilarity = Math.abs(
          (holdings[i].totalGainLossPercentage || 0) - (holdings[j].totalGainLossPercentage || 0)
        ) < 10; // Within 10% performance
        
        if (sameSector && performanceSimilarity) {
          matrix[i][j] = 0.8;
        } else if (sameSector || performanceSimilarity) {
          matrix[i][j] = 0.5;
        } else {
          matrix[i][j] = 0.2;
        }
      }
    }
  }
  
  return matrix;
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
});
