/**
 * Dehydration and hydration utilities for SSR support.
 *
 * dehydrate() serializes the query cache into a portable format.
 * hydrate() restores it on the client side.
 *
 * @packageDocumentation
 */

import { ok, err, fromThrowable } from "@hex-di/result";
import type { QueryClient } from "./query-client.js";
import type { CacheKey } from "../cache/cache-key.js";
import { createCacheKeyFromName } from "../cache/cache-key.js";

// =============================================================================
// DehydratedState
// =============================================================================

export interface DehydratedState {
  readonly version: 3;
  readonly queries: ReadonlyArray<{
    readonly cacheKey: CacheKey;
    readonly result:
      | { readonly _tag: "Ok"; readonly value: unknown }
      | { readonly _tag: "Err"; readonly error: unknown };
    readonly dataUpdatedAt: number;
  }>;
}

// =============================================================================
// dehydrate
// =============================================================================

/**
 * Extracts the current query cache state into a serializable format.
 *
 * Includes both success and error entries. Pending entries (no data and
 * no error) are omitted since they don't provide useful SSR state.
 */
export function dehydrate(client: QueryClient): DehydratedState {
  const queries: Array<{
    readonly cacheKey: CacheKey;
    readonly result:
      | { readonly _tag: "Ok"; readonly value: unknown }
      | { readonly _tag: "Err"; readonly error: unknown };
    readonly dataUpdatedAt: number;
  }> = [];

  const allEntries = client.cache.getAll();

  for (const [serializedKey, entry] of allEntries) {
    if (entry.data === undefined && entry.error === null) continue;

    const separatorIndex = serializedKey.indexOf("\0");
    if (separatorIndex === -1) continue;

    const portName = serializedKey.slice(0, separatorIndex);
    const paramsHash = serializedKey.slice(separatorIndex + 1);

    const cacheKey = createCacheKeyFromName(portName, parseParamsHash(paramsHash));

    if (entry.status === "success" && entry.data !== undefined) {
      queries.push({
        cacheKey,
        result: ok(entry.data).toJSON(),
        dataUpdatedAt: entry.dataUpdatedAt ?? 0,
      });
    } else if (entry.status === "error" && entry.error !== null) {
      queries.push({
        cacheKey,
        result: err(entry.error).toJSON(),
        dataUpdatedAt: entry.errorUpdatedAt ?? 0,
      });
    }
  }

  return { version: 3, queries };
}

// =============================================================================
// hydrate helpers
// =============================================================================

/**
 * Reconstructs params from a paramsHash string so that
 * `stableStringify(result)` produces the same hash.
 *
 * The paramsHash is produced by stableStringify, which outputs
 * valid JSON for objects/arrays/strings/numbers/booleans/null,
 * and the literal string "undefined" for undefined.
 */
function parseParamsHash(paramsHash: string): unknown {
  if (paramsHash === "undefined") {
    return undefined;
  }
  return fromThrowable(
    (): unknown => JSON.parse(paramsHash),
    () => paramsHash
  ).unwrapOr(paramsHash);
}

// =============================================================================
// hydrate
// =============================================================================

/**
 * Restores dehydrated query state into a QueryClient's cache.
 *
 * For each entry, creates a cache entry via `cache.set()` using
 * a minimal port-like object. Existing entries are not overwritten
 * (hydration fills in missing data, doesn't replace fresh data).
 */
export function hydrate(client: QueryClient, state: DehydratedState): void {
  for (const query of state.queries) {
    const portLike = { __portName: query.cacheKey[0] };
    const params = parseParamsHash(query.cacheKey[1]);

    // Check if entry already exists with success data
    const existing = client.cache.get(portLike, params);
    if (existing !== undefined && existing.status === "success") {
      continue;
    }

    if (query.result._tag === "Ok") {
      client.cache.set(portLike, params, query.result.value);
    } else {
      client.cache.setError(portLike, params, query.result.error);
    }
  }
}
