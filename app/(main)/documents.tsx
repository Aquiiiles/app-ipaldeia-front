import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { AppColors } from '@/constants/theme';

const DOCUMENTS = [
  'CONFISSÃO DE FÉ\nDE WESTMINSTER',
  'CATECISMO MAIOR\nDE WESTMINSTER',
  'CATECISMO MENOR\nDE WESTMINSTER',
  'SALMOS/CIFRAS',
  'CREDO NICENO',
];

export default function DocumentsScreen() {
  const handlePress = (doc: string) => {
    Alert.alert(doc.replace('\n', ' '), 'Este documento estará disponível em breve.');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {DOCUMENTS.map((doc, index) => (
        <View key={doc}>
          {index > 0 && <View style={styles.divider} />}
          <TouchableOpacity
            style={styles.item}
            onPress={() => handlePress(doc)}
            activeOpacity={0.7}
          >
            <Text style={styles.itemText}>{doc}</Text>
          </TouchableOpacity>
        </View>
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
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  item: {
    paddingVertical: 22,
    alignItems: 'center',
  },
  itemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 1,
    lineHeight: 20,
    textDecorationLine: 'underline',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});
