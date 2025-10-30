import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import React, { useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';

interface EquinoxLogoProps {
  size?: number;
  showText?: boolean;
}

export const EquinoxLogo: React.FC<EquinoxLogoProps> = ({ 
  size = 120, 
  showText = true 
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [animationKey, setAnimationKey] = useState(0);
  
  // Use useFocusEffect to trigger animation every time the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Reset animation value to 0
      fadeAnim.setValue(0);
      
      // Start the fade-in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
      
      // Increment key to force re-render if needed
      setAnimationKey(prev => prev + 1);
    }, [fadeAnim])
  );

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Image
        source={require('@/assets/images/logo.png')}
        style={[
          styles.logo,
          {
            width: size+100,
            height:  size+100,
          }
        ]}
        tintColor="#22C55E"
        transition={400}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    resizeMode: 'contain',
    borderRadius: 25,
    shadowColor: '#00FF88', // Green shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,

    borderColor: '#00CC6A', 
  },
});
