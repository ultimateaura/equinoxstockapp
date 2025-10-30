import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

interface AISuggestionsProps {
  suggestions: string[];
  onSuggestionPress: (suggestion: string) => void;
}

export const AISuggestions: React.FC<AISuggestionsProps> = ({ suggestions, onSuggestionPress }) => {
  if (suggestions.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="lightbulb-on-outline" size={20} color="#17bf2d" />
        <Text style={styles.title}>Suggested Questions</Text>
      </View>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {suggestions.map((suggestion, index) => (
          <TouchableOpacity
            key={index}
            style={styles.suggestionCard}
            onPress={() => onSuggestionPress(suggestion)}
          >
            <Text style={styles.suggestionText}>{suggestion}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 15,
    backgroundColor: '#1e1e22',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#b8b8d2',
    fontFamily: 'Poppins',
    marginLeft: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  suggestionCard: {
    backgroundColor: '#2a2a2e',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#3a3a3e',
  },
  suggestionText: {
    fontSize: 14,
    color: '#ffffff',
    fontFamily: 'Poppins',
  },
});

