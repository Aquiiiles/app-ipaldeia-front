import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { AppColors } from '@/constants/theme';

const SAMPLE_TEXT = `No princípio, criou Deus os céus e a terra. A terra, porém, estava sem forma e vazia; havia trevas sobre a face do abismo, e o Espírito de Deus pairava por sobre as águas.

Disse Deus: Haja luz; e houve luz. E viu Deus que a luz era boa; e fez separação entre a luz e as trevas. Chamou Deus à luz Dia e às trevas, Noite. Houve tarde e manhã, o primeiro dia.

E disse Deus: Haja expansão no meio das águas e separação entre águas e águas.`;

export default function BibleScreen() {
  const [selectedBook, setSelectedBook] = useState('Gênesis');
  const [selectedChapter, setSelectedChapter] = useState(1);

  return (
    <View style={styles.container}>
      <View style={styles.selectorRow}>
        <TouchableOpacity style={styles.selectorButton}>
          <Text style={styles.selectorText}>{selectedBook}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.selectorButton}>
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
    backgroundColor: AppColors.background,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  selectorButton: {
    backgroundColor: AppColors.primaryDark,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  selectorText: {
    color: AppColors.textLight,
    fontSize: 15,
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
    fontSize: 17,
    lineHeight: 28,
    color: AppColors.text,
  },
});
