import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, useSettings } from '@/src/contexts/SettingsContext';

type HymnBook = 'hinario' | 'salterio';

type ExternalApp = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  description: string;
  buttonLabel: string;
  /** Shown under the button, and used as the fallback if a store link can't be opened. */
  site: string;
  android?: string;
  ios?: string;
};

// Hinário Novo Cântico, o app oficial mantido em novocantico.com.br.
const NOVO_CANTICO: ExternalApp = {
  title: 'Hinário Novo Cântico',
  icon: 'musical-notes',
  color: '#5B7F5E',
  description:
    'O Hinário Novo Cântico tem um aplicativo próprio, com os 404 hinos, áudio e '
    + 'índices por tema. Acesse lá o hinário completo da Igreja Presbiteriana do Brasil.',
  buttonLabel: 'Abrir o app do Novo Cântico',
  site: 'https://novocantico.com.br/',
  android: 'https://play.google.com/store/apps/details?id=com.rallapps.novocantico',
  ios: 'https://apps.apple.com/br/app/novo-c%C3%A2ntico/id1548148433',
};

const SALTERIO: ExternalApp = {
  title: 'Saltério Reformado',
  icon: 'book',
  color: '#6B8E9B',
  description:
    'O Saltério Reformado tem um aplicativo próprio, feito com muito carinho por nossos '
    + 'irmãos. Acesse lá o conteúdo completo dos salmos cantados.',
  buttonLabel: 'Abrir o app do Saltério',
  site: 'https://appsalterioreformado.com.br/',
};

/** Store link on native, site on web — falling back to the site if the store can't open. */
async function openApp(app: ExternalApp) {
  const storeUrl = Platform.OS === 'android' ? app.android : Platform.OS === 'ios' ? app.ios : undefined;
  if (storeUrl) {
    try {
      await Linking.openURL(storeUrl);
      return;
    } catch {
      // Device without the store installed — fall through to the site.
    }
  }
  Linking.openURL(app.site);
}

/** Strips the scheme so the card shows a readable domain. */
function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function AppCard({ app }: { app: ExternalApp }) {
  const colors = useThemeColors();
  const { fontSize } = useSettings();

  return (
    <View style={styles.cardContainer}>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={[styles.cardIcon, { backgroundColor: app.color }]}>
          <Ionicons name={app.icon} size={32} color="#FFFFFF" />
        </View>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{app.title}</Text>
        <Text style={[styles.cardDesc, { color: colors.textSecondary, fontSize }]}>
          {app.description}
        </Text>
        <TouchableOpacity
          style={[styles.cardButton, { backgroundColor: app.color }]}
          onPress={() => openApp(app)}
          activeOpacity={0.85}
        >
          <Ionicons name="open-outline" size={18} color="#FFFFFF" />
          <Text style={styles.cardButtonText}>{app.buttonLabel}</Text>
        </TouchableOpacity>
        <Text style={[styles.cardUrl, { color: colors.textSecondary }]}>
          {displayUrl(app.site)}
        </Text>
      </View>
    </View>
  );
}

export default function HymnsScreen() {
  const colors = useThemeColors();
  const [activeBook, setActiveBook] = useState<HymnBook>('hinario');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.bookTabs, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity
          style={[styles.bookTab, activeBook === 'hinario' && styles.bookTabActive]}
          onPress={() => setActiveBook('hinario')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="musical-notes"
            size={16}
            color={activeBook === 'hinario' ? '#FFFFFF' : 'rgba(255,255,255,0.5)'}
          />
          <Text style={[styles.bookTabText, activeBook === 'hinario' && styles.bookTabTextActive]}>
            Hinário Presbiteriano
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bookTab, activeBook === 'salterio' && styles.bookTabActive]}
          onPress={() => setActiveBook('salterio')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="book"
            size={16}
            color={activeBook === 'salterio' ? '#FFFFFF' : 'rgba(255,255,255,0.5)'}
          />
          <Text style={[styles.bookTabText, activeBook === 'salterio' && styles.bookTabTextActive]}>
            Saltério Reformado
          </Text>
        </TouchableOpacity>
      </View>

      <AppCard app={activeBook === 'hinario' ? NOVO_CANTICO : SALTERIO} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bookTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  bookTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  bookTabActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  bookTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  bookTabTextActive: {
    color: '#FFFFFF',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
  },
  cardIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  cardDesc: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  cardButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  cardUrl: {
    fontSize: 12,
    marginTop: 14,
  },
});
