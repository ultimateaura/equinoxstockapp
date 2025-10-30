import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import ErrorHandler from '@/utils/errorHandler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import React from 'react';
import { Alert, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, List, Text } from 'react-native-paper';

export default function SettingsScreen() {
  // Safely access settings context
  let settingsContext: any = {
    darkMode: true,
    setDarkMode: (_value: boolean) => {},
    notifications: true,
    setNotifications: (_value: boolean) => {},
    priceAlerts: true,
    setPriceAlerts: (_value: boolean) => {},
    newsAlerts: false,
    setNewsAlerts: (_value: boolean) => {},
    autoRefresh: true,
    setAutoRefresh: (_value: boolean) => {},
    showPercentages: true,
    setShowPercentages: (_value: boolean) => {},
    currency: 'USD',
    setCurrency: (_value: string) => {},
    clearCache: async () => {},
    exportData: async () => {},
  };

  try {
    settingsContext = useSettings();
  } catch (error) {
    console.log('Settings context not available in SettingsScreen');
  }

  // Safely access auth context
  let user = null;
  let userProfile = null;
  let signOutUser = async () => {};

  try {
    const authContext = useAuth();
    user = authContext.user;
    userProfile = authContext.userProfile;
    signOutUser = authContext.signOutUser;
  } catch (error) {
    console.log('Auth context not available in SettingsScreen');
  }

  const {
    darkMode,
    setDarkMode,
    notifications,
    setNotifications,
    priceAlerts,
    setPriceAlerts,
    newsAlerts,
    setNewsAlerts,
    autoRefresh,
    setAutoRefresh,
    showPercentages,
    setShowPercentages,
    currency,
    setCurrency,
    clearCache,
    exportData,
  } = settingsContext;

  // Store context when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      const storeSettingsContext = async () => {
        try {
          const context = {
            screen: 'account',
            data: {
              user: {
                name: userProfile?.name || user?.displayName || 'User',
                email: user?.email || 'No email',
              },
              settings: {
                darkMode,
                notifications,
                priceAlerts,
                newsAlerts,
                autoRefresh,
                showPercentages,
                currency,
              },
            },
            suggestion: 'I can help you understand your account settings, explain notification preferences, or answer questions about how to customize your experience. What would you like to know?',
          };
          await AsyncStorage.setItem('aiContext', JSON.stringify(context));
        } catch (error) {
          console.error('Error storing settings context:', error);
        }
      };

      storeSettingsContext();
    }, [user, userProfile, darkMode, notifications, priceAlerts, newsAlerts, autoRefresh, showPercentages, currency])
  );

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data and may improve performance. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: async () => {
            try {
              await clearCache();
              Alert.alert('Success', 'Cache cleared successfully!');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'Export your portfolio and watchlist data?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Export', 
          onPress: async () => {
            try {
              const data = await exportData();
              Alert.alert('Success', 'Data exported successfully! Check console for details.');
              console.log('Exported data:', data);
            } catch (error) {
              Alert.alert('Error', 'Failed to export data. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://equinox-stocks.com/privacy');
  };

  const handleTermsOfService = () => {
    Linking.openURL('https://equinox-stocks.com/terms');
  };

  const handleSupport = () => {
    Linking.openURL('mailto:support@equinox-stocks.com');
  };

  const handleChangeProfilePicture = () => {
    Alert.alert(
      'Change Profile Picture',
      'Choose how you want to update your profile picture',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => Alert.alert('Camera', 'Camera functionality coming soon!') },
        { text: 'Choose from Gallery', onPress: () => Alert.alert('Gallery', 'Gallery functionality coming soon!') },
      ]
    );
  };

  const handleLogout = async () => {
    ErrorHandler.showDestructiveConfirmationAlert(
      'Are you sure you want to logout?',
      'Logout',
      async () => {
        try {
          await signOutUser();
          router.push('/login');
          // Force navigation reset by redirecting to login
          // The AuthContext state change will trigger navigation in _layout.tsx
        } catch (error) {
          ErrorHandler.showErrorAlert(error, 'Logout Failed');
        }
      }
    );
  };

  const handleEditProfile = () => {
    router.push('/edit-profile');
  };

  const handleDeleteAccount = () => {
    ErrorHandler.showDestructiveConfirmationAlert(
      'Are you sure you want to delete your account? This action cannot be undone.',
      'Delete Account',
      () => {
        ErrorHandler.showSuccessAlert('Account deletion will be available in a future update.', 'Coming Soon');
      }
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account</Text>
        <Text style={styles.headerSubtitle}>Manage your profile</Text>
      </View>

      {/* Profile Picture Section */}
      <View style={styles.profileSection}>
        <TouchableOpacity style={styles.profilePictureButton} onPress={handleChangeProfilePicture}>
          <View style={styles.profilePicture}>
            <Text style={styles.profilePictureText}>
              {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.editIcon}>
            <MaterialCommunityIcons name="camera" size={16} color="#ffffff" />
          </View>
        </TouchableOpacity>
        <Text style={styles.profileName}>
          {userProfile?.name || user?.displayName || 'User'}
        </Text>
        <Text style={styles.profileEmail}>
          {userProfile?.email || user?.email || ''}
        </Text>
      </View>

      {/* Account Options */}
      <View style={styles.optionsContainer}>
        <Card style={styles.card}>
          <Card.Content>
            <List.Item
              title="Favourite"
              description="Manage your favorite stocks"
              left={(props) => <List.Icon {...props} icon="heart" />}
              right={() => (
                <MaterialCommunityIcons name="chevron-right" size={24} color="#17bf2d" />
              )}
              titleStyle={styles.listItemTitle}
              descriptionStyle={styles.listItemDescription}
            />

            <List.Item
              title="Edit Account"
              description="Update your profile information"
              left={(props) => <List.Icon {...props} icon="account-edit" />}
              right={() => (
                <MaterialCommunityIcons name="chevron-right" size={24} color="#17bf2d" />
              )}
              onPress={handleEditProfile}
              titleStyle={styles.listItemTitle}
              descriptionStyle={styles.listItemDescription}
            />

            <List.Item
              title="Settings and Privacy"
              description="Manage your privacy settings"
              left={(props) => <List.Icon {...props} icon="shield-account" />}
              right={() => (
                <MaterialCommunityIcons name="chevron-right" size={24} color="#17bf2d" />
              )}
              titleStyle={styles.listItemTitle}
              descriptionStyle={styles.listItemDescription}
            />

            <List.Item
              title="Help"
              description="Get help and support"
              left={(props) => <List.Icon {...props} icon="help-circle" />}
              right={() => (
                <MaterialCommunityIcons name="chevron-right" size={24} color="#17bf2d" />
              )}
              onPress={handleSupport}
              titleStyle={styles.listItemTitle}
              descriptionStyle={styles.listItemDescription}
            />

            <List.Item
              title="Logout"
              description="Sign out of your account"
              left={(props) => <List.Icon {...props} icon="logout" />}
              onPress={handleLogout}
              titleStyle={[styles.listItemTitle, { color: '#ff6b6b' }]}
              descriptionStyle={styles.listItemDescription}
            />

            <List.Item
              title="Delete Account"
              description="Permanently delete your account"
              left={(props) => <List.Icon {...props} icon="delete-forever" />}
              onPress={handleDeleteAccount}
              titleStyle={[styles.listItemTitle, { color: '#ff6b6b' }]}
              descriptionStyle={styles.listItemDescription}
            />
          </Card.Content>
        </Card>
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
    
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#17bf2d',
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
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#1e1e22',
  },
  profilePictureButton: {
    position: 'relative',
  },
  profilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#17bf2d',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  profilePictureText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#17bf2d',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
    marginTop: 16,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#b8b8d2',
    fontFamily: 'Poppins',
  },
  optionsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: '#1e1e22',
  },
  card: {
    margin: 0,
    backgroundColor: '#2a2a2e',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#3a3a3e',
  },
  sectionTitle: {
    color: '#17bf2d',
    marginBottom: 15,
    fontWeight: 'bold',
    fontFamily: 'Poppins',
  },
  listItemTitle: {
    color: '#ffffff',
    fontFamily: 'Poppins',
    fontWeight: '500',
  },
  listItemDescription: {
    color: '#b8b8d2',
    fontFamily: 'Poppins',
  },
});
