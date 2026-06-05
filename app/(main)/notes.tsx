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
        placeholderTextColor="#a0a090"
      />

      <View style={styles.divider} />

      <Text style={styles.label}>Texto:</Text>
      <TextInput
        style={styles.input}
        value={texto}
        onChangeText={setTexto}
        placeholder="Referência bíblica"
        placeholderTextColor="#a0a090"
      />

      <View style={styles.divider} />

      <Text style={styles.label}>Palavras importantes:</Text>
      <TextInput
        style={[styles.input, styles.multilineInput]}
        value={palavras}
        onChangeText={setPalavras}
        placeholder="Palavras-chave do sermão"
        placeholderTextColor="#a0a090"
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
        placeholderTextColor="#a0a090"
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
    backgroundColor: '#E8E4DD',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4a4a40',
    marginBottom: 8,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#c5c0b8',
    paddingVertical: 8,
    fontSize: 14,
    color: '#4a4a40',
  },
  multilineInput: {
    minHeight: 80,
    borderBottomWidth: 1,
    borderBottomColor: '#c5c0b8',
  },
  divider: {
    height: 16,
  },
  saveButton: {
    backgroundColor: AppColors.primaryDark,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
