import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';
import { isAdmin } from '@/src/services/admin';
import { fetchNews, addNews, updateNews, deleteNews, NewsItem } from '@/src/services/firestore';
import Toast from '@/components/Toast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 20;
const CARD_GAP = 12;
const CARD_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - CARD_GAP * 2) / 3;

interface FeatureItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const features: FeatureItem[] = [
  { label: 'Bíblia', icon: 'book-outline', route: '/(main)/bible' },
  { label: 'Sermões', icon: 'mic-outline', route: '/(main)/sermons' },
  { label: 'Anotações', icon: 'document-text-outline', route: '/(main)/notes' },
  { label: 'Oração', icon: 'heart-outline', route: '/(main)/prayers' },
  { label: 'Doações', icon: 'gift-outline', route: '/(main)/donations' },
  { label: 'Documentos', icon: 'folder-open-outline', route: '/(main)/documents' },
  { label: 'Agenda', icon: 'calendar-outline', route: '/(main)/agenda' },
  { label: 'Grupos', icon: 'people-outline', route: '/(main)/groups' },
  { label: 'Liderança', icon: 'shield-outline', route: '/(main)/leadership' },
];

export default function HomeScreen() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'warning' });

  function showToast(message: string, type: 'success' | 'error' | 'warning' = 'success') {
    setToast({ visible: true, message, type });
  }

  const loadNews = useCallback(async () => {
    try {
      const data = await fetchNews();
      setNews(data);
    } catch {
      // silently fail, show empty
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setAdmin(isAdmin());
    loadNews();
  }, [loadNews]);

  function openNewNews() {
    setEditingNews(null);
    setFormTitle('');
    setFormBody('');
    setShowForm(true);
  }

  function openEditNews(item: NewsItem) {
    setEditingNews(item);
    setFormTitle(item.title);
    setFormBody(item.body);
    setShowForm(true);
  }

  async function handleSaveNews() {
    if (!formTitle.trim()) {
      showToast('Digite um título.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const today = new Date();
      const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

      if (editingNews) {
        await updateNews(editingNews.id, { title: formTitle.trim(), body: formBody.trim() });
        showToast('Notícia atualizada!');
      } else {
        await addNews({ title: formTitle.trim(), body: formBody.trim(), date: dateStr });
        showToast('Notícia publicada!');
      }
      setShowForm(false);
      loadNews();
    } catch {
      showToast('Erro ao salvar.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteNews(id: string) {
    try {
      await deleteNews(id);
      setShowDeleteConfirm(null);
      showToast('Notícia excluída.');
      loadNews();
    } catch {
      showToast('Erro ao excluir.', 'error');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast(p => ({ ...p, visible: false }))} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.push('/(main)/profile')}
          activeOpacity={0.7}
        >
          <Ionicons name="menu" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Image
          source={require('../../assets/images_igreja/logo_igreja.jpg')}
          style={styles.headerLogo}
          resizeMode="contain"
        />

        <TouchableOpacity style={styles.headerButton} activeOpacity={0.7}>
          <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadNews(); }} />
        }
      >
        <View style={styles.logoSection}>
          <Image
            source={require('../../assets/images_igreja/logo_igreja.jpg')}
            style={styles.centerLogo}
            resizeMode="contain"
          />
          <Text style={styles.churchName}>IGREJA{'\n'}PRESBITERIANA{'\n'}DE ALDEIA</Text>
        </View>

        <View style={styles.grid}>
          {features.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.iconCircle}>
                <Ionicons name={item.icon} size={26} color={AppColors.primaryDark} />
              </View>
              <Text style={styles.cardLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.newsSection}>
          <View style={styles.newsSectionHeader}>
            <Text style={styles.sectionTitle}>Notícias</Text>
            {admin && (
              <TouchableOpacity onPress={openNewNews} activeOpacity={0.7}>
                <Ionicons name="add-circle" size={26} color={AppColors.primaryDark} />
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <ActivityIndicator color={AppColors.primaryDark} style={{ marginTop: 20 }} />
          ) : news.length === 0 ? (
            <View style={styles.emptyNews}>
              <Ionicons name="newspaper-outline" size={36} color="#c5c0b8" />
              <Text style={styles.emptyNewsText}>Nenhuma notícia por enquanto</Text>
            </View>
          ) : (
            news.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.newsCard}
                activeOpacity={admin ? 0.7 : 1}
                onPress={() => admin && openEditNews(item)}
              >
                <View style={styles.newsImagePlaceholder}>
                  <Ionicons name="megaphone-outline" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.newsContent}>
                  <Text style={styles.newsTitle} numberOfLines={2}>{item.title}</Text>
                  {item.body ? <Text style={styles.newsBody} numberOfLines={2}>{item.body}</Text> : null}
                  <Text style={styles.newsDate}>{item.date}</Text>
                </View>
                {admin && (
                  <TouchableOpacity onPress={() => setShowDeleteConfirm(item.id)} style={styles.newsDeleteBtn}>
                    <Ionicons name="trash-outline" size={16} color="#c0392b" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* News Form Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingNews ? 'Editar Notícia' : 'Nova Notícia'}</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Ionicons name="close" size={24} color={AppColors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>Título</Text>
              <TextInput
                style={styles.fieldInput}
                value={formTitle}
                onChangeText={setFormTitle}
                placeholder="Título da notícia"
                placeholderTextColor="#a0a090"
              />

              <Text style={styles.fieldLabel}>Descrição (opcional)</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldMultiline]}
                value={formBody}
                onChangeText={setFormBody}
                placeholder="Mais detalhes..."
                placeholderTextColor="#a0a090"
                multiline
                textAlignVertical="top"
              />

              <TouchableOpacity style={styles.saveButton} onPress={handleSaveNews} disabled={saving} activeOpacity={0.8}>
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>PUBLICAR</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Confirm */}
      <Modal visible={showDeleteConfirm !== null} animationType="fade" transparent>
        <TouchableOpacity style={styles.confirmOverlay} activeOpacity={1} onPress={() => setShowDeleteConfirm(null)}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>Excluir notícia?</Text>
            <Text style={styles.confirmDesc}>Esta ação não pode ser desfeita.</Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowDeleteConfirm(null)} activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => showDeleteConfirm && handleDeleteNews(showDeleteConfirm)} activeOpacity={0.7}>
                <Text style={styles.deleteBtnText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppColors.headerBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AppColors.headerBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#E8E4DD',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: GRID_PADDING,
    gap: 12,
  },
  centerLogo: {
    width: 56,
    height: 56,
    borderRadius: 8,
    opacity: 0.6,
  },
  churchName: {
    fontSize: 14,
    fontWeight: '700',
    color: AppColors.primaryDark,
    letterSpacing: 1,
    lineHeight: 18,
    opacity: 0.6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GRID_PADDING,
    gap: CARD_GAP,
  },
  card: {
    width: CARD_SIZE,
    aspectRatio: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(60, 74, 62, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.primaryDark,
    textAlign: 'center',
  },
  newsSection: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 20,
  },
  newsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.text,
  },
  emptyNews: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyNewsText: {
    fontSize: 14,
    color: '#8a8a7a',
  },
  newsCard: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 14,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 10,
  },
  newsImagePlaceholder: {
    width: 70,
    height: 70,
    backgroundColor: AppColors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    margin: 8,
  },
  newsContent: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  newsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: 2,
  },
  newsBody: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginBottom: 2,
  },
  newsDate: {
    fontSize: 11,
    color: '#b0b0a0',
  },
  newsDeleteBtn: {
    padding: 10,
    alignSelf: 'flex-start',
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
  fieldMultiline: {
    minHeight: 80,
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
