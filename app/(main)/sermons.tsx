import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';
import { useThemeColors, useSettings } from '@/src/contexts/SettingsContext';
import {
  fetchChannelVideos,
  formatPublishedDate,
  getRelativeTime,
  YouTubeVideo,
} from '@/src/services/youtube';

const CHANNEL_URL = 'https://www.youtube.com/@ipaldeia';

export default function SermonsScreen() {
  const colors = useThemeColors();
  const { fontSize } = useSettings();
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  async function loadVideos() {
    try {
      setError(false);
      const data = await fetchChannelVideos();
      setVideos(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadVideos();
  }, []);

  function onRefresh() {
    setRefreshing(true);
    loadVideos();
  }

  function openVideo(url: string) {
    Linking.openURL(url);
  }

  function openChannel() {
    Linking.openURL(CHANNEL_URL);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.headerBg }]}>
      <TouchableOpacity style={[styles.liveBanner, { backgroundColor: colors.card }]} activeOpacity={0.8} onPress={openChannel}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>AO VIVO</Text>
      </TouchableOpacity>

      <View style={styles.channelRow}>
        <Text style={[styles.channelLabel, { color: colors.textSecondary }]}>Últimos vídeos do canal</Text>
        <TouchableOpacity onPress={openChannel} activeOpacity={0.7}>
          <Text style={[styles.channelLink, { color: colors.textSecondary }]}>Ver canal</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Carregando vídeos...</Text>
        </View>
      ) : error ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color="rgba(255,255,255,0.4)" />
          <Text style={styles.errorText}>Não foi possível carregar os vídeos</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadVideos} activeOpacity={0.7}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />
          }
        >
          {videos.map((video) => (
            <TouchableOpacity
              key={video.id}
              style={[styles.card, { backgroundColor: colors.card }]}
              activeOpacity={0.7}
              onPress={() => openVideo(video.url)}
            >
              <View style={styles.cardImageContainer}>
                <Image
                  source={{ uri: video.thumbnail }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
                <View style={styles.playOverlay}>
                  <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.85)" />
                </View>
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardTitle, { color: colors.text, fontSize }]} numberOfLines={2}>{video.title}</Text>
                <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                  {formatPublishedDate(video.published)} • {getRelativeTime(video.published)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.moreButton} activeOpacity={0.7} onPress={openChannel}>
            <Text style={styles.moreButtonText}>VER MAIS NO YOUTUBE</Text>
            <Ionicons name="open-outline" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.headerBg,
  },
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 20,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E53935',
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
  channelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  channelLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  channelLink: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  errorText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginTop: 8,
  },
  retryButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginTop: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 32,
    gap: 14,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardImageContainer: {
    height: 180,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  cardInfo: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    lineHeight: 20,
  },
  cardMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 4,
  },
  moreButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
