import { StockCard } from '@/components/StockCard';
import { useFavorites } from '@/contexts/FavoritesContext';
import { SearchResult } from '@/types/stock';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { createContext, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Banner, Text, TextInput } from 'react-native-paper';
import { searchStocksAPI } from '../../utils/searchStocks';
import { stockApiService } from '../../utils/stockApi';

// Type for FlatList data - now only real-time SearchResult
type StockListItem = SearchResult;

export const storeContext = createContext<
  { searchQuery: string; 
    setSearchQuery: (str: string) => void 
    searchedStocks: SearchResult[];
    setSearchedStocks: (stocks: SearchResult[]) => void
  }>(
      {
        searchQuery: "",
        setSearchQuery: (str: string) => {},
        searchedStocks: [],
        setSearchedStocks: (stocks: SearchResult[]) => {}
      }
    );

// Function to get AI context from discover screen
export function getDiscoverContext(selectedStock: SearchResult | null) {
  if (selectedStock) {
    return {
      screen: 'stock-detail',
      data: {
        ticker: selectedStock.symbol,
        companyName: selectedStock.longName || selectedStock.shortName,
        currentPrice: selectedStock.regularMarketPrice,
        priceChange: selectedStock.regularMarketChange,
        priceChangePercent: selectedStock.regularMarketChangePercent,
        volume: 0,
        marketCap: 0,
        dayHigh: 0,
        dayLow: 0,
        open: 0,
        previousClose: (selectedStock.regularMarketPrice || 0) - (selectedStock.regularMarketChange || 0),
        isFavorite: false,
        isHeld: false,
        holdingQuantity: 0,
      },
      suggestion: `You're currently viewing ${selectedStock.symbol} (${selectedStock.longName || selectedStock.shortName}). The current price is $${selectedStock.regularMarketPrice?.toFixed(2)} with a ${selectedStock.regularMarketChangePercent?.toFixed(2)}% change. How can I help you analyze this stock?`,
    };
  }
  return null;
}

