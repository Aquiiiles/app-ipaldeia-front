import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// --- News ---

export type NewsItem = {
  id: string;
  title: string;
  body: string;
  date: string;
  createdAt: number;
};

export async function fetchNews(): Promise<NewsItem[]> {
  const q = query(collection(db, 'noticias'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({
    id: d.id,
    ...d.data(),
  })) as NewsItem[];
}

export async function addNews(data: Omit<NewsItem, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'noticias'), {
    ...data,
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function updateNews(id: string, data: Partial<Omit<NewsItem, 'id' | 'createdAt'>>): Promise<void> {
  await updateDoc(doc(db, 'noticias', id), data);
}

export async function deleteNews(id: string): Promise<void> {
  await deleteDoc(doc(db, 'noticias', id));
}

// --- Events ---

export type EventItem = {
  id: string;
  title: string;
  date: string;
  type: 'geral' | 'aniversariante';
  createdAt: number;
};

export async function fetchEvents(): Promise<EventItem[]> {
  const q = query(collection(db, 'eventos'), orderBy('date', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({
    id: d.id,
    ...d.data(),
  })) as EventItem[];
}

export async function addEvent(data: Omit<EventItem, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'eventos'), {
    ...data,
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function updateEvent(id: string, data: Partial<Omit<EventItem, 'id' | 'createdAt'>>): Promise<void> {
  await updateDoc(doc(db, 'eventos', id), data);
}

export async function deleteEvent(id: string): Promise<void> {
  await deleteDoc(doc(db, 'eventos', id));
}

// --- Prayers ---

export type PrayerItem = {
  id: string;
  text: string;
  authorName: string;
  authorId: string;
  prayedBy: string[];
  createdAt: number;
};

export async function fetchPrayers(): Promise<PrayerItem[]> {
  const q = query(collection(db, 'oracoes'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      text: data.text ?? '',
      authorName: data.authorName ?? '',
      authorId: data.authorId ?? '',
      prayedBy: data.prayedBy ?? [],
      createdAt: data.createdAt ?? 0,
    } as PrayerItem;
  });
}

export async function addPrayer(data: Omit<PrayerItem, 'id' | 'createdAt' | 'prayedBy'>): Promise<string> {
  const ref = await addDoc(collection(db, 'oracoes'), {
    ...data,
    prayedBy: [],
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function togglePrayed(prayerId: string, userId: string, currentList: string[]): Promise<string[]> {
  const newList = currentList.includes(userId)
    ? currentList.filter(id => id !== userId)
    : [...currentList, userId];
  await updateDoc(doc(db, 'oracoes', prayerId), { prayedBy: newList });
  return newList;
}

export async function deletePrayer(id: string): Promise<void> {
  await deleteDoc(doc(db, 'oracoes', id));
}
