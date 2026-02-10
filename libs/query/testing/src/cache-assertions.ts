/**
 * Cache Entry Assertion Helpers
 *
 * Fluent assertions for verifying cache entry state in tests.
 *
 * @packageDocumentation
 */

import { expect } from "vitest";
import { getSubscriberCount } from "@hex-di/query";
import type { QueryClient, QueryPort } from "@hex-di/query";

// =============================================================================
// CacheEntryAssertions
// =============================================================================

export interface CacheEntryAssertions<TData> {
  /** Assert that a cache entry exists for this port+params */
  toExist(): void;
  /** Assert that no cache entry exists for this port+params */
  toNotExist(): void;
  /** Assert that the cache entry has the expected data */
  toHaveData(expected: TData): void;
  /** Assert that the cache entry is marked as invalidated (stale) */
  toBeStale(): void;
  /** Assert that the cache entry is not invalidated (fresh) */
  toBeFresh(): void;
  /** Assert that the cache entry has the expected number of observers */
  toHaveObserverCount(n: number): void;
}

// =============================================================================
// expectCacheEntry
// =============================================================================

/**
 * Fluent assertions for cache entries.
 *
 * @example
 * ```typescript
 * const client = createQueryClient();
 * client.setQueryData(UsersPort, {}, [{ id: "1", name: "Alice" }]);
 *
 * expectCacheEntry(client, UsersPort, {}).toExist();
 * expectCacheEntry(client, UsersPort, {}).toHaveData([{ id: "1", name: "Alice" }]);
 * expectCacheEntry(client, UsersPort, {}).toBeFresh();
 * ```
 */
export function expectCacheEntry<TData, TParams, TError, TName extends string>(
  client: QueryClient,
  port: QueryPort<TName, TData, TParams, TError>,
  params: TParams
): CacheEntryAssertions<TData> {
  return {
    toExist() {
      const entry = client.cache.get(port, params);
      expect(entry).toBeDefined();
    },
    toNotExist() {
      const entry = client.cache.get(port, params);
      expect(entry).toBeUndefined();
    },
    toHaveData(expected: TData) {
      const entry = client.cache.get(port, params);
      expect(entry).toBeDefined();
      if (entry === undefined) return;
      expect(entry.data).toEqual(expected);
    },
    toBeStale() {
      const entry = client.cache.get(port, params);
      expect(entry).toBeDefined();
      if (entry === undefined) return;
      expect(entry.isInvalidated).toBe(true);
    },
    toBeFresh() {
      const entry = client.cache.get(port, params);
      expect(entry).toBeDefined();
      if (entry === undefined) return;
      expect(entry.isInvalidated).toBe(false);
    },
    toHaveObserverCount(n: number) {
      const reactiveEntry = client.cache.getEntry(port, params);
      expect(reactiveEntry).toBeDefined();
      if (reactiveEntry === undefined) return;
      expect(getSubscriberCount(reactiveEntry)).toBe(n);
    },
  };
}
