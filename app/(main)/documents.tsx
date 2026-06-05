import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';
import { scale } from '@/constants/responsive';

const DOCUMENTS = [
  { name: 'CONFISSÃO DE FÉ DE WESTMINSTER', icon: 'document-text-outline' as const },
  { name: 'CATECISMO MAIOR DE WESTMINSTER', icon: 'document-text-outline' as const },
  { name: 'CATECISMO MENOR DE WESTMINSTER', icon: 'document-text-outline' as const },
  { name: 'SALMOS/CIFRAS', icon: 'musical-notes-outline' as const },
  { name: 'CREDO NICENO', icon: 'document-text-outline' as const },
];

export default function DocumentsScreen() {
  const handlePress = (docName: string) => {
    Alert.alert(docName, 'Este documento estará disponível em breve.');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {DOCUMENTS.map((doc, index) => (
        <TouchableOpacity
          key={doc.name}
          style={styles.item}
          onPress={() => handlePress(doc.name)}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <Ionicons name={doc.icon} size={scale(20)} color={AppColors.primaryDark} />
          </View>
          <Text style={styles.itemText} numberOfLines={2}>{doc.name}</Text>
          <Ionicons name="chevron-forward" size={scale(16)} color={AppColors.border} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  content: {
    paddingVertical: scale(8),
    paddingHorizontal: scale(16),
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.cardBackground,
    borderRadius: scale(10),
    padding: scale(14),
    marginBottom: scale(8),
  },
  iconContainer: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: 'rgba(60, 74, 62, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  itemText: {
    flex: 1,
    fontSize: scale(13),
    fontWeight: '600',
    color: AppColors.text,
    letterSpacing: 0.3,
  },
});
