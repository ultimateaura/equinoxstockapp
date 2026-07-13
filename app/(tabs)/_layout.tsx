import FontAwesome from '@expo/vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs, router } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useColorScheme } from '@/components/useColorScheme';

type TabDef = {
  name: string;
  label: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
};

/** Portfolio-first order: My Portfolio | Market | Ask AI | Discover | Account */
const LEFT_TABS: TabDef[] = [
  { name: 'portfolio', label: 'My Portfolio', icon: 'briefcase' },
  { name: 'index', label: 'Market', icon: 'line-chart' },
];
const RIGHT_TABS: TabDef[] = [
  { name: 'discover', label: 'Discover', icon: 'compass' },
  { name: 'settings', label: 'Account', icon: 'user' },
];

function CustomTabBar({ state, navigation }: any) {
  const handleAIButtonPress = async () => {
    try {
      const currentRoute = state.routes[state.index];
      const existing = await AsyncStorage.getItem('aiContext');
      if (!existing) {
        const context = {
          screen:
            currentRoute.name === 'index'
              ? 'home'
              : currentRoute.name === 'portfolio'
                ? 'portfolio'
                : currentRoute.name === 'discover'
                  ? 'trending'
                  : currentRoute.name === 'settings'
                    ? 'account'
                    : 'portfolio',
          data: null as any,
          suggestion:
            currentRoute.name === 'portfolio'
              ? 'Ask about Portfolio DNA, what-if ranges, market regime, or your investing patterns.'
              : currentRoute.name === 'index'
                ? 'Ask about trending stocks or market themes.'
                : currentRoute.name === 'discover'
                  ? 'Ask about any stock; I will fetch cards and analyze.'
                  : 'Ask about account or general investing.',
        };
        await AsyncStorage.setItem('aiContext', JSON.stringify(context));
      }
      router.push('/ai');
    } catch (error) {
      console.error('Error storing context:', error);
      router.push('/ai');
    }
  };

  const renderTab = (tab: TabDef, marginStyle?: object) => {
    const routeIndex = state.routes.findIndex((r: any) => r.name === tab.name);
    if (routeIndex < 0) return null;
    const route = state.routes[routeIndex];
    const focused = state.index === routeIndex;

    return (
      <TouchableOpacity
        key={route.key}
        onPress={() => navigation.navigate(tab.name)}
        style={[styles.navItem, marginStyle]}
      >
        <View style={styles.navItemContent}>
          <FontAwesome name={tab.icon} size={24} color={focused ? '#17bf2d' : '#b8b8d2'} />
          <Text style={[styles.navLabel, { color: focused ? '#17bf2d' : '#b8b8d2' }]}>
            {tab.label}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.customNavBar}>
      {renderTab(LEFT_TABS[0])}
      {renderTab(LEFT_TABS[1], { marginRight: 40 })}

      <TouchableOpacity style={styles.askAiButton} onPress={handleAIButtonPress}>
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/logoImg.png')}
            style={styles.aiLogo}
            resizeMode="contain"
          />
        </View>
      </TouchableOpacity>

      {renderTab(RIGHT_TABS[0], { marginLeft: 40 })}
      {renderTab(RIGHT_TABS[1])}
    </View>
  );
}

export default function TabLayout() {
  useColorScheme();

  return (
    <Tabs
      initialRouteName="portfolio"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'My Portfolio',
          tabBarIcon: ({ color }) => <FontAwesome name="briefcase" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Market',
          tabBarIcon: ({ color }) => <FontAwesome name="line-chart" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color }) => <FontAwesome name="compass" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => <FontAwesome name="user" size={24} color={color} />,
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
    marginBottom: 15,
  },
  navItemContent: {
    alignItems: 'center',
  },
  navLabel: {
    fontSize: 10,
    fontFamily: 'Poppins',
    fontWeight: '500',
    textAlign: 'center',
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
});
