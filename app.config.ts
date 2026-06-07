import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  // baseUrl '/app-ipaldeia-front' is only needed for the GitHub Pages web deployment.
  // It must NOT be included on native platforms because the prefix breaks native routing.
  // EAS_BUILD_PLATFORM is 'android' or 'ios' during EAS builds.
  // EXPO_OS is set during local dev via `npx expo start`.
  const isNativeBuild =
    ['android', 'ios'].includes(process.env.EAS_BUILD_PLATFORM ?? '') ||
    ['android', 'ios'].includes(process.env.EXPO_OS ?? '');

  return {
    ...config,
    name: 'IP Aldeia',
    slug: 'ip-aldeia',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'igrejaapp',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
    },
    android: {
      package: 'com.ipaldeia.app',
      adaptiveIcon: {
        backgroundColor: '#3C4A3E',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      edgeToEdgeEnabled: true,
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
          dark: {
            backgroundColor: '#000000',
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
      ...(isNativeBuild ? {} : { baseUrl: '/app-ipaldeia-front' }),
    },
  };
};
