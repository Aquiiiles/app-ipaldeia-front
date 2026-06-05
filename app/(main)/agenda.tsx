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
  { id: '2', date: '15/1', label: 'SIMONE PEREIRA\nDA COSTA' },
  { id: '3', date: '10/2', label: 'RAFAEL MENDES\nDA SILVA' },
  { id: '4', date: '17/2', label: 'MARIA\nDA SILVA' },
  { id: '5', date: '16/2', label: 'CLÁUDIO DA\nSILVA ROCHA' },
];

export default function AgendaScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('geral');

  const data = activeTab === 'geral' ? EVENTS : BIRTHDAYS;

  const renderItem = ({ item, index }: { item: AgendaItem; index: number }) => (
    <View>
      <View style={styles.row}>
        <Text style={styles.date}>{item.date}</Text>
        <Text style={styles.label}>{item.label}</Text>
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
    backgroundColor: AppColors.headerBg,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 10,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  tabActive: {
    backgroundColor: AppColors.accent,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  date: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    minWidth: 100,
  },
  label: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});
