import { NewsCard, NewsItem } from '@/components/NewsCard';
import { StockCard } from '@/components/StockCard';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { newsService } from '@/utils/newsService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image as ExpoImage } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import React from 'react';
import { FlatList, Image, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

export default function HomeScreen() {
  const [trendingNews, setTrendingNews] = React.useState<NewsItem[]>([]);
  const [isLoadingNews, setIsLoadingNews] = React.useState(true);
  const [selectedNews, setSelectedNews] = React.useState<NewsItem | null>(null);

  // Safely access auth context
  let userName = 'User';
  try {
    const authContext = useAuth();
    if (authContext.userProfile?.name) {
      // Extract first name from full name
      userName = authContext.userProfile.name.split(' ')[0];
    } else if (authContext.user?.displayName) {
      userName = authContext.user.displayName.split(' ')[0];
    }
  } catch (error) {
    console.log('Auth context not available in HomeScreen');
  }

  // Safely access favorites context
  let favoriteStocks: any[] = [];
  try {
    const favoritesContext = useFavorites();
    favoriteStocks = favoritesContext.favoriteStocks || [];
  } catch (error) {
    console.log('Favorites context not available in HomeScreen');
    favoriteStocks = [];
  }

  // Load trending news on component mount
  React.useEffect(() => {
    const loadTrendingNews = async () => {
      try {
        setIsLoadingNews(true);
        const news = await newsService.getTrendingNews();
        setTrendingNews(news);
      } catch (error) {
        console.error('Error loading trending news:', error);
      } finally {
        setIsLoadingNews(false);
      }
    };

    loadTrendingNews();
  }, []);

  // Store context when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      const storeHomeContext = async () => {
        try {
          const context = {
            screen: 'home',
            data: {
              favoriteStocks: favoriteStocks.slice(0, 5).map(stock => ({
                ticker: stock.ticker,
                companyName: stock.companyName,
                price: stock.price,
                priceChange: stock.priceChange,
                priceChangePercentage: stock.priceChangePercentage,
                image: stock.image
              })),
              trendingNews: trendingNews.slice(0, 5).map(news => ({
                headline: news.headline,
                summary: news.summary,
                source: news.source,
                related: news.related,
                url: news.url,
                datetime: news.datetime,
                image: news.image
              })),
            },
            suggestion: 'I can help you understand the trending news, analyze your favorite stocks, or guide you on building your investment portfolio. What would you like to know?',
          };
          await AsyncStorage.setItem('aiContext', JSON.stringify(context));
        } catch (error) {
          console.error('Error storing home context:', error);
        }
      };

      storeHomeContext();
    }, [favoriteStocks, trendingNews])
  );

  const handleNewsPress = async (news: NewsItem) => {
    console.log('News pressed:', news.headline);
    // Set selected news to show article view
    setSelectedNews(news);
    
    // Store article context for AI
    try {
      const articleContext = {
        screen: 'news-article',
        data: {
          headline: news.headline,
          summary: news.summary,
          source: news.source,
          url: news.url,
          related: news.related,
          datetime: news.datetime,
        },
        suggestion: `I can help you understand this article, explain the key points, discuss the implications for ${news.related}, or answer any questions you have about the news.`,
      };
      await AsyncStorage.setItem('aiContext', JSON.stringify(articleContext));
      console.log('Stored news article context for AI');
    } catch (error) {
      console.error('Error storing news article context:', error);
    }
  };

  const handleBackToNewsList = async () => {
    setSelectedNews(null);
    
    // Clear article context when going back
    try {
      await AsyncStorage.removeItem('newsArticleContext');
    } catch (error) {
      console.error('Error clearing news article context:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleOpenOriginal = (url: string) => {
    if (url) {
      Linking.openURL(url).catch(err => {
        console.error('Failed to open URL:', err);
      });
    }
  };

  // If a news article is selected, show the article view
  if (selectedNews) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.newsHeader}>
          <TouchableOpacity onPress={handleBackToNewsList} style={styles.headerBackButton}>
            <MaterialCommunityIcons name="chevron-left" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.newsHeaderTitle}>News Article</Text>
          </View>
          <TouchableOpacity onPress={() => handleOpenOriginal(selectedNews.url)} style={styles.headerOpenButton}>
            <MaterialCommunityIcons name="open-in-new" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.newsScrollView}
          contentContainerStyle={styles.newsScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Article Image (if available) */}
          {selectedNews.image && (
            <View style={styles.imageContainer}>
              <ExpoImage
                source={{ uri: selectedNews.image }}
                style={styles.articleImage}
                contentFit="cover"
              />
            </View>
          )}

          {/* Article Header Info */}
          <View style={styles.articleHeader}>
            <View style={styles.sourceRow}>
              <View style={styles.sourceContainer}>
                <MaterialCommunityIcons name="newspaper" size={18} color="#17bf2d" />
                <Text style={styles.source}>{selectedNews.source}</Text>
              </View>
              <View style={styles.relatedContainer}>
                <MaterialCommunityIcons name="trending-up" size={16} color="#6E7681" />
                <Text style={styles.related}>{selectedNews.related}</Text>
              </View>
            </View>
            <Text style={styles.date}>{formatDate(selectedNews.datetime)}</Text>
          </View>

          {/* Article Headline */}
          <Text style={styles.headline}>{selectedNews.headline}</Text>

          {/* Article Summary/Content */}
          <View style={styles.contentContainer}>
            <Text style={styles.articleSectionTitle}>Summary</Text>
            <Text style={styles.summary}>{selectedNews.summary}</Text>
            
            {/* Information Note */}
            <View style={styles.infoNote}>
              <MaterialCommunityIcons name="information" size={20} color="#17bf2d" />
              <Text style={styles.infoText}>
                This is a summary of the article. Tap "Read Full Article" below to view the complete story on the original website.
              </Text>
            </View>
          </View>

          {/* Read Full Article Button */}
          <TouchableOpacity 
            style={styles.fullArticleButton}
            onPress={() => handleOpenOriginal(selectedNews.url)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="web" size={20} color="#ffffff" />
            <Text style={styles.fullArticleButtonText}>Read Full Article</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#ffffff" />
          </TouchableOpacity>

          {/* Additional Info */}
          <View style={styles.metaContainer}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="link" size={16} color="#6E7681" />
              <Text style={styles.metaLabel}>Source:</Text>
              <Text style={styles.metaValue} numberOfLines={1}>{selectedNews.url}</Text>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  // Default view: show news list and favorites
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Header Section with Equinox Logo */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Hi, {userName}</Text>
          <Text style={styles.headerSubtitle}>Market pulse</Text>
        </View>
        <View style={styles.logoContainer}>
          <Image 
            source={require('@/assets/images/logo.png')}
            style={styles.equinoxLogo}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* News Section */}
      <View style={styles.newsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trending News</Text>
          <TouchableOpacity>
            <Text style={styles.moreText}>more</Text>
          </TouchableOpacity>
        </View>
        
        {isLoadingNews ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading news...</Text>
          </View>
        ) : (
          <FlatList
            data={trendingNews}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <NewsCard news={item} onPress={handleNewsPress} />
            )}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.newsListContent}
          />
        )}
      </View>

      {/* Favorite Stocks Section */}
      <View style={styles.favoritesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Favorite Stocks</Text>
          <TouchableOpacity>
            <Text style={styles.moreText}>more</Text>
          </TouchableOpacity>
        </View>
        
        {favoriteStocks.length > 0 ? (
          favoriteStocks.slice(0, 3).map((stock, index) => (
            <TouchableOpacity 
              key={stock.ticker} 
              onPress={() => router.push({
                pathname: '/(tabs)/discover',
                params: {
                  stockTicker: stock.ticker,
                  companyName: stock.companyName,
                  price: stock.price.toString(),
                  priceChange: stock.priceChange.toString(),
                  priceChangePercent: stock.priceChangePercentage.toString(),
                  logoUrl: stock.image,
                }
              })}
            >
              <StockCard
                ticker={stock.ticker}
                companyName={stock.companyName}
                price={stock.price}
                priceChange={stock.priceChange}
                priceChangePercentage={stock.priceChangePercentage}
                image={stock.image}
              />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyFavorites}>
            <Text style={styles.emptyFavoritesText}>No favorite stocks yet</Text>
            <Text style={styles.emptyFavoritesSubtext}>Add stocks to your favorites to see them here</Text>
          </View>
        )}
      </View>


    </ScrollView>
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
  logoContainer: {
    marginLeft: 60,
    shadowColor: '#ffffff',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 1.0,
    shadowRadius: 40,
    elevation: 25,
    borderRadius: 60,
  },
  equinoxLogo: {
    width: 170,
    height: 170,
  },
  newsSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
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
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6E7681',
    fontFamily: 'Poppins',
  },
  newsListContent: {
    paddingLeft: 0,
  },
  favoritesSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#1e1e22',
  },
  emptyFavorites: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  emptyFavoritesText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    fontFamily: 'Poppins',
    marginBottom: 8,
  },
  emptyFavoritesSubtext: {
    fontSize: 14,
    color: '#b8b8d2',
    fontFamily: 'Poppins',
    textAlign: 'center',
  },
  // News Article View Styles
  newsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#17bf2d',
  },
  headerBackButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  newsHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
  },
  headerOpenButton: {
    padding: 4,
    marginLeft: 12,
  },
  newsScrollView: {
    flex: 1,
  },
  newsScrollContent: {
    paddingBottom: 20,
  },
  imageContainer: {
    width: '100%',
    height: 240,
    backgroundColor: '#2a2a2e',
  },
  articleImage: {
    width: '100%',
    height: '100%',
  },
  articleHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3e',
  },
  sourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  source: {
    color: '#17bf2d',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins',
    marginLeft: 6,
  },
  relatedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  related: {
    color: '#6E7681',
    fontSize: 12,
    fontFamily: 'Poppins',
    marginLeft: 4,
  },
  date: {
    color: '#8B949E',
    fontSize: 12,
    fontFamily: 'Poppins',
  },
  headline: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
    lineHeight: 32,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  articleSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#C9D1D9',
    fontFamily: 'Poppins',
    marginBottom: 12,
  },
  summary: {
    fontSize: 16,
    color: '#C9D1D9',
    fontFamily: 'Poppins',
    lineHeight: 24,
    marginBottom: 24,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#2a2a2e',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#17bf2d',
    marginTop: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#8B949E',
    fontFamily: 'Poppins',
    lineHeight: 18,
    marginLeft: 12,
  },
  fullArticleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#17bf2d',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 24,
    gap: 8,
  },
  fullArticleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Poppins',
  },
  metaContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#3a3a3e',
  },
  metaLabel: {
    fontSize: 13,
    color: '#8B949E',
    fontFamily: 'Poppins',
    marginLeft: 8,
    marginRight: 8,
  },
  metaValue: {
    flex: 1,
    fontSize: 12,
    color: '#6E7681',
    fontFamily: 'Poppins',
  },
});
