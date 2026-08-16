import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';
import { useThemeColors, useSettings } from '@/src/contexts/SettingsContext';
import { CREDO_NICENO } from '@/constants/creeds';

export default function CreedScreen() {
  const colors = useThemeColors();
  const { fontSize } = useSettings();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={32} color={AppColors.primaryDark} />
        <Text style={[styles.title, { color: colors.text }]}>{CREDO_NICENO.title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {CREDO_NICENO.subtitle}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {CREDO_NICENO.paragraphs.map((paragraph, index) => (
          <Text
            key={index}
            style={[
              styles.paragraph,
              { color: colors.text, fontSize, lineHeight: fontSize * 1.7 },
              index === CREDO_NICENO.paragraphs.length - 1 && styles.paragraphLast,
            ]}
          >
            {paragraph}
          </Text>
        ))}
      </View>

      <View style={styles.footer}>
        <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          Confessado pela igreja em nossos cultos
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
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    borderRadius: 16,
    padding: 22,
  },
  paragraph: {
    marginBottom: 18,
    textAlign: 'left',
  },
  paragraphLast: {
    marginBottom: 0,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 18,
  },
  footerText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
