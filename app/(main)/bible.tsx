import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';
import { scale } from '@/constants/responsive';

const SAMPLE_TEXT = `No princípio, criou Deus os céus e a terra. A terra, porém, estava sem forma e vazia; havia trevas sobre a face do abismo, e o Espírito de Deus pairava por sobre as águas.

Disse Deus: Haja luz; e houve luz. E viu Deus que a luz era boa; e fez separação entre a luz e as trevas. Chamou Deus à luz Dia e às trevas, Noite. Houve tarde e manhã, o primeiro dia.

E disse Deus: Haja expansão no meio das águas e separação entre águas e águas.`;

export default function BibleScreen() {
  const [selectedBook, setSelectedBook] = useState('Gênesis');
  const [selectedChapter, setSelectedChapter] = useState(1);

  return (
    <View style={styles.container}>
      <View style={styles.selectorRow}>
        <TouchableOpacity style={styles.selectorButton} activeOpacity={0.7}>
          <Ionicons name="book-outline" size={scale(14)} color={AppColors.textLight} style={{ marginRight: scale(6) }} />
          <Text style={styles.selectorText}>{selectedBook}</Text>
          <Ionicons name="chevron-down" size={scale(14)} color={AppColors.textLight} style={{ marginLeft: scale(4) }} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.selectorButton} activeOpacity={0.7}>
          <Text style={styles.selectorText}>Cap {selectedChapter}</Text>
          <Ionicons name="chevron-down" size={scale(14)} color={AppColors.textLight} style={{ marginLeft: scale(4) }} />
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
    gap: scale(8),
    paddingHorizontal: scale(16),
    paddingTop: scale(14),
    paddingBottom: scale(8),
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.primaryDark,
    paddingVertical: scale(8),
    paddingHorizontal: scale(14),
    borderRadius: scale(20),
  },
  selectorText: {
    color: AppColors.textLight,
    fontSize: scale(13),
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(16),
    paddingTop: scale(8),
    paddingBottom: scale(32),
  },
  bibleText: {
    fontSize: scale(15),
    lineHeight: scale(24),
    color: AppColors.text,
  },
});
