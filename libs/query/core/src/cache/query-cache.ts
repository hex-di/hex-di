/**
 * QueryCache implementation with signal-backed reactive entries.
 *
 * An in-memory cache storing reactive query entries keyed by port+params.
 * Supports structural sharing, garbage collection, and reactive subscriptions.
 *
 * @packageDocumentation
 */

import { ok, err } from "@hex-di/result";
import type { ReactiveCacheEntry, CacheEntrySnapshot } from "./cache-entry.js";
import {
  createReactiveCacheEntry,
  getSnapshot,
  hasSubscribers,
  incrementSubscribers,
  decrementSubscribers,
} from "./cache-entry.js";
import type { CacheKey } from "./cache-key.js";
import { createCacheKeyFromName, serializeCacheKey, cacheKeyMatchesPort } from "./cache-key.js";
import { replaceEqualDeep } from "./structural-sharing.js";
import { DEFAULT_QUERY_OPTIONS } from "../types/options.js";
import type { ReactiveSystemInstance } from "../reactivity/system-factory.js";

// =============================================================================
// PortLike - minimal interface to avoid variance issues
// =============================================================================

interface PortLike {
  readonly __portName: string;
}

// =============================================================================
// Cache Events
// =============================================================================

export type CacheEvent =
  | { readonly type: "added"; readonly key: CacheKey; readonly entry: CacheEntrySnapshot }
  | { readonly type: "updated"; readonly key: CacheKey; readonly entry: CacheEntrySnapshot }
  | { readonly type: "removed"; readonly key: CacheKey }
  | { readonly type: "invalidated"; readonly key: CacheKey }
  | { readonly type: "cleared" };

export type CacheListener = (event: CacheEvent) => void;
export type Unsubscribe = () => void;

// =============================================================================
// GC Configuration
// =============================================================================

export interface GarbageCollectorConfig {
  readonly interval: number;
  readonly enabled: boolean;
}

// =============================================================================
// Clock Interface
// =============================================================================

export interface Clock {
  readonly now: () => number;
}

const systemClock: Clock = { now: () => Date.now() };

// =============================================================================
// QueryCache Interface
// =============================================================================

export interface QueryCache {
  // === Read (snapshot-based for backward compat) ===
  get(port: PortLike, params: unknown): CacheEntrySnapshot | undefined;

  has(port: PortLike, params: unknown): boolean;

  getAll(): ReadonlyMap<string, CacheEntrySnapshot>;

  findByPort(port: PortLike): ReadonlyArray<readonly [CacheKey, CacheEntrySnapshot]>;

  find(
    predicate: (entry: CacheEntrySnapshot, key: CacheKey) => boolean
  ): ReadonlyArray<readonly [CacheKey, CacheEntrySnapshot]>;

  // === Reactive entry access ===
  getEntry(port: PortLike, params: unknown): ReactiveCacheEntry<unknown, unknown> | undefined;

  getOrCreateEntry(port: PortLike, params: unknown): ReactiveCacheEntry<unknown, unknown>;

  // === Write (signal mutations) ===
  set(
    port: PortLike,
    params: unknown,
    data: unknown,
    options?: { readonly structuralSharing?: boolean }
  ): void;

  setError(port: PortLike, params: unknown, error: unknown): void;

  invalidate(port: PortLike, params?: unknown): void;

  remove(port: PortLike, params?: unknown): void;

  clear(): void;

  // === Legacy compat: getOrCreate returns snapshot ===
  getOrCreate(port: PortLike, params: unknown): CacheEntrySnapshot;

  // === Subscriber tracking (used by observers) ===
  incrementObservers(port: PortLike, params: unknown): void;
  decrementObservers(port: PortLike, params: unknown): void;

  // === Event subscriptions ===
  subscribe(listener: CacheListener): Unsubscribe;

  // === Metrics ===
  readonly size: number;

  // === Disposal ===
  dispose(): void;
}

// =============================================================================
// QueryCache Configuration
// =============================================================================

export interface QueryCacheConfig {
  readonly clock?: Clock;
  readonly gc?: Partial<GarbageCollectorConfig>;
  readonly reactiveSystem?: ReactiveSystemInstance;
}

// =============================================================================
// createQueryCache Factory
// =============================================================================

