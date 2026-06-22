import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';
import { useThemeColors, useSettings } from '@/src/contexts/SettingsContext';
import { auth } from '@/src/services/firebase';
import { subscribeNotes, addNote, updateNote, deleteNote, NoteItem } from '@/src/services/firestore';
import Toast from '@/components/Toast';

export default function NotesScreen() {
  const colors = useThemeColors();
  const { fontSize } = useSettings();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [pregador, setPregador] = useState('');
  const [texto, setTexto] = useState('');
  const [palavras, setPalavras] = useState('');
  const [aplicacoes, setAplicacoes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'warning' });

  const userId = auth.currentUser?.uid || '';

  function showToast(message: string, type: 'success' | 'error' | 'warning' = 'success') {
    setToast({ visible: true, message, type });
  }

  function hideToast() {
    setToast(prev => ({ ...prev, visible: false }));
  }

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeNotes(userId, setNotes);
    return unsubscribe;
  }, [userId]);

  function clearForm() {
    setPregador('');
    setTexto('');
    setPalavras('');
    setAplicacoes('');
    setEditingId(null);
  }

  function openNewNote() {
    clearForm();
    setShowForm(true);
  }

  function openEditNote(note: NoteItem) {
    setPregador(note.pregador);
    setTexto(note.texto);
    setPalavras(note.palavras);
    setAplicacoes(note.aplicacoes);
    setEditingId(note.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!pregador.trim() && !texto.trim() && !palavras.trim() && !aplicacoes.trim()) {
      showToast('Preencha pelo menos um campo.', 'warning');
      return;
    }
    if (!userId) {
      showToast('Faça login para salvar anotações.', 'warning');
      return;
    }

    try {
      const payload = {
        pregador: pregador.trim(),
        texto: texto.trim(),
        palavras: palavras.trim(),
        aplicacoes: aplicacoes.trim(),
      };
      if (editingId) {
        await updateNote(editingId, payload);
        showToast('Anotação atualizada!');
      } else {
        await addNote({ ...payload, authorId: userId });
        showToast('Anotação salva!');
      }
      setShowForm(false);
      clearForm();
    } catch {
      showToast('Erro ao salvar.', 'error');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteNote(id);
      setShowDeleteConfirm(null);
      showToast('Anotação excluída.');
    } catch {
      showToast('Erro ao excluir.', 'error');
    }
  }

  function formatDate(timestamp: number) {
    const d = new Date(timestamp);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />

      {!showForm ? (
        <>
          {notes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={56} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhuma anotação</Text>
              <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>Suas anotações de sermões ficarão salvas aqui.</Text>
            </View>
          ) : (
            <FlatList
              data={notes}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.noteCard, { backgroundColor: colors.surface }]} onPress={() => openEditNote(item)} activeOpacity={0.7}>
                  <View style={styles.noteCardHeader}>
                    <View style={styles.noteCardInfo}>
                      {item.pregador ? (
                        <Text style={[styles.noteCardPregador, { color: colors.primaryDark }]} numberOfLines={1}>{item.pregador}</Text>
                      ) : null}
                      {item.texto ? (
                        <Text style={[styles.noteCardTexto, { color: colors.textSecondary, fontSize: fontSize - 2 }]} numberOfLines={1}>{item.texto}</Text>
                      ) : null}
                    </View>
                    <TouchableOpacity onPress={() => setShowDeleteConfirm(item.id)} style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={18} color="#c0392b" />
                    </TouchableOpacity>
                  </View>
                  {item.palavras ? (
                    <Text style={[styles.noteCardPreview, { color: colors.textSecondary }]} numberOfLines={2}>{item.palavras}</Text>
                  ) : item.aplicacoes ? (
                    <Text style={[styles.noteCardPreview, { color: colors.textSecondary }]} numberOfLines={2}>{item.aplicacoes}</Text>
                  ) : null}
                  <Text style={[styles.noteCardDate, { color: colors.textSecondary }]}>{formatDate(item.createdAt)}</Text>
                </TouchableOpacity>
              )}
            />
          )}

          <TouchableOpacity style={styles.fab} onPress={openNewNote} activeOpacity={0.8}>
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </>
      ) : (
        <ScrollView
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formHeader}>
            <TouchableOpacity onPress={() => { setShowForm(false); clearForm(); }} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.formTitle, { color: colors.primaryDark }]}>{editingId ? 'Editar Anotação' : 'Nova Anotação'}</Text>
            <View style={{ width: 22 }} />
          </View>

          <Text style={[styles.label, { color: colors.text }]}>Pregador:</Text>
          <TextInput
            style={[styles.input, { borderBottomColor: colors.border, color: colors.text }]}
            value={pregador}
            onChangeText={setPregador}
            placeholder="Nome do pregador"
            placeholderTextColor={colors.textSecondary}
          />

          <View style={styles.divider} />

          <Text style={[styles.label, { color: colors.text }]}>Texto:</Text>
          <TextInput
            style={[styles.input, { borderBottomColor: colors.border, color: colors.text, fontSize }]}
            value={texto}
            onChangeText={setTexto}
            placeholder="Referência bíblica"
            placeholderTextColor={colors.textSecondary}
          />

          <View style={styles.divider} />

          <Text style={[styles.label, { color: colors.text }]}>Palavras importantes:</Text>
          <TextInput
            style={[styles.input, styles.multilineInput, { borderBottomColor: colors.border, color: colors.text }]}
            value={palavras}
            onChangeText={setPalavras}
            placeholder="Palavras-chave do sermão"
            placeholderTextColor={colors.textSecondary}
            multiline
            textAlignVertical="top"
          />

          <View style={styles.divider} />

          <Text style={[styles.label, { color: colors.text }]}>Aplicações:</Text>
          <TextInput
            style={[styles.input, styles.multilineInput, { borderBottomColor: colors.border, color: colors.text }]}
            value={aplicacoes}
            onChangeText={setAplicacoes}
            placeholder="Como aplicar na sua vida"
            placeholderTextColor={colors.textSecondary}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
            <Text style={styles.saveButtonText}>SALVAR</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Delete Confirm Modal */}
      <Modal visible={showDeleteConfirm !== null} animationType="fade" transparent>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDeleteConfirm(null)}>
          <View style={[styles.confirmModal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.confirmTitle, { color: colors.primaryDark }]}>Excluir anotação?</Text>
            <Text style={[styles.confirmDesc, { color: colors.textSecondary }]}>Esta ação não pode ser desfeita.</Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setShowDeleteConfirm(null)} activeOpacity={0.7}>
                <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteBtn}
                onPress={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmDeleteText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8E4DD',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4a4a40',
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#8a8a7a',
    textAlign: 'center',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
    gap: 12,
  },
  noteCard: {
    backgroundColor: '#F5F0EB',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  noteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  noteCardInfo: {
    flex: 1,
    marginRight: 12,
  },
  noteCardPregador: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3C4A3E',
    marginBottom: 2,
  },
  noteCardTexto: {
    fontSize: 13,
    color: '#6B6B6B',
  },
  deleteBtn: {
    padding: 4,
  },
  noteCardPreview: {
    fontSize: 13,
    color: '#8a8a7a',
    lineHeight: 18,
    marginBottom: 6,
  },
  noteCardDate: {
    fontSize: 11,
    color: '#b0b0a0',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AppColors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  formContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    padding: 4,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3C4A3E',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModal: {
    backgroundColor: '#F5F0EB',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3C4A3E',
    marginBottom: 8,
  },
  confirmDesc: {
    fontSize: 14,
    color: '#6B6B6B',
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#c5c0b8',
    borderRadius: 25,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a4a40',
  },
  confirmDeleteBtn: {
    flex: 1,
    backgroundColor: '#c0392b',
    borderRadius: 25,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDeleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
