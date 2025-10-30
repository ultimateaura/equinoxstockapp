import { useSettings } from '@/contexts/SettingsContext';
import { formatCurrency } from '@/utils/formatCurrency';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

interface PurchaseLot {
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
}

interface HoldingCardProps {
  ticker: string;
  companyName: string;
  purchaseLots: PurchaseLot[];
  currentPrice: number;
  image: string;
  onRemove?: () => void;
}

export const HoldingCard = ({
  ticker,
  companyName,
  purchaseLots,
  currentPrice,
  image,
  onRemove,
}: HoldingCardProps) => {
  // Calculate totals from all purchase lots
  const totalQuantity = purchaseLots && Array.isArray(purchaseLots) 
    ? purchaseLots.reduce((sum, lot) => sum + lot.quantity, 0)
    : 0;
  const totalCostBasis = purchaseLots && Array.isArray(purchaseLots)
    ? purchaseLots.reduce((sum, lot) => sum + (lot.quantity * lot.purchasePrice), 0)
    : 0;
  const averagePurchasePrice = totalQuantity > 0 ? totalCostBasis / totalQuantity : 0;
  
  const totalValue = totalQuantity * currentPrice;
  const gainLoss = totalValue - totalCostBasis;
  const gainLossPercentage = totalCostBasis > 0 ? (gainLoss / totalCostBasis) * 100 : 0;
  const { showPercentages } = useSettings();

  const handlePress = () => {
    // Navigate to discover tab with stock details as params
    const priceChange = currentPrice - averagePurchasePrice;
    const priceChangePercent = averagePurchasePrice > 0 ? ((currentPrice - averagePurchasePrice) / averagePurchasePrice) * 100 : 0;
    
    router.push({
      pathname: '/(tabs)/discover',
      params: {
        stockTicker: ticker,
        companyName: companyName,
        price: currentPrice.toString(),
        priceChange: priceChange.toString(),
        priceChangePercent: priceChangePercent.toString(),
        logoUrl: image,
      }
    });
  };

  const handleManagePress = (e: any) => {
    e.stopPropagation(); // Prevent the card press from firing
    router.push({
      pathname: '/holding-management',
      params: { ticker }
    });
  };

  return (
    <Pressable 
      style={styles.container}
      onPress={handlePress}
    >
      <Image
        source={`https://api.elbstream.com/logos/symbol/${ticker}`}
        placeholder={require('@/assets/images/logoImg.png')}
        style={styles.logo}
        contentFit="contain"
        transition={200}
        onError={(error) => {
          console.log(`Image load error for ${ticker}:`, error);
          console.log(`Failed URL: ${image}`);
        }}
        onLoad={() => {
          console.log(`Image loaded successfully for ${ticker}: ${image}`);
        }}
      />
      <View style={styles.content}>
        <View style={styles.leftSection}>
          <Text style={styles.ticker}>{ticker}</Text>
          <Text style={styles.companyName} numberOfLines={1} ellipsizeMode="tail">
            {companyName}
          </Text>
        </View>
        <View style={styles.rightSection}>
          {totalValue > 0 ? (
            <>
              <Text style={styles.price}>
                {formatCurrency(totalValue)}
              </Text>
              <Text 
                style={[
                  styles.change,
                  { color: gainLoss >= 0 ? '#22C55E' : '#FF6B6B' }
                ]}
              >
                {showPercentages 
                  ? `${formatCurrency(gainLoss)} (${gainLossPercentage.toFixed(2)}%)`
                  : formatCurrency(gainLoss)
                }
              </Text>
            </>
          ) : (
            <Text style={styles.noData}>
              No data available
            </Text>
          )}
        </View>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={handleManagePress}
        >
          <MaterialCommunityIcons name="dots-vertical" size={20} color="#b8b8d2" />
        </TouchableOpacity>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    marginVertical: 8,
    backgroundColor: '#161B22',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#4A9EFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logo: {
    width: 50,
    height: 50,
    marginRight: 12,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flex: 1,
    marginRight: 12,
  },
  rightSection: {
    alignItems: 'flex-end',
    minWidth: 100,
    flex: 1,
  },
  menuButton: {
    padding: 8,
    marginLeft: 8,
  },
  ticker: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#C9D1D9',
    marginBottom: 4,
    fontFamily: 'Poppins',
  },
  companyName: {
    fontSize: 14,
    color: '#6E7681',
    fontFamily: 'Poppins',
    fontWeight: 'bold',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#C9D1D9',
    marginBottom: 4,
    fontFamily: 'Poppins',
  },
  change: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Poppins',
  },
  noData: {
    fontSize: 14,
    color: '#6E7681',
    fontFamily: 'Poppins',
    fontStyle: 'italic',
  },
});
