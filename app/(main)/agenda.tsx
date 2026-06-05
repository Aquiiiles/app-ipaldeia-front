import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';
import { isAdmin } from '@/src/services/admin';
import { fetchEvents, addEvent, updateEvent, deleteEvent, EventItem } from '@/src/services/firestore';
import Toast from '@/components/Toast';

type TabKey = 'geral' | 'aniversariantes';

export default function AgendaScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('geral');
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formType, setFormType] = useState<'geral' | 'aniversariante'>('geral');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'warning' });

  function showToast(message: string, type: 'success' | 'error' | 'warning' = 'success') {
    setToast({ visible: true, message, type });
  }

  const loadEvents = useCallback(async () => {
    try {
      const data = await fetchEvents();
      setEvents(data);
    } catch {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setAdmin(isAdmin());
    loadEvents();
  }, [loadEvents]);

  const filteredEvents = events.filter(e =>
    activeTab === 'geral' ? e.type === 'geral' : e.type === 'aniversariante'
  );

  function openNewEvent() {
    setEditingEvent(null);
    setFormTitle('');
    setFormDate('');
    setFormType(activeTab === 'aniversariantes' ? 'aniversariante' : 'geral');
    setShowForm(true);
  }

  function openEditEvent(item: EventItem) {
    setEditingEvent(item);
    setFormTitle(item.title);
    setFormDate(item.date);
    setFormType(item.type);
    setShowForm(true);
  }

  async function handleSave() {
    if (!formTitle.trim() || !formDate.trim()) {
      showToast('Preencha título e data.', 'warning');
      return;
    }

    setSaving(true);
    try {
      if (editingEvent) {
        await updateEvent(editingEvent.id, { title: formTitle.trim(), date: formDate.trim(), type: formType });
        showToast('Evento atualizado!');
      } else {
        await addEvent({ title: formTitle.trim(), date: formDate.trim(), type: formType });
        showToast('Evento criado!');
      }
      setShowForm(false);
      loadEvents();
    } catch {
      showToast('Erro ao salvar.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteEvent(id);
      setShowDeleteConfirm(null);
      showToast('Evento excluído.');
      loadEvents();
    } catch {
      showToast('Erro ao excluir.', 'error');
    }
  }

  const renderItem = ({ item, index }: { item: EventItem; index: number }) => (
    <View>
      <TouchableOpacity
        style={styles.row}
        activeOpacity={admin ? 0.7 : 1}
        onPress={() => admin && openEditEvent(item)}
      >
        <Text style={styles.date}>{item.date}</Text>
        <Text style={styles.label}>{item.title}</Text>
        {admin && (
          <TouchableOpacity onPress={() => setShowDeleteConfirm(item.id)} style={styles.rowDeleteBtn}>
            <Ionicons name="trash-outline" size={16} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
      {index < filteredEvents.length - 1 && <View style={styles.divider} />}
    </View>
  );

  return (
    <View style={styles.container}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast(p => ({ ...p, visible: false }))} />

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'geral' && styles.tabActive]}
          onPress={() => setActiveTab('geral')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'geral' && styles.tabTextActive]}>Geral</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'aniversariantes' && styles.tabActive]}
          onPress={() => setActiveTab('aniversariantes')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'aniversariantes' && styles.tabTextActive]}>Aniversariantes</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        {admin && (
          <TouchableOpacity onPress={openNewEvent} activeOpacity={0.7}>
            <Ionicons name="add-circle" size={28} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : filteredEvents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color="rgba(255,255,255,0.3)" />
          <Text style={styles.emptyText}>
            {activeTab === 'geral' ? 'Nenhum evento na agenda' : 'Nenhum aniversariante cadastrado'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadEvents(); }} tintColor="#FFFFFF" />
          }
        />
      )}

      {/* Event Form Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingEvent ? 'Editar Evento' : 'Novo Evento'}</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Ionicons name="close" size={24} color={AppColors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <Text style={styles.fieldLabel}>Tipo</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[styles.typeBtn, formType === 'geral' && styles.typeBtnActive]}
                  onPress={() => setFormType('geral')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.typeBtnText, formType === 'geral' && styles.typeBtnTextActive]}>Geral</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, formType === 'aniversariante' && styles.typeBtnActive]}
                  onPress={() => setFormType('aniversariante')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.typeBtnText, formType === 'aniversariante' && styles.typeBtnTextActive]}>Aniversariante</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Data (ex: 27/11 ou 10/1)</Text>
              <TextInput
                style={styles.fieldInput}
                value={formDate}
                onChangeText={setFormDate}
                placeholder="DD/MM"
                placeholderTextColor="#a0a090"
              />

              <Text style={styles.fieldLabel}>{formType === 'aniversariante' ? 'Nome' : 'Título do evento'}</Text>
              <TextInput
                style={styles.fieldInput}
                value={formTitle}
                onChangeText={setFormTitle}
                placeholder={formType === 'aniversariante' ? 'Nome da pessoa' : 'Ex: ALMOÇO'}
                placeholderTextColor="#a0a090"
              />

              <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>SALVAR</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirm */}
      <Modal visible={showDeleteConfirm !== null} animationType="fade" transparent>
        <TouchableOpacity style={styles.confirmOverlay} activeOpacity={1} onPress={() => setShowDeleteConfirm(null)}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>Excluir evento?</Text>
            <Text style={styles.confirmDesc}>Esta ação não pode ser desfeita.</Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowDeleteConfirm(null)} activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDeleteBtn} onPress={() => showDeleteConfirm && handleDelete(showDeleteConfirm)} activeOpacity={0.7}>
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
    backgroundColor: AppColors.headerBg,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 10,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  tabActive: {
    backgroundColor: AppColors.accent,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  date: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    minWidth: 100,
  },
  label: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.5,
  },
  rowDeleteBtn: {
    padding: 8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#F5F0EB',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
  },
  modalContent: {
    padding: 24,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8a8a7a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  fieldInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#c5c0b8',
    paddingVertical: 10,
    fontSize: 15,
    color: '#4a4a40',
    marginBottom: 20,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  typeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#c5c0b8',
  },
  typeBtnActive: {
    backgroundColor: AppColors.primaryDark,
    borderColor: AppColors.primaryDark,
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4a4a40',
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: '#3C4A3E',
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
    backgroundColor: '#F5F0EB',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 320,
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
