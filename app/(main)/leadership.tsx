import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';
import { scale } from '@/constants/responsive';

type TabKey = 'pastores' | 'presbiteros' | 'diaconos';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'pastores', label: 'Pastores' },
  { key: 'presbiteros', label: 'Presbíteros' },
  { key: 'diaconos', label: 'Diáconos' },
];

const LEADERS: Record<TabKey, string[]> = {
  pastores: ['Rev. João Silva', 'Rev. Pedro Santos'],
  presbiteros: ['Altimar Duarte', 'André Figueiredo'],
  diaconos: ['Carlos Mendes', 'Lucas Oliveira'],
};

export default function LeadershipScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('pastores');

  const leaders = LEADERS[activeTab];

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {leaders.map((name, index) => (
          <View key={name} style={styles.card}>
            <View style={styles.avatar}>
              <Ionicons
                name="person"
                size={scale(20)}
                color={AppColors.primaryDark}
              />
            </View>
            <Text style={styles.leaderName}>{name}</Text>
          </View>
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
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    paddingTop: scale(12),
    paddingBottom: scale(6),
    gap: scale(6),
  },
  tab: {
    flex: 1,
    paddingVertical: scale(9),
    borderRadius: scale(20),
    backgroundColor: AppColors.cardBackground,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: AppColors.primaryDark,
  },
  tabText: {
    fontSize: scale(12),
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  tabTextActive: {
    color: AppColors.textLight,
  },
  listContent: {
    paddingHorizontal: scale(16),
    paddingTop: scale(8),
    paddingBottom: scale(24),
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.cardBackground,
    borderRadius: scale(12),
    padding: scale(14),
    marginBottom: scale(8),
  },
  avatar: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(21),
    backgroundColor: 'rgba(60, 74, 62, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(14),
  },
  leaderName: {
    fontSize: scale(14),
    fontWeight: '500',
    color: AppColors.text,
    flex: 1,
  },
});
