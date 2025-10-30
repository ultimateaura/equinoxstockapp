import { PRESET_STYLES, VisualizationStyle } from '@/types/visualization';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

interface StyleCustomizerProps {
  currentStyle: VisualizationStyle;
  onStyleChange: (style: VisualizationStyle) => void;
  onClose: () => void;
}

export const StyleCustomizer: React.FC<StyleCustomizerProps> = ({
  currentStyle,
  onStyleChange,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'theme' | 'appearance' | 'text' | 'layout' | 'animation'>('theme');
  const [customStyle, setCustomStyle] = useState<VisualizationStyle>(currentStyle);

  const handleStyleUpdate = (updates: Partial<VisualizationStyle>) => {
    const newStyle = { ...customStyle, ...updates };
    setCustomStyle(newStyle);
    onStyleChange(newStyle);
  };

  const handlePresetSelect = (preset: VisualizationStyle) => {
    setCustomStyle(preset);
    onStyleChange(preset);
  };

  const tabs = [
    { id: 'theme', label: 'Theme', icon: 'palette' },
    { id: 'appearance', label: 'Style', icon: 'format-paint' },
    { id: 'text', label: 'Text', icon: 'format-text' },
    { id: 'layout', label: 'Layout', icon: 'view-grid' },
    { id: 'animation', label: 'Animation', icon: 'play' }
  ];

  const renderThemeTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Color Theme</Text>
      
      {/* Preset Themes */}
      <View style={styles.presetGrid}>
        {PRESET_STYLES.map((preset, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.presetCard,
              customStyle.theme === preset.style.theme && styles.presetCardActive
            ]}
            onPress={() => handlePresetSelect(preset.style)}
          >
            <View style={[styles.presetPreview, { backgroundColor: preset.style.backgroundColor }]}>
              <MaterialCommunityIcons 
                name="chart-pie" 
                size={24} 
                color={preset.style.colorPalette[0]} 
              />
            </View>
            <Text style={styles.presetName}>{preset.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Custom Colors</Text>
      <View style={styles.colorPalette}>
        {customStyle.colorPalette.map((color, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.colorSwatch, { backgroundColor: color }]}
            onPress={() => {
              // In a real app, you'd open a color picker here
              console.log('Color picker for', color);
            }}
          />
        ))}
      </View>

      <View style={styles.optionRow}>
        <Text style={styles.optionLabel}>Use Gradients</Text>
        <TouchableOpacity
          style={[styles.toggle, customStyle.useGradients && styles.toggleActive]}
          onPress={() => handleStyleUpdate({ useGradients: !customStyle.useGradients })}
        >
          <View style={[styles.toggleThumb, customStyle.useGradients && styles.toggleThumbActive]} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAppearanceTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Chart Style</Text>
      <View style={styles.optionGroup}>
        {(['2d', '3d'] as const).map((style) => (
          <TouchableOpacity
            key={style}
            style={[
              styles.optionButton,
              customStyle.chartStyle === style && styles.optionButtonActive
            ]}
            onPress={() => handleStyleUpdate({ chartStyle: style })}
          >
            <Text style={[
              styles.optionButtonText,
              customStyle.chartStyle === style && styles.optionButtonTextActive
            ]}>
              {style.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Border Radius</Text>
      <View style={styles.sliderContainer}>
        <Text style={styles.sliderLabel}>0</Text>
        <View style={styles.slider}>
          <View 
            style={[
              styles.sliderTrack,
              { width: `${(customStyle.borderRadius / 20) * 100}%` }
            ]} 
          />
        </View>
        <Text style={styles.sliderLabel}>20</Text>
      </View>

      <View style={styles.optionRow}>
        <Text style={styles.optionLabel}>Shadows</Text>
        <TouchableOpacity
          style={[styles.toggle, customStyle.shadows && styles.toggleActive]}
          onPress={() => handleStyleUpdate({ shadows: !customStyle.shadows })}
        >
          <View style={[styles.toggleThumb, customStyle.shadows && styles.toggleThumbActive]} />
        </TouchableOpacity>
      </View>

      <View style={styles.optionRow}>
        <Text style={styles.optionLabel}>Transparency</Text>
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>0%</Text>
          <View style={styles.slider}>
            <View 
              style={[
                styles.sliderTrack,
                { width: `${customStyle.transparency * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.sliderLabel}>100%</Text>
        </View>
      </View>
    </View>
  );

  const renderTextTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Font Family</Text>
      <View style={styles.optionGroup}>
        {(['modern', 'classic', 'handwritten', 'monospace'] as const).map((font) => (
          <TouchableOpacity
            key={font}
            style={[
              styles.optionButton,
              customStyle.fontFamily === font && styles.optionButtonActive
            ]}
            onPress={() => handleStyleUpdate({ fontFamily: font })}
          >
            <Text style={[
              styles.optionButtonText,
              customStyle.fontFamily === font && styles.optionButtonTextActive
            ]}>
              {font.charAt(0).toUpperCase() + font.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Font Size</Text>
      <View style={styles.optionGroup}>
        {(['small', 'medium', 'large', 'xlarge'] as const).map((size) => (
          <TouchableOpacity
            key={size}
            style={[
              styles.optionButton,
              customStyle.fontSize === size && styles.optionButtonActive
            ]}
            onPress={() => handleStyleUpdate({ fontSize: size })}
          >
            <Text style={[
              styles.optionButtonText,
              customStyle.fontSize === size && styles.optionButtonTextActive
            ]}>
              {size.charAt(0).toUpperCase() + size.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Labels & Values</Text>
      <View style={styles.checkboxGroup}>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => handleStyleUpdate({ showLabels: !customStyle.showLabels })}
        >
          <View style={[styles.checkbox, customStyle.showLabels && styles.checkboxActive]}>
            {customStyle.showLabels && <MaterialCommunityIcons name="check" size={16} color="#ffffff" />}
          </View>
          <Text style={styles.checkboxLabel}>Show Labels</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => handleStyleUpdate({ showLegend: !customStyle.showLegend })}
        >
          <View style={[styles.checkbox, customStyle.showLegend && styles.checkboxActive]}>
            {customStyle.showLegend && <MaterialCommunityIcons name="check" size={16} color="#ffffff" />}
          </View>
          <Text style={styles.checkboxLabel}>Show Legend</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => handleStyleUpdate({ showValues: !customStyle.showValues })}
        >
          <View style={[styles.checkbox, customStyle.showValues && styles.checkboxActive]}>
            {customStyle.showValues && <MaterialCommunityIcons name="check" size={16} color="#ffffff" />}
          </View>
          <Text style={styles.checkboxLabel}>Show Values</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => handleStyleUpdate({ showPercentages: !customStyle.showPercentages })}
        >
          <View style={[styles.checkbox, customStyle.showPercentages && styles.checkboxActive]}>
            {customStyle.showPercentages && <MaterialCommunityIcons name="check" size={16} color="#ffffff" />}
          </View>
          <Text style={styles.checkboxLabel}>Show Percentages</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderLayoutTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Size</Text>
      <View style={styles.optionGroup}>
        {(['compact', 'standard', 'large', 'fullscreen'] as const).map((size) => (
          <TouchableOpacity
            key={size}
            style={[
              styles.optionButton,
              customStyle.size === size && styles.optionButtonActive
            ]}
            onPress={() => handleStyleUpdate({ size })}
          >
            <Text style={[
              styles.optionButtonText,
              customStyle.size === size && styles.optionButtonTextActive
            ]}>
              {size.charAt(0).toUpperCase() + size.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Aspect Ratio</Text>
      <View style={styles.optionGroup}>
        {(['square', 'wide', 'tall', 'auto'] as const).map((ratio) => (
          <TouchableOpacity
            key={ratio}
            style={[
              styles.optionButton,
              customStyle.aspectRatio === ratio && styles.optionButtonActive
            ]}
            onPress={() => handleStyleUpdate({ aspectRatio: ratio })}
          >
            <Text style={[
              styles.optionButtonText,
              customStyle.aspectRatio === ratio && styles.optionButtonTextActive
            ]}>
              {ratio.charAt(0).toUpperCase() + ratio.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Padding</Text>
      <View style={styles.optionGroup}>
        {(['tight', 'normal', 'spacious'] as const).map((padding) => (
          <TouchableOpacity
            key={padding}
            style={[
              styles.optionButton,
              customStyle.padding === padding && styles.optionButtonActive
            ]}
            onPress={() => handleStyleUpdate({ padding })}
          >
            <Text style={[
              styles.optionButtonText,
              customStyle.padding === padding && styles.optionButtonTextActive
            ]}>
              {padding.charAt(0).toUpperCase() + padding.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderAnimationTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.optionRow}>
        <Text style={styles.optionLabel}>Enable Animations</Text>
        <TouchableOpacity
          style={[styles.toggle, customStyle.enableAnimations && styles.toggleActive]}
          onPress={() => handleStyleUpdate({ enableAnimations: !customStyle.enableAnimations })}
        >
          <View style={[styles.toggleThumb, customStyle.enableAnimations && styles.toggleThumbActive]} />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Animation Speed</Text>
      <View style={styles.optionGroup}>
        {(['instant', 'fast', 'smooth', 'slow'] as const).map((speed) => (
          <TouchableOpacity
            key={speed}
            style={[
              styles.optionButton,
              customStyle.animationSpeed === speed && styles.optionButtonActive
            ]}
            onPress={() => handleStyleUpdate({ animationSpeed: speed })}
          >
            <Text style={[
              styles.optionButtonText,
              customStyle.animationSpeed === speed && styles.optionButtonTextActive
            ]}>
              {speed.charAt(0).toUpperCase() + speed.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Animation Style</Text>
      <View style={styles.optionGroup}>
        {(['linear', 'ease', 'bounce', 'elastic'] as const).map((style) => (
          <TouchableOpacity
            key={style}
            style={[
              styles.optionButton,
              customStyle.animationStyle === style && styles.optionButtonActive
            ]}
            onPress={() => handleStyleUpdate({ animationStyle: style })}
          >
            <Text style={[
              styles.optionButtonText,
              customStyle.animationStyle === style && styles.optionButtonTextActive
            ]}>
              {style.charAt(0).toUpperCase() + style.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'theme': return renderThemeTab();
      case 'appearance': return renderAppearanceTab();
      case 'text': return renderTextTab();
      case 'layout': return renderLayoutTab();
      case 'animation': return renderAnimationTab();
      default: return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Customize Style</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <MaterialCommunityIcons name="close" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.tabActive
            ]}
            onPress={() => setActiveTab(tab.id as any)}
          >
            <MaterialCommunityIcons 
              name={tab.icon as any} 
              size={20} 
              color={activeTab === tab.id ? '#17bf2d' : '#b8b8d2'} 
            />
            <Text style={[
              styles.tabLabel,
              activeTab === tab.id && styles.tabLabelActive
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {renderTabContent()}
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.resetButton} onPress={() => handlePresetSelect(PRESET_STYLES[0].style)}>
          <Text style={styles.resetButtonText}>Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.applyButton} onPress={onClose}>
          <Text style={styles.applyButtonText}>Apply</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

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
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2e',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
  },
  closeButton: {
    padding: 5,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#2a2a2e',
  },
  tabLabel: {
    fontSize: 12,
    color: '#b8b8d2',
    fontFamily: 'Poppins',
    marginTop: 4,
  },
  tabLabelActive: {
    color: '#17bf2d',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  tabContent: {
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
    marginBottom: 15,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  presetCard: {
    width: '48%',
    marginRight: '4%',
    marginBottom: 15,
    backgroundColor: '#2a2a2e',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  presetCardActive: {
    backgroundColor: '#17bf2d',
  },
  presetPreview: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  presetName: {
    fontSize: 12,
    color: '#ffffff',
    fontFamily: 'Poppins',
    textAlign: 'center',
  },
  colorPalette: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  colorSwatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#3a3a3e',
  },
  optionGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  optionButton: {
    backgroundColor: '#2a2a2e',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginRight: 10,
    marginBottom: 10,
  },
  optionButtonActive: {
    backgroundColor: '#17bf2d',
  },
  optionButtonText: {
    fontSize: 14,
    color: '#b8b8d2',
    fontFamily: 'Poppins',
  },
  optionButtonTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  optionLabel: {
    fontSize: 14,
    color: '#ffffff',
    fontFamily: 'Poppins',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#3a3a3e',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#17bf2d',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ffffff',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  slider: {
    flex: 1,
    height: 4,
    backgroundColor: '#3a3a3e',
    borderRadius: 2,
    marginHorizontal: 10,
    position: 'relative',
  },
  sliderTrack: {
    height: 4,
    backgroundColor: '#17bf2d',
    borderRadius: 2,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#b8b8d2',
    fontFamily: 'Poppins',
  },
  checkboxGroup: {
    marginBottom: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#3a3a3e',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#17bf2d',
    borderColor: '#17bf2d',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#ffffff',
    fontFamily: 'Poppins',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2e',
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#2a2a2e',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 10,
  },
  resetButtonText: {
    color: '#b8b8d2',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Poppins',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#17bf2d',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 10,
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Poppins',
  },
});
