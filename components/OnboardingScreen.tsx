import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const slides = [
    {
      id: 1,
      title: 'Welcome to Equinox',
      subtitle: 'Your personal stock trading companion',
      description: 'Track your favorite stocks, analyze market trends, and make informed investment decisions.',
      image: require('@/assets/images/logo.png'),
      backgroundColor: '#17bf2d',
    },
    {
      id: 2,
      title: 'Discover Stocks',
      subtitle: 'Explore the market',
      description: 'Search and discover new investment opportunities with real-time market data and insights.',
      image: require('@/assets/images/logo.png'),
      backgroundColor: '#1e1e22',
    },
    {
      id: 3,
      title: 'Track Your Portfolio',
      subtitle: 'Monitor your investments',
      description: 'Keep track of your holdings, analyze performance, and get personalized recommendations.',
      image: require('@/assets/images/logo.png'),
      backgroundColor: '#2a2a2e',
    },
  ];

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollViewRef.current?.scrollTo({ x: nextIndex * screenWidth, animated: true });
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    setCurrentIndex(index);
  };

  return (
    <View style={styles.container}>
      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {slides.map((slide, index) => (
          <View key={slide.id} style={[styles.slide, { backgroundColor: slide.backgroundColor }]}>
            <View style={styles.slideContent}>
              <View style={styles.imageContainer}>
                <Image 
                  source={slide.image} 
                  style={styles.slideImage}
                  resizeMode="contain"
                />
              </View>
              
              <View style={styles.textContainer}>
                <Text style={styles.slideTitle}>{slide.title}</Text>
                <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
                <Text style={styles.slideDescription}>{slide.description}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        {/* Next/Get Started Button */}
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <MaterialCommunityIcons 
            name={currentIndex === slides.length - 1 ? 'check' : 'arrow-right'} 
            size={24} 
            color="#ffffff" 
          />
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
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  skipText: {
    color: '#b8b8d2',
    fontSize: 16,
    fontFamily: 'Poppins',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width: screenWidth,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  imageContainer: {
    width: 200,
    height: 200,
    marginBottom: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideImage: {
    width: 150,
    height: 150,
    tintColor: '#ffffff',
  },
  textContainer: {
    alignItems: 'center',
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
    marginBottom: 12,
    textAlign: 'center',
  },
  slideSubtitle: {
    fontSize: 18,
    color: '#b8b8d2',
    fontFamily: 'Poppins',
    marginBottom: 20,
    textAlign: 'center',
  },
  slideDescription: {
    fontSize: 16,
    color: '#b8b8d2',
    fontFamily: 'Poppins',
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: '#17bf2d',
    width: 30,
  },
  inactiveDot: {
    backgroundColor: '#3a3a3e',
  },
  nextButton: {
    backgroundColor: '#17bf2d',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Poppins',
  },
});

export default OnboardingScreen;
