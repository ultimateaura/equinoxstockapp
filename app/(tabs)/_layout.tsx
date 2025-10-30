import FontAwesome from '@expo/vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs, router } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useColorScheme } from '@/components/useColorScheme';


// Custom Tab Bar Component matching Figma design
function CustomTabBar({ state, descriptors, navigation }: any) {
  // Function to handle AI button press with context from current screen
  const handleAIButtonPress = async () => {
    try {
      const currentScreenIndex = state.index;
      const currentRoute = state.routes[currentScreenIndex];
      
      // If a rich aiContext was already published by the screen, use it.
      const existing = await AsyncStorage.getItem('aiContext');
      if (!existing) {
        // Fallback: publish a minimal context so AI always has something
        const context = {
          screen: currentRoute.name === 'index' ? 'home'
                : currentRoute.name === 'portfolio' ? 'portfolio'
                : currentRoute.name === 'discover' ? 'trending'
                : currentRoute.name === 'settings' ? 'account'
                : 'home',
          data: null as any,
          suggestion: currentRoute.name === 'index' ? 'Ask about trending stocks or market themes.'
                   : currentRoute.name === 'portfolio' ? 'Ask about diversification, rebalancing, performance.'
                   : currentRoute.name === 'discover' ? 'Ask about any stock; I’ll fetch cards and analyze.'
                   : 'Ask about account or general investing.'
        };
        await AsyncStorage.setItem('aiContext', JSON.stringify(context));
      }

      router.push('/ai');
    } catch (error) {
      console.error('Error storing context:', error);
      // Fallback to basic navigation
      router.push('/ai');
    }
  };

  return (
    <View style={styles.customNavBar}>
      {/* Home */}
      {state.routes[0] && (
        <TouchableOpacity
          key={state.routes[0].key}
          onPress={() => navigation.navigate(state.routes[0].name)}
          style={styles.navItem}
        >
          <View style={styles.navItemContent}>
            <FontAwesome name="home" size={24} color={state.index === 0 ? '#17bf2d' : '#b8b8d2'} />
            <Text style={[
              styles.navLabel,
              { color: state.index === 0 ? '#17bf2d' : '#b8b8d2' }
            ]}>
              Home
            </Text>
          </View>
        </TouchableOpacity>
      )}
      
      {/* Portfolio */}
      {state.routes[1] && (
        <TouchableOpacity
          key={state.routes[1].key}
          onPress={() => navigation.navigate(state.routes[1].name)}
          style={[styles.navItem, { marginRight: 40 }]}
        >
          <View style={styles.navItemContent}>
            <FontAwesome name="briefcase" size={24} color={state.index === 1 ? '#17bf2d' : '#b8b8d2'} />
            <Text style={[
              styles.navLabel,
              { color: state.index === 1 ? '#17bf2d' : '#b8b8d2' }
            ]}>
              Portfolio
            </Text>
          </View>
        </TouchableOpacity>
      )}
      
      {/* Ask AI Button - larger and higher */}
      <TouchableOpacity style={styles.askAiButton} onPress={handleAIButtonPress}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('@/assets/images/logoImg.png')} 
            style={styles.aiLogo}
            resizeMode="contain"
          />
        </View>
      </TouchableOpacity>
      
      {/* Discover */}
      {state.routes[2] && (
        <TouchableOpacity
          key={state.routes[2].key}
          onPress={() => navigation.navigate(state.routes[2].name)}
          style={[styles.navItem, { marginLeft: 40 }]}
        >
          <View style={styles.navItemContent}>
            <FontAwesome name="compass" size={24} color={state.index === 2 ? '#17bf2d' : '#b8b8d2'} />
            <Text style={[
              styles.navLabel,
              { color: state.index === 2 ? '#17bf2d' : '#b8b8d2' }
            ]}>
              Discover
            </Text>
          </View>
        </TouchableOpacity>
      )}
      
      {/* Account */}
      {state.routes[3] && (
        <TouchableOpacity
          key={state.routes[3].key}
          onPress={() => navigation.navigate(state.routes[3].name)}
          style={styles.navItem}
        >
          <View style={styles.navItemContent}>
            <FontAwesome name="user" size={24} color={state.index === 3 ? '#17bf2d' : '#b8b8d2'} />
            <Text style={[
              styles.navLabel,
              { color: state.index === 3 ? '#17bf2d' : '#b8b8d2' }
            ]}>
              Account
            </Text>
          </View>
        </TouchableOpacity>
      )}
      
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: false,
      }}>
        
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome name="home" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome name="briefcase" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome name="compass" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome name="user" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
  
}

const styles = StyleSheet.create({
  customNavBar: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2e',
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#3a3a3e',
    height: 80,
    position: 'relative',
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
    marginBottom: 15
  },
  navItemContent: {
    alignItems: 'center',
  },
  navLabel: {
    fontSize: 11,
    fontFamily: 'Poppins',
    fontWeight: '500',
  },
  askAiButton: {
    width: 72,
    height: 72,
    borderRadius: 26,
    backgroundColor: '#2a2a2e',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    position: 'absolute',
    bottom: 20,
    left: '50%',
    marginBottom: 6.7,
    marginLeft: -26,
  },
    logoContainer: {
      width: 52,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#17bf2d',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1.0,
      shadowRadius: 25,
      elevation: 20,
    },
  aiLogo: {
    width: 45,
    height: 45,
    tintColor: '#17bf2d',
  },
  spacer: {
    flex: 1,
  },
});
