
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import 'react-native-reanimated';
import { theme } from '../theme';


import OnboardingScreen from '@/components/OnboardingScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { AIConversationProvider } from '@/contexts/AIConversationContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { HoldingsProvider } from '@/contexts/HoldingsContext';
import { InvestmentPlansProvider } from '@/contexts/InvestmentPlansContext';
import { OnboardingProvider, useOnboarding } from '@/contexts/OnboardingContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { TradeEventsProvider } from '@/contexts/TradeEventsContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function AuthContent() {
  const { user, loading } = useAuth();
  const { hasCompletedOnboarding, completeOnboarding } = useOnboarding();

  if (loading) {
    return null; // Show loading screen or splash
  }

  if (!user) {
    // Show authentication screens (login, signup, forgot-password)
    // Use key prop to force full remount on logout/login
    return <AuthLayoutNav key="auth" />;
  }

  if (!hasCompletedOnboarding) {
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

  // Use key prop to force full remount on login/logout
  return <RootLayoutNav key="authenticated" />;
}

function AppContent() {
  return <AuthContent />;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    Merriweather: require('../assets/fonts/Merriweather-VariableFont_opsz,wdth,wght.ttf'),
    Poppins: require('../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
    'Poppins-Medium': require('../assets/fonts/Poppins-Medium.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <OnboardingProvider>
        <AppContent />
      </OnboardingProvider>
    </AuthProvider>
  );
}

function AuthLayoutNav() {
  return (
    <PaperProvider theme={theme}>
      <ThemeProvider value={DarkTheme}>
        <View style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              animation: 'slide_from_right',
              animationDuration: 300,
              headerShown: false,
            }}
          >
            <Stack.Screen name="login" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="forgot-password" />
          </Stack>
        </View>
      </ThemeProvider>
    </PaperProvider>
  );
}

function AuthenticatedApp() {
  return (
    <SettingsProvider>
      <FavoritesProvider>
        <HoldingsProvider>
          <TradeEventsProvider>
            <InvestmentPlansProvider>
              <AIConversationProvider>
              <PaperProvider theme={theme}>
                <ThemeProvider value={DarkTheme}>
                  <View style={{ flex: 1 }}>
                    <Stack
                      screenOptions={{
                        animation: 'slide_from_right',
                        animationDuration: 300,
                      }}
                    >
                      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                      
                      <Stack.Screen name="ai" options={{ headerShown: false }} />
                      <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
                      <Stack.Screen name="holding-management" options={{ headerShown: false }} />
                      <Stack.Screen name="visualize" options={{ headerShown: false }} />
                      <Stack.Screen name="ai-settings" options={{ headerShown: false }} />
                    </Stack>
                  </View>
                </ThemeProvider>
              </PaperProvider>
              </AIConversationProvider>
            </InvestmentPlansProvider>
          </TradeEventsProvider>
        </HoldingsProvider>
      </FavoritesProvider>
    </SettingsProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();

  return <AuthenticatedApp />;
}
