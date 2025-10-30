import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Svg, Rect, Text as SvgText, Circle, Path, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { ComprehensivePortfolioContext } from '../../utils/portfolioContextService';

const { width: screenWidth } = Dimensions.get('window');

interface PortfolioSummaryPosterProps {
  context: ComprehensivePortfolioContext;
  width?: number;
  height?: number;
}

export const PortfolioSummaryPoster: React.FC<PortfolioSummaryPosterProps> = ({ 
  context, 
  width = screenWidth - 20, 
  height = 600 
}) => {
  const { metrics, holdings, goals } = context;
  const isPositive = metrics.totalGainLossPercentage >= 0;
  const gainColor = isPositive ? '#4CAF50' : '#F44336';

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="headerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#1a1a1a" stopOpacity="1" />
            <Stop offset="100%" stopColor="#2d2d2d" stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="cardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#f8f9fa" stopOpacity="1" />
            <Stop offset="100%" stopColor="#e9ecef" stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Header */}
        <Rect width={width} height={120} fill="url(#headerGradient)" />
        <SvgText
          x={width / 2}
          y={40}
          fontSize="24"
          fill="white"
          textAnchor="middle"
          fontWeight="bold"
        >
          Portfolio Summary
        </SvgText>
        <SvgText
          x={width / 2}
          y={65}
          fontSize="32"
          fill={gainColor}
          textAnchor="middle"
          fontWeight="bold"
        >
          ${metrics.totalValue.toLocaleString()}
        </SvgText>
        <SvgText
          x={width / 2}
          y={90}
          fontSize="16"
          fill="#b8b8d2"
          textAnchor="middle"
        >
          {isPositive ? '+' : ''}{(metrics.totalGainLossPercentage || 0).toFixed(1)}% • {(metrics.totalGainLoss || 0) >= 0 ? '+' : ''}${(metrics.totalGainLoss || 0).toLocaleString()}
        </SvgText>

        {/* Key Metrics Cards */}
        <G transform="translate(20, 140)">
          {/* Total Value Card */}
          <Rect width={width / 2 - 30} height={80} rx="8" fill="url(#cardGradient)" stroke="#dee2e6" strokeWidth="1" />
          <SvgText x={15} y={25} fontSize="12" fill="#6c757d" fontWeight="bold">TOTAL VALUE</SvgText>
          <SvgText x={15} y={45} fontSize="20" fill="#212529" fontWeight="bold">${metrics.totalValue.toLocaleString()}</SvgText>
          <SvgText x={15} y={60} fontSize="10" fill="#6c757d">Current Portfolio Value</SvgText>

          {/* Gain/Loss Card */}
          <Rect x={width / 2 - 10} width={width / 2 - 30} height={80} rx="8" fill="url(#cardGradient)" stroke="#dee2e6" strokeWidth="1" />
          <SvgText x={width / 2 + 5} y={25} fontSize="12" fill="#6c757d" fontWeight="bold">GAIN/LOSS</SvgText>
          <SvgText x={width / 2 + 5} y={45} fontSize="20} fill={gainColor} fontWeight="bold">
            {isPositive ? '+' : ''}{(metrics.totalGainLossPercentage || 0).toFixed(1)}%
          </SvgText>
          <SvgText x={width / 2 + 5} y={60} fontSize="10" fill="#6c757d">Total Return</SvgText>
        </G>

        {/* Holdings Overview */}
        <G transform="translate(20, 240)">
          <SvgText x={0} y={0} fontSize="18} fill="#212529" fontWeight="bold">Holdings Overview</SvgText>
          <SvgText x={0} y={20} fontSize="14} fill="#6c757d">{holdings.length} investments across {Object.keys(metrics.sectorAllocation).length} sectors</SvgText>
          
          {/* Top 3 Holdings */}
          <G transform="translate(0, 40)">
            {holdings.slice(0, 3).map((holding, index) => (
              <G key={index} transform={`translate(0, ${index * 35})`}>
                <Rect width={width - 40} height={30} rx="4" fill="#f8f9fa" stroke="#dee2e6" strokeWidth="1" />
                <SvgText x={10} y={20} fontSize="14} fill="#212529" fontWeight="bold">{holding.ticker}</SvgText>
                <SvgText x={width - 150} y={20} fontSize="12} fill="#6c757d">${holding.totalValue.toLocaleString()}</SvgText>
                <SvgText x={width - 80} y={20} fontSize="12} fill={holding.totalGainLossPercentage >= 0 ? '#4CAF50' : '#F44336'}>
                  {(holding.totalGainLossPercentage || 0) >= 0 ? '+' : ''}{(holding.totalGainLossPercentage || 0).toFixed(1)}%
                </SvgText>
              </G>
            ))}
          </G>
        </G>

        {/* Risk & Diversification */}
        <G transform="translate(20, 400)">
          <SvgText x={0} y={0} fontSize="18} fill="#212529" fontWeight="bold">Risk Profile</SvgText>
          
          {/* Risk Level Indicator */}
          <G transform="translate(0, 25)">
            <Rect width={120} height={30} rx="15" fill={metrics.riskLevel === 'conservative' ? '#4CAF50' : metrics.riskLevel === 'moderate' ? '#FF9800' : '#F44336'} />
            <SvgText x={60} y={20} fontSize="12} fill="white" textAnchor="middle" fontWeight="bold">
              {metrics.riskLevel.toUpperCase()}
            </SvgText>
          </G>

          {/* Diversification Score */}
          <G transform="translate(140, 25)">
            <SvgText x={0} y={15} fontSize="12} fill="#6c757d">Diversification</SvgText>
            <Rect width={100} height={8} rx="4" fill="#e9ecef" />
            <Rect width={100 * metrics.diversificationScore} height={8} rx="4" fill="#4CAF50" />
            <SvgText x={110} y={15} fontSize="10} fill="#6c757d">{((metrics.diversificationScore || 0) * 100).toFixed(0)}%</SvgText>
          </G>
        </G>

        {/* Goals Progress */}
        {goals.planProgress.length > 0 && (
          <G transform="translate(20, 480)">
            <SvgText x={0} y={0} fontSize="18} fill="#212529" fontWeight="bold">Investment Goals</SvgText>
            <G transform="translate(0, 25)">
              {goals.planProgress.slice(0, 2).map((goal, index) => (
                <G key={index} transform={`translate(0, ${index * 40})`}>
                  <SvgText x={0} y={15} fontSize="12} fill="#6c757d">{goal.plan.name}</SvgText>
                  <Rect width={width - 40} height={8} rx="4" fill="#e9ecef" />
                  <Rect width={(width - 40) * Math.min(goal.percentComplete / 100, 1)} height={8} rx="4" fill="#4CAF50" />
                  <SvgText x={width - 50} y={15} fontSize="10} fill="#6c757d">{(goal.percentComplete || 0).toFixed(0)}%</SvgText>
                </G>
              ))}
            </G>
          </G>
        )}

        {/* Footer */}
        <G transform={`translate(20, ${height - 30})`}>
          <SvgText x={0} y={0} fontSize="10} fill="#6c757d">
            Generated on {new Date().toLocaleDateString()} • Portfolio Analysis
          </SvgText>
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
