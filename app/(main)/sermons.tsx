import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';

const SAMPLE_SERMONS = [
  {
    id: '1',
    title: 'PR | Rev. Reinoso Silva | 1 Coríntios 10.29-11.1 |',
    subtitle: 'Culto Vespertino - 14/12/2025',
    views: '44 visualizações',
    time: 'Transmitido há 4 dias',
  },
  {
    id: '2',
    title: 'PR | Rev. Reinoso Silva | Atos 26.19-23 | Culto',
    subtitle: 'Vespertino - 07/12/2025',
    views: '31 visualizações',
    time: 'Transmitido há 11 dias',
  },
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
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton} activeOpacity={0.7}>
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
            <View style={styles.cardImage}>
              <View style={styles.cardImageOverlay}>
                <Image
                  source={require('../../assets/images_igreja/logo_igreja.jpg')}
                  style={styles.cardLogo}
                  resizeMode="contain"
                />
              </View>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle} numberOfLines={2}>{sermon.title}</Text>
              <Text style={styles.cardSubtitle}>{sermon.subtitle}</Text>
              <Text style={styles.cardMeta}>{sermon.views} • {sermon.time}</Text>
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
    backgroundColor: AppColors.headerBg,
  },
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 20,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E53935',
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  filterButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  filterText: {
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
    paddingBottom: 32,
    gap: 14,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardImage: {
    height: 140,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImageOverlay: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    opacity: 0.6,
  },
  cardLogo: {
    width: 60,
    height: 60,
  },
  cardInfo: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
  },
});
