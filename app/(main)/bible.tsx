import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';

const SAMPLE_TEXT = `¹No princípio, criou Deus os céus e a terra. ²A terra, porém, estava sem forma e vazia; havia trevas sobre a face do abismo, e o Espírito de Deus pairava por sobre as águas.

³Disse Deus: Haja luz; e houve luz. ⁴E viu Deus que a luz era boa; e fez separação entre a luz e as trevas. ⁵Chamou Deus à luz Dia e às trevas, Noite. Houve tarde e manhã, o primeiro dia.

⁶E disse Deus: Haja expansão no meio das águas e separação entre águas e águas.`;

export default function BibleScreen() {
  const [selectedBook, setSelectedBook] = useState('Gênesis');
  const [selectedChapter, setSelectedChapter] = useState(1);

  return (
    <View style={styles.container}>
      <View style={styles.selectorRow}>
        <TouchableOpacity style={styles.selectorButton} activeOpacity={0.7}>
          <Text style={styles.selectorText}>{selectedBook}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.selectorButton} activeOpacity={0.7}>
          <Text style={styles.selectorText}>Cap {selectedChapter}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.bibleText}>{SAMPLE_TEXT}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8E4DD',
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  selectorButton: {
    backgroundColor: AppColors.primaryDark,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  selectorText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  bibleText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#4a4a40',
  },
});
