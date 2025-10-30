import { Holding } from '../contexts/HoldingsContext';

export interface ChartDataPoint {
  x: string; // Date string
  y: number; // Value
  label?: string;
  data?: any; // Additional data
}

export interface TimeSeriesData {
  ticker: string;
  companyName: string;
  data: ChartDataPoint[];
  color?: string;
}

/**
 * Convert holdings data to time-series chart data
 * @param holdings - Array of holdings from HoldingsContext
 * @param chartType - Type of chart data to generate
 * @returns Formatted data for charts
 */
export const generateTimeSeriesData = (
  holdings: Holding[],
  chartType: 'cumulative' | 'individual' | 'portfolio' = 'cumulative'
): TimeSeriesData[] => {
  if (chartType === 'individual') {
    // Generate individual time series for each holding
    return holdings.map(holding => {
      const purchaseLots = holding.purchaseLots || [];
      const data: ChartDataPoint[] = purchaseLots
        .sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime())
        .map(lot => ({
          x: new Date(lot.purchaseDate).toISOString().split('T')[0], // YYYY-MM-DD format
          y: lot.quantity * lot.purchasePrice,
          label: `${lot.quantity} @ $${lot.purchasePrice.toFixed(2)}`,
          data: {
            quantity: lot.quantity,
            price: lot.purchasePrice,
            date: lot.purchaseDate
          }
        }));

      return {
        ticker: holding.ticker,
        companyName: holding.companyName,
        data,
        color: getColorForTicker(holding.ticker)
      };
    });
  }

  if (chartType === 'cumulative') {
    // Generate cumulative portfolio value over time
    const allPurchases = holdings.flatMap(holding => 
      (holding.purchaseLots || []).map(lot => ({
        date: new Date(lot.purchaseDate),
        value: lot.quantity * lot.purchasePrice,
        ticker: holding.ticker,
        companyName: holding.companyName
      }))
    ).sort((a, b) => a.date.getTime() - b.date.getTime());

    // Group by date and calculate cumulative values
    const dateMap = new Map<string, number>();
    allPurchases.forEach(purchase => {
      const dateStr = purchase.date.toISOString().split('T')[0];
      const currentValue = dateMap.get(dateStr) || 0;
      dateMap.set(dateStr, currentValue + purchase.value);
    });

    let cumulativeValue = 0;
    const data: ChartDataPoint[] = Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dailyValue]) => {
        cumulativeValue += dailyValue;
        return {
          x: date,
          y: cumulativeValue,
          label: `$${cumulativeValue.toFixed(2)}`,
          data: { dailyValue, cumulativeValue }
        };
      });

    return [{
      ticker: 'PORTFOLIO',
      companyName: 'Total Portfolio',
      data,
      color: '#17bf2d'
    }];
  }

  if (chartType === 'portfolio') {
    // Generate portfolio allocation over time
    const allPurchases = holdings.flatMap(holding => 
      (holding.purchaseLots || []).map(lot => ({
        date: new Date(lot.purchaseDate),
        value: lot.quantity * lot.purchasePrice,
        ticker: holding.ticker,
        companyName: holding.companyName
      }))
    ).sort((a, b) => a.date.getTime() - b.date.getTime());

    // Group by date and ticker
    const dateTickerMap = new Map<string, Map<string, number>>();
    allPurchases.forEach(purchase => {
      const dateStr = purchase.date.toISOString().split('T')[0];
      if (!dateTickerMap.has(dateStr)) {
        dateTickerMap.set(dateStr, new Map());
      }
      const tickerMap = dateTickerMap.get(dateStr)!;
      const currentValue = tickerMap.get(purchase.ticker) || 0;
      tickerMap.set(purchase.ticker, currentValue + purchase.value);
    });

    // Convert to time series data for each ticker
    const tickerData = new Map<string, ChartDataPoint[]>();
    
    Array.from(dateTickerMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, tickerValues]) => {
        tickerValues.forEach((value, ticker) => {
          if (!tickerData.has(ticker)) {
            tickerData.set(ticker, []);
          }
          tickerData.get(ticker)!.push({
            x: date,
            y: value,
            label: `$${value.toFixed(2)}`,
            data: { ticker, value }
          });
        });
      });

    return Array.from(tickerData.entries()).map(([ticker, data]) => {
      const holding = holdings.find(h => h.ticker === ticker);
      return {
        ticker,
        companyName: holding?.companyName || ticker,
        data,
        color: getColorForTicker(ticker)
      };
    });
  }

  return [];
};

/**
 * Generate pie chart data for portfolio allocation
 * @param holdings - Array of holdings from HoldingsContext
 * @returns Data formatted for pie charts
 */
export const generatePieChartData = (holdings: Holding[]) => {
  return holdings.map(holding => {
    const totalQuantity = holding.purchaseLots?.reduce((sum, lot) => sum + lot.quantity, 0) || 0;
    const totalValue = totalQuantity * holding.currentPrice;
    
    return {
      value: totalValue,
      color: getColorForTicker(holding.ticker),
      text: holding.ticker,
      label: holding.companyName,
      data: {
        ticker: holding.ticker,
        companyName: holding.companyName,
        quantity: totalQuantity,
        currentPrice: holding.currentPrice,
        totalValue
      }
    };
  });
};

/**
 * Generate line chart data for performance over time
 * @param holdings - Array of holdings from HoldingsContext
 * @param startDate - Start date for the chart
 * @param endDate - End date for the chart
 * @returns Data formatted for line charts
 */
export const generatePerformanceData = (
  holdings: Holding[],
  startDate?: Date,
  endDate?: Date
) => {
  const allPurchases = holdings.flatMap(holding => 
    (holding.purchaseLots || []).map(lot => ({
      date: new Date(lot.purchaseDate),
      value: lot.quantity * lot.purchasePrice,
      ticker: holding.ticker,
      companyName: holding.companyName,
      quantity: lot.quantity,
      price: lot.purchasePrice
    }))
  ).sort((a, b) => a.date.getTime() - b.date.getTime());

  // Filter by date range if provided
  const filteredPurchases = allPurchases.filter(purchase => {
    if (startDate && purchase.date < startDate) return false;
    if (endDate && purchase.date > endDate) return false;
    return true;
  });

  // Group by date and calculate daily portfolio value
  const dateMap = new Map<string, number>();
  filteredPurchases.forEach(purchase => {
    const dateStr = purchase.date.toISOString().split('T')[0];
    const currentValue = dateMap.get(dateStr) || 0;
    dateMap.set(dateStr, currentValue + purchase.value);
  });

  let cumulativeValue = 0;
  return Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dailyValue]) => {
      cumulativeValue += dailyValue;
      return {
        x: date,
        y: cumulativeValue,
        label: `$${cumulativeValue.toFixed(2)}`,
        data: { dailyValue, cumulativeValue }
      };
    });
};

/**
 * Get a consistent color for a ticker symbol
 * @param ticker - Stock ticker symbol
 * @returns Hex color code
 */
const getColorForTicker = (ticker: string): string => {
  const colors = [
    '#17bf2d', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
    '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3',
    '#ff9f43', '#10ac84', '#ee5a24', '#0984e3', '#6c5ce7'
  ];
  
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) {
    hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Format date for chart display
 * @param date - Date object or string
 * @param format - Format type
 * @returns Formatted date string
 */
export const formatChartDate = (
  date: Date | string,
  format: 'short' | 'medium' | 'long' = 'short'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'medium':
      return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
    case 'long':
      return dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    default:
      return dateObj.toISOString().split('T')[0];
  }
};
