import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { AppColors } from '@/constants/theme';

const PIX_KEY = '12.345.678/0001-90';

export default function DonationsScreen() {
  const handleCopyPix = () => {
    Alert.alert('Chave PIX', PIX_KEY, [{ text: 'OK' }]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <TouchableOpacity style={styles.pixButton} onPress={handleCopyPix}>
        <Text style={styles.pixButtonText}>COPIAR PIX</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Dados bancários:</Text>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Banco:</Text>
          <Text style={styles.rowValue}>Banco do Brasil</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Agência:</Text>
          <Text style={styles.rowValue}>1234-5</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Conta:</Text>
          <Text style={styles.rowValue}>12345-6</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>CNPJ:</Text>
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
    padding: 24,
    alignItems: 'center',
  },
  pixButton: {
    backgroundColor: AppColors.primaryDark,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  pixButtonText: {
    color: AppColors.textLight,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 32,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.text,
    width: 80,
  },
  rowValue: {
    fontSize: 15,
    color: AppColors.textSecondary,
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  logo: {
    width: 120,
    height: 120,
    opacity: 0.7,
  },
});
