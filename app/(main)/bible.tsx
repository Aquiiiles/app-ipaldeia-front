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
import { BIBLE_BOOKS } from '@/constants/bibleBooks';

type BibleBook = {
  abbrev: string;
  chapters: string[][];
};

let bibleDataCache: BibleBook[] | null = null;

function loadBibleData(): BibleBook[] {
  if (!bibleDataCache) {
    bibleDataCache = require('../../assets/bible/pt_aa.json');
  }
  return bibleDataCache!;
}

export default function BibleScreen() {
  const [bookIndex, setBookIndex] = useState(0);
  const [chapter, setChapter] = useState(0);
  const [verses, setVerses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [showChapterPicker, setShowChapterPicker] = useState(false);

  const currentBook = BIBLE_BOOKS[bookIndex];

  const loadChapter = useCallback((bIdx: number, ch: number) => {
    setLoading(true);
    setTimeout(() => {
      const data = loadBibleData();
      const bookData = data[bIdx];
      if (bookData && bookData.chapters[ch]) {
        setVerses(bookData.chapters[ch]);
      }
      setLoading(false);
    }, 50);
  }, []);

  useEffect(() => {
    loadChapter(bookIndex, chapter);
  }, [bookIndex, chapter, loadChapter]);

  const selectBook = (index: number) => {
    setBookIndex(index);
    setChapter(0);
    setShowBookPicker(false);
  };

  const selectChapter = (ch: number) => {
    setChapter(ch);
    setShowChapterPicker(false);
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
    <View style={styles.container}>
      <View style={styles.selectorRow}>
        <TouchableOpacity
          style={styles.selectorButton}
          onPress={() => setShowBookPicker(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="book-outline" size={14} color={AppColors.textLight} style={{ marginRight: 6 }} />
          <Text style={styles.selectorText}>{currentBook.name}</Text>
          <Ionicons name="chevron-down" size={14} color={AppColors.textLight} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.selectorButton}
          onPress={() => setShowChapterPicker(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.selectorText}>Cap {chapter + 1}</Text>
          <Ionicons name="chevron-down" size={14} color={AppColors.textLight} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AppColors.primaryDark} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {verses.map((verse, index) => (
            <Text key={index} style={styles.verseText}>
              <Text style={styles.verseNumber}>{index + 1} </Text>
              {verse}
            </Text>
          ))}
        </ScrollView>
      )}

      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.navButton, !hasPrev && styles.navButtonDisabled]}
          onPress={goToPrevChapter}
          disabled={!hasPrev}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={hasPrev ? AppColors.primaryDark : AppColors.border} />
          <Text style={[styles.navButtonText, !hasPrev && styles.navButtonTextDisabled]}>Anterior</Text>
        </TouchableOpacity>

        <Text style={styles.navInfo}>{currentBook.name} {chapter + 1}</Text>

        <TouchableOpacity
          style={[styles.navButton, !hasNext && styles.navButtonDisabled]}
          onPress={goToNextChapter}
          disabled={!hasNext}
          activeOpacity={0.7}
        >
          <Text style={[styles.navButtonText, !hasNext && styles.navButtonTextDisabled]}>Próximo</Text>
          <Ionicons name="chevron-forward" size={20} color={hasNext ? AppColors.primaryDark : AppColors.border} />
        </TouchableOpacity>
      </View>

      {/* Book Picker Modal */}
      <Modal visible={showBookPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Livro</Text>
              <TouchableOpacity onPress={() => setShowBookPicker(false)}>
                <Ionicons name="close" size={24} color={AppColors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>Antigo Testamento</Text>
            <FlatList
              data={BIBLE_BOOKS}
              keyExtractor={(item) => item.abbrev}
              renderItem={({ item, index }) => (
                <>
                  {index === 39 && <Text style={styles.sectionLabel}>Novo Testamento</Text>}
                  <TouchableOpacity
                    style={[styles.bookItem, index === bookIndex && styles.bookItemActive]}
                    onPress={() => selectBook(index)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.bookItemText, index === bookIndex && styles.bookItemTextActive]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.bookItemChapters, index === bookIndex && styles.bookItemTextActive]}>
                      {item.chapters} cap.
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              showsVerticalScrollIndicator={false}
              initialScrollIndex={bookIndex > 5 ? bookIndex - 3 : 0}
              getItemLayout={(_, index) => ({ length: 48, offset: 48 * index, index })}
            />
          </View>
        </View>
      </Modal>

      {/* Chapter Picker Modal */}
      <Modal visible={showChapterPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{currentBook.name}</Text>
              <TouchableOpacity onPress={() => setShowChapterPicker(false)}>
                <Ionicons name="close" size={24} color={AppColors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={Array.from({ length: currentBook.chapters }, (_, i) => i)}
              keyExtractor={(item) => String(item)}
              numColumns={5}
              columnWrapperStyle={styles.chapterRow}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.chapterItem, item === chapter && styles.chapterItemActive]}
                  onPress={() => selectChapter(item)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chapterItemText, item === chapter && styles.chapterItemTextActive]}>
                    {item + 1}
                  </Text>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </View>
        </View>
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

  // Modal styles
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
    height: 48,
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
    paddingHorizontal: 20,
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
});
