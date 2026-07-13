import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

interface QuantCredibilityFooterProps {
  method: string;
  explanation: string;
}

/** Expandable "how we calculated this" attribution for insight cards. */
export const QuantCredibilityFooter: React.FC<QuantCredibilityFooterProps> = ({
  method,
  explanation,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.row}
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
      >
        <MaterialCommunityIcons name="flask-outline" size={14} color="#17bf2d" />
        <Text style={styles.method}>{method}</Text>
        <MaterialCommunityIcons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="#b8b8d2"
        />
      </TouchableOpacity>
      {open && <Text style={styles.explanation}>{explanation}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#3a3a3e',
    paddingTop: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  method: {
    flex: 1,
    fontSize: 11,
    color: '#17bf2d',
    fontFamily: 'Poppins',
  },
  explanation: {
    marginTop: 8,
    fontSize: 12,
    color: '#b8b8d2',
    fontFamily: 'Poppins',
    lineHeight: 18,
  },
});
