import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';

interface SettingsContextType {
  // Display Settings
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  showPercentages: boolean;
  setShowPercentages: (value: boolean) => void;
  currency: string;
  setCurrency: (value: string) => void;
  
  // Notification Settings
  notifications: boolean;
  setNotifications: (value: boolean) => void;
  priceAlerts: boolean;
  setPriceAlerts: (value: boolean) => void;
  newsAlerts: boolean;
  setNewsAlerts: (value: boolean) => void;
  
  // Data & Performance
  autoRefresh: boolean;
  setAutoRefresh: (value: boolean) => void;
  
  // Utility functions
  clearCache: () => Promise<void>;
  exportData: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: React.ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  // Display Settings
  const [darkMode, setDarkModeState] = useState(true);
  const [showPercentages, setShowPercentagesState] = useState(true);
  const [currency, setCurrencyState] = useState('USD');
  
  // Notification Settings
  const [notifications, setNotificationsState] = useState(true);
  const [priceAlerts, setPriceAlertsState] = useState(true);
  const [newsAlerts, setNewsAlertsState] = useState(false);
  
  // Data & Performance
  const [autoRefresh, setAutoRefreshState] = useState(true);

  // Safely access auth context
  let user = null;
  try {
    const authContext = useAuth();
    user = authContext.user;
  } catch (error) {
    // Auth context not available yet
    console.log('Auth context not available in SettingsProvider');
  }

  // Load settings from Firestore when user changes
  useEffect(() => {
    if (!user) {
      loadSettingsFromAsyncStorage();
      return;
    }

    // Check if Firestore is properly configured
    if (!db) {
      console.log('Firestore not initialized, using local storage only');
      loadSettingsFromAsyncStorage();
      return;
    }

    try {
      const settingsRef = doc(db, 'users', user.uid);
      
      const unsubscribe = onSnapshot(settingsRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const settings = data.settings || {};
          setDarkModeState(settings.darkMode ?? true);
          setShowPercentagesState(settings.showPercentages ?? true);
          setCurrencyState(settings.currency ?? 'USD');
          setNotificationsState(settings.notifications ?? true);
          setPriceAlertsState(settings.priceAlerts ?? true);
          setNewsAlertsState(settings.newsAlerts ?? false);
          setAutoRefreshState(settings.autoRefresh ?? true);
        } else {
          loadSettingsFromAsyncStorage();
        }
      }, (error) => {
        console.error('Error loading settings from Firestore, using local storage:', error);
        loadSettingsFromAsyncStorage();
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up Firestore listener:', error);
      loadSettingsFromAsyncStorage();
    }
  }, [user]);

  // Load settings from storage on app start (fallback)
  useEffect(() => {
    if (!user) {
      loadSettingsFromAsyncStorage();
    }
  }, []);

  const loadSettingsFromAsyncStorage = async () => {
    try {
      const settings = await AsyncStorage.getItem('app_settings');
      if (settings) {
        const parsedSettings = JSON.parse(settings);
        setDarkModeState(parsedSettings.darkMode ?? true);
        setShowPercentagesState(parsedSettings.showPercentages ?? true);
        setCurrencyState(parsedSettings.currency ?? 'USD');
        setNotificationsState(parsedSettings.notifications ?? true);
        setPriceAlertsState(parsedSettings.priceAlerts ?? true);
        setNewsAlertsState(parsedSettings.newsAlerts ?? false);
        setAutoRefreshState(parsedSettings.autoRefresh ?? true);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('app_settings');
      if (settings) {
        const parsedSettings = JSON.parse(settings);
        setDarkModeState(parsedSettings.darkMode ?? true);
        setShowPercentagesState(parsedSettings.showPercentages ?? true);
        setCurrencyState(parsedSettings.currency ?? 'USD');
        setNotificationsState(parsedSettings.notifications ?? true);
        setPriceAlertsState(parsedSettings.priceAlerts ?? true);
        setNewsAlertsState(parsedSettings.newsAlerts ?? false);
        setAutoRefreshState(parsedSettings.autoRefresh ?? true);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings: Partial<SettingsContextType>) => {
    try {
      // Save to AsyncStorage (fallback)
      const currentSettings = await AsyncStorage.getItem('app_settings');
      const settings = currentSettings ? JSON.parse(currentSettings) : {};
      const updatedSettings = { ...settings, ...newSettings };
      await AsyncStorage.setItem('app_settings', JSON.stringify(updatedSettings));

      // Save to Firestore if user is authenticated and Firestore is configured
      if (user && db) {
        try {
          await setDoc(doc(db, 'users', user.uid), {
            settings: updatedSettings
          }, { merge: true });
        } catch (firestoreError) {
          console.error('Error saving settings to Firestore:', firestoreError);
          // Continue without crashing
        }
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  // Wrapper functions that save to storage
  const setDarkMode = (value: boolean) => {
    setDarkModeState(value);
    saveSettings({ darkMode: value });
  };

  const setShowPercentages = (value: boolean) => {
    setShowPercentagesState(value);
    saveSettings({ showPercentages: value });
  };

  const setCurrency = (value: string) => {
    setCurrencyState(value);
    saveSettings({ currency: value });
  };

  const setNotifications = (value: boolean) => {
    setNotificationsState(value);
    saveSettings({ notifications: value });
  };

  const setPriceAlerts = (value: boolean) => {
    setPriceAlertsState(value);
    saveSettings({ priceAlerts: value });
  };

  const setNewsAlerts = (value: boolean) => {
    setNewsAlertsState(value);
    saveSettings({ newsAlerts: value });
  };

  const setAutoRefresh = (value: boolean) => {
    setAutoRefreshState(value);
    saveSettings({ autoRefresh: value });
  };

  const clearCache = async () => {
    try {
      // Clear cached stock data
      await AsyncStorage.removeItem('stock_data_cache');
      await AsyncStorage.removeItem('trending_stocks_cache');
      await AsyncStorage.removeItem('us_stock_symbols');
      
      // Clear any other cached data
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.includes('cache') || key.includes('_expiry'));
      await AsyncStorage.multiRemove(cacheKeys);
      
      console.log('Cache cleared successfully');
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  };

  const exportData = async () => {
    try {
      // Get portfolio data
      const portfolioData = await AsyncStorage.getItem('portfolio_holdings');
      const favoritesData = await AsyncStorage.getItem('favorite_stocks');
      const settingsData = await AsyncStorage.getItem('app_settings');
      
      const exportData = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        portfolio: portfolioData ? JSON.parse(portfolioData) : [],
        favorites: favoritesData ? JSON.parse(favoritesData) : [],
        settings: settingsData ? JSON.parse(settingsData) : {},
      };
      
      // In a real app, you would save this to a file or share it
      console.log('Export data:', JSON.stringify(exportData, null, 2));
      
      // For now, we'll just log it - in production you'd implement file sharing
      // Return void to match the interface
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  };

  const value: SettingsContextType = {
    // Display Settings
    darkMode,
    setDarkMode,
    showPercentages,
    setShowPercentages,
    currency,
    setCurrency,
    
    // Notification Settings
    notifications,
    setNotifications,
    priceAlerts,
    setPriceAlerts,
    newsAlerts,
    setNewsAlerts,
    
    // Data & Performance
    autoRefresh,
    setAutoRefresh,
    
    // Utility functions
    clearCache,
    exportData,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

