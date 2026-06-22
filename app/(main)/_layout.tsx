import { Stack } from 'expo-router';
import { AppColors } from '@/constants/theme';
import { useThemeColors } from '@/src/contexts/SettingsContext';

export default function MainLayout() {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.headerBg },
        headerTintColor: AppColors.textLight,
        headerTitleStyle: { fontWeight: '600' },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="hymns" options={{ title: 'Hinos' }} />
      <Stack.Screen name="agenda" options={{ title: 'Agenda' }} />
      <Stack.Screen name="bible" options={{ title: 'Bíblia ARA' }} />
      <Stack.Screen name="sermons" options={{ title: 'Sermões' }} />
      <Stack.Screen name="notes" options={{ title: 'Anotações' }} />
      <Stack.Screen name="prayers" options={{ title: 'Orações' }} />
      <Stack.Screen name="donations" options={{ title: 'Doações' }} />
      <Stack.Screen name="documents" options={{ title: 'Documentos' }} />
      <Stack.Screen name="leadership" options={{ title: 'Liderança' }} />
      <Stack.Screen name="profile" options={{ title: 'Perfil' }} />
      <Stack.Screen name="settings" options={{ title: 'Configurações' }} />
    </Stack>
  );
}
