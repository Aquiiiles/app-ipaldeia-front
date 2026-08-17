import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, Text, View } from 'react-native';
import 'react-native-reanimated';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { SettingsProvider, useSettings } from '@/src/contexts/SettingsContext';
import { enableGlobalPoppins } from '@/src/utils/fonts';

enableGlobalPoppins();

// Expo Router renders this instead of a blank/generic screen when a descendant
// route throws during render. Surfaces the actual error on-device so failures
// are diagnosable in release builds instead of showing a silent white screen.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={{ flex: 1, backgroundColor: '#fff', padding: 24, paddingTop: 72 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
        Ops, algo deu errado ao abrir o app
      </Text>
      <ScrollView style={{ flex: 1 }}>
        <Text selectable style={{ fontSize: 13, color: '#333' }}>
          {String(error?.message ?? error)}
          {'\n\n'}
          {String(error?.stack ?? '')}
        </Text>
      </ScrollView>
      <Text onPress={retry} style={{ marginTop: 16, fontSize: 16, fontWeight: '600', color: '#2563eb' }}>
        Tentar novamente
      </Text>
    </View>
  );
}

function RootNavigator() {
  const { darkMode } = useSettings();
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
      </Stack>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // Render once fonts are ready OR if loading failed. Ignoring `fontError` here
  // would leave the app stuck on a blank white screen forever if font loading
  // fails (which can happen on native release builds but not on web). On error
  // we proceed and text falls back to the system font.
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <SettingsProvider>
        <RootNavigator />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
