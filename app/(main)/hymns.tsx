import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';
import { useThemeColors, useSettings } from '@/src/contexts/SettingsContext';
import { HINARIO_PRESBITERIANO, Hymn } from '@/constants/hymns';

type HymnBook = 'hinario' | 'salterio';

const SALTERIO_URL = 'https://appsalterioreformado.com.br/';

export default function HymnsScreen() {
  const colors = useThemeColors();
  const { fontSize } = useSettings();
  const [activeBook, setActiveBook] = useState<HymnBook>('hinario');
  const [search, setSearch] = useState('');
  const [selectedHymn, setSelectedHymn] = useState<Hymn | null>(null);

  const filtered = HINARIO_PRESBITERIANO.filter(h => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return h.title.toLowerCase().includes(q) || h.number.toString().includes(q);
  });

  const renderItem = ({ item }: { item: Hymn }) => (
    <TouchableOpacity
      style={[styles.hymnRow, { backgroundColor: colors.card }]}
      onPress={() => setSelectedHymn(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.numberBadge, { backgroundColor: '#5B7F5E' }]}>
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
      <View style={[styles.bookTabs, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity
          style={[styles.bookTab, activeBook === 'hinario' && styles.bookTabActive]}
          onPress={() => setActiveBook('hinario')}
          activeOpacity={0.7}
        >
          <Ionicons name="musical-notes" size={16} color={activeBook === 'hinario' ? '#FFFFFF' : 'rgba(255,255,255,0.5)'} />
          <Text style={[styles.bookTabText, activeBook === 'hinario' && styles.bookTabTextActive]}>
            Hinário Presbiteriano
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bookTab, activeBook === 'salterio' && styles.bookTabActive]}
          onPress={() => setActiveBook('salterio')}
          activeOpacity={0.7}
        >
          <Ionicons name="book" size={16} color={activeBook === 'salterio' ? '#FFFFFF' : 'rgba(255,255,255,0.5)'} />
          <Text style={[styles.bookTabText, activeBook === 'salterio' && styles.bookTabTextActive]}>
            Saltério Reformado
          </Text>
        </TouchableOpacity>
      </View>

      {activeBook === 'hinario' ? (
        <>
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
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.number.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="musical-notes-outline" size={48} color="#c5c0b8" />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {search ? 'Nenhum hino encontrado' : 'Hinos em breve'}
                </Text>
                <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                  {search
                    ? 'Tente buscar por outro número ou título'
                    : 'Os hinos do Hinário Presbiteriano serão disponibilizados aqui.'}
                </Text>
              </View>
            }
          />
        </>
      ) : (
        <View style={styles.salterioContainer}>
          <View style={[styles.salterioCard, { backgroundColor: colors.card }]}>
            <View style={[styles.salterioIcon, { backgroundColor: '#6B8E9B' }]}>
              <Ionicons name="book" size={32} color="#FFFFFF" />
            </View>
            <Text style={[styles.salterioTitle, { color: colors.text }]}>Saltério Reformado</Text>
            <Text style={[styles.salterioDesc, { color: colors.textSecondary, fontSize }]}>
              O Saltério Reformado tem um aplicativo próprio, feito com muito carinho por nossos
              irmãos. Acesse lá o conteúdo completo dos salmos cantados.
            </Text>
            <TouchableOpacity
              style={styles.salterioButton}
              onPress={() => Linking.openURL(SALTERIO_URL)}
              activeOpacity={0.85}
            >
              <Ionicons name="open-outline" size={18} color="#FFFFFF" />
              <Text style={styles.salterioButtonText}>Abrir o app do Saltério</Text>
            </TouchableOpacity>
            <Text style={[styles.salterioUrl, { color: colors.textSecondary }]}>appsalterioreformado.com.br</Text>
          </View>
        </View>
      )}

      {/* Hymn Detail Modal */}
      <Modal visible={selectedHymn !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            {selectedHymn && (
              <>
                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <View style={styles.modalHeaderLeft}>
                    <View style={[styles.numberBadgeLg, { backgroundColor: '#5B7F5E' }]}>
                      <Text style={styles.numberTextLg}>{selectedHymn.number}</Text>
                    </View>
                    <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={2}>
                      {selectedHymn.title}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedHymn(null)}>
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={styles.lyricsContent} showsVerticalScrollIndicator={false}>
                  <Text style={[styles.lyricsText, { color: colors.text, fontSize }]}>
                    {selectedHymn.lyrics}
                  </Text>
                </ScrollView>
              </>
            )}
          </View>
        </View>
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
  salterioContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  salterioCard: {
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
  },
  salterioIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  salterioTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
  },
  salterioDesc: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  salterioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#6B8E9B',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  salterioButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  salterioUrl: {
    fontSize: 12,
    marginTop: 14,
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
  lyricsContent: {
    padding: 24,
    paddingBottom: 40,
  },
  lyricsText: {
    lineHeight: 28,
  },
});
