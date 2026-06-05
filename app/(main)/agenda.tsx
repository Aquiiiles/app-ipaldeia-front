import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { AppColors } from '@/constants/theme';

type TabKey = 'geral' | 'aniversariantes';

interface AgendaItem {
  id: string;
  date: string;
  label: string;
}

const EVENTS: AgendaItem[] = [
  { id: '1', date: '27/11', label: 'ALMOÇO' },
  { id: '2', date: '5/12', label: 'ENCONTRO MULHERES' },
  { id: '3', date: '7/12', label: 'ENCONTRO HOMENS' },
  { id: '4', date: '17/12', label: 'FUTEBOL' },
  { id: '5', date: '19/12', label: 'ENCONTRO JOVENS' },
];

const BIRTHDAYS: AgendaItem[] = [
  { id: '1', date: '10/1', label: 'JOSÉ DA SILVA' },
  { id: '2', date: '15/1', label: 'SIMONE PEREIRA DA COSTA' },
  { id: '3', date: '10/2', label: 'RAFAEL MENDES DA SILVA' },
  { id: '4', date: '17/2', label: 'MARIA DA SILVA' },
  { id: '5', date: '16/2', label: 'CLÁUDIO DA SILVA ROCHA' },
];

export default function AgendaScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('geral');

  const data = activeTab === 'geral' ? EVENTS : BIRTHDAYS;

  const renderItem = ({ item, index }: { item: AgendaItem; index: number }) => (
    <View>
      <View style={styles.row}>
        <Text style={styles.date}>{item.date}</Text>
        <View style={styles.labelContainer}>
          <Text style={styles.dash}>-</Text>
          <Text style={styles.label}>{item.label}</Text>
        </View>
      </View>
      {index < data.length - 1 && <View style={styles.divider} />}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'geral' && styles.tabActive]}
          onPress={() => setActiveTab('geral')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'geral' && styles.tabTextActive]}>
            Geral
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'aniversariantes' && styles.tabActive]}
          onPress={() => setActiveTab('aniversariantes')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'aniversariantes' && styles.tabTextActive]}>
            Aniversariantes
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => `${activeTab}-${item.id}`}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: AppColors.cardBackground,
  },
  tabActive: {
    backgroundColor: AppColors.primaryDark,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  tabTextActive: {
    color: AppColors.textLight,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  date: {
    fontSize: 42,
    fontWeight: '700',
    color: AppColors.primaryDark,
    minWidth: 110,
  },
  labelContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dash: {
    fontSize: 20,
    fontWeight: '600',
    color: AppColors.text,
    marginRight: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  divider: {
    height: 1,
    backgroundColor: AppColors.border,
  },
});
