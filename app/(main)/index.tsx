import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';
import { scale, wp, SCREEN_WIDTH } from '@/constants/responsive';

const GRID_PADDING = scale(16);
const CARD_GAP = scale(10);
const CARD_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - CARD_GAP * 2) / 3;

interface FeatureItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const features: FeatureItem[] = [
  { label: 'Bíblia', icon: 'book-outline', route: '/(main)/bible' },
  { label: 'Sermões', icon: 'mic-outline', route: '/(main)/sermons' },
  { label: 'Anotações', icon: 'document-text-outline', route: '/(main)/notes' },
  { label: 'Oração', icon: 'heart-outline', route: '/(main)/prayers' },
  { label: 'Doações', icon: 'gift-outline', route: '/(main)/donations' },
  { label: 'Documentos', icon: 'folder-open-outline', route: '/(main)/documents' },
  { label: 'Agenda', icon: 'calendar-outline', route: '/(main)/agenda' },
  { label: 'Grupos', icon: 'people-outline', route: '/(main)/groups' },
  { label: 'Liderança', icon: 'shield-outline', route: '/(main)/leadership' },
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.push('/(main)/profile')}
          activeOpacity={0.7}
        >
          <Ionicons name="menu" size={scale(22)} color="#FFFFFF" />
        </TouchableOpacity>

        <Image
          source={require('../../assets/images_igreja/logo_igreja.jpg')}
          style={styles.headerLogo}
          resizeMode="contain"
        />

        <TouchableOpacity style={styles.headerButton} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={scale(20)} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {features.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.iconCircle}>
                <Ionicons name={item.icon} size={scale(22)} color={AppColors.primaryDark} />
              </View>
              <Text style={styles.cardLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.newsSection}>
          <Text style={styles.sectionTitle}>Notícias</Text>

          <TouchableOpacity style={styles.newsCard} activeOpacity={0.8}>
            <View style={styles.newsImagePlaceholder}>
              <Ionicons name="image-outline" size={scale(32)} color="#FFFFFF" />
            </View>
            <View style={styles.newsContent}>
              <Text style={styles.newsTitle} numberOfLines={2}>
                Neste domingo teremos almoço. Veja lista no wapp!
              </Text>
              <Text style={styles.newsDate}>29/11/2025</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppColors.headerBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AppColors.headerBg,
    paddingHorizontal: scale(14),
    paddingVertical: scale(10),
  },
  headerButton: {
    width: scale(36),
    height: scale(36),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scale(18),
  },
  headerLogo: {
    width: scale(100),
    height: scale(34),
  },
  scrollView: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  scrollContent: {
    paddingBottom: scale(24),
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: GRID_PADDING,
    paddingTop: scale(18),
    paddingBottom: scale(6),
    gap: CARD_GAP,
  },
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    backgroundColor: AppColors.cardBackground,
    borderRadius: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconCircle: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(60, 74, 62, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(6),
  },
  cardLabel: {
    fontSize: scale(11),
    fontWeight: '600',
    color: AppColors.primaryDark,
    textAlign: 'center',
  },
  newsSection: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: scale(14),
  },
  sectionTitle: {
    fontSize: scale(17),
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: scale(10),
  },
  newsCard: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: scale(14),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  newsImagePlaceholder: {
    height: scale(130),
    backgroundColor: AppColors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newsContent: {
    padding: scale(12),
  },
  newsTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: scale(4),
  },
  newsDate: {
    fontSize: scale(11),
    color: AppColors.textSecondary,
  },
});
