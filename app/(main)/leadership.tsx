import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';
import { useThemeColors, useSettings } from '@/src/contexts/SettingsContext';

type Leader = {
  name: string;
  role: string;
};

type Section = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  leaders: Leader[];
};

const SECTIONS: Section[] = [
  {
    title: 'Pastores',
    icon: 'book',
    color: '#5B7F5E',
    leaders: [
      { name: 'Relrison Silva', role: 'Reverendo' },
      { name: 'Doug Leaman', role: 'Reverendo' },
    ],
  },
  {
    title: 'Presbíteros',
    icon: 'shield-checkmark',
    color: '#6B8E9B',
    leaders: [
      { name: 'Altimar Duarte', role: 'Presbítero' },
      { name: 'André Figueiredo', role: 'Presbítero' },
    ],
  },
  {
    title: 'Diáconos',
    icon: 'hand-left',
    color: '#8B7B6B',
    leaders: [
      { name: 'Rafael Amorim', role: 'Diácono' },
      { name: 'Gonçalo Barbosa', role: 'Diácono' },
      { name: 'Adauto Telino', role: 'Diácono' },
    ],
  },
];

function getInitials(name: string): string {
  const parts = name.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

export default function LeadershipScreen() {
  const colors = useThemeColors();
  const { fontSize } = useSettings();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerSection}>
        <Ionicons name="people" size={32} color={AppColors.primaryDark} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Nossa Liderança</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Conheça os líderes que servem nossa igreja
        </Text>
      </View>

      {SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBg, { backgroundColor: section.color + '20' }]}>
              <Ionicons name={section.icon} size={18} color={section.color} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            <View style={[styles.sectionLine, { backgroundColor: section.color + '30' }]} />
          </View>

          {section.leaders.map((leader) => (
            <View key={leader.name} style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={[styles.avatar, { backgroundColor: section.color }]}>
                <Text style={styles.avatarText}>{getInitials(leader.name)}</Text>
              </View>
              <View style={styles.info}>
                <Text style={[styles.leaderName, { color: colors.text, fontSize }]}>
                  {leader.name}
                </Text>
                <Text style={[styles.leaderRole, { color: section.color }]}>
                  {leader.role}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ))}

      <View style={styles.footer}>
        <Ionicons name="heart" size={16} color={colors.textSecondary} />
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          "Apascentai o rebanho de Deus" — 1 Pedro 5:2
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 28,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 10,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  sectionIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionLine: {
    flex: 1,
    height: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  info: {
    flex: 1,
  },
  leaderName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  leaderRole: {
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 8,
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 30,
  },
});
