import 'dotenv/config';
export default {
  expo: {
    name: "trial-stocks-app",
    slug: "trial-stocks-app",
    version: "1.0.0",
    // No API keys here: everything in `extra` is bundled into the app. Third-party
    // keys live on the API proxy (proxy/); the app reads EXPO_PUBLIC_API_PROXY_URL.
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "trialstocksapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
    ],
    experiments: {
      typedRoutes: true,
    },
  },
};


