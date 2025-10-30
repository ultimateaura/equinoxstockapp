import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Svg, Rect, Text as SvgText, Circle, Path, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { ComprehensivePortfolioContext } from '../../utils/portfolioContextService';

const { width: screenWidth } = Dimensions.get('window');

interface GoalProgressInfographicProps {
  context: ComprehensivePortfolioContext;
  width?: number;
  height?: number;
}

export const GoalProgressInfographic: React.FC<GoalProgressInfographicProps> = ({ 
  context, 
  width = screenWidth - 20, 
  height = 500 
}) => {
  const { metrics, goals } = context;
  const totalGoalValue = goals.planProgress.reduce((sum, goal) => sum + goal.plan.targetAmount, 0);
  const totalProgress = goals.planProgress.reduce((sum, goal) => sum + (goal.plan.targetAmount * goal.percentComplete / 100), 0);
  const overallProgress = totalGoalValue > 0 ? (totalProgress / totalGoalValue) * 100 : 0;

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="headerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#4CAF50" stopOpacity="1" />
            <Stop offset="100%" stopColor="#2E7D32" stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#4CAF50" stopOpacity="1" />
            <Stop offset="100%" stopColor="#8BC34A" stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Header */}
        <Rect width={width} height={100} fill="url(#headerGradient)" />
        <SvgText
          x={width / 2}
          y={35}
          fontSize="24"
          fill="white"
          textAnchor="middle"
          fontWeight="bold"
        >
          Investment Goals Progress
        </SvgText>
        <SvgText
          x={width / 2}
          y={60}
          fontSize="16"
          fill="#E8F5E8"
          textAnchor="middle"
        >
          Track your journey to financial success
        </SvgText>
        <SvgText
          x={width / 2}
          y={80}
          fontSize="14"
          fill="#E8F5E8"
          textAnchor="middle"
        >
          {goals.overallOnTrack ? '🎯 On Track!' : '⚠️ Needs Attention'}
        </SvgText>

        {/* Overall Progress Circle */}
        <G transform={`translate(${width / 2}, 180)`}>
          <Circle
            cx={0}
            cy={0}
            r={60}
            fill="none"
            stroke="#E0E0E0"
            strokeWidth="8"
          />
          <Path
            d={`M 0 -60 A 60 60 0 ${overallProgress > 50 ? 1 : 0} 1 ${60 * Math.cos((overallProgress * 3.6 - 90) * Math.PI / 180)} ${60 * Math.sin((overallProgress * 3.6 - 90) * Math.PI / 180)}`}
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <SvgText
            x={0}
            y={-5}
            fontSize="20}
            fill="#2E7D32"
            textAnchor="middle"
            fontWeight="bold"
          >
            {(overallProgress || 0).toFixed(0)}%
          </SvgText>
          <SvgText
            x={0}
            y={15}
            fontSize="12}
            fill="#666"
            textAnchor="middle"
          >
            Complete
          </SvgText>
        </G>

        {/* Individual Goals */}
        <G transform="translate(20, 300)">
          {goals.planProgress.map((goal, index) => (
            <G key={index} transform={`translate(0, ${index * 80})`}>
              {/* Goal Card */}
              <Rect
                width={width - 40}
                height={70}
                rx="8"
                fill="#F8F9FA"
                stroke="#E9ECEF"
                strokeWidth="1"
              />
              
              {/* Goal Name */}
              <SvgText
                x={15}
                y={20}
                fontSize="14}
                fill="#212529"
                fontWeight="bold"
              >
                {goal.plan.name}
              </SvgText>
              
              {/* Target Amount */}
              <SvgText
                x={15}
                y={35}
                fontSize="12}
                fill="#6C757D"
              >
                Target: ${goal.plan.targetAmount.toLocaleString()}
              </SvgText>
              
              {/* Progress Bar */}
              <Rect
                x={15}
                y={45}
                width={width - 70}
                height={8}
                rx="4"
                fill="#E9ECEF"
              />
              <Rect
                x={15}
                y={45}
                width={(width - 70) * Math.min(goal.percentComplete / 100, 1)}
                height={8}
                rx="4"
                fill={goal.onTrack ? '#4CAF50' : '#FF9800'}
              />
              
              {/* Progress Percentage */}
              <SvgText
                x={width - 55}
                y={35}
                fontSize="12}
                fill={goal.onTrack ? '#4CAF50' : '#FF9800'}
                fontWeight="bold"
              >
                {(goal.percentComplete || 0).toFixed(0)}%
              </SvgText>
              
              {/* Status Icon */}
              <SvgText
                x={width - 25}
                y={20}
                fontSize="16}
              >
                {goal.onTrack ? '✅' : '⚠️'}
              </SvgText>
            </G>
          ))}
        </G>

        {/* Summary Stats */}
        <G transform={`translate(20, ${height - 60})`}>
          <Rect
            width={width - 40}
            height={40}
            rx="6"
            fill="#E3F2FD"
            stroke="#2196F3"
            strokeWidth="1"
          />
          <SvgText
            x={15}
            y={20}
            fontSize="12}
            fill="#1976D2"
            fontWeight="bold"
          >
            💡 Insight: {goals.overallOnTrack 
              ? `You're making great progress! Keep up the consistent contributions.`
              : `Consider increasing your monthly contributions to stay on track with your goals.`
            }
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
