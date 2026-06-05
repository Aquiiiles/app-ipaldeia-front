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
        {leaders.map((name) => (
          <View key={name} style={styles.card}>
            <View style={styles.avatar}>
              <Ionicons name="camera-outline" size={22} color="rgba(255,255,255,0.4)" />
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
