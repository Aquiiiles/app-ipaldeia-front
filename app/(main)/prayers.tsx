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
          numberOfLines={8}
          placeholder="Escreva seu pedido de oração aqui..."
          placeholderTextColor={AppColors.textSecondary}
          value={motivo}
          onChangeText={setMotivo}
          textAlignVertical="top"
        />

        <View style={styles.divider} />

        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
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
    padding: 24,
    flexGrow: 1,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: AppColors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.border,
    padding: 16,
    fontSize: 16,
    color: AppColors.text,
    minHeight: 180,
    textAlignVertical: 'top',
  },
  divider: {
    height: 1,
    backgroundColor: AppColors.border,
    marginVertical: 24,
  },
  button: {
    backgroundColor: AppColors.primaryDark,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: AppColors.textLight,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
