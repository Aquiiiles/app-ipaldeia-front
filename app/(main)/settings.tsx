import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings, useThemeColors } from '@/src/contexts/SettingsContext';
import { AppColors } from '@/constants/theme';

const MIN_FONT = 12;
const MAX_FONT = 32;

export default function SettingsScreen() {
  const { darkMode, setDarkMode, fontSize, setFontSize } = useSettings();
  const colors = useThemeColors();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Aparência</Text>

        <View style={[styles.row, { borderBottomColor: colors.border }]}>
          <View style={styles.rowLeft}>
            <Ionicons name="moon-outline" size={20} color={colors.text} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, { color: colors.text }]}>Modo escuro</Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: '#c5c0b8', true: '#5a7a5e' }}
            thumbColor={darkMode ? '#FFFFFF' : '#f4f3f4'}
          />
        </View>

        <View style={styles.rowNoBorder}>
          <View style={styles.rowLeft}>
            <Ionicons name="text-outline" size={20} color={colors.text} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, { color: colors.text }]}>Tamanho da fonte</Text>
          </View>
        </View>
        <View style={styles.fontSizeControls}>
          <TouchableOpacity
            style={[styles.fontSizeCircle, { borderColor: colors.border, opacity: fontSize <= MIN_FONT ? 0.3 : 1 }]}
            onPress={() => fontSize > MIN_FONT && setFontSize(fontSize - 1)}
            disabled={fontSize <= MIN_FONT}
            activeOpacity={0.7}
          >
            <Ionicons name="remove" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.fontSizeValue, { color: colors.text }]}>{fontSize}</Text>
          <TouchableOpacity
            style={[styles.fontSizeCircle, { borderColor: colors.border, opacity: fontSize >= MAX_FONT ? 0.3 : 1 }]}
            onPress={() => fontSize < MAX_FONT && setFontSize(fontSize + 1)}
            disabled={fontSize >= MAX_FONT}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.fontPreview, { color: colors.textSecondary, fontSize }]}>
          Exemplo de texto com esta fonte
        </Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Sobre o App</Text>

        <View style={[styles.aboutRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>Aplicativo</Text>
          <Text style={[styles.aboutValue, { color: colors.text }]}>IP Aldeia</Text>
        </View>
        <View style={[styles.aboutRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>Versão</Text>
          <Text style={[styles.aboutValue, { color: colors.text }]}>1.0.0</Text>
        </View>
        <View style={[styles.aboutRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>Igreja</Text>
          <Text style={[styles.aboutValue, { color: colors.text }]}>Igreja Presbiteriana de Aldeia</Text>
        </View>

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => Linking.openURL('https://www.instagram.com/ip_aldeia/')}
          activeOpacity={0.7}
        >
          <Ionicons name="logo-instagram" size={18} color={AppColors.primaryDark} />
          <Text style={[styles.linkText, { color: colors.primaryDark }]}>@ip_aldeia</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => Linking.openURL('https://www.youtube.com/@ipaldeia')}
          activeOpacity={0.7}
        >
          <Ionicons name="logo-youtube" size={18} color={AppColors.primaryDark} />
          <Text style={[styles.linkText, { color: colors.primaryDark }]}>@ipaldeia</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.footer, { color: colors.textSecondary }]}>
        Desenvolvido com carinho por Aquiles para a IP Aldeia
      </Text>
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
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  rowNoBorder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingBottom: 8,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIcon: {
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  fontSizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 12,
  },
  fontSizeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontSizeValue: {
    fontSize: 20,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'center',
  },
  fontPreview: {
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  aboutLabel: {
    fontSize: 14,
  },
  aboutValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 8,
  },
});
