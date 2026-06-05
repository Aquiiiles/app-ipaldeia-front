import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 20;
const CARD_GAP = 12;
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
          <Ionicons name="menu" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Image
          source={require('../../assets/images_igreja/logo_igreja.jpg')}
          style={styles.headerLogo}
          resizeMode="contain"
        />

        <TouchableOpacity style={styles.headerButton} activeOpacity={0.7}>
          <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoSection}>
          <Image
            source={require('../../assets/images_igreja/logo_igreja.jpg')}
            style={styles.centerLogo}
            resizeMode="contain"
          />
          <Text style={styles.churchName}>IGREJA{'\n'}PRESBITERIANA{'\n'}DE ALDEIA</Text>
        </View>

        <View style={styles.grid}>
          {features.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.iconCircle}>
                <Ionicons name={item.icon} size={26} color={AppColors.primaryDark} />
              </View>
              <Text style={styles.cardLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.newsSection}>
          <Text style={styles.sectionTitle}>Notícias</Text>
          <TouchableOpacity style={styles.newsCard} activeOpacity={0.8}>
            <View style={styles.newsImagePlaceholder}>
              <Ionicons name="image-outline" size={32} color="#FFFFFF" />
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
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#E8E4DD',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: GRID_PADDING,
    gap: 12,
  },
  centerLogo: {
    width: 56,
    height: 56,
    borderRadius: 8,
    opacity: 0.6,
  },
  churchName: {
    fontSize: 14,
    fontWeight: '700',
    color: AppColors.primaryDark,
    letterSpacing: 1,
    lineHeight: 18,
    opacity: 0.6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GRID_PADDING,
    gap: CARD_GAP,
  },
  card: {
    width: CARD_SIZE,
    aspectRatio: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(60, 74, 62, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.primaryDark,
    textAlign: 'center',
  },
  newsSection: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 10,
  },
  newsCard: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 14,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  newsImagePlaceholder: {
    width: 90,
    height: 90,
    backgroundColor: AppColors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    margin: 8,
  },
  newsContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  newsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: 4,
  },
  newsDate: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
});
