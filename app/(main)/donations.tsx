import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';
import { scale } from '@/constants/responsive';
import { useState } from 'react';

const PIX_KEY = '12.345.678/0001-90';

export default function DonationsScreen() {
  const [copied, setCopied] = useState(false);

  const handleCopyPix = async () => {
    await Clipboard.setStringAsync(PIX_KEY);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <TouchableOpacity
        style={[styles.pixButton, copied && styles.pixButtonCopied]}
        onPress={handleCopyPix}
        activeOpacity={0.8}
      >
        <Ionicons
          name={copied ? 'checkmark-circle' : 'copy-outline'}
          size={scale(18)}
          color={AppColors.textLight}
          style={{ marginRight: scale(8) }}
        />
        <Text style={styles.pixButtonText}>
          {copied ? 'COPIADO!' : 'COPIAR CHAVE PIX'}
        </Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Dados bancários</Text>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Banco</Text>
          <Text style={styles.rowValue}>Banco do Brasil</Text>
        </View>

        <View style={styles.rowDivider} />

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Agência</Text>
          <Text style={styles.rowValue}>1234-5</Text>
        </View>

        <View style={styles.rowDivider} />

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Conta</Text>
          <Text style={styles.rowValue}>12345-6</Text>
        </View>

        <View style={styles.rowDivider} />

        <View style={styles.row}>
          <Text style={styles.rowLabel}>CNPJ</Text>
          <Text style={styles.rowValue}>12.345.678/0001-90</Text>
        </View>
      </View>

      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/icon.png')}
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
    backgroundColor: AppColors.background,
  },
  content: {
    padding: scale(16),
    alignItems: 'center',
  },
  pixButton: {
    flexDirection: 'row',
    backgroundColor: AppColors.primaryDark,
    borderRadius: scale(10),
    paddingVertical: scale(12),
    paddingHorizontal: scale(20),
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: scale(18),
  },
  pixButtonCopied: {
    backgroundColor: AppColors.success,
  },
  pixButtonText: {
    color: AppColors.textLight,
    fontSize: scale(14),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: scale(12),
    padding: scale(16),
    width: '100%',
    marginBottom: scale(24),
  },
  cardTitle: {
    fontSize: scale(15),
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: scale(14),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: scale(8),
  },
  rowLabel: {
    fontSize: scale(13),
    fontWeight: '600',
    color: AppColors.text,
  },
  rowValue: {
    fontSize: scale(13),
    color: AppColors.textSecondary,
  },
  rowDivider: {
    height: 1,
    backgroundColor: AppColors.border,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: scale(8),
  },
  logo: {
    width: scale(80),
    height: scale(80),
    opacity: 0.5,
  },
});
