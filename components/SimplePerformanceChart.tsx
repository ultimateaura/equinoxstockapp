import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Text } from 'react-native-paper';

interface PerformanceDataPoint {
  x: string;
  y: number;
  label?: string;
}

interface SimplePerformanceChartProps {
  data: PerformanceDataPoint[];
  title?: string;
  height?: number;
  color?: string;
}

export const SimplePerformanceChart: React.FC<SimplePerformanceChartProps> = ({
  data,
  title,
  height = 200,
  color = '#17bf2d'
}) => {
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 40;

  // Convert data to the format expected by react-native-gifted-charts
  const chartData = data.map((point, index) => ({
    value: point.y,
    label: point.label || point.x,
    dataPointText: point.y.toString(),
    labelTextStyle: { 
      color: '#666', 
      fontSize: 10 
    }
  }));

  const maxValue = Math.max(...data.map(d => d.y));
  const minValue = Math.min(...data.map(d => d.y));
  const range = maxValue - minValue;
  const padding = range * 0.1; // 10% padding

  return (
    <View style={styles.container}>
      {title && (
        <Text style={styles.title}>{title}</Text>
      )}
      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={chartWidth}
          height={height}
          spacing={chartWidth / (data.length - 1)}
          thickness={2}
          color={color}
          curved={false}
          areaChart={false}
          xAxisThickness={1}
          yAxisThickness={1}
          xAxisColor="#e0e0e0"
          yAxisColor="#e0e0e0"
          yAxisTextStyle={{ color: '#666', fontSize: 10 }}
          xAxisTextStyle={{ color: '#666', fontSize: 10 }}
          noOfSections={4}
          maxValue={maxValue + padding}
          minValue={minValue - padding}
          isAnimated={true}
          animationDuration={1000}
          dataPointsColor={color}
          dataPointsRadius={3}
          showVerticalLines={false}
          showHorizontalLines={true}
          rulesType="solid"
          rulesColor="#f0f0f0"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
