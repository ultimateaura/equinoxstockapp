import { GeneratedVisualization } from '@/components/GeneratedVisualization';
import { VisualizationChart } from '@/components/VisualizationChart';
import { useHoldings } from '@/contexts/HoldingsContext';
import { useInvestmentPlans } from '@/contexts/InvestmentPlansContext';
import { PRESET_STYLES, SavedVisualization, VisualizationConfig } from '@/types/visualization';
import { portfolioContextService } from '@/utils/portfolioContextService';
import { visualizationService } from '@/utils/visualizationService';
import { VisualizationSuggestion, visualizationSuggestionService } from '@/utils/visualizationSuggestionService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';

type VisualizeScreenProps = { embedded?: boolean };

export default function VisualizeScreen({ embedded }: VisualizeScreenProps = {}) {
  const { holdings, refreshPrices } = useHoldings();
  const { plans } = useInvestmentPlans();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentVisualization, setCurrentVisualization] = useState<VisualizationConfig | null>(null);
  const [savedVisualizations, setSavedVisualizations] = useState<SavedVisualization[]>([]);
  const [showExamples, setShowExamples] = useState(true);
  const [includeImage, setIncludeImage] = useState(true); // Always enabled by default
  const [generatedImage, setGeneratedImage] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<VisualizationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [portfolioContext, setPortfolioContext] = useState<any>(null);
  const [lastIntentType, setLastIntentType] = useState<string>('chart'); // Track what type of visualization was generated

  // Auto-refresh prices on mount if needed
  useEffect(() => {
    const autoRefreshPrices = async () => {
      if (holdings.length > 0) {
        // Check if any holdings have zero price
        const hasZeroPrices = holdings.some(h => h.currentPrice === 0);
        if (hasZeroPrices) {
          try {
            await refreshPrices();
          } catch (error) {
            console.error('❌ Auto-refresh failed:', error);
          }
        }
      }
    };
    
    autoRefreshPrices();
  }, []); // Only run once on mount

  // Build comprehensive portfolio context when holdings or plans change
  useEffect(() => {
    if (holdings.length > 0) {
      try {
        const context = portfolioContextService.buildContext(holdings, plans);
        
        if (!context) {
          console.error('❌ Failed to build portfolio context');
          setPortfolioContext(null);
          setSuggestions([]);
          return;
        }
        
        // Validate context has valid data
        if (!context.metrics || context.metrics.totalValue === 0) {
          console.warn('⚠️ Portfolio context has zero value. Holdings may have missing prices.');
          console.warn('⚠️ Context metrics:', context.metrics);
        }
        
        setPortfolioContext(context);
        
        // Generate suggestions only if context is valid
        if (context && context.metrics && context.metrics.totalValue > 0) {
          visualizationSuggestionService.generateSuggestions(context).then(setSuggestions).catch(err => {
            console.error('Error generating suggestions:', err);
            setSuggestions([]);
          });
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        console.error('❌ Error building portfolio context:', error);
        setPortfolioContext(null);
      }
    } else {
      setPortfolioContext(null);
      setSuggestions([]);
    }
  }, [holdings, plans]);

  const examplePrompts = [
    "Show my portfolio allocation as a pie chart",
    "Compare performance of all my holdings in a bar chart",
    "Show portfolio value over time as a line chart",
    "Create a dark mode donut chart of my holdings",
    "Show my best and worst performing stocks",
    "Visualize my portfolio with a professional style",
    "Create an infographic showing my investment journey",
    "Generate a dashboard-style overview of my portfolio",
    "Make a poster summarizing my financial performance"
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      Alert.alert('Empty Prompt', 'Please enter a description for your visualization');
      return;
    }
    
    if (holdings.length === 0) {
      Alert.alert('No Holdings', 'Please add some holdings to your portfolio first');
      return;
    }
    
    if (!portfolioContext || !portfolioContext.metrics) {
      Alert.alert('Error', 'Portfolio data is not available. Please ensure you have holdings in your portfolio.');
      return;
    }

    // Validate portfolio context has required data
    if (!portfolioContext.holdings || portfolioContext.holdings.length === 0) {
      Alert.alert('Error', 'No holdings found in your portfolio. Add some holdings first.');
      return;
    }

    // Check if portfolio has valid values (not all zeros)
    if (portfolioContext.metrics.totalValue === 0) {
      Alert.alert(
        'Missing Price Data',
        'Your holdings appear to have zero value. This might be because stock prices are missing or outdated. Would you like to refresh prices now?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Refresh Prices',
            onPress: async () => {
              try {
                setIsGenerating(true);
                await refreshPrices();
                // Retry after a short delay to allow context to rebuild
                setTimeout(() => handleGenerate(), 500);
              } catch (error) {
                console.error('❌ Failed to refresh prices:', error);
                Alert.alert('Error', 'Failed to refresh stock prices. Please try again later.');
                setIsGenerating(false);
              }
            }
          }
        ]
      );
      return;
    }

    setIsGenerating(true);
    setShowExamples(false);
    setShowSuggestions(false);
    setGeneratedImage(null);

    try {
      let config: VisualizationConfig;
      
      // First, classify the user's intent to determine if we need image generation
      const { visualizationIntentService } = await import('@/utils/visualizationIntentService');
      const intent = await visualizationIntentService.classifyPrompt(prompt);
      
      // Store the intent type for display logic
      setLastIntentType(intent.primaryType);
      
      // Automatically use enhanced visualization for infographics, illustrations, and dashboards
      // Charts only get images if user explicitly enabled it
      const shouldGenerateImage = includeImage || 
                                  intent.primaryType === 'infographic' || 
                                  intent.primaryType === 'illustration' ||
                                  intent.primaryType === 'dashboard' ||
                                  intent.primaryType === 'report';
      
      if (shouldGenerateImage) {
        const { imageGenerationService } = await import('../utils/imageGenerationService');
        
        // Pass intent information to image service for better generation
        const generatedImg = await imageGenerationService.generateImageWithFallback(
          prompt, 
          portfolioContext,
          intent
        );
        
        setGeneratedImage(generatedImg);
        
        // For illustrations, skip chart config generation (image is the primary output)
        if (intent.primaryType === 'illustration') {
          // Create minimal config just for display purposes
          const { DEFAULT_STYLE } = await import('../types/visualization');
          config = {
            type: 'pie',
            title: prompt,
            description: 'Custom illustration generated',
            data: { labels: [], datasets: [] },
            style: DEFAULT_STYLE,
            insights: [`Created custom ${generatedImg.metadata.model} illustration`]
          };
          setCurrentVisualization(config);
        } else {
          // For other types (infographics, dashboards), also generate chart config
          config = await visualizationService.generateVisualizationWithContext(prompt, portfolioContext);
          setCurrentVisualization(config);
        }
      } else {
        // Generate chart config
        config = await visualizationService.generateVisualizationWithContext(prompt, portfolioContext);
        setCurrentVisualization(config);
      }

      // Save to history
      const saved: SavedVisualization = {
        id: Date.now().toString(),
        config,
        prompt,
        createdAt: new Date().toISOString()
      };
      setSavedVisualizations(prev => [saved, ...prev]);
    } catch (error) {
      console.error('❌ Error generating visualization:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      
      // Show error to user
      Alert.alert('Error', `Failed to generate visualization: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSuggestionPress = async (suggestion: VisualizationSuggestion) => {
    setPrompt(suggestion.title);
    setShowSuggestions(false);
    
    // Auto-generate based on suggestion
    if (portfolioContext) {
      setIsGenerating(true);
      try {
        const config = await visualizationService.generateVisualizationWithContext(
          suggestion.title,
          portfolioContext
        );
        setCurrentVisualization(config);
        
        const saved: SavedVisualization = {
          id: Date.now().toString(),
          config,
          prompt: suggestion.title,
          createdAt: new Date().toISOString()
        };
        setSavedVisualizations(prev => [saved, ...prev]);
      } catch (error) {
        console.error('❌ Error generating from suggestion:', error);
        Alert.alert('Error', `Failed to generate visualization: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const handleQuickVisualization = (type: 'allocation' | 'performance' | 'timeline') => {
    setShowExamples(false);
    let config: VisualizationConfig;

    switch (type) {
      case 'allocation':
        config = visualizationService['createDefaultVisualization'](holdings);
        break;
      case 'performance':
        config = visualizationService.generatePerformanceComparison(holdings);
        break;
      case 'timeline':
        config = visualizationService.generateValueOverTime(holdings);
        break;
    }

    setCurrentVisualization(config);
    const saved: SavedVisualization = {
      id: Date.now().toString(),
      config,
      prompt: `Quick ${type} visualization`,
      createdAt: new Date().toISOString()
    };
    setSavedVisualizations(prev => [saved, ...prev]);
  };

  const handleExamplePress = (example: string) => {
    setPrompt(example);
    setShowExamples(false);
  };

  

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header (hidden when embedded inside Portfolio) */}
      {!embedded && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-left" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>AI Visualizations</Text>
            <Text style={styles.headerSubtitle}>Create custom portfolio charts</Text>
          </View>
          <TouchableOpacity style={styles.headerButton}>
            <MaterialCommunityIcons name="history" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Input Section */}
        <View style={styles.inputSection}>
          <TextInput
            mode="outlined"
            placeholder="Describe the visualization you want..."
            placeholderTextColor="#b8b8d2"
            value={prompt}
            onChangeText={setPrompt}
            multiline
            numberOfLines={3}
            style={styles.input}
            outlineStyle={styles.inputOutline}
            theme={{
              colors: {
                primary: '#17bf2d',
                onSurfaceVariant: '#ffffff',
                outline: '#3a3a3e',
                surface: '#2a2a2e',
                onSurface: '#ffffff',
              }
            }}
            right={
              <TextInput.Icon 
                icon={() => isGenerating ? (
                  <ActivityIndicator size="small" color="#17bf2d" />
                ) : (
                  <MaterialCommunityIcons name="send" size={24} color="#17bf2d" />
                )}
                onPress={handleGenerate}
                disabled={isGenerating || !prompt.trim() || holdings.length === 0}
              />
            }
          />

          {holdings.length === 0 && (
            <Text style={styles.warningText}>
              Add holdings to your portfolio to create visualizations
            </Text>
          )}

          {/* Enhanced Visualization is now automatic */}
          <View style={styles.infoSection}>
            <MaterialCommunityIcons name="chart-box" size={20} color="#17bf2d" />
            <Text style={styles.infoText}>
              Enhanced visualizations with your portfolio data are automatically generated
            </Text>
          </View>
        </View>


       

        {/* Portfolio Context Preview */}
        {portfolioContext && !currentVisualization && (
          <View style={styles.contextPreview}>
            <Text style={styles.contextTitle}>Your Portfolio Context</Text>
            <View style={styles.contextStats}>
              <View style={styles.contextStat}>
                <Text style={styles.contextStatValue}>${(portfolioContext.metrics.totalValue || 0).toFixed(0)}</Text>
                <Text style={styles.contextStatLabel}>Total Value</Text>
              </View>
              <View style={styles.contextStat}>
                <Text style={[styles.contextStatValue, { color: (portfolioContext.metrics.totalGainLossPercentage || 0) >= 0 ? '#4CAF50' : '#ff6b6b' }]}>
                  {(portfolioContext.metrics.totalGainLossPercentage || 0) >= 0 ? '+' : ''}
                  {(portfolioContext.metrics.totalGainLossPercentage || 0).toFixed(1)}%
                </Text>
                <Text style={styles.contextStatLabel}>Performance</Text>
              </View>
              <View style={styles.contextStat}>
                <Text style={styles.contextStatValue}>{portfolioContext.holdings.length}</Text>
                <Text style={styles.contextStatLabel}>Holdings</Text>
              </View>
              <View style={styles.contextStat}>
                <Text style={styles.contextStatValue}>{portfolioContext.metrics.riskLevel}</Text>
                <Text style={styles.contextStatLabel}>Risk Level</Text>
              </View>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Visualizations</Text>
          <View style={styles.quickButtonsRow}>
            <TouchableOpacity 
              style={styles.quickButton}
              onPress={() => handleQuickVisualization('allocation')}
              disabled={holdings.length === 0}
            >
              <MaterialCommunityIcons name="chart-pie" size={24} color="#17bf2d" />
              <Text style={styles.quickButtonText}>Allocation</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickButton}
              onPress={() => handleQuickVisualization('performance')}
              disabled={holdings.length === 0}
            >
              <MaterialCommunityIcons name="chart-bar" size={24} color="#17bf2d" />
              <Text style={styles.quickButtonText}>Performance</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickButton}
              onPress={() => handleQuickVisualization('timeline')}
              disabled={holdings.length === 0}
            >
              <MaterialCommunityIcons name="chart-line" size={24} color="#17bf2d" />
              <Text style={styles.quickButtonText}>Timeline</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Example Prompts */}
        {showExamples && (
          <View style={styles.examplesSection}>
            <Text style={styles.sectionTitle}>Example Prompts</Text>
            {examplePrompts.map((example, index) => (
              <TouchableOpacity
                key={index}
                style={styles.exampleCard}
                onPress={() => handleExamplePress(example)}
              >
                <MaterialCommunityIcons name="lightbulb-outline" size={20} color="#17bf2d" />
                <Text style={styles.exampleText}>{example}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Current Visualization */}
        {currentVisualization && (
          <View style={styles.visualizationSection}>
            {/* Generated Image */}
            {generatedImage && (
              <GeneratedVisualization
                generatedImage={generatedImage}
                onRegenerate={() => handleGenerate()}
                onSave={() => {
                  // Handle save
                }}
                onShare={() => {
                  // Handle share
                }}
                isLoading={isGenerating}
              />
            )}
            
            {/* Chart Visualization - Only show for non-illustration types */}
            {lastIntentType !== 'illustration' && (
              <VisualizationChart config={currentVisualization} />
            )}
            
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton}>
                <MaterialCommunityIcons name="download" size={20} color="#ffffff" />
                <Text style={styles.actionButtonText}>Export</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton}>
                <MaterialCommunityIcons name="share-variant" size={20} color="#ffffff" />
                <Text style={styles.actionButtonText}>Share</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton}>
                <MaterialCommunityIcons name="palette" size={20} color="#ffffff" />
                <Text style={styles.actionButtonText}>Customize</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

         {/* AI Suggestions */}
         {suggestions.length > 0 && !currentVisualization && (
          <View style={styles.suggestionsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>AI Suggestions</Text>
              <TouchableOpacity onPress={() => setShowSuggestions(!showSuggestions)}>
                <MaterialCommunityIcons 
                  name={showSuggestions ? "chevron-up" : "chevron-down"} 
                  size={24} 
                  color="#17bf2d" 
                />
              </TouchableOpacity>
            </View>
            {showSuggestions && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {suggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionCard}
                    onPress={() => handleSuggestionPress(suggestion)}
                  >
                    <MaterialCommunityIcons 
                      name={suggestion.type === 'chart' ? 'chart-box' : 'image-multiple'} 
                      size={32} 
                      color="#17bf2d" 
                    />
                    <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
                    <Text style={styles.suggestionDescription}>{suggestion.description}</Text>
                    <Text style={styles.suggestionReason}>{suggestion.reason}</Text>
                    <View style={styles.confidenceBadge}>
                      <Text style={styles.confidenceText}>
                        {(suggestion.confidenceScore * 100).toFixed(0)}% match
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Style Presets */}
        <View style={styles.presetsSection}>
          <Text style={styles.sectionTitle}>Style Presets</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {PRESET_STYLES.map((preset, index) => (
              <TouchableOpacity
                key={index}
                style={styles.presetCard}
                onPress={() => {
                  if (currentVisualization) {
                    setCurrentVisualization({
                      ...currentVisualization,
                      style: preset.style
                    });
                  }
                }}
              >
                <View style={[styles.presetPreview, { backgroundColor: preset.style.backgroundColor }]}>
                  <MaterialCommunityIcons 
                    name="chart-pie" 
                    size={32} 
                    color={preset.style.colorPalette[0]} 
                  />
                </View>
                <Text style={styles.presetName}>{preset.name}</Text>
                <Text style={styles.presetDescription}>{preset.description}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>


        {/* History */}
        {savedVisualizations.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Recent Visualizations</Text>
            {savedVisualizations.slice(0, 5).map((saved) => (
              <TouchableOpacity
                key={saved.id}
                style={styles.historyCard}
                onPress={() => setCurrentVisualization(saved.config)}
              >
                <MaterialCommunityIcons name="chart-box-outline" size={24} color="#17bf2d" />
                <View style={styles.historyContent}>
                  <Text style={styles.historyTitle}>{saved.config.title}</Text>
                  <Text style={styles.historyPrompt}>{saved.prompt}</Text>
                  <Text style={styles.historyDate}>
                    {new Date(saved.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  headerButton: {
    marginLeft: 15,
  },
  content: {
    flex: 1,
  },
  inputSection: {
    padding: 20,
  },
  input: {
    backgroundColor: '#2a2a2e',
    fontFamily: 'Poppins',
  },
  inputOutline: {
    borderColor: '#3a3a3e',
    borderRadius: 12,
  },
  warningText: {
    color: '#ff6b6b',
    fontSize: 12,
    fontFamily: 'Poppins',
    marginTop: 8,
  },
  quickActions: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
    marginBottom: 15,
  },
  quickButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickButton: {
    flex: 1,
    backgroundColor: '#2a2a2e',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  quickButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Poppins',
    marginTop: 8,
  },
  examplesSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  exampleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2e',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  exampleText: {
    flex: 1,
    color: '#b8b8d2',
    fontSize: 14,
    fontFamily: 'Poppins',
    marginLeft: 12,
  },
  visualizationSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2e',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Poppins',
    marginLeft: 8,
  },
  toggleSection: {
    marginTop: 16,
    paddingHorizontal: 4,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#17bf2d',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#17bf2d',
  },
  toggleText: {
    color: '#17bf2d',
    fontSize: 14,
    fontFamily: 'Poppins',
    marginLeft: 8,
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#1a1a1a',
  },
  toggleDescription: {
    color: '#b8b8d2',
    fontSize: 12,
    fontFamily: 'Poppins',
    fontStyle: 'italic',
  },
  presetsSection: {
    paddingLeft: 20,
    marginBottom: 20,
  },
  presetCard: {
    width: 120,
    marginRight: 15,
  },
  presetPreview: {
    height: 100,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  presetName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  presetDescription: {
    fontSize: 12,
    color: '#b8b8d2',
    fontFamily: 'Poppins',
  },
  historySection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  historyCard: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2e',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  historyContent: {
    flex: 1,
    marginLeft: 12,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  historyPrompt: {
    fontSize: 14,
    color: '#b8b8d2',
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Poppins',
  },
  testButton: {
    backgroundColor: '#ff6b6b',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Poppins',
  },
  suggestionsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  suggestionCard: {
    width: 200,
    backgroundColor: '#2a2a2e',
    borderRadius: 12,
    padding: 15,
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#17bf2d',
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
    marginTop: 10,
    marginBottom: 5,
  },
  suggestionDescription: {
    fontSize: 12,
    color: '#b8b8d2',
    fontFamily: 'Poppins',
    marginBottom: 5,
  },
  suggestionReason: {
    fontSize: 11,
    color: '#17bf2d',
    fontFamily: 'Poppins',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  confidenceBadge: {
    backgroundColor: '#17bf2d',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  confidenceText: {
    fontSize: 10,
    color: '#1a1a1a',
    fontFamily: 'Poppins',
    fontWeight: 'bold',
  },
  contextPreview: {
    backgroundColor: '#2a2a2e',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#3a3a3e',
  },
  contextTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
    marginBottom: 15,
  },
  contextStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contextStat: {
    alignItems: 'center',
  },
  contextStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#17bf2d',
    fontFamily: 'Poppins',
  },
  contextStatLabel: {
    fontSize: 11,
    color: '#b8b8d2',
    fontFamily: 'Poppins',
    marginTop: 4,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2e',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#17bf2d',
  },
  infoText: {
    fontSize: 14,
    color: '#17bf2d',
    fontFamily: 'Poppins',
    marginLeft: 10,
    flex: 1,
  },
});

