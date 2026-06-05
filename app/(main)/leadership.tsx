import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';

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
          <View key={name}>
            {index > 0 && <View style={styles.divider} />}
            <View style={styles.leaderRow}>
              <View style={styles.avatar}>
                <Ionicons
                  name="person"
                  size={28}
                  color={AppColors.textSecondary}
                />
              </View>
              <Text style={styles.leaderName}>{name}</Text>
            </View>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: AppColors.cardBackground,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: AppColors.primaryDark,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  tabTextActive: {
    color: AppColors.textLight,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AppColors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  leaderName: {
    fontSize: 17,
    fontWeight: '500',
    color: AppColors.text,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: AppColors.border,
  },
});
