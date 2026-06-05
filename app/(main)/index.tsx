import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = 10;
const GRID_PADDING = 16;
const CARD_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - CARD_MARGIN * 4) / 3;

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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.push('/(main)/profile')}
          activeOpacity={0.7}
        >
          <Ionicons name="menu" size={26} color="#FFFFFF" />
        </TouchableOpacity>

        <Image
          source={require('../../assets/images_igreja/logo_igreja.jpg')}
          style={styles.logo}
          resizeMode="contain"
        />

        <TouchableOpacity style={styles.headerButton} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Feature Grid */}
        <View style={styles.grid}>
          {features.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.iconContainer}>
                <Ionicons name={item.icon} size={30} color={AppColors.primaryDark} />
              </View>
              <Text style={styles.cardLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* News Section */}
        <View style={styles.newsSection}>
          <Text style={styles.sectionTitle}>Notícias</Text>

          <TouchableOpacity style={styles.newsCard} activeOpacity={0.8}>
            <View style={styles.newsImagePlaceholder}>
              <Ionicons name="image-outline" size={40} color="#FFFFFF" />
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
    paddingVertical: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  logo: {
    width: 120,
    height: 40,
  },
  scrollView: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: GRID_PADDING,
    paddingTop: 24,
    paddingBottom: 8,
  },
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    backgroundColor: AppColors.cardBackground,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    margin: CARD_MARGIN / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(60, 74, 62, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.primaryDark,
    textAlign: 'center',
  },
  newsSection: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 12,
  },
  newsCard: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  newsImagePlaceholder: {
    height: 160,
    backgroundColor: AppColors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newsContent: {
    padding: 16,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: 6,
  },
  newsDate: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
});
