import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';
import { useThemeColors, useSettings } from '@/src/contexts/SettingsContext';
import { isAdmin } from '@/src/services/admin';
import { subscribeHymns, addHymn, deleteHymn, HymnItem } from '@/src/services/firestore';
import Toast from '@/components/Toast';

type HymnBook = 'hinario' | 'salterio';

export default function HymnsScreen() {
  const colors = useThemeColors();
  const { fontSize } = useSettings();
  const [activeBook, setActiveBook] = useState<HymnBook>('hinario');
  const [hymns, setHymns] = useState<HymnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [admin, setAdmin] = useState(false);
  const [selectedHymn, setSelectedHymn] = useState<HymnItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formNumber, setFormNumber] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formLyrics, setFormLyrics] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'warning' });

  function showToast(message: string, type: 'success' | 'error' | 'warning' = 'success') {
    setToast({ visible: true, message, type });
  }

  useEffect(() => {
    setAdmin(isAdmin());
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeHymns(activeBook, (data) => {
      setHymns(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [activeBook]);

  const filtered = hymns.filter(h => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      h.title.toLowerCase().includes(q) ||
      h.number.toString().includes(q)
    );
  });

  async function handleSave() {
    if (!formNumber.trim() || !formTitle.trim()) {
      showToast('Preencha número e título.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await addHymn({
        number: parseInt(formNumber, 10) || 0,
        title: formTitle.trim(),
        lyrics: formLyrics.trim(),
        book: activeBook,
      });
      setShowForm(false);
      setFormNumber('');
      setFormTitle('');
      setFormLyrics('');
      showToast('Hino adicionado!');
    } catch {
      showToast('Erro ao salvar.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteHymn(id);
      setShowDeleteConfirm(null);
      setSelectedHymn(null);
      showToast('Hino removido.');
    } catch {
      showToast('Erro ao excluir.', 'error');
    }
  }

  const renderItem = ({ item }: { item: HymnItem }) => (
    <TouchableOpacity
      style={[styles.hymnRow, { backgroundColor: colors.card }]}
      onPress={() => setSelectedHymn(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.numberBadge, { backgroundColor: activeBook === 'hinario' ? '#5B7F5E' : '#6B8E9B' }]}>
        <Text style={styles.numberText}>{item.number}</Text>
      </View>
      <Text style={[styles.hymnTitle, { color: colors.text, fontSize: fontSize - 1 }]} numberOfLines={2}>
        {item.title}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast(p => ({ ...p, visible: false }))} />

      <View style={[styles.bookTabs, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity
          style={[styles.bookTab, activeBook === 'hinario' && styles.bookTabActive]}
          onPress={() => { setActiveBook('hinario'); setSearch(''); }}
          activeOpacity={0.7}
        >
          <Ionicons name="musical-notes" size={16} color={activeBook === 'hinario' ? '#FFFFFF' : 'rgba(255,255,255,0.5)'} />
          <Text style={[styles.bookTabText, activeBook === 'hinario' && styles.bookTabTextActive]}>
            Hinário Presbiteriano
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bookTab, activeBook === 'salterio' && styles.bookTabActive]}
          onPress={() => { setActiveBook('salterio'); setSearch(''); }}
          activeOpacity={0.7}
        >
          <Ionicons name="book" size={16} color={activeBook === 'salterio' ? '#FFFFFF' : 'rgba(255,255,255,0.5)'} />
          <Text style={[styles.bookTabText, activeBook === 'salterio' && styles.bookTabTextActive]}>
            Saltério Reformado
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: colors.card }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar por número ou título..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        {admin && (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: activeBook === 'hinario' ? '#5B7F5E' : '#6B8E9B' }]}
            onPress={() => setShowForm(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={AppColors.primaryDark} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="musical-notes-outline" size={48} color="#c5c0b8" />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {search ? 'Nenhum hino encontrado' : 'Nenhum hino cadastrado'}
              </Text>
              <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                {search ? 'Tente buscar por outro número ou título' : admin ? 'Toque no + para adicionar hinos' : 'Os hinos serão adicionados em breve'}
              </Text>
            </View>
          }
        />
      )}

      {/* Hymn Detail Modal */}
      <Modal visible={selectedHymn !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            {selectedHymn && (
              <>
                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <View style={styles.modalHeaderLeft}>
                    <View style={[styles.numberBadgeLg, { backgroundColor: activeBook === 'hinario' ? '#5B7F5E' : '#6B8E9B' }]}>
                      <Text style={styles.numberTextLg}>{selectedHymn.number}</Text>
                    </View>
                    <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={2}>
                      {selectedHymn.title}
                    </Text>
                  </View>
                  <View style={styles.modalHeaderRight}>
                    {admin && (
                      <TouchableOpacity onPress={() => setShowDeleteConfirm(selectedHymn.id)} style={styles.deleteIcon}>
                        <Ionicons name="trash-outline" size={20} color="#c0392b" />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => setSelectedHymn(null)}>
                      <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
                <ScrollView contentContainerStyle={styles.lyricsContent} showsVerticalScrollIndicator={false}>
                  {selectedHymn.lyrics ? (
                    <Text style={[styles.lyricsText, { color: colors.text, fontSize }]}>
                      {selectedHymn.lyrics}
                    </Text>
                  ) : (
                    <View style={styles.noLyrics}>
                      <Ionicons name="document-text-outline" size={36} color={colors.textSecondary} />
                      <Text style={[styles.noLyricsText, { color: colors.textSecondary }]}>
                        Letra ainda não disponível
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Hymn Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Adicionar {activeBook === 'hinario' ? 'Hino' : 'Salmo'}
              </Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>NÚMERO</Text>
              <TextInput
                style={[styles.fieldInput, { borderBottomColor: colors.border, color: colors.text }]}
                value={formNumber}
                onChangeText={setFormNumber}
                placeholder="Ex: 1"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>TÍTULO</Text>
              <TextInput
                style={[styles.fieldInput, { borderBottomColor: colors.border, color: colors.text }]}
                value={formTitle}
                onChangeText={setFormTitle}
                placeholder="Nome do hino"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>LETRA (OPCIONAL)</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldMultiline, { borderBottomColor: colors.border, color: colors.text }]}
                value={formLyrics}
                onChangeText={setFormLyrics}
                placeholder="Cole a letra do hino aqui..."
                placeholderTextColor={colors.textSecondary}
                multiline
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: activeBook === 'hinario' ? '#5B7F5E' : '#6B8E9B' }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>SALVAR</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Confirm */}
      <Modal visible={showDeleteConfirm !== null} animationType="fade" transparent>
        <TouchableOpacity style={styles.confirmOverlay} activeOpacity={1} onPress={() => setShowDeleteConfirm(null)}>
          <View style={[styles.confirmModal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.confirmTitle, { color: colors.text }]}>Excluir hino?</Text>
            <Text style={[styles.confirmDesc, { color: colors.textSecondary }]}>Esta ação não pode ser desfeita.</Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setShowDeleteConfirm(null)} activeOpacity={0.7}>
                <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => showDeleteConfirm && handleDelete(showDeleteConfirm)} activeOpacity={0.7}>
                <Text style={styles.deleteBtnText}>Excluir</Text>
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
  },
  bookTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  bookTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  bookTabActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  bookTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  bookTabTextActive: {
    color: '#FFFFFF',
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: 44,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  hymnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  numberBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  hymnTitle: {
    flex: 1,
    fontWeight: '500',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  numberBadgeLg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberTextLg: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteIcon: {
    padding: 4,
  },
  lyricsContent: {
    padding: 24,
    paddingBottom: 40,
  },
  lyricsText: {
    lineHeight: 28,
  },
  noLyrics: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 12,
  },
  noLyricsText: {
    fontSize: 14,
  },
  formContent: {
    padding: 24,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  fieldInput: {
    borderBottomWidth: 1,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 20,
  },
  fieldMultiline: {
    minHeight: 120,
  },
  saveButton: {
    borderRadius: 25,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModal: {
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 320,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  confirmDesc: {
    fontSize: 14,
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 25,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: '#c0392b',
    borderRadius: 25,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
