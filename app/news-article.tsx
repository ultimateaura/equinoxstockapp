import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

export default function NewsArticleScreen() {
  const params = useLocalSearchParams();
  
  // Parse the news item from params
  const newsItem = params.news ? JSON.parse(params.news as string) : null;

  if (!newsItem) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#FF6B6B" />
          <Text style={styles.errorText}>Article not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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

  const handleOpenOriginal = () => {
    if (newsItem.url) {
      Linking.openURL(newsItem.url).catch(err => {
        console.error('Failed to open URL:', err);
      });
    }
  };

  const handleAskAI = async () => {
    try {
      const context = {
        screen: 'news-article',
        data: {
          related: newsItem.related || '',
          headline: newsItem.headline || '',
          source: newsItem.source || '',
        },
        suggestion: `Reading news about ${newsItem.related || 'the market'}. Ask for implications or next steps.`
      };
      await AsyncStorage.setItem('aiContext', JSON.stringify(context));
      router.push('/ai');
    } catch (e) {
      router.push('/ai');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
          <MaterialCommunityIcons name="chevron-left" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>News Article</Text>
        </View>
        <TouchableOpacity onPress={handleAskAI} style={styles.headerOpenButton}>
          <MaterialCommunityIcons name="robot-outline" size={20} color="#ffffff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleOpenOriginal} style={[styles.headerOpenButton, { marginLeft: 8 }]}>
          <MaterialCommunityIcons name="open-in-new" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Article Image (if available) */}
        {newsItem.image && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: newsItem.image }}
              style={styles.articleImage}
              contentFit="cover"
              placeholder={require('@/assets/images/adaptive-icon.png')}
            />
          </View>
        )}

        {/* Article Header Info */}
        <View style={styles.articleHeader}>
          <View style={styles.sourceRow}>
            <View style={styles.sourceContainer}>
              <MaterialCommunityIcons name="newspaper" size={18} color="#17bf2d" />
              <Text style={styles.source}>{newsItem.source}</Text>
            </View>
            <View style={styles.relatedContainer}>
              <MaterialCommunityIcons name="trending-up" size={16} color="#6E7681" />
              <Text style={styles.related}>{newsItem.related}</Text>
            </View>
          </View>
          <Text style={styles.date}>{formatDate(newsItem.datetime)}</Text>
        </View>

        {/* Article Headline */}
        <Text style={styles.headline}>{newsItem.headline}</Text>

        {/* Article Summary/Content */}
        <View style={styles.contentContainer}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <Text style={styles.summary}>{newsItem.summary}</Text>
          
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
          onPress={handleOpenOriginal}
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
            <Text style={styles.metaValue} numberOfLines={1}>{newsItem.url}</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
  },
  headerOpenButton: {
    padding: 4,
    marginLeft: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
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
  sectionTitle: {
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    color: '#C9D1D9',
    fontFamily: 'Poppins',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#17bf2d',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Poppins',
  },
});

