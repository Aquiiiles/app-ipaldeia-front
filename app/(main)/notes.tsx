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
import { scale } from '@/constants/responsive';

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
    paddingHorizontal: scale(16),
    paddingTop: scale(18),
    paddingBottom: scale(32),
  },
  label: {
    fontSize: scale(14),
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: scale(6),
  },
  input: {
    backgroundColor: AppColors.surface,
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: AppColors.border,
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
    fontSize: scale(14),
    color: AppColors.text,
  },
  multilineInput: {
    minHeight: scale(100),
    paddingTop: scale(10),
  },
  divider: {
    height: 1,
    backgroundColor: AppColors.border,
    marginVertical: scale(14),
  },
  saveButton: {
    backgroundColor: AppColors.primaryDark,
    paddingVertical: scale(12),
    borderRadius: scale(10),
    alignItems: 'center',
    marginTop: scale(20),
  },
  saveButtonText: {
    color: AppColors.textLight,
    fontSize: scale(14),
    fontWeight: '700',
    letterSpacing: 1,
  },
});
