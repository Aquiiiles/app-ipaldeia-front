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
import { useThemeColors, useSettings } from '@/src/contexts/SettingsContext';

export default function PrayersScreen() {
  const colors = useThemeColors();
  const { fontSize } = useSettings();
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
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.label, { color: colors.text }]}>Motivo:</Text>

        <TextInput
          style={[styles.textInput, { borderBottomColor: colors.border, color: colors.text, fontSize }]}
          multiline
          numberOfLines={8}
          placeholder="Escreva seu pedido de oração aqui..."
          placeholderTextColor={colors.textSecondary}
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
    backgroundColor: '#E8E4DD',
  },
  content: {
    padding: 24,
    flexGrow: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4a4a40',
    marginBottom: 12,
  },
  textInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#c5c0b8',
    paddingVertical: 8,
    fontSize: 14,
    color: '#4a4a40',
    minHeight: 160,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: AppColors.primaryDark,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
    alignSelf: 'flex-start',
    paddingHorizontal: 32,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
