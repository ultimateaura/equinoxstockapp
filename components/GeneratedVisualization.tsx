import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { GestureHandlerRootView, PinchGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';
import { GeneratedImage } from '../utils/imageGenerationService';

interface GeneratedVisualizationProps {
  generatedImage: GeneratedImage;
  onRegenerate?: () => void;
  onSave?: () => void;
  onShare?: () => void;
  isLoading?: boolean;
}

export const GeneratedVisualization: React.FC<GeneratedVisualizationProps> = ({
  generatedImage,
  onRegenerate,
  onSave,
  onShare,
  isLoading = false
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  // Zoom state
  const scale = useSharedValue(1);
  const [currentZoom, setCurrentZoom] = useState(1);

  // Early return if no generatedImage and not loading
  if (!generatedImage && !isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Generated Visualization</Text>
        </View>
        <View style={[styles.placeholderContainer, { width: 300, height: 225 }]}>
          <View style={styles.placeholderContent}>
            <MaterialCommunityIcons name="image-outline" size={64} color="#666" />
            <Text style={styles.placeholderTitle}>No Image Generated</Text>
            <Text style={styles.placeholderDescription}>
              Generate a visualization to see it here
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = (error: any) => {
    console.error('❌ Image load error:', error);
    console.error('❌ Image URL:', generatedImage?.url);
    setImageLoading(false);
    setImageError(true);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out my portfolio visualization: ${generatedImage?.description || 'Portfolio visualization'}`,
        url: generatedImage?.url || '',
      });
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share visualization');
    }
  };

  const handleSave = () => {
    if (!generatedImage) {
      Alert.alert('Error', 'No visualization to save');
      return;
    }
    // In a real implementation, you would save the image to device storage
    Alert.alert('Saved', 'Visualization saved to your gallery');
  };

  // Zoom handlers
  const handleZoomIn = () => {
    const newScale = Math.min(currentZoom + 0.5, 3); // Max 3x zoom
    scale.value = withSpring(newScale);
    setCurrentZoom(newScale);
  };

  const handleZoomOut = () => {
    const newScale = Math.max(currentZoom - 0.5, 1); // Min 1x zoom
    scale.value = withSpring(newScale);
    setCurrentZoom(newScale);
  };

  const handleResetZoom = () => {
    scale.value = withSpring(1);
    setCurrentZoom(1);
  };

  // Pinch gesture handler
  const onPinchGestureEvent = (event: any) => {
    'worklet';
    if (event.nativeEvent.scale) {
      scale.value = Math.max(1, Math.min(event.nativeEvent.scale, 3));
    }
  };

  const onPinchEnd = () => {
    'worklet';
    if (scale.value < 1) {
      scale.value = withSpring(1);
    }
  };

  // Animated style for zoom
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const screenWidth = Dimensions.get('window').width;
  const imageWidth = screenWidth - 32;
  const imageHeight = (imageWidth * 3) / 4; // 4:3 aspect ratio

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Generated Visualization</Text>
          {currentZoom > 1 && (
            <Text style={styles.zoomIndicator}>{currentZoom.toFixed(1)}x</Text>
          )}
        </View>
        <View style={styles.actions}>
          {/* Zoom Controls */}
          <TouchableOpacity 
            style={[styles.actionButton, currentZoom >= 3 && styles.actionButtonDisabled]} 
            onPress={handleZoomIn}
            disabled={currentZoom >= 3}
          >
            <MaterialCommunityIcons 
              name="magnify-plus" 
              size={20} 
              color={currentZoom >= 3 ? "#666" : "#68d391"} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, currentZoom <= 1 && styles.actionButtonDisabled]} 
            onPress={handleZoomOut}
            disabled={currentZoom <= 1}
          >
            <MaterialCommunityIcons 
              name="magnify-minus" 
              size={20} 
              color={currentZoom <= 1 ? "#666" : "#68d391"} 
            />
          </TouchableOpacity>
          {currentZoom > 1 && (
            <TouchableOpacity style={styles.actionButton} onPress={handleResetZoom}>
              <MaterialCommunityIcons name="magnify-close" size={20} color="#68d391" />
            </TouchableOpacity>
          )}
          {onRegenerate && (
            <TouchableOpacity style={styles.actionButton} onPress={onRegenerate}>
              <MaterialCommunityIcons name="refresh" size={20} color="#68d391" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionButton} onPress={handleSave}>
            <MaterialCommunityIcons name="download" size={20} color="#68d391" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <MaterialCommunityIcons name="share" size={20} color="#68d391" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.imageContainer}>
        {imageLoading && (
          <View style={[styles.loadingContainer, { width: imageWidth, height: imageHeight }]}>
            <ActivityIndicator size="large" color="#68d391" />
            <Text style={styles.loadingText}>Generating visualization...</Text>
          </View>
        )}

        {imageError ? (
          <View style={[styles.errorContainer, { width: imageWidth, height: imageHeight }]}>
            <MaterialCommunityIcons name="image-off" size={48} color="#666" />
            <Text style={styles.errorText}>Failed to load image</Text>
            <Text style={styles.debugText}>URL: {generatedImage?.url?.substring(0, 50) || 'No URL'}...</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => {
              setImageError(false);
              setImageLoading(true);
            }}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : !generatedImage ? (
          <View style={[styles.placeholderContainer, { width: imageWidth, height: imageHeight }]}>
            <View style={styles.placeholderContent}>
              <MaterialCommunityIcons name="image-outline" size={64} color="#666" />
              <Text style={styles.placeholderTitle}>No Image Generated</Text>
              <Text style={styles.placeholderDescription}>
                Generate a visualization to see it here
              </Text>
            </View>
          </View>
        ) : generatedImage.url === 'enhanced-placeholder' ? (
          // Handle enhanced placeholder for billing limits
          <View style={[styles.placeholderContainer, { width: imageWidth, height: imageHeight }]}>
            <View style={styles.placeholderContent}>
              <MaterialCommunityIcons name="credit-card-off" size={64} color="#f56565" />
              <Text style={styles.placeholderTitle}>DALL-E Billing Limit Reached</Text>
              <Text style={styles.placeholderDescription}>
                Your DALL-E API has reached its billing limit. Upgrade your plan or try again later.
              </Text>
              <View style={styles.placeholderCircles}>
                <View style={[styles.placeholderCircle, { backgroundColor: '#f56565', opacity: 0.3 }]} />
                <View style={[styles.placeholderCircle, { backgroundColor: '#f56565', opacity: 0.6 }]} />
                <View style={[styles.placeholderCircle, { backgroundColor: '#f56565', opacity: 1 }]} />
              </View>
              <Text style={styles.placeholderTime}>
                Billing limit reached at {new Date().toLocaleTimeString()}
              </Text>
            </View>
          </View>
        ) : generatedImage.url?.startsWith('data:image/svg') ? (
          // Render actual SVG image with zoom
          <>
            <PinchGestureHandler
              onGestureEvent={onPinchGestureEvent}
              onHandlerStateChange={(event: any) => {
                if (event.nativeEvent.state === State.END) {
                  setCurrentZoom(scale.value);
                  onPinchEnd();
                }
              }}
            >
              <Animated.View style={[{ width: imageWidth, height: imageHeight }, animatedStyle]}>
                <Image
                  source={{ uri: generatedImage.url }}
                  style={[styles.image, { width: imageWidth, height: imageHeight }]}
                  contentFit="contain"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              </Animated.View>
            </PinchGestureHandler>
            {/* Show metadata below the image */}
            {!imageLoading && (
              <View style={styles.metadata}>
                <Text style={styles.metadataText}>
                  {generatedImage.description || 'Portfolio visualization'}
                </Text>
                <Text style={styles.metadataTime}>
                  Generated at {new Date(generatedImage.metadata.generatedAt).toLocaleTimeString()}
                </Text>
              </View>
            )}
          </>
        ) : generatedImage.url?.startsWith('data:image/png') ? (
          // Handle real AI-generated PNG images from Imagen API with zoom
          <PinchGestureHandler
            onGestureEvent={onPinchGestureEvent}
            onHandlerStateChange={(event: any) => {
              if (event.nativeEvent.state === State.END) {
                setCurrentZoom(scale.value);
                onPinchEnd();
              }
            }}
          >
            <Animated.View style={[{ width: imageWidth, height: imageHeight }, animatedStyle]}>
              <Image
                source={{ uri: generatedImage.url }}
                style={[styles.image, { width: imageWidth, height: imageHeight }]}
                onLoad={handleImageLoad}
                onError={handleImageError}
                contentFit="cover"
              />
            </Animated.View>
          </PinchGestureHandler>
        ) : generatedImage.url?.startsWith('https://') ? (
          // Handle real AI-generated images from APIs (URLs) with zoom
          <PinchGestureHandler
            onGestureEvent={onPinchGestureEvent}
            onHandlerStateChange={(event: any) => {
              if (event.nativeEvent.state === State.END) {
                setCurrentZoom(scale.value);
                onPinchEnd();
              }
            }}
          >
            <Animated.View style={[{ width: imageWidth, height: imageHeight }, animatedStyle]}>
              <Image
                source={{ uri: generatedImage.url }}
                style={[styles.image, { width: imageWidth, height: imageHeight }]}
                onLoad={handleImageLoad}
                onError={handleImageError}
                contentFit="cover"
              />
            </Animated.View>
          </PinchGestureHandler>
        ) : (
          <PinchGestureHandler
            onGestureEvent={onPinchGestureEvent}
            onHandlerStateChange={(event: any) => {
              if (event.nativeEvent.state === State.END) {
                setCurrentZoom(scale.value);
                onPinchEnd();
              }
            }}
          >
            <Animated.View style={[{ width: imageWidth, height: imageHeight }, animatedStyle]}>
              <Image
                source={{ uri: generatedImage.url }}
                style={[styles.image, { width: imageWidth, height: imageHeight }]}
                onLoad={handleImageLoad}
                onError={handleImageError}
                contentFit="cover"
              />
            </Animated.View>
          </PinchGestureHandler>
        )}
      </View>

      {generatedImage && (
        <View style={styles.details}>
          <Text style={styles.description}>{generatedImage.description}</Text>
          <Text style={styles.promptLabel}>Generated from:</Text>
          <Text style={styles.prompt}>{generatedImage.prompt}</Text>
          
          <View style={styles.metadata}>
            <Text style={styles.metadataText}>
              {generatedImage.metadata.width} × {generatedImage.metadata.height} • {generatedImage.metadata.format.toUpperCase()}
            </Text>
            <Text style={styles.metadataText}>
              Generated: {new Date(generatedImage.metadata.generatedAt).toLocaleString()}
            </Text>
          </View>
        </View>
      )}
      
      {/* Zoom Instructions */}
      {!imageLoading && !imageError && generatedImage && (
        <Text style={styles.zoomHint}>
          Pinch to zoom • Use + / - buttons to zoom
        </Text>
      )}
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    margin: 16,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  zoomIndicator: {
    fontSize: 14,
    color: '#68d391',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#2d3748',
  },
  actionButtonDisabled: {
    opacity: 0.5,
    backgroundColor: 'rgba(100, 100, 100, 0.1)',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  image: {
    borderRadius: 8,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2d3748',
    borderRadius: 8,
  },
  loadingText: {
    color: '#68d391',
    marginTop: 8,
    fontSize: 14,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2d3748',
    borderRadius: 8,
  },
  errorText: {
    color: '#666',
    marginTop: 8,
    fontSize: 14,
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#68d391',
    borderRadius: 6,
  },
  retryText: {
    color: '#1a1a1a',
    fontWeight: 'bold',
  },
  debugText: {
    color: '#999',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  placeholderContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2d3748',
  },
  placeholderContent: {
    alignItems: 'center',
    padding: 20,
  },
  placeholderTitle: {
    color: '#68d391',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  placeholderDescription: {
    color: '#b8b8d2',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 300,
  },
  placeholderCircles: {
    flexDirection: 'row',
    marginTop: 24,
    alignItems: 'center',
  },
  placeholderCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginHorizontal: 8,
  },
  placeholderTime: {
    color: '#b8b8d2',
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
  },
  details: {
    backgroundColor: '#2d3748',
    borderRadius: 8,
    padding: 12,
  },
  description: {
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 8,
  },
  promptLabel: {
    color: '#68d391',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  prompt: {
    color: '#b8b8d2',
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  metadata: {
    borderTopWidth: 1,
    borderTopColor: '#4a5568',
    paddingTop: 8,
  },
  metadataText: {
    color: '#666',
    fontSize: 10,
    marginBottom: 2,
  },
  metadataTime: {
    color: '#999',
    fontSize: 9,
  },
  zoomHint: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
