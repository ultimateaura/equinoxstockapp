import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

export interface NewsItem {
  id: number;
  headline: string;
  summary: string;
  url: string;
  source: string;
  datetime: number;
  related: string;
  image?: string;
}

interface NewsCardProps {
  news: NewsItem;
  onPress?: (news: NewsItem) => void;
}

export const NewsCard: React.FC<NewsCardProps> = ({ news, onPress }) => {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const handlePress = () => {
    console.log('NewsCard pressed:', news.headline);
    if (onPress) {
      console.log('Using custom onPress handler');
      onPress(news);
    } else {
      console.log('Warning: NewsCard pressed but no onPress handler provided');
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.8}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.sourceContainer}>
            <MaterialCommunityIcons name="newspaper" size={16} color="#17bf2d" />
            <Text style={styles.source}>{news.source}</Text>
          </View>
          <Text style={styles.time}>{formatDate(news.datetime)}</Text>
        </View>
        
        <Text style={styles.headline} numberOfLines={2}>
          {truncateText(news.headline, 80)}
        </Text>
        
        {news.summary && (
          <Text style={styles.summary} numberOfLines={3}>
            {truncateText(news.summary, 120)}
          </Text>
        )}
        
        <View style={styles.footer}>
          <View style={styles.relatedContainer}>
            <MaterialCommunityIcons name="trending-up" size={14} color="#6E7681" />
            <Text style={styles.related}>{news.related}</Text>
          </View>
          <MaterialCommunityIcons name="open-in-new" size={16} color="#6E7681" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#161B22',
    borderRadius: 12,
    marginRight: 16,
    width: 280,
    borderWidth: 1,
    borderColor: '#3a3a3e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  source: {
    color: '#17bf2d',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Poppins',
    marginLeft: 6,
  },
  time: {
    color: '#6E7681',
    fontSize: 11,
    fontFamily: 'Poppins',
  },
  headline: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins',
    lineHeight: 22,
    marginBottom: 8,
  },
  summary: {
    color: '#C9D1D9',
    fontSize: 13,
    fontFamily: 'Poppins',
    lineHeight: 18,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  relatedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  related: {
    color: '#6E7681',
    fontSize: 11,
    fontFamily: 'Poppins',
    marginLeft: 4,
    flex: 1,
  },
});
