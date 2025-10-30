import 'dotenv/config';
export default {
  expo: {
    name: "trial-stocks-app",
    slug: "trial-stocks-app",
    version: "1.0.0",
    extra: {
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      FINNHUB_API_KEY: process.env.FINNHUB_API_KEY,
    },
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


