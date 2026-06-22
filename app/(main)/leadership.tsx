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
import { useThemeColors, useSettings } from '@/src/contexts/SettingsContext';

type TabKey = 'pastores' | 'presbiteros' | 'diaconos';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'pastores', label: 'Pastores' },
  { key: 'presbiteros', label: 'Presbíteros' },
  { key: 'diaconos', label: 'Diáconos' },
];

const LEADERS: Record<TabKey, string[]> = {
  pastores: ['Rev. Relrison Silva', 'Rev. Doug Leaman'],
  presbiteros: ['Presb. Altimar Duarte', 'Presb. André Figueiredo'],
  diaconos: ['Diác. Rafael Amorim', 'Diác. Gonçalo Barbosa', 'Diác. Adauto Telino'],
};

export default function LeadershipScreen() {
  const colors = useThemeColors();
  const { fontSize } = useSettings();
  const [activeTab, setActiveTab] = useState<TabKey>('pastores');

  const leaders = LEADERS[activeTab];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.tabRow, { backgroundColor: colors.headerBg }]}>
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
        {leaders.map((name) => (
          <View key={name} style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={[styles.avatar, { backgroundColor: colors.border }]}>
              <Ionicons name="person" size={22} color={colors.textSecondary} />
            </View>
            <Text style={[styles.leaderName, { color: colors.text, fontSize }]}>{name}</Text>
          </View>
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
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: AppColors.accent,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  leaderName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    flex: 1,
  },
});
