/**
 * PersistenceManager — wires CachePersister to QueryCache lifecycle events.
 *
 * Handles restore-on-startup (with buster + maxAge filtering) and
 * persist-on-change via a CacheListener.
 *
 * @packageDocumentation
 */

import type { CachePersister } from "./cache-persister.js";
import type { QueryCache, CacheListener, Clock } from "../cache/query-cache.js";
import type { CacheKey } from "../cache/cache-key.js";
import { createCacheKeyFromName } from "../cache/cache-key.js";

// =============================================================================
// Configuration
// =============================================================================

export interface PersistenceConfig {
  readonly persister: CachePersister;
  readonly buster: string;
  readonly maxAge: number;
}

// =============================================================================
// PersistenceManager Interface
// =============================================================================

export interface PersistenceManager {
  readonly restore: () => Promise<void>;
  readonly createListener: () => CacheListener;
  readonly dispose: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const BUSTER_PORT_NAME = "__hex_query_buster__";

// =============================================================================
// Factory
// =============================================================================

export function createPersistenceManager(
  config: PersistenceConfig,
  cache: QueryCache,
  clock: Clock
): PersistenceManager {
  const { persister, buster, maxAge } = config;

  async function restore(): Promise<void> {
    const entriesResult = await persister.restoreAll();
    if (entriesResult.isErr()) return;
    const entries = entriesResult.value;

    // Check buster marker
    const busterEntry = entries.find(([key]) => key[0] === BUSTER_PORT_NAME);
    if (busterEntry) {
      // The buster value is stored in the data field of the cache entry
      const storedBuster = busterEntry[1].data;
      if (storedBuster !== buster) {
        await persister.clear();
        await persistBusterMarker();
        return;
      }
    }

    const now = clock.now();

    for (const [key, entry] of entries) {
      // Skip the buster marker itself
      if (key[0] === BUSTER_PORT_NAME) continue;

      // Discard stale entries
      if (entry.dataUpdatedAt !== undefined && now - entry.dataUpdatedAt > maxAge) {
        continue;
      }

      // Restore valid entries into cache
      cache.set({ __portName: key[0] }, deserializeParams(key), entry.data);
    }

    // Ensure buster marker is persisted
    if (!busterEntry) {
      await persistBusterMarker();
    }
  }

  async function persistBusterMarker(): Promise<void> {
    const busterKey = createCacheKeyFromName(BUSTER_PORT_NAME, undefined);
    await persister.persistQuery(busterKey, {
      result: undefined,
      data: buster,
      error: null,
      status: "success",
      fetchStatus: "idle",
      dataUpdatedAt: clock.now(),
      errorUpdatedAt: undefined,
      fetchCount: 0,
      isInvalidated: false,
    });
  }

  function createListener(): CacheListener {
    return event => {
      switch (event.type) {
        case "added":
        case "updated":
          void persister.persistQuery(event.key, event.entry);
          break;
        case "removed":
          void persister.removeQuery(event.key);
          break;
        case "cleared":
          void persister.clear();
          break;
      }
    };
  }

  function dispose(): void {
    // Cleanup is handled by unsubscribing from the cache listener
    // (the caller is responsible for calling the unsubscribe function)
  }

  return { restore, createListener, dispose };
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Deserialize params from a cache key.
 * Cache keys store params as a JSON string in position [1].
 * We parse it back to the original value.
 */
function deserializeParams(key: CacheKey): unknown {
  try {
    return JSON.parse(key[1]) as unknown;
  } catch {
    return undefined;
  }
}
