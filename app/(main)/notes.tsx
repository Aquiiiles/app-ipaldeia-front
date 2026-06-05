import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { AppColors } from '@/constants/theme';

export default function NotesScreen() {
  const [pregador, setPregador] = useState('');
  const [texto, setTexto] = useState('');
  const [palavras, setPalavras] = useState('');
  const [aplicacoes, setAplicacoes] = useState('');

  const handleSave = () => {
    Alert.alert('Sucesso', 'Anotação salva com sucesso!');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.label}>Pregador:</Text>
      <TextInput
        style={styles.input}
        value={pregador}
        onChangeText={setPregador}
        placeholder="Nome do pregador"
        placeholderTextColor={AppColors.textSecondary}
      />

      <View style={styles.divider} />

      <Text style={styles.label}>Texto:</Text>
      <TextInput
        style={styles.input}
        value={texto}
        onChangeText={setTexto}
        placeholder="Referência bíblica"
        placeholderTextColor={AppColors.textSecondary}
      />

      <View style={styles.divider} />

      <Text style={styles.label}>Palavras importantes:</Text>
      <TextInput
        style={[styles.input, styles.multilineInput]}
        value={palavras}
        onChangeText={setPalavras}
        placeholder="Palavras-chave do sermão"
        placeholderTextColor={AppColors.textSecondary}
        multiline
        textAlignVertical="top"
      />

      <View style={styles.divider} />

      <Text style={styles.label}>Aplicações:</Text>
      <TextInput
        style={[styles.input, styles.multilineInput]}
        value={aplicacoes}
        onChangeText={setAplicacoes}
        placeholder="Como aplicar na sua vida"
        placeholderTextColor={AppColors.textSecondary}
        multiline
        textAlignVertical="top"
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
        <Text style={styles.saveButtonText}>SALVAR</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: AppColors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AppColors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: AppColors.text,
  },
  multilineInput: {
    minHeight: 120,
    paddingTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: AppColors.border,
    marginVertical: 18,
  },
  saveButton: {
    backgroundColor: AppColors.primaryDark,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 28,
  },
  saveButtonText: {
    color: AppColors.textLight,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
