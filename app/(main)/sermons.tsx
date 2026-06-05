import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { AppColors } from '@/constants/theme';

const SAMPLE_SERMONS = [
  { id: '1', title: 'Culto Dominical - 15/12' },
  { id: '2', title: 'Estudo Bíblico - 18/12' },
  { id: '3', title: 'Culto de Oração - 20/12' },
];

export default function SermonsScreen() {
  const [selectedMonth, setSelectedMonth] = useState('Dezembro');
  const [selectedYear, setSelectedYear] = useState('2025');

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.liveBanner} activeOpacity={0.8}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>AO VIVO</Text>
      </TouchableOpacity>

      <View style={styles.filterRow}>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterText}>{selectedMonth}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterText}>{selectedYear}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {SAMPLE_SERMONS.map((sermon) => (
          <TouchableOpacity key={sermon.id} style={styles.card} activeOpacity={0.7}>
            <View style={styles.cardImage} />
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{sermon.title}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.primaryDark,
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E53935',
  },
  liveText: {
    color: AppColors.textLight,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  filterButton: {
    backgroundColor: AppColors.primaryDark,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  filterText: {
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
    gap: 16,
  },
  card: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardImage: {
    height: 160,
    backgroundColor: AppColors.border,
  },
  cardInfo: {
    padding: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
  },
});
