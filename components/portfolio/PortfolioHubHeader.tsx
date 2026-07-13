import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { RegimeLabel } from '@/utils/quant/types';

interface PortfolioHubHeaderProps {
  regime?: RegimeLabel | null;
  onAvatarPress?: () => void;
  userInitial?: string;
}

export const PortfolioHubHeader: React.FC<PortfolioHubHeaderProps> = ({
  regime,
  onAvatarPress,
  userInitial = 'U',
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={styles.headerTitle}>My Portfolio</Text>
        <Text style={styles.headerSubtitle}>Your portfolio, explained</Text>
      </View>
      {regime ? (
        <View
          style={[
            styles.badge,
            regime === 'turbulent' ? styles.badgeTurbulent : styles.badgeCalm,
          ]}
        >
          <MaterialCommunityIcons
            name={regime === 'turbulent' ? 'weather-lightning' : 'weather-partly-cloudy'}
            size={14}
            color={regime === 'turbulent' ? '#F59E0B' : '#17bf2d'}
          />
          <Text
            style={[
              styles.badgeText,
              { color: regime === 'turbulent' ? '#F59E0B' : '#17bf2d' },
            ]}
          >
            {regime === 'turbulent' ? 'Turbulent' : 'Calm'}
          </Text>
        </View>
      ) : null}
      <TouchableOpacity style={styles.avatarButton} onPress={onAvatarPress}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{userInitial}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#17bf2d',
  },
  headerText: {
    flex: 1,
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
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginRight: 10,
  },
  badgeCalm: {},
  badgeTurbulent: {},
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },
  avatarButton: {
    marginLeft: 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#17bf2d',
    fontFamily: 'Poppins',
  },
});