export function createQueryCache(config?: QueryCacheConfig): QueryCache {
  const clock = config?.clock ?? systemClock;
  const system = config?.reactiveSystem;
  const gcConfig: GarbageCollectorConfig = {
    interval: config?.gc?.interval ?? 60_000,
    enabled: config?.gc?.enabled ?? true,
  };

  // Internal storage: serialized cache key -> reactive entry
  const entries = new Map<string, ReactiveCacheEntry<unknown, unknown>>();
  // Reverse map: serialized key -> CacheKey object
  const keyMap = new Map<string, CacheKey>();
  // Listeners
  const listeners = new Set<CacheListener>();
  // GC timer
  let gcTimer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;

  function emit(event: CacheEvent): void {
    for (const listener of listeners) {
      listener(event);
    }
  }

  function getSerializedKey(port: PortLike, params: unknown): string {
    const cacheKey = createCacheKeyFromName(port.__portName, params);
    return serializeCacheKey(cacheKey);
  }

  function ensureCacheKey(
    port: PortLike,
    params: unknown
  ): { serialized: string; cacheKey: CacheKey } {
    const cacheKey = createCacheKeyFromName(port.__portName, params);
    const serialized = serializeCacheKey(cacheKey);
    if (!keyMap.has(serialized)) {
      keyMap.set(serialized, cacheKey);
    }
    return { serialized, cacheKey };
  }

  // GC sweep
  function gcSweep(): void {
    const now = clock.now();
    const keysToRemove: string[] = [];

    for (const [serialized, entry] of entries) {
      if (hasSubscribers(entry)) continue;
      const cacheTime = DEFAULT_QUERY_OPTIONS.cacheTime;
      const dataUpdatedAt = entry.dataUpdatedAt$.peek();
      const errorUpdatedAt = entry.errorUpdatedAt$.peek();
      if (dataUpdatedAt !== undefined && now - dataUpdatedAt > cacheTime) {
        keysToRemove.push(serialized);
      } else if (errorUpdatedAt !== undefined && now - errorUpdatedAt > cacheTime) {
        keysToRemove.push(serialized);
      }
    }

    for (const serialized of keysToRemove) {
      const key = keyMap.get(serialized);
      entries.delete(serialized);
      keyMap.delete(serialized);
      if (key) {
        emit({ type: "removed", key });
      }
    }
  }

  function startGC(): void {
    if (gcConfig.enabled && gcConfig.interval > 0 && gcTimer === undefined) {
      gcTimer = setInterval(gcSweep, gcConfig.interval);
      // Unref the timer so it doesn't keep Node processes alive
      if (typeof gcTimer === "object" && gcTimer !== null && "unref" in gcTimer) {
        const proto: unknown = Object.getPrototypeOf(gcTimer);
        if (proto !== null && typeof proto === "object") {
          const desc = Object.getOwnPropertyDescriptor(proto, "unref");
          if (desc !== undefined && typeof desc.value === "function") {
            Reflect.apply(desc.value, gcTimer, []);
          }
        }
      }
    }
  }

  function stopGC(): void {
    if (gcTimer !== undefined) {
      clearInterval(gcTimer);
      gcTimer = undefined;
    }
  }

  startGC();

  const cache: QueryCache = {
    get(port: PortLike, params: unknown): CacheEntrySnapshot | undefined {
      const serialized = getSerializedKey(port, params);
      const entry = entries.get(serialized);
      if (entry === undefined) return undefined;
      return getSnapshot(entry);
    },

    has(port: PortLike, params: unknown): boolean {
      const serialized = getSerializedKey(port, params);
      return entries.has(serialized);
    },

    getAll(): ReadonlyMap<string, CacheEntrySnapshot> {
      const result = new Map<string, CacheEntrySnapshot>();
      for (const [serialized, entry] of entries) {
        result.set(serialized, getSnapshot(entry));
      }
      return result;
    },

    findByPort(port: PortLike): ReadonlyArray<readonly [CacheKey, CacheEntrySnapshot]> {
      const results: Array<readonly [CacheKey, CacheEntrySnapshot]> = [];
      for (const [serialized, entry] of entries) {
        const key = keyMap.get(serialized);
        if (key && cacheKeyMatchesPort(key, port.__portName)) {
          results.push([key, getSnapshot(entry)] as const);
        }
      }
      return results;
    },

    find(
      predicate: (entry: CacheEntrySnapshot, key: CacheKey) => boolean
    ): ReadonlyArray<readonly [CacheKey, CacheEntrySnapshot]> {
      const results: Array<readonly [CacheKey, CacheEntrySnapshot]> = [];
      for (const [serialized, entry] of entries) {
        const key = keyMap.get(serialized);
        if (key) {
          const snapshot = getSnapshot(entry);
          if (predicate(snapshot, key)) {
            results.push([key, snapshot] as const);
          }
        }
      }
      return results;
    },

    getEntry(port: PortLike, params: unknown): ReactiveCacheEntry<unknown, unknown> | undefined {
      const serialized = getSerializedKey(port, params);
      return entries.get(serialized);
    },

    getOrCreateEntry(port: PortLike, params: unknown): ReactiveCacheEntry<unknown, unknown> {
      const { serialized, cacheKey } = ensureCacheKey(port, params);
      const existing = entries.get(serialized);
      if (existing) return existing;

      const entry = createReactiveCacheEntry(serialized, system);
      entries.set(serialized, entry);
      emit({ type: "added", key: cacheKey, entry: getSnapshot(entry) });
      return entry;
    },

    set(
      port: PortLike,
      params: unknown,
      data: unknown,
      options?: { readonly structuralSharing?: boolean }
    ): void {
      const { serialized, cacheKey } = ensureCacheKey(port, params);
      const isNew = !entries.has(serialized);
      const entry = cache.getOrCreateEntry(port, params);
      const useStructuralSharing = options?.structuralSharing ?? true;

      let finalData = data;
      if (useStructuralSharing) {
        const prevData = entry.data.peek();
        if (prevData !== undefined) {
          finalData = replaceEqualDeep(prevData, data);
        }
      }

      // Write to source signals
      entry.result$.set(ok(finalData));
      entry.dataUpdatedAt$.set(clock.now());
      entry.fetchCount$.set(entry.fetchCount$.peek() + 1);
      entry.isInvalidated$.set(false);

      const snapshot = getSnapshot(entry);
      if (isNew) {
        emit({ type: "added", key: cacheKey, entry: snapshot });
      } else {
        emit({ type: "updated", key: cacheKey, entry: snapshot });
      }
    },

    setError(port: PortLike, params: unknown, error: unknown): void {
      const { serialized, cacheKey } = ensureCacheKey(port, params);
      const isNew = !entries.has(serialized);
      const entry = cache.getOrCreateEntry(port, params);

      // Write to source signals
      entry.result$.set(err(error));
      entry.errorUpdatedAt$.set(clock.now());
      entry.fetchCount$.set(entry.fetchCount$.peek() + 1);
      entry.isInvalidated$.set(false);

      const snapshot = getSnapshot(entry);
      if (isNew) {
        emit({ type: "added", key: cacheKey, entry: snapshot });
      } else {
        emit({ type: "updated", key: cacheKey, entry: snapshot });
      }
    },

    invalidate(port: PortLike, params?: unknown): void {
      if (params !== undefined) {
        const { serialized, cacheKey } = ensureCacheKey(port, params);
        const entry = entries.get(serialized);
        if (entry) {
          entry.isInvalidated$.set(true);
          emit({ type: "invalidated", key: cacheKey });
        }
      } else {
        for (const [serialized, entry] of entries) {
          const key = keyMap.get(serialized);
          if (key && cacheKeyMatchesPort(key, port.__portName)) {
            entry.isInvalidated$.set(true);
            emit({ type: "invalidated", key });
          }
        }
      }
    },

    remove(port: PortLike, params?: unknown): void {
      if (params !== undefined) {
        const { serialized, cacheKey } = ensureCacheKey(port, params);
        if (entries.has(serialized)) {
          entries.delete(serialized);
          keyMap.delete(serialized);
          emit({ type: "removed", key: cacheKey });
        }
      } else {
        const keysToRemove: string[] = [];
        for (const [serialized] of entries) {
          const key = keyMap.get(serialized);
          if (key && cacheKeyMatchesPort(key, port.__portName)) {
            keysToRemove.push(serialized);
          }
        }
        for (const serialized of keysToRemove) {
          const key = keyMap.get(serialized);
          entries.delete(serialized);
          keyMap.delete(serialized);
          if (key) {
            emit({ type: "removed", key });
          }
        }
      }
    },

    clear(): void {
      entries.clear();
      keyMap.clear();
      emit({ type: "cleared" });
    },

    getOrCreate(port: PortLike, params: unknown): CacheEntrySnapshot {
      const entry = cache.getOrCreateEntry(port, params);
      return getSnapshot(entry);
    },

    incrementObservers(port: PortLike, params: unknown): void {
      const entry = entries.get(getSerializedKey(port, params));
      if (entry) {
        incrementSubscribers(entry);
      }
    },

    decrementObservers(port: PortLike, params: unknown): void {
      const entry = entries.get(getSerializedKey(port, params));
      if (entry) {
        decrementSubscribers(entry);
      }
    },

    subscribe(listener: CacheListener): Unsubscribe {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    get size(): number {
      return entries.size;
    },

    dispose(): void {
      if (disposed) return;
      disposed = true;
      stopGC();
      entries.clear();
      keyMap.clear();
      listeners.clear();
    },
  };

  return cache;
}
