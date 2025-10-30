import { useSettings } from '@/contexts/SettingsContext';
import { formatCurrency } from '@/utils/formatCurrency';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

export const StockCard = ({
    ticker, 
    companyName,
    price,
    priceChange,
    priceChangePercentage,
    image,
    isLoading = false,
    isCached = false,
    onPress,
} : {
    ticker: string;
    companyName: string;
    price: number;
    priceChange: number;
    priceChangePercentage: number;
    image: string;
    isLoading?: boolean;
    isCached?: boolean;
    onPress?: () => void;
}) => {
    const { showPercentages } = useSettings();
    if (isLoading) {
      return (
        <View style={[styles.container, styles.loadingContainer]}>
          <View style={styles.logoPlaceholder}>
            <ActivityIndicator size="small" color="#22C55E" />
          </View>
          <View style={styles.content}>
            <View style={styles.leftSection}>
              <View style={styles.skeletonText} />
              <View style={[styles.skeletonText, { width: '80%' }]} />
            </View>
            <View style={styles.rightSection}>
              <View style={[styles.skeletonText, { width: 60 }]} />
              <View style={[styles.skeletonText, { width: 80 }]} />
            </View>
          </View>
        </View>
      );
    }

    const handlePress = () => {
      if (onPress) {
        // Use custom handler if provided (for discover screen state toggle)
        onPress();
      } else {
        // Navigate to discover tab with stock details as params (for home/portfolio screens)
        router.push({
          pathname: '/(tabs)/discover',
          params: {
            stockTicker: ticker,
            companyName: companyName,
            price: price.toString(),
            priceChange: priceChange.toString(),
            priceChangePercent: priceChangePercentage.toString(),
            logoUrl: image,
          }
        });
      }
    };

    return (
        <Pressable 
          style={styles.container}
          onPress={handlePress}>
            <Image 
              source={{ uri: `https://api.elbstream.com/logos/symbol/${ticker}` }}
              placeholder={require('@/assets/images/logoImg.png')}
              style={styles.logo}
              contentFit="contain"
              transition={200}
            />
            <View style={styles.content}>
              <View style={styles.leftSection}>
                <Text  style={styles.ticker}>{ticker}</Text>
                <Text style={styles.companyName} numberOfLines={1} ellipsizeMode="tail">
                  {companyName}
                </Text>
               
              </View>
              <View style={styles.rightSection}>
                {price > 0 ? (
                  <>
                    <Text  style={styles.price}>
                      {formatCurrency(price)}
                    </Text>
                    <Text 
                      style={[
                        styles.change,
                        { color: priceChange > 0 ? '#22C55E' : '#FF6B6B' }
                      ]}
                    >
                      {showPercentages 
                        ? `${formatCurrency(priceChange)} (${priceChangePercentage.toFixed(2)}%)`
                        : formatCurrency(priceChange)
                      }
                    </Text>
                  </>
                ) : (
                  <Text  style={styles.noData}>
                    No price data
                  </Text>
                )}
              </View>
            </View>
          </Pressable>
    );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    marginVertical: 8,
    backgroundColor: '#161B22',
    borderRadius: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#22C55E',
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
  },
  ticker: {
    fontWeight: 'bold',
    color: '#C9D1D9',
    marginBottom: 2,
    fontFamily: 'Poppins',
  },
  companyName: {
    color: '#C9D1D9',
    fontSize: 14,
    fontFamily: 'Poppins',
    fontWeight: 'bold',
  },
  price: {
    fontWeight: 'bold',
    color: '#C9D1D9',
    marginBottom: 2,
    fontFamily: 'Poppins',
  },
  change: {
    fontWeight: 'bold',
    fontSize: 12,
    fontFamily: 'Poppins',
  },
  loadingContainer: {
    opacity: 0.7,
  },
  logoPlaceholder: {
    width: 50,
    height: 50,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#21262D',
    borderRadius: 8,
  },
  skeletonText: {
    height: 16,
    backgroundColor: '#21262D',
    borderRadius: 4,
    marginBottom: 4,
    width: '100%',
  },
  cachedIndicator: {
    color: '#22C55E',
    fontSize: 10,
    marginTop: 2,
  },
  realtimeIndicator: {
    color: '#22C55E',
    fontSize: 10,
    marginTop: 2,
  },
  noData: {
    color: '#6E7681',
    fontSize: 12,
    fontStyle: 'italic',
  },
});