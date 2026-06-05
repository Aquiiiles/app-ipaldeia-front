import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';
import { scale } from '@/constants/responsive';

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
        <TouchableOpacity style={styles.filterButton} activeOpacity={0.7}>
          <Text style={styles.filterText}>{selectedMonth}</Text>
          <Ionicons name="chevron-down" size={scale(13)} color={AppColors.textLight} style={{ marginLeft: scale(4) }} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton} activeOpacity={0.7}>
          <Text style={styles.filterText}>{selectedYear}</Text>
          <Ionicons name="chevron-down" size={scale(13)} color={AppColors.textLight} style={{ marginLeft: scale(4) }} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {SAMPLE_SERMONS.map((sermon) => (
          <TouchableOpacity key={sermon.id} style={styles.card} activeOpacity={0.7}>
            <View style={styles.cardImage}>
              <Ionicons name="play-circle-outline" size={scale(32)} color="rgba(255,255,255,0.8)" />
            </View>
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
    marginHorizontal: scale(16),
    marginTop: scale(14),
    paddingVertical: scale(12),
    borderRadius: scale(10),
    gap: scale(8),
  },
  liveDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: '#E53935',
  },
  liveText: {
    color: AppColors.textLight,
    fontSize: scale(14),
    fontWeight: '700',
    letterSpacing: 1,
  },
  filterRow: {
    flexDirection: 'row',
    gap: scale(8),
    paddingHorizontal: scale(16),
    paddingTop: scale(12),
    paddingBottom: scale(6),
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.primaryDark,
    paddingVertical: scale(8),
    paddingHorizontal: scale(14),
    borderRadius: scale(20),
  },
  filterText: {
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
    gap: scale(12),
  },
  card: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: scale(12),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardImage: {
    height: scale(120),
    backgroundColor: AppColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    padding: scale(12),
  },
  cardTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: AppColors.text,
  },
});
