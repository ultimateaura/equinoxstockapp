import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams, usePathname } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from 'react-native-paper';

export const AdvisorBubble = () => {
  const pathname = usePathname();
  const params = useLocalSearchParams();

  const getContextInfo = () => {
    let context: {
      screen: string;
      data: any;
      suggestion: string;
    } = {
      screen: 'unknown',
      data: null,
      suggestion: ''
    };

    if (pathname === '/') {
      context.screen = 'home';
      context.suggestion = 'Welcome to Equinox! I can help you learn about investing, analyze stocks, and provide educational guidance for your investment journey. What would you like to know?';
    } else if (pathname === '/discover') {
      context.screen = 'discover';
      context.suggestion = 'I can help you analyze any stocks you\'re viewing on the discover screen. Ask me about specific companies, market trends, or investment strategies.';
    } else if (pathname === '/portfolio') {
      context.screen = 'portfolio';
      context.suggestion = 'I can help you analyze your tracked portfolio, suggest strategies, or provide insights on your external holdings. What would you like to know about your investments?';
    } else if (pathname === '/settings') {
      context.screen = 'settings';
      context.suggestion = 'I can help you understand app settings or provide general investment guidance. How can I assist you?';
    } else if (pathname.startsWith('/') && params.ticker) {
      context.screen = 'stock-detail';
      context.data = {
        ticker: params.ticker as string
      };
      context.suggestion = `I can provide detailed analysis of ${params.ticker}, including investment recommendations, risk assessment, or market outlook. What would you like to know about this stock?`;
    }

    return context;
  };

  const handlePress = () => {
    const context = getContextInfo();
    router.push({
      pathname: '/ai',
      params: {
        context: JSON.stringify(context)
      }
    });
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableOpacity 
        style={styles.bubble} 
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={styles.bubbleContent}>
          <FontAwesome
            name="comments"
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.bubbleText}>Ask AI</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100, // Increased from 30 to avoid nav bar (typically around 80-90px)
    right: 20,
    zIndex: 1000,
  },
  bubble: {
    backgroundColor: '#00FF88', // Bright green background
    borderRadius: 25,
    shadowColor: '#00FF88', // Green shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#00CC6A', // Slightly darker green border
  },
  bubbleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  bubbleText: {
    color: '#0D1117', // Dark text on green background
    fontSize: 14,
    fontWeight: '600',
  },
});