import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';
import { useThemeColors, useSettings } from '@/src/contexts/SettingsContext';
import { BIBLE_BOOKS, BIBLE_VERSIONS, BibleVersion } from '@/constants/bibleBooks';

type BibleBookData = {
  abbrev: string;
  name: string;
  chapters: string[][];
};

const bibleCache: Record<string, BibleBookData[]> = {};

function loadBibleData(version: BibleVersion): BibleBookData[] {
  if (!bibleCache[version]) {
    switch (version) {
      case 'ARA':
        bibleCache[version] = require('../../assets/bible/ARA.json');
        break;
      case 'NVI':
        bibleCache[version] = require('../../assets/bible/NVI.json');
        break;
      case 'NAA':
        bibleCache[version] = require('../../assets/bible/NAA.json');
        break;
    }
  }
  return bibleCache[version];
}

export default function BibleScreen() {
  const colors = useThemeColors();
  const { fontSize } = useSettings();
  const [version, setVersion] = useState<BibleVersion>('ARA');
  const [bookIndex, setBookIndex] = useState(0);
  const [chapter, setChapter] = useState(0);
  const [verses, setVerses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [showChapterPicker, setShowChapterPicker] = useState(false);
  const [showVersionPicker, setShowVersionPicker] = useState(false);

  const currentBook = BIBLE_BOOKS[bookIndex];

  const loadChapter = useCallback((ver: BibleVersion, bIdx: number, ch: number) => {
    setLoading(true);
    setTimeout(() => {
      const data = loadBibleData(ver);
      const bookData = data[bIdx];
      if (bookData && bookData.chapters[ch]) {
        setVerses(bookData.chapters[ch]);
      }
      setLoading(false);
    }, 50);
  }, []);

  useEffect(() => {
    loadChapter(version, bookIndex, chapter);
  }, [version, bookIndex, chapter, loadChapter]);

  const selectBook = (index: number) => {
    setBookIndex(index);
    setChapter(0);
    setShowBookPicker(false);
  };

  const selectChapter = (ch: number) => {
    setChapter(ch);
    setShowChapterPicker(false);
  };

  const selectVersion = (ver: BibleVersion) => {
    setVersion(ver);
    setShowVersionPicker(false);
  };

  const goToPrevChapter = () => {
    if (chapter > 0) {
      setChapter(chapter - 1);
    } else if (bookIndex > 0) {
      const prevBook = bookIndex - 1;
      setBookIndex(prevBook);
      setChapter(BIBLE_BOOKS[prevBook].chapters - 1);
    }
  };

  const goToNextChapter = () => {
    if (chapter < currentBook.chapters - 1) {
      setChapter(chapter + 1);
    } else if (bookIndex < BIBLE_BOOKS.length - 1) {
      setBookIndex(bookIndex + 1);
      setChapter(0);
    }
  };

  const hasPrev = bookIndex > 0 || chapter > 0;
  const hasNext = bookIndex < BIBLE_BOOKS.length - 1 || chapter < currentBook.chapters - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.selectorRow}>
        <TouchableOpacity
          style={[styles.selectorButton, { backgroundColor: colors.primaryDark }]}
          onPress={() => setShowBookPicker(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.selectorText}>{currentBook.name}</Text>
          <Ionicons name="chevron-down" size={14} color={AppColors.textLight} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.selectorButton, { backgroundColor: colors.primaryDark }]}
          onPress={() => setShowChapterPicker(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.selectorText}>Cap {chapter + 1}</Text>
          <Ionicons name="chevron-down" size={14} color={AppColors.textLight} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={[styles.versionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowVersionPicker(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.versionText, { color: colors.primaryDark }]}>{version}</Text>
          <Ionicons name="chevron-down" size={12} color={colors.primaryDark} style={{ marginLeft: 3 }} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryDark} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {verses.map((verse, index) => (
            <Text key={index} style={[styles.verseText, { color: colors.text, fontSize, lineHeight: fontSize * 1.6 }]}>
              <Text style={[styles.verseNumber, { color: colors.primaryDark }]}>{index + 1} </Text>
              {verse}
            </Text>
          ))}
        </ScrollView>
      )}

      <View style={[styles.navBar, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.navButton, !hasPrev && styles.navButtonDisabled]}
          onPress={goToPrevChapter}
          disabled={!hasPrev}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={hasPrev ? colors.primaryDark : colors.border} />
          <Text style={[styles.navButtonText, { color: colors.primaryDark }, !hasPrev && { color: colors.border }]}>Anterior</Text>
        </TouchableOpacity>
        <Text style={[styles.navInfo, { color: colors.textSecondary }]}>{currentBook.name} {chapter + 1}</Text>
        <TouchableOpacity
          style={[styles.navButton, !hasNext && styles.navButtonDisabled]}
          onPress={goToNextChapter}
          disabled={!hasNext}
          activeOpacity={0.7}
        >
          <Text style={[styles.navButtonText, { color: colors.primaryDark }, !hasNext && { color: colors.border }]}>Próximo</Text>
          <Ionicons name="chevron-forward" size={20} color={hasNext ? colors.primaryDark : colors.border} />
        </TouchableOpacity>
      </View>

      {/* Book Picker Modal */}
      <Modal visible={showBookPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Selecionar Livro</Text>
              <TouchableOpacity onPress={() => setShowBookPicker(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={BIBLE_BOOKS}
              keyExtractor={(item) => item.abbrev}
              ListHeaderComponent={<Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Antigo Testamento</Text>}
              renderItem={({ item, index }) => (
                <>
                  {index === 39 && <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Novo Testamento</Text>}
                  <TouchableOpacity
                    style={[styles.bookItem, index === bookIndex && styles.bookItemActive]}
                    onPress={() => selectBook(index)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.bookItemText, { color: colors.text }, index === bookIndex && styles.bookItemTextActive]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.bookItemChapters, { color: colors.textSecondary }, index === bookIndex && styles.bookItemTextActive]}>
                      {item.chapters} cap.
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Chapter Picker Modal */}
      <Modal visible={showChapterPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{currentBook.name}</Text>
              <TouchableOpacity onPress={() => setShowChapterPicker(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={Array.from({ length: currentBook.chapters }, (_, i) => i)}
              keyExtractor={(item) => String(item)}
              numColumns={5}
              columnWrapperStyle={styles.chapterRow}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.chapterItem, { backgroundColor: colors.card }, item === chapter && styles.chapterItemActive]}
                  onPress={() => selectChapter(item)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chapterItemText, { color: colors.text }, item === chapter && styles.chapterItemTextActive]}>
                    {item + 1}
                  </Text>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 16 }}
            />
          </View>
        </View>
      </Modal>

      {/* Version Picker Modal */}
      <Modal visible={showVersionPicker} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowVersionPicker(false)}
        >
          <View style={[styles.versionModal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.versionModalTitle, { color: colors.text }]}>Versão da Bíblia</Text>
            {BIBLE_VERSIONS.map((v) => (
              <TouchableOpacity
                key={v.key}
                style={[styles.versionItem, v.key === version && styles.versionItemActive]}
                onPress={() => selectVersion(v.key)}
                activeOpacity={0.7}
              >
                <View>
                  <Text style={[styles.versionItemLabel, { color: colors.text }, v.key === version && styles.versionItemLabelActive]}>
                    {v.label}
                  </Text>
                  <Text style={[styles.versionItemDesc, { color: colors.textSecondary }, v.key === version && styles.versionItemDescActive]}>
                    {v.description}
                  </Text>
                </View>
                {v.key === version && (
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            ))}
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
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.primaryDark,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  selectorText: {
    color: AppColors.textLight,
    fontSize: 13,
    fontWeight: '600',
  },
  versionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.cardBackground,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.primaryDark,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  verseText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#2C2C2C',
    marginBottom: 4,
  },
  verseNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.primaryDark,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#D4CFC8',
    backgroundColor: '#E8E4DD',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.primaryDark,
  },
  navButtonTextDisabled: {
    color: AppColors.border,
  },
  navInfo: {
    fontSize: 12,
    color: AppColors.textSecondary,
    fontWeight: '500',
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
    maxHeight: '75%',
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
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },
  bookItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  bookItemActive: {
    backgroundColor: AppColors.primaryDark,
    marginHorizontal: 8,
    borderRadius: 10,
    paddingHorizontal: 16,
  },
  bookItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: AppColors.text,
  },
  bookItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  bookItemChapters: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  chapterRow: {
    justifyContent: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  chapterItem: {
    width: 56,
    height: 48,
    borderRadius: 10,
    backgroundColor: AppColors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterItemActive: {
    backgroundColor: AppColors.primaryDark,
  },
  chapterItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
  },
  chapterItemTextActive: {
    color: '#FFFFFF',
  },
  versionModal: {
    backgroundColor: '#F5F0EB',
    marginHorizontal: 24,
    marginBottom: 100,
    marginTop: 'auto',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  versionModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 14,
  },
  versionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 6,
  },
  versionItemActive: {
    backgroundColor: AppColors.primaryDark,
  },
  versionItemLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.text,
  },
  versionItemLabelActive: {
    color: '#FFFFFF',
  },
  versionItemDesc: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginTop: 1,
  },
  versionItemDescActive: {
    color: 'rgba(255,255,255,0.7)',
  },
});
