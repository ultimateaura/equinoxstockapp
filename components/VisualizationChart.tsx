import { VisualizationConfig } from '@/types/visualization';
import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { Text } from 'react-native-paper';

interface VisualizationChartProps {
  config: VisualizationConfig;
}

export const VisualizationChart: React.FC<VisualizationChartProps> = ({ config }) => {
  const { type, title, description, data, style, insights } = config;
  const screenWidth = Dimensions.get('window').width;

  const getChartWidth = () => {
    switch (style.size) {
      case 'compact': return screenWidth * 0.7;
      case 'large': return screenWidth * 0.95;
      case 'fullscreen': return screenWidth;
      default: return screenWidth * 0.85;
    }
  };

  const getFontSize = () => {
    switch (style.fontSize) {
      case 'small': return 10;
      case 'large': return 16;
      case 'xlarge': return 20;
      default: return 12;
    }
  };

  const renderPieChart = () => {
    const pieData = data.labels.map((label, index) => ({
      value: data.datasets[0].data[index],
      color: Array.isArray(data.datasets[0].backgroundColor) 
        ? data.datasets[0].backgroundColor[index] 
        : style.colorPalette[index % style.colorPalette.length],
      text: label,
      label: style.showLabels ? label : undefined
    }));

    return (
      <View style={styles.chartContainer}>
        <PieChart
          data={pieData}
          radius={style.size === 'compact' ? 80 : style.size === 'large' ? 120 : 100}
          innerRadius={type === 'donut' ? (style.size === 'compact' ? 40 : 60) : 0}
          showText={style.showPercentages}
          textColor="#ffffff"
          textSize={getFontSize()}
          focusOnPress={style.enableHover}
          showValuesAsLabels={style.showValues}
          centerLabelComponent={type === 'donut' ? () => (
            <View style={styles.centerLabel}>
              <Text style={styles.centerLabelText}>Total</Text>
              <Text style={styles.centerLabelValue}>
                ${data.datasets[0].data.reduce((a, b) => a + b, 0).toFixed(0)}
              </Text>
            </View>
          ) : undefined}
        />
        {style.showLegend && (
          <View style={styles.legendContainer}>
            {pieData.map((item, index) => (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{item.text}</Text>
                {style.showValues && (
                  <Text style={styles.legendValue}>${item.value.toFixed(2)}</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderBarChart = () => {
    const barData = data.labels.map((label, index) => ({
      value: data.datasets[0].data[index],
      label: style.showLabels ? label : '',
      frontColor: Array.isArray(data.datasets[0].backgroundColor)
        ? data.datasets[0].backgroundColor[index]
        : style.colorPalette[0],
      labelTextStyle: { color: style.theme === 'dark' ? '#b8b8d2' : '#666', fontSize: getFontSize() }
    }));

    return (
      <View style={styles.chartContainer}>
        <BarChart
          data={barData}
          width={getChartWidth() - 40}
          height={220}
          barWidth={style.size === 'compact' ? 20 : 30}
          spacing={style.padding === 'tight' ? 10 : style.padding === 'spacious' ? 30 : 20}
          roundedTop={style.borderRadius > 0}
          roundedBottom={style.borderRadius > 0}
          xAxisThickness={style.gridStyle !== 'none' ? 1 : 0}
          yAxisThickness={style.gridStyle !== 'none' ? 1 : 0}
          xAxisColor={style.gridColor}
          yAxisColor={style.gridColor}
          yAxisTextStyle={{ color: style.theme === 'dark' ? '#b8b8d2' : '#666', fontSize: getFontSize() }}
          noOfSections={5}
          maxValue={Math.max(...data.datasets[0].data) * 1.2}
          isAnimated={style.enableAnimations}
          animationDuration={style.animationSpeed === 'fast' ? 500 : style.animationSpeed === 'slow' ? 2000 : 1000}
          showGradient={false}
          frontColor={style.colorPalette[0]}
        />
      </View>
    );
  };

  const renderLineChart = () => {
    const lineData = data.labels.map((label, index) => ({
      value: data.datasets[0].data[index],
      label: style.showLabels ? label : '',
      dataPointText: style.showValues ? data.datasets[0].data[index].toString() : undefined,
      labelTextStyle: { color: style.theme === 'dark' ? '#b8b8d2' : '#666', fontSize: getFontSize() }
    }));

    return (
      <View style={styles.chartContainer}>
        <LineChart
          data={lineData}
          width={getChartWidth() - 40}
          height={220}
          spacing={style.padding === 'tight' ? 30 : style.padding === 'spacious' ? 60 : 45}
          thickness={3}
          color={style.colorPalette[0]}
          curved={style.animationStyle === 'ease'}
          areaChart={type === 'area'}
          startFillColor={style.colorPalette[0]}
          startOpacity={0.3}
          endOpacity={0.1}
          xAxisThickness={style.gridStyle !== 'none' ? 1 : 0}
          yAxisThickness={style.gridStyle !== 'none' ? 1 : 0}
          xAxisColor={style.gridColor}
          yAxisColor={style.gridColor}
          yAxisTextStyle={{ color: style.theme === 'dark' ? '#b8b8d2' : '#666', fontSize: getFontSize() }}
          noOfSections={5}
          maxValue={Math.max(...data.datasets[0].data) * 1.2}
          isAnimated={style.enableAnimations}
          animationDuration={style.animationSpeed === 'fast' ? 500 : style.animationSpeed === 'slow' ? 2000 : 1000}
          showDataPointOnFocus={style.enableHover}
          dataPointsColor={style.colorPalette[0]}
          dataPointsRadius={4}
        />
      </View>
    );
  };

  const renderChart = () => {
    switch (type) {
      case 'pie':
      case 'donut':
        return renderPieChart();
      case 'bar':
      case 'waterfall':
        return renderBarChart();
      case 'line':
      case 'area':
        return renderLineChart();
      default:
        return <Text style={styles.errorText}>Unsupported chart type: {type}</Text>;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: style.backgroundColor }]}>
      {/* Title */}
      <View style={styles.header}>
        <Text style={[styles.title, { fontSize: getFontSize() + 6, color: style.theme === 'dark' ? '#ffffff' : '#000000' }]}>
          {title}
        </Text>
        {description && (
          <Text style={[styles.description, { fontSize: getFontSize(), color: style.theme === 'dark' ? '#b8b8d2' : '#666' }]}>
            {description}
          </Text>
        )}
      </View>

      {/* Chart */}
      {renderChart()}

      {/* Insights */}
      {insights && insights.length > 0 && (
        <View style={styles.insightsContainer}>
          <Text style={[styles.insightsTitle, { color: style.theme === 'dark' ? '#ffffff' : '#000000' }]}>
            Key Insights
          </Text>
          {insights.map((insight, index) => (
            <View key={index} style={styles.insightItem}>
              <Text style={[styles.insightBullet, { color: style.colorPalette[0] }]}>•</Text>
              <Text style={[styles.insightText, { color: style.theme === 'dark' ? '#b8b8d2' : '#666' }]}>
                {insight}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 20,
    marginVertical: 10,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontWeight: 'bold',
    fontFamily: 'Poppins',
    marginBottom: 8,
  },
  description: {
    fontFamily: 'Poppins',
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  centerLabel: {
    alignItems: 'center',
  },
  centerLabelText: {
    fontSize: 12,
    color: '#b8b8d2',
    fontFamily: 'Poppins',
  },
  centerLabelValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
  },
  legendContainer: {
    marginTop: 20,
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 10,
  },
  legendText: {
    flex: 1,
    fontSize: 14,
    color: '#b8b8d2',
    fontFamily: 'Poppins',
  },
  legendValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
  },
  insightsContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Poppins',
    marginBottom: 12,
  },
  insightItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  insightBullet: {
    fontSize: 20,
    marginRight: 8,
    marginTop: -4,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins',
    lineHeight: 20,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontFamily: 'Poppins',
    textAlign: 'center',
    padding: 20,
  },
});

