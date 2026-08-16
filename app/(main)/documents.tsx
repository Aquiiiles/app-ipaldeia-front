import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { AppColors } from '@/constants/theme';
import { useThemeColors, useSettings } from '@/src/contexts/SettingsContext';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

type Document = {
  title: string;
  subtitle: string;
  icon: IoniconsName;
  /** PDF ou site de terceiros, aberto no navegador. */
  url?: string;
  /** Conteúdo que hospedamos no próprio app. */
  route?: Href;
};

const DOCUMENTS: Document[] = [
  {
    title: 'Confissão de Fé de Westminster',
    subtitle: 'Documento doutrinário da fé reformada',
    icon: 'book-outline',
    url: 'https://www.executivaipb.com.br/arquivos/confissao_de_westminster.pdf',
  },
  {
    title: 'Catecismo Maior de Westminster',
    subtitle: '196 perguntas e respostas',
    icon: 'document-text-outline',
    url: 'https://www.ipb.org.br/content/Arquivos/Catecismo_Maior_de_Westminster.pdf',
  },
  {
    title: 'Breve Catecismo de Westminster',
    subtitle: '107 perguntas e respostas',
    icon: 'document-text-outline',
    url: 'https://www.ipb.org.br/content/Arquivos/Breve_Catecismo_de_Westminster.pdf',
  },
  {
    title: 'Saltério Reformado',
    subtitle: 'Salmos cantados com cifras',
    icon: 'musical-notes-outline',
    url: 'https://www.cifraclub.com.br/salterio-reformado/',
  },
  {
    title: 'Cifras do Saltério',
    subtitle: 'PDF com cifras do Saltério de Genebra',
    icon: 'musical-note-outline',
    url: 'https://salterio.com.br/downloads/cifras.pdf',
  },
  {
    title: 'Credo Niceno',
    subtitle: 'A versão confessada em nossos cultos',
    icon: 'shield-checkmark-outline',
    route: '/(main)/creed',
  },
];

export default function DocumentsScreen() {
  const colors = useThemeColors();
  const { fontSize } = useSettings();

  function handlePress(doc: Document) {
    if (doc.route) {
      router.push(doc.route);
      return;
    }
    if (doc.url) Linking.openURL(doc.url);
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.headerBg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {DOCUMENTS.map((doc, index) => (
        <TouchableOpacity
          key={doc.title}
          style={[styles.card, { backgroundColor: colors.card }, index === DOCUMENTS.length - 1 && { marginBottom: 0 }]}
          onPress={() => handlePress(doc)}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <Ionicons name={doc.icon} size={22} color={colors.text} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: colors.text, fontSize }]}>{doc.title}</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{doc.subtitle}</Text>
          </View>
          <Ionicons
            name={doc.route ? 'chevron-forward' : 'open-outline'}
            size={16}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.headerBg,
  },
  content: {
    padding: 20,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    gap: 14,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
});
