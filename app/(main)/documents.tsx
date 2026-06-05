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
  'CONFISSÃO DE FÉ DE WESTMINSTER',
  'CATECISMO MAIOR DE WESTMINSTER',
  'CATECISMO MENOR DE WESTMINSTER',
  'SALMOS/CIFRAS',
  'CREDO NICENO',
];

export default function DocumentsScreen() {
  const handlePress = () => {
    Alert.alert('Em breve!');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {DOCUMENTS.map((doc, index) => (
        <View key={doc}>
          {index > 0 && <View style={styles.divider} />}
          <TouchableOpacity style={styles.item} onPress={handlePress}>
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
    backgroundColor: AppColors.background,
  },
  content: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  item: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  itemText: {
    fontSize: 17,
    fontWeight: '600',
    color: AppColors.text,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: AppColors.border,
  },
});
