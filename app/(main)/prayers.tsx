import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { AppColors } from '@/constants/theme';
import { scale } from '@/constants/responsive';

export default function PrayersScreen() {
  const [motivo, setMotivo] = useState('');

  const handleSubmit = () => {
    if (!motivo.trim()) {
      Alert.alert('Atenção', 'Por favor, escreva seu pedido de oração.');
      return;
    }
    Alert.alert('Pedido de oração enviado!');
    setMotivo('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Motivo:</Text>

        <TextInput
          style={styles.textInput}
          multiline
          numberOfLines={6}
          placeholder="Escreva seu pedido de oração aqui..."
          placeholderTextColor={AppColors.textSecondary}
          value={motivo}
          onChangeText={setMotivo}
          textAlignVertical="top"
        />

        <TouchableOpacity style={styles.button} onPress={handleSubmit} activeOpacity={0.8}>
          <Text style={styles.buttonText}>ENVIAR</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  content: {
    padding: scale(16),
    flexGrow: 1,
  },
  label: {
    fontSize: scale(14),
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: scale(8),
  },
  textInput: {
    backgroundColor: AppColors.surface,
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: AppColors.border,
    padding: scale(12),
    fontSize: scale(14),
    color: AppColors.text,
    minHeight: scale(140),
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: AppColors.primaryDark,
    borderRadius: scale(10),
    paddingVertical: scale(12),
    alignItems: 'center',
    marginTop: scale(20),
  },
  buttonText: {
    color: AppColors.textLight,
    fontSize: scale(14),
    fontWeight: '700',
    letterSpacing: 1,
  },
});
