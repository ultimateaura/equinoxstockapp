import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

interface AISettings {
  conversationPersistence: boolean;
  responseDetailLevel: 'concise' | 'balanced' | 'detailed';
  enableDataEnrichment: boolean;
  enableSuggestions: boolean;
  enableEducationalTips: boolean;
  defaultVisualizationStyle: string;
  showDataSources: boolean;
}

const DEFAULT_SETTINGS: AISettings = {
  conversationPersistence: true,
  responseDetailLevel: 'balanced',
  enableDataEnrichment: true,
  enableSuggestions: true,
  enableEducationalTips: true,
  defaultVisualizationStyle: 'dark',
  showDataSources: true,
};

export default function AISettingsScreen() {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem('aiSettings');
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading AI settings:', error);
    }
  };

  const saveSettings = async (newSettings: AISettings) => {
    try {
      setIsSaving(true);
      await AsyncStorage.setItem('aiSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving AI settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = <K extends keyof AISettings>(key: K, value: AISettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>AI Settings</Text>
          <Text style={styles.headerSubtitle}>Customize your AI experience</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Conversation Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conversation</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Save Conversation History</Text>
              <Text style={styles.settingDescription}>
                Store your conversations for future reference
              </Text>
            </View>
            <Switch
              value={settings.conversationPersistence}
              onValueChange={(value) => updateSetting('conversationPersistence', value)}
              trackColor={{ false: '#3a3a3e', true: '#17bf2d' }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Show Data Sources</Text>
              <Text style={styles.settingDescription}>
                Display where information comes from
              </Text>
            </View>
            <Switch
              value={settings.showDataSources}
              onValueChange={(value) => updateSetting('showDataSources', value)}
              trackColor={{ false: '#3a3a3e', true: '#17bf2d' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Response Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Response Style</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Detail Level</Text>
              <Text style={styles.settingDescription}>
                How detailed should responses be?
              </Text>
            </View>
          </View>

          <View style={styles.optionsContainer}>
            {(['concise', 'balanced', 'detailed'] as const).map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.optionButton,
                  settings.responseDetailLevel === level && styles.optionButtonActive
                ]}
                onPress={() => updateSetting('responseDetailLevel', level)}
              >
                <Text style={[
                  styles.optionText,
                  settings.responseDetailLevel === level && styles.optionTextActive
                ]}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Data & Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Features</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Smart Data Enrichment</Text>
              <Text style={styles.settingDescription}>
                Automatically fetch relevant real-time data
              </Text>
            </View>
            <Switch
              value={settings.enableDataEnrichment}
              onValueChange={(value) => updateSetting('enableDataEnrichment', value)}
              trackColor={{ false: '#3a3a3e', true: '#17bf2d' }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>AI Suggestions</Text>
              <Text style={styles.settingDescription}>
                Show suggested questions based on context
              </Text>
            </View>
            <Switch
              value={settings.enableSuggestions}
              onValueChange={(value) => updateSetting('enableSuggestions', value)}
              trackColor={{ false: '#3a3a3e', true: '#17bf2d' }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Educational Tips</Text>
              <Text style={styles.settingDescription}>
                Receive helpful investing tips and insights
              </Text>
            </View>
            <Switch
              value={settings.enableEducationalTips}
              onValueChange={(value) => updateSetting('enableEducationalTips', value)}
              trackColor={{ false: '#3a3a3e', true: '#17bf2d' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Visualization Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visualizations</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Default Style</Text>
              <Text style={styles.settingDescription}>
                Choose your preferred visualization style
              </Text>
            </View>
          </View>

          <View style={styles.optionsContainer}>
            {['minimalist', 'bold', 'professional', 'dark', 'pastel'].map((style) => (
              <TouchableOpacity
                key={style}
                style={[
                  styles.optionButton,
                  settings.defaultVisualizationStyle === style && styles.optionButtonActive
                ]}
                onPress={() => updateSetting('defaultVisualizationStyle', style)}
              >
                <Text style={[
                  styles.optionText,
                  settings.defaultVisualizationStyle === style && styles.optionTextActive
                ]}>
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="information-outline" size={24} color="#17bf2d" />
            <View style={styles.infoContent}>
              <Text style={styles.infoText}>
                The AI Advisor uses advanced language models to provide educational insights about investing. 
                It's designed to help you learn, not to provide specific investment advice.
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="shield-check-outline" size={24} color="#17bf2d" />
            <View style={styles.infoContent}>
              <Text style={styles.infoText}>
                Your conversations are private and stored securely. You can delete your conversation history 
                at any time from the AI screen.
              </Text>
            </View>
          </View>
        </View>

        {/* Reset Button */}
        <TouchableOpacity 
          style={styles.resetButton}
          onPress={() => saveSettings(DEFAULT_SETTINGS)}
        >
          <MaterialCommunityIcons name="restore" size={20} color="#ff6b6b" />
          <Text style={styles.resetButtonText}>Reset to Defaults</Text>
        </TouchableOpacity>
      </ScrollView>

      {isSaving && (
        <View style={styles.savingIndicator}>
          <Text style={styles.savingText}>Saving...</Text>
        </View>
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#17bf2d',
  },
  backButton: {
    marginRight: 15,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ffffff',
    fontFamily: 'Poppins',
    opacity: 0.9,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2e',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingLabel: {
    fontSize: 16,
    color: '#ffffff',
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#b8b8d2',
    fontFamily: 'Poppins',
    lineHeight: 20,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  optionButton: {
    backgroundColor: '#2a2a2e',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonActive: {
    backgroundColor: '#17bf2d',
    borderColor: '#17bf2d',
  },
  optionText: {
    fontSize: 14,
    color: '#b8b8d2',
    fontFamily: 'Poppins',
  },
  optionTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2e',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#b8b8d2',
    fontFamily: 'Poppins',
    lineHeight: 20,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2e',
    borderRadius: 8,
    paddingVertical: 15,
    margin: 20,
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  resetButtonText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Poppins',
    marginLeft: 8,
  },
  savingIndicator: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#17bf2d',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  savingText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Poppins',
  },
});

