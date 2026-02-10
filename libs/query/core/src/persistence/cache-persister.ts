/**
 * CachePersister interface for durable query cache storage.
 *
 * Implementors provide storage backends (localStorage, IndexedDB, etc.)
 * for persisting cache entries across sessions.
 *
 * @packageDocumentation
 */

import type { ResultAsync } from "@hex-di/result";
import type { CacheKey } from "../cache/cache-key.js";
import type { CacheEntry } from "../cache/cache-entry.js";

// =============================================================================
// PersistenceError
// =============================================================================

export interface PersistenceError {
  readonly _tag: "PersistenceError";
  readonly operation: "persist" | "restore" | "remove" | "restoreAll" | "clear";
  readonly cause: unknown;
}

// =============================================================================
// CachePersister Interface
// =============================================================================

export interface CachePersister {
  persistQuery(
    key: CacheKey,
    entry: CacheEntry<unknown, unknown>
  ): ResultAsync<void, PersistenceError>;
  restoreQuery(
    key: CacheKey
  ): ResultAsync<CacheEntry<unknown, unknown> | undefined, PersistenceError>;
  removeQuery(key: CacheKey): ResultAsync<void, PersistenceError>;
  restoreAll(): ResultAsync<
    ReadonlyArray<[CacheKey, CacheEntry<unknown, unknown>]>,
    PersistenceError
  >;
  clear(): ResultAsync<void, PersistenceError>;
}
