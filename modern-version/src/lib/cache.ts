/**
 * Simple in-memory cache for Firestore reads.
 * Reduces Firestore quota usage significantly.
 */

interface CacheEntry {
  data: any;
  timestamp: number;
}

const store = new Map<string, CacheEntry>();

export function getCache(key: string, ttlMs: number): any | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttlMs) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

export function setCache(key: string, data: any): void {
  store.set(key, { data, timestamp: Date.now() });
}

export function invalidateCache(key: string): void {
  store.delete(key);
}

// TTL constants
export const TTL = {
  CATEGORIES: 5 * 60 * 1000,  // 5 daqiqa
  MARKETS:    5 * 60 * 1000,  // 5 daqiqa
  PRODUCTS:   2 * 60 * 1000,  // 2 daqiqa
};