export default function DiscoverScreen() {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchedStocks, setSearchedStocks] = useState<SearchResult[]>([]);
  const [trendingStocks, setTrendingStocks] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  
  // Selected stock for detail view
  const [selectedStock, setSelectedStock] = useState<SearchResult | null>(null);

  // Check for stock param from other screens (for opening stock detail from home/portfolio)
  const params = useLocalSearchParams();
  
  useEffect(() => {
    if (params.stockTicker) {
      // Convert params to SearchResult format
      const stockFromParams: SearchResult = {
        symbol: params.stockTicker as string,
        longName: params.companyName as string || params.stockTicker as string,
        shortName: params.companyName as string || params.stockTicker as string,
        regularMarketPrice: parseFloat(params.price as string) || 0,
        regularMarketChange: parseFloat(params.priceChange as string) || 0,
        regularMarketChangePercent: parseFloat(params.priceChangePercent as string) || 0,
        exchange: 'NASDAQ',
        type: 'EQUITY',
        region: 'US',
        currency: 'USD',
        marketState: 'REGULAR',
        quoteType: 'EQUITY',
        triggerable: true,
        customPriceAlertConfidence: 'HIGH',
        regularMarketTime: new Date().toISOString(),
        marketCap: 0,
        logoUrl: params.logoUrl as string || undefined,
      };
      setSelectedStock(stockFromParams);
      
      // Clear params after processing to allow re-clicking
      setTimeout(() => {
        router.setParams({ 
          stockTicker: undefined,
          companyName: undefined,
          price: undefined,
          priceChange: undefined,
          priceChangePercent: undefined,
          logoUrl: undefined,
        });
      }, 100);
    }
  }, [params.stockTicker, params.companyName, params.price, params.priceChange, params.priceChangePercent, params.logoUrl]);

  // Price chart temporarily removed per request

  // Fetch trending stocks
  const fetchTrendingStocks = async () => {
    try {
      setIsLoadingTrending(true);
      const response = await stockApiService.getTrendingStocks();
      
      if (response.success && response.data) {
        setTrendingStocks(response.data);
      } else {
        console.log('Failed to fetch trending stocks:', response.error);
      }
    } catch (error) {
      console.error('Error fetching trending stocks:', error);
    } finally {
      setIsLoadingTrending(false);
    }
  };

  // Load trending stocks on component mount
  useEffect(() => {
    fetchTrendingStocks();
  }, []);

  // Debounced search function
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId: ReturnType<typeof setTimeout>;
      return (query: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          if (query.length < 2) {
            setSearchedStocks([]);
            setError(null);
            return;
          }

          setIsLoading(true);
          setError(null);

          try {
            console.log('Searching for:', query);
            const results = await searchStocksAPI(query);
            console.log('Search results:', results);
            setSearchedStocks(results);
          } catch (err) {
            console.error('Search error:', err);
            setError('Failed to search stocks. Please try again.');
            setSearchedStocks([]);
          } finally {
            setIsLoading(false);
          }
        }, 500); // 500ms debounce
      };
    })(),
    []
  );

  // Handle search input change
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    debouncedSearch(text);
  };

  // Store context when screen is focused
  useFocusEffect(
    useCallback(() => {
      const storeDiscoverContext = async () => {
        try {
          if (selectedStock) {
            // Store stock detail context
            const context = {
              screen: 'stock-detail',
              data: {
                ticker: selectedStock.symbol,
                companyName: selectedStock.longName || selectedStock.shortName,
                currentPrice: selectedStock.regularMarketPrice,
                priceChange: selectedStock.regularMarketChange,
                priceChangePercent: selectedStock.regularMarketChangePercent,
                open: (selectedStock as any).open || 0,
                previousClose: (selectedStock as any).previousClose || 0,
                dayHigh: (selectedStock as any).dayHigh || 0,
                dayLow: (selectedStock as any).dayLow || 0,
                volume: (selectedStock as any).regularMarketVolume || 0,
                marketCap: (selectedStock as any).marketCap || 0,
              },
              suggestion: `You're viewing ${selectedStock.symbol} (${selectedStock.longName || selectedStock.shortName}). Current price: $${selectedStock.regularMarketPrice?.toFixed(2)} (${selectedStock.regularMarketChangePercent >= 0 ? '+' : ''}${selectedStock.regularMarketChangePercent?.toFixed(2)}%). How can I help you analyze this stock?`,
            };
            await AsyncStorage.setItem('aiContext', JSON.stringify(context));
          } else if (trendingStocks.length > 0) {
            // Store trending stocks context
            const context = {
              screen: 'trending',
              data: {
                trendingStocks: trendingStocks.slice(0, 10).map(stock => ({
                  ticker: stock.symbol,
                  companyName: stock.longName || stock.shortName,
                  price: stock.regularMarketPrice,
                  priceChange: stock.regularMarketChange,
                  priceChangePercent: stock.regularMarketChangePercent,
                  image: stock.logoUrl
                })),
              },
              suggestion: 'I can help you analyze the trending stocks, compare different companies, or explain what makes a stock worth investing in. What would you like to know?',
            };
            await AsyncStorage.setItem('aiContext', JSON.stringify(context));
          }
        } catch (error) {
          console.error('Error storing discover context:', error);
        }
      };

      storeDiscoverContext();
    }, [selectedStock, trendingStocks])
  );

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      // Refresh trending stocks
      await fetchTrendingStocks();
      
      // Refresh search results if there's a query
      if (searchQuery.length >= 2) {
        const results = await searchStocksAPI(searchQuery);
        setSearchedStocks(results);
      }
    } catch (err) {
      console.error('Refresh error:', err);
      setError('Failed to refresh results. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle stock selection
  const handleStockPress = async (stock: SearchResult) => {
    try {
      // Fetch full stock quote data from Finnhub
      const quoteResponse = await stockApiService.getStockQuote(stock.symbol);
      
      if (quoteResponse.success && quoteResponse.data) {
        // Merge the full quote data with the search result
        const enrichedStock = {
          ...stock,
          ...quoteResponse.data,
        };
        setSelectedStock(enrichedStock);
        
        // Store selected stock in AsyncStorage for nav bar AI button to access
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const context = getDiscoverContext(enrichedStock);
        console.log('Discover - saving stock context:', JSON.stringify(context, null, 2));
        await AsyncStorage.setItem('aiContext', JSON.stringify(context));
      } else {
        // Fallback to basic data if quote fetch fails
        setSelectedStock(stock);
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const context = getDiscoverContext(stock);
        await AsyncStorage.setItem('aiContext', JSON.stringify(context));
      }
    } catch (error) {
      console.log('Error fetching stock details:', error);
      // Fallback to basic data
      setSelectedStock(stock);
    }
  };

  // Handle back to stock list
  const handleBackToList = async () => {
    setSelectedStock(null);
    // Clear stored context
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    try {
      await AsyncStorage.removeItem('aiContext');
    } catch (error) {
      console.log('Error clearing stock context:', error);
    }
  };

  // Render item function for FlatList
  const renderItem = ({ item }: { item: SearchResult }) => {
    const stockData = {
      ticker: item.symbol,
      companyName: item.longName || item.shortName,
      price: item.regularMarketPrice,
      priceChange: item.regularMarketChange,
      priceChangePercentage: item.regularMarketChangePercent,
      image: item.logoUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjMTYxQjIyIi8+Cjx0ZXh0IHg9IjI1IiB5PSIzNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSIjMjJDNTVFIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn5KIPPCvdGV4dD4KPC9zdmc+',
    };

    return (
      <StockCard
        ticker={stockData.ticker}
        companyName={stockData.companyName}
        price={stockData.price}
        priceChange={stockData.priceChange}
        priceChangePercentage={stockData.priceChangePercentage}
        image={stockData.image}
        onPress={() => handleStockPress(item)}
      />
    );
  };

  return (
    <View style={styles.container}>
      {selectedStock ? (
        // Stock Detail View
        <>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBackToList} style={styles.backButton}>
              <MaterialCommunityIcons name="chevron-left" size={24} color="#ffffff" />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>{selectedStock.symbol}</Text>
              <Text style={styles.headerSubtitle}>Stock Details</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                onPress={() => {
                  const context = getDiscoverContext(selectedStock);
                  if (context) {
                    router.push({
                      pathname: '/ai',
                      params: {
                        context: JSON.stringify(context),
                      },
                    });
                  }
                }} 
                style={styles.aiButton}
              >
                <MaterialCommunityIcons name="robot-happy" size={24} color="#17bf2d" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => {
                  if (selectedStock) {
                    const stockData = {
                      ticker: selectedStock.symbol,
                      companyName: selectedStock.longName || selectedStock.shortName,
                      price: selectedStock.regularMarketPrice || 0,
                      priceChange: selectedStock.regularMarketChange || 0,
                      priceChangePercentage: selectedStock.regularMarketChangePercent || 0,
                      image: `https://api.elbstream.com/logos/symbol/${selectedStock.symbol}`,
                      addedAt: new Date().toISOString()
                    };
                    toggleFavorite(stockData);
                  }
                }} 
                style={styles.favoriteButton}
              >
                <MaterialCommunityIcons 
                  name={isFavorite(selectedStock.symbol) ? "heart" : "heart-outline"} 
                  size={24} 
                  color={isFavorite(selectedStock.symbol) ? "#ff6b6b" : "#ffffff"} 
                />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Stock Detail Content */}
          <ScrollView style={styles.contentSection} showsVerticalScrollIndicator={false}>
            {/* Price Chart removed */}
            {/* Header Info */}
            <View style={styles.stockDetail}>
              <Image 
                source={`https://api.elbstream.com/logos/symbol/${selectedStock.symbol}`}
                placeholder={require('@/assets/images/logoImg.png')}
                style={styles.stockImage}
                contentFit="contain"
              />
              <Text style={styles.stockTicker}>{selectedStock.symbol}</Text>
              <Text style={styles.stockName}>{selectedStock.longName || selectedStock.shortName}</Text>
              <Text style={styles.stockPrice}>
                ${selectedStock.regularMarketPrice?.toFixed(2) || 'N/A'}
              </Text>
              <Text style={[
                styles.stockChange,
                { color: (selectedStock.regularMarketChange || 0) >= 0 ? '#22C55E' : '#FF6B6B' }
              ]}>
                {(selectedStock.regularMarketChangePercent || 0) >= 0 ? '+' : ''}
                {(selectedStock.regularMarketChangePercent || 0).toFixed(2)}% (
                {(selectedStock.regularMarketChange || 0) >= 0 ? '+' : ''}
                ${Math.abs(selectedStock.regularMarketChange || 0).toFixed(2)})
              </Text>
            </View>

            {/* Market Stats Grid */}
            <View style={styles.statsContainer}>
              <Text style={styles.sectionTitle}>Market Statistics</Text>
              
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Open</Text>
                  <Text style={styles.statValue}>
                    ${(selectedStock as any).open?.toFixed(2) || 'N/A'}
                  </Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Prev Close</Text>
                  <Text style={styles.statValue}>
                    ${(selectedStock as any).previousClose?.toFixed(2) || 'N/A'}
                  </Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Day Low</Text>
                  <Text style={styles.statValue}>
                    ${(selectedStock as any).dayLow?.toFixed(2) || 'N/A'}
                  </Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Day High</Text>
                  <Text style={styles.statValue}>
                    ${(selectedStock as any).dayHigh?.toFixed(2) || 'N/A'}
                  </Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Volume</Text>
                  <Text style={styles.statValue}>
                    {(selectedStock as any).regularMarketVolume 
                      ? ((selectedStock as any).regularMarketVolume / 1000000).toFixed(2) + 'M'
                      : 'N/A'}
                  </Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Market Cap</Text>
                  <Text style={styles.statValue}>
                    {selectedStock.marketCap 
                      ? (selectedStock.marketCap > 1000 
                        ? (selectedStock.marketCap / 1000).toFixed(2) + 'T' 
                        : selectedStock.marketCap.toFixed(2) + 'B')
                      : 'N/A'}
                  </Text>
                </View>
              </View>
            </View>

            {/* About Section */}
            <View style={styles.aboutContainer}>
              <Text style={styles.sectionTitle}>About</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Symbol:</Text>
                <Text style={styles.infoValue}>{selectedStock.symbol}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Exchange:</Text>
                <Text style={styles.infoValue}>{selectedStock.exchange || 'NASDAQ'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Type:</Text>
                <Text style={styles.infoValue}>{selectedStock.type || 'Common Stock'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Region:</Text>
                <Text style={styles.infoValue}>{selectedStock.region || 'US'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Currency:</Text>
                <Text style={styles.infoValue}>{selectedStock.currency || 'USD'}</Text>
              </View>
            </View>

            {/* Add to Holdings Button */}
            <TouchableOpacity 
              style={styles.addHoldingButton}
              onPress={() => {
                // TODO: Implement add to holdings functionality
                Alert.alert(
                  'Add to Holdings',
                  `Would you like to add ${selectedStock.symbol} to your portfolio?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Add', onPress: () => {
                      // Navigate to add holding modal or handle here
                      console.log('Add holding:', selectedStock.symbol);
                    }}
                  ]
                );
              }}
            >
              <MaterialCommunityIcons name="plus-circle" size={20} color="#ffffff" />
              <Text style={styles.addHoldingButtonText}>Add to Portfolio</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </>
      ) : (
        // Regular Discover View
        <>
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Discover</Text>
              <Text style={styles.headerSubtitle}>Find new opportunities</Text>
            </View>
            <TouchableOpacity style={styles.avatarButton}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>K</Text>
              </View>
            </TouchableOpacity>
          </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <TextInput 
          placeholder='Search Stocks'
          placeholderTextColor="#b8b8d2"
          mode='outlined'
          left={<TextInput.Icon icon="magnify" />}
          right={isLoading ? <TextInput.Icon icon={() => <ActivityIndicator size="small" color="#17bf2d" />} /> : undefined}
          value={searchQuery}
          onChangeText={handleSearchChange}
          autoCapitalize='characters'
          autoCorrect={false}
          autoComplete='off'
          keyboardType='default'
          returnKeyType='search'
          blurOnSubmit={true}
          clearButtonMode='while-editing'
          dense
          style={styles.searchInput}
          contentStyle={styles.searchContent}
          outlineStyle={styles.searchOutline}
          theme={{
            colors: {
              primary: '#17bf2d',
              onSurfaceVariant: '#ffffff',
              outline: '#3a3a3e',
              surface: '#2a2a2e',
              onSurface: '#ffffff',
            }
          }}
        />
      </View>

      {/* Error Banner */}
      {error && (
        <Banner
          visible={!!error}
          actions={[
            {
              label: 'Dismiss',
              onPress: () => setError(null),
            },
          ]}
          style={styles.errorBanner}
        >
          {error}
        </Banner>
      )}

      {/* Cache Indicator */}

      {/* Content Section */}
      <View style={styles.contentSection}>
        {searchQuery ? (
          /* Search Results */
          <View style={styles.searchResultsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Search Results</Text>
            </View>
            <FlatList
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyExtractor={(item) => item.symbol}
              data={searchedStocks}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  tintColor="#17bf2d"
                  colors={["#17bf2d"]}
                />
              }
              ListEmptyComponent={
                searchedStocks.length === 0 && !isLoading && searchQuery.length >= 2 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      No stocks found for "{searchQuery}"
                    </Text>
                  </View>
                ) : null
              }
            />
          </View>
        ) : (
          /* Trending Stocks */
          <View style={styles.trendingSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Moving Stocks</Text>
              
            </View>
            {isLoadingTrending ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#17bf2d" />
                <Text style={styles.loadingText}>Loading trending stocks...</Text>
              </View>
            ) : (
              <FlatList
                data={trendingStocks}
                renderItem={renderItem}
                keyExtractor={(item) => `${item.symbol}-trending`}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.verticalList}
                refreshControl={
                  <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={handleRefresh}
                    tintColor="#17bf2d"
                    colors={["#17bf2d"]}
                  />
                }
              />
            )}
          </View>
        )}
      </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e22',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#17bf2d',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ffffff',
    fontFamily: 'Poppins',
  },
  avatarButton: {
    marginLeft: 20,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#17bf2d',
    fontFamily: 'Poppins',
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#1e1e22',
  },
  contentSection: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#1e1e22',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#ffffff',
    fontFamily: 'Poppins',
  },
  moreText: {
    fontSize: 14,
    color: '#17bf2d',
    fontFamily: 'Poppins',
  },
  searchResultsSection: {
    flex: 1,
  },
  trendingSection: {
    flex: 1,
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: '#2a2a2e',
    borderRadius: 8,
  },
  searchContent: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Poppins',
  },
  searchOutline: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3a3e',
  },
  sectionContainer: {
    marginBottom: 20,
  },
  verticalList: {
    paddingHorizontal: 5,
    paddingBottom: 10,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontWeight: 'bold',
    color: '#C9D1D9',
    marginLeft: 5,
    fontFamily: 'Poppins',
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#17bf2d',
    fontSize: 12,
    fontFamily: 'Poppins',
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  errorBanner: {
    backgroundColor: '#FF6B6B',
    marginBottom: 10,
  },
  cacheBanner: {
    backgroundColor: '#22C55E',
    marginBottom: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#b8b8d2',
    textAlign: 'center',
    fontFamily: 'Poppins',
  },
  backButton: {
    marginRight: 15,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiButton: {
    marginRight: 10,
  },
  favoriteButton: {
    padding: 5,
  },
  stockDetail: {
    alignItems: 'center',
    paddingVertical: 40,
    marginBottom: 30,
  },
  stockTicker: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
    marginBottom: 8,
  },
  stockName: {
    fontSize: 18,
    color: '#b8b8d2',
    fontFamily: 'Poppins',
    marginBottom: 20,
    textAlign: 'center',
  },
  stockPrice: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#22C55E',
    fontFamily: 'Poppins',
    marginBottom: 8,
  },
  stockImage: {
    width: 100,
    height: 100,
    borderRadius: 30,
    marginBottom: 20,
  },
  stockChange: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Poppins',
  },
  statsContainer: {
    backgroundColor: '#2a2a2e',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    marginHorizontal: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  statItem: {
    width: '48%',
    backgroundColor: '#1e1e22',
    borderRadius: 8,
    padding: 15,
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 12,
    color: '#8B949E',
    fontFamily: 'Poppins',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Poppins',
  },
  aboutContainer: {
    backgroundColor: '#2a2a2e',
    borderRadius: 12,
    padding: 20,
    marginTop: 15,
    marginHorizontal: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3e',
  },
  infoLabel: {
    fontSize: 14,
    color: '#8B949E',
    fontFamily: 'Poppins',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
    fontFamily: 'Poppins',
  },
  addHoldingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#17bf2d',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginHorizontal: 20,
    gap: 8,
  },
  addHoldingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Poppins',
  },
  askAiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#17bf2d',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 12,
  },
  askAiButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Poppins',
  },
});
