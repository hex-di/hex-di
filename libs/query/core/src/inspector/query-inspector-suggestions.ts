/**
 * Query Inspector Suggestions
 *
 * Builds actionable suggestions from fetch history and cache state.
 *
 * @packageDocumentation
 */

import type { CacheKey } from "../cache/cache-key.js";
import type { CacheEntrySnapshot } from "../cache/cache-entry.js";
import type { FetchHistoryEntry, QuerySuggestion } from "./query-inspector-types.js";

function collectPortHistorySuggestions(
  byPort: Map<string, FetchHistoryEntry[]>,
  suggestions: QuerySuggestion[]
): void {
  for (const [portName, portHistory] of byPort) {
    const errorCount = portHistory.filter(h => h.result === "error").length;
    const errorRate = portHistory.length > 0 ? errorCount / portHistory.length : 0;
    if (errorRate > 0.5 && portHistory.length >= 3) {
      suggestions.push({
        type: "high_error_rate",
        portName,
        message: `Query "${portName}" has a ${Math.round(errorRate * 100)}% error rate (${errorCount}/${portHistory.length} fetches)`,
        action: "Check the data source or network connectivity. Consider increasing retry count.",
      });
    }

    const recentWindow = 5000;
    const now = Date.now();
    const recentFetches = portHistory.filter(h => now - h.timestamp < recentWindow);
    if (recentFetches.length > 10) {
      suggestions.push({
        type: "invalidation_storm",
        portName,
        message: `Query "${portName}" had ${recentFetches.length} fetches in the last 5 seconds`,
        action: "Check for unnecessary invalidations or missing deduplication.",
      });
    }
  }
}

function collectCacheEntrySuggestions(
  cacheEntries: Iterable<readonly [CacheKey, CacheEntrySnapshot]>,
  entryHasSubscribers: (portName: string, params: unknown) => boolean,
  isStale: (entry: CacheEntrySnapshot) => boolean,
  parseParams: (keyPart: string | undefined) => unknown,
  stableStringify: (data: unknown) => string,
  suggestions: QuerySuggestion[]
): void {
  for (const [key, entry] of cacheEntries) {
    const portName = key[0];
    const params = parseParams(key[1]);
    const hasSubs = entryHasSubscribers(portName, params);

    if (hasSubs && isStale(entry)) {
      suggestions.push({
        type: "stale_query",
        portName,
        message: `Query "${portName}" has active subscriber(s) but data is stale`,
        action: "Consider reducing staleTime or triggering a refetch.",
      });
    }

    if (entry.data !== undefined) {
      const serialized = stableStringify(entry.data);
      if (serialized.length > 1_000_000) {
        const sizeMb = (serialized.length / 1_000_000).toFixed(1);
        suggestions.push({
          type: "large_cache_entry",
          portName,
          message: `Query "${portName}" cache entry is ${sizeMb}MB`,
          action: "Use pagination or select to reduce cached data size.",
        });
      }
    }

    if (hasSubs && entry.fetchCount === 0) {
      suggestions.push({
        type: "unused_subscriber",
        portName,
        message: `Query "${portName}" has active subscriber(s) but data was never fetched`,
        action: "Remove unused useQuery calls or add enabled: false.",
      });
    }
  }
}

export function buildQuerySuggestions(params: {
  history: ReadonlyArray<FetchHistoryEntry>;
  cacheEntries: Iterable<readonly [CacheKey, CacheEntrySnapshot]>;
  entryHasSubscribers: (portName: string, params: unknown) => boolean;
  isStale: (entry: CacheEntrySnapshot) => boolean;
  parseParams: (keyPart: string | undefined) => unknown;
  stableStringify: (data: unknown) => string;
}): ReadonlyArray<QuerySuggestion> {
  const { history, cacheEntries, entryHasSubscribers, isStale, parseParams, stableStringify } =
    params;

  const suggestions: QuerySuggestion[] = [];

  // Group history by port
  const byPort = new Map<string, FetchHistoryEntry[]>();
  for (const entry of history) {
    const existing = byPort.get(entry.portName) ?? [];
    existing.push(entry);
    byPort.set(entry.portName, existing);
  }

  collectPortHistorySuggestions(byPort, suggestions);
  collectCacheEntrySuggestions(
    cacheEntries,
    entryHasSubscribers,
    isStale,
    parseParams,
    stableStringify,
    suggestions
  );

  const adapterMissingPorts = new Set<string>();
  for (const entry of history) {
    if (entry.errorTag === "QueryAdapterMissing" && !adapterMissingPorts.has(entry.portName)) {
      adapterMissingPorts.add(entry.portName);
      suggestions.push({
        type: "missing_adapter",
        portName: entry.portName,
        message: `Query "${entry.portName}" has cached data but no registered adapter`,
        action: "Register an adapter or remove stale cache entries.",
      });
    }
  }

  return suggestions;
}
