import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';
import { useThemeColors, useSettings } from '@/src/contexts/SettingsContext';
import { auth } from '@/src/services/firebase';
import { fetchPrayers, addPrayer, togglePrayed, deletePrayer, PrayerItem } from '@/src/services/firestore';
import Toast from '@/components/Toast';

export default function PrayersScreen() {
  const colors = useThemeColors();
  const { fontSize } = useSettings();
  const [prayers, setPrayers] = useState<PrayerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'warning' });

  const userId = auth.currentUser?.uid || '';
  const userName = auth.currentUser?.displayName || 'Anônimo';

  function showToast(message: string, type: 'success' | 'error' | 'warning' = 'success') {
    setToast({ visible: true, message, type });
  }

  const loadPrayers = useCallback(async () => {
    try {
      const data = await fetchPrayers();
      setPrayers(data);
    } catch {
      showToast('Erro ao carregar pedidos.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadPrayers(); }, [loadPrayers]);

  async function handleSubmit() {
    if (!text.trim()) {
      showToast('Escreva seu pedido de oração.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await addPrayer({ text: text.trim(), authorName: userName, authorId: userId });
      setText('');
      setShowForm(false);
      showToast('Pedido publicado!');
      loadPrayers();
    } catch {
      showToast('Erro ao publicar. Tente novamente.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handlePray(item: PrayerItem) {
    try {
      const newList = await togglePrayed(item.id, userId, item.prayedBy);
      setPrayers(prev => prev.map(p => p.id === item.id ? { ...p, prayedBy: newList } : p));
    } catch {
      showToast('Erro ao registrar oração.', 'error');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deletePrayer(id);
      setShowDeleteConfirm(null);
      showToast('Pedido removido.');
      loadPrayers();
    } catch {
      showToast('Erro ao excluir.', 'error');
    }
  }

  function timeAgo(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }

  const renderItem = ({ item }: { item: PrayerItem }) => {
    const hasPrayed = item.prayedBy.includes(userId);
    const isOwner = item.authorId === userId;
    const prayCount = item.prayedBy.length;

    return (
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.cardHeader}>
          <View style={styles.authorRow}>
            <View style={[styles.avatarSmall, { backgroundColor: colors.border }]}>
              <Ionicons name="person" size={14} color={colors.textSecondary} />
            </View>
            <Text style={[styles.authorName, { color: colors.text }]}>{item.authorName}</Text>
            <Text style={[styles.timeAgo, { color: colors.textSecondary }]}>{timeAgo(item.createdAt)}</Text>
          </View>
          {isOwner && (
            <TouchableOpacity onPress={() => setShowDeleteConfirm(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="trash-outline" size={16} color="#c0392b" />
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.prayerText, { color: colors.text, fontSize }]}>{item.text}</Text>

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={[styles.prayButton, hasPrayed && styles.prayButtonActive]}
            onPress={() => handlePray(item)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={hasPrayed ? 'heart' : 'heart-outline'}
              size={18}
              color={hasPrayed ? '#FFFFFF' : AppColors.primaryDark}
            />
            <Text style={[styles.prayButtonText, hasPrayed && styles.prayButtonTextActive]}>
              {hasPrayed ? 'Orando' : 'Orar'}
            </Text>
          </TouchableOpacity>
          {prayCount > 0 && (
            <Text style={[styles.prayCount, { color: colors.textSecondary }]}>
              {prayCount} {prayCount === 1 ? 'pessoa orando' : 'pessoas orando'}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast(p => ({ ...p, visible: false }))} />

      {loading ? (
        <ActivityIndicator color={AppColors.primaryDark} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={prayers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPrayers(); }} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="heart-outline" size={48} color="#c5c0b8" />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhum pedido ainda</Text>
              <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                Seja o primeiro a compartilhar um pedido de oração
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowForm(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* New Prayer Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Pedido de Oração</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>SEU PEDIDO</Text>
              <TextInput
                style={[styles.fieldInput, { borderBottomColor: colors.border, color: colors.text, fontSize }]}
                multiline
                numberOfLines={6}
                placeholder="Compartilhe seu pedido de oração..."
                placeholderTextColor={colors.textSecondary}
                value={text}
                onChangeText={setText}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>PUBLICAR</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirm */}
      <Modal visible={showDeleteConfirm !== null} animationType="fade" transparent>
        <TouchableOpacity style={styles.confirmOverlay} activeOpacity={1} onPress={() => setShowDeleteConfirm(null)}>
          <View style={[styles.confirmModal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.confirmTitle, { color: colors.text }]}>Excluir pedido?</Text>
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
  listContent: {
    padding: 20,
    paddingBottom: 80,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorName: {
    fontSize: 13,
    fontWeight: '600',
  },
  timeAgo: {
    fontSize: 12,
  },
  prayerText: {
    lineHeight: 22,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  prayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AppColors.primaryDark,
  },
  prayButtonActive: {
    backgroundColor: AppColors.primaryDark,
    borderColor: AppColors.primaryDark,
  },
  prayButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.primaryDark,
  },
  prayButtonTextActive: {
    color: '#FFFFFF',
  },
  prayCount: {
    fontSize: 12,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalContent: {
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
    minHeight: 120,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: AppColors.primaryDark,
    borderRadius: 25,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
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
