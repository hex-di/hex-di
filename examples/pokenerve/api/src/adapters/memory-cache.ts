import { createAdapter } from "@hex-di/core";
import { PokemonCachePort } from "../ports/pokemon-cache.js";
import type { CacheStats } from "../ports/pokemon-cache.js";

const MAX_ENTRIES = 1000;
const TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  value: unknown;
  expiresAt: number;
  lastAccessed: number;
}

const memoryCacheAdapter = createAdapter({
  provides: PokemonCachePort,
  requires: [],
  lifetime: "singleton",
  factory: () => {
    const store = new Map<string, CacheEntry>();
    let hits = 0;
    let misses = 0;

    function isExpired(entry: CacheEntry): boolean {
      return Date.now() > entry.expiresAt;
    }

    function evictLru(): void {
      if (store.size === 0) return;

      let oldestKey: string | undefined;
      let oldestTime = Infinity;

      for (const [key, entry] of store) {
        if (entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed;
          oldestKey = key;
        }
      }

      if (oldestKey !== undefined) {
        store.delete(oldestKey);
      }
    }

    return {
      get(key: string): unknown | undefined {
        const entry = store.get(key);
        if (entry === undefined) {
          misses++;
          return undefined;
        }
        if (isExpired(entry)) {
          store.delete(key);
          misses++;
          return undefined;
        }
        entry.lastAccessed = Date.now();
        hits++;
        return entry.value;
      },

      set(key: string, value: unknown): void {
        if (store.size >= MAX_ENTRIES && !store.has(key)) {
          evictLru();
        }
        store.set(key, {
          value,
          expiresAt: Date.now() + TTL_MS,
          lastAccessed: Date.now(),
        });
      },

      has(key: string): boolean {
        const entry = store.get(key);
        if (entry === undefined) return false;
        if (isExpired(entry)) {
          store.delete(key);
          return false;
        }
        return true;
      },

      delete(key: string): boolean {
        return store.delete(key);
      },

      clear(): void {
        store.clear();
        hits = 0;
        misses = 0;
      },

      size(): number {
        return store.size;
      },

      stats(): CacheStats {
        const total = hits + misses;
        return {
          hits,
          misses,
          size: store.size,
          maxSize: MAX_ENTRIES,
          hitRate: total === 0 ? 0 : hits / total,
        };
      },
    };
  },
});

export { memoryCacheAdapter };
