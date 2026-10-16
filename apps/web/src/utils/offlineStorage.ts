import { Book } from '../types';

const OFFLINE_CATALOGUE_KEY = 'libnexa_offline_catalogue_v1';
const OFFLINE_LAST_SYNC_KEY = 'libnexa_offline_last_sync_v1';

export const saveOfflineCatalogue = (books: Book[]): void => {
  try {
    const existing = getOfflineCatalogue();
    const map = new Map<string, Book>();
    
    // Merge existing with newly fetched
    existing.forEach(b => map.set(b.id, b));
    books.forEach(b => map.set(b.id, b));

    const combined = Array.from(map.values());
    localStorage.setItem(OFFLINE_CATALOGUE_KEY, JSON.stringify(combined));
    localStorage.setItem(OFFLINE_LAST_SYNC_KEY, new Date().toISOString());
  } catch (err) {
    console.warn('[OFFLINE CACHE] Could not cache catalogue to local storage:', err);
  }
};

export const getOfflineCatalogue = (): Book[] => {
  try {
    const raw = localStorage.getItem(OFFLINE_CATALOGUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const getLastSyncTime = (): string | null => {
  return localStorage.getItem(OFFLINE_LAST_SYNC_KEY);
};

export const searchOfflineCatalogue = (query: string, category?: string): Book[] => {
  const books = getOfflineCatalogue();
  const q = query.toLowerCase().trim();

  return books.filter(b => {
    const matchesQ =
      !q ||
      b.title.toLowerCase().includes(q) ||
      b.isbn.toLowerCase().includes(q) ||
      (Array.isArray(b.authors) &&
        b.authors.some(a => (typeof a === 'string' ? a.toLowerCase().includes(q) : a.name.toLowerCase().includes(q))));

    const matchesCat =
      !category ||
      category === 'ALL' ||
      (Array.isArray(b.categories) &&
        b.categories.some(c => (typeof c === 'string' ? c === category : c.name === category)));

    return matchesQ && matchesCat;
  });
};
