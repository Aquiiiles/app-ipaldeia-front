import { Platform } from 'react-native';

const CHANNEL_ID = 'UCksZ_zB6vDBCIyFShDa_d3A';
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

export type YouTubeVideo = {
  id: string;
  title: string;
  published: string;
  thumbnail: string;
  url: string;
};

const FALLBACK_VIDEOS: YouTubeVideo[] = [
  {
    id: '9rnkxRlfUG4',
    title: 'Culto Vespertino',
    published: '2025-05-25T00:00:00Z',
    thumbnail: 'https://i.ytimg.com/vi/9rnkxRlfUG4/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=9rnkxRlfUG4',
  },
  {
    id: 't5N1H_WR9_g',
    title: 'O perigo da NEGLIGÊNCIA ESPIRITUAL | Rev. Relrison Silva',
    published: '2020-04-09T00:00:00Z',
    thumbnail: 'https://i.ytimg.com/vi/t5N1H_WR9_g/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=t5N1H_WR9_g',
  },
  {
    id: 'pufmlIRRguM',
    title: 'Culto de 05/10/2025',
    published: '2025-10-05T00:00:00Z',
    thumbnail: 'https://i.ytimg.com/vi/pufmlIRRguM/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=pufmlIRRguM',
  },
];

function parseXML(xml: string): YouTubeVideo[] {
  const videos: YouTubeVideo[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];
    const videoId = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1] ?? '';
    const title = entry.match(/<title>(.*?)<\/title>/)?.[1] ?? '';
    const published = entry.match(/<published>(.*?)<\/published>/)?.[1] ?? '';

    if (videoId) {
      videos.push({
        id: videoId,
        title: decodeXMLEntities(title),
        published,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${videoId}`,
      });
    }
  }

  return videos;
}

function decodeXMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchChannelVideos(): Promise<YouTubeVideo[]> {
  if (Platform.OS !== 'web') {
    try {
      const response = await fetchWithTimeout(RSS_URL);
      if (response.ok) {
        const xml = await response.text();
        const videos = parseXML(xml);
        if (videos.length > 0) return videos;
      }
    } catch {}
  }

  for (const makeProxy of CORS_PROXIES) {
    try {
      const proxyUrl = makeProxy(RSS_URL);
      const response = await fetchWithTimeout(proxyUrl);
      if (response.ok) {
        const xml = await response.text();
        const videos = parseXML(xml);
        if (videos.length > 0) return videos;
      }
    } catch {}
  }

  return FALLBACK_VIDEOS;
}

export function formatPublishedDate(isoDate: string): string {
  const date = new Date(isoDate);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function getRelativeTime(isoDate: string): string {
  const now = new Date();
  const then = new Date(isoDate);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Há 1 dia';
  if (diffDays < 7) return `Há ${diffDays} dias`;
  if (diffDays < 14) return 'Há 1 semana';
  const weeks = Math.floor(diffDays / 7);
  if (diffDays < 30) return `Há ${weeks} semanas`;
  const months = Math.floor(diffDays / 30);
  if (months === 1) return 'Há 1 mês';
  if (months < 12) return `Há ${months} meses`;
  const years = Math.floor(months / 12);
  if (years === 1) return 'Há 1 ano';
  return `Há ${years} anos`;
}
