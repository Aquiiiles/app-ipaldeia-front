import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { AppColors } from '@/constants/theme';
import { useThemeColors, useSettings } from '@/src/contexts/SettingsContext';
import { useState } from 'react';

const PIX_KEY = '12.345.678/0001-90';

export default function DonationsScreen() {
  const colors = useThemeColors();
  const { fontSize } = useSettings();
  const [copied, setCopied] = useState(false);

  const handleCopyPix = async () => {
    await Clipboard.setStringAsync(PIX_KEY);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.headerBg }]}
      contentContainerStyle={styles.content}
    >
      <TouchableOpacity
        style={[styles.pixButton, copied && styles.pixButtonCopied]}
        onPress={handleCopyPix}
        activeOpacity={0.8}
      >
        <Text style={styles.pixButtonText}>
          {copied ? 'COPIADO!' : 'COPIAR PIX'}
        </Text>
      </TouchableOpacity>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Dados bancários:</Text>

        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>Banco:</Text>
          <Text style={[styles.rowValue, { color: colors.textSecondary, fontSize }]}>Banco do Brasil</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>Agência:</Text>
          <Text style={[styles.rowValue, { color: colors.textSecondary, fontSize }]}>1234-5</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>Conta:</Text>
          <Text style={[styles.rowValue, { color: colors.textSecondary, fontSize }]}>12345-6</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>CNPJ:</Text>
          <Text style={[styles.rowValue, { color: colors.textSecondary, fontSize }]}>12.345.678/0001-90</Text>
        </View>
      </View>

      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/images_igreja/logo_igreja.jpg')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.headerBg,
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  pixButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  pixButtonCopied: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
  },
  pixButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 32,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    width: 80,
  },
  rowValue: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 8,
    opacity: 0.3,
  },
  logo: {
    width: 100,
    height: 100,
  },
});
