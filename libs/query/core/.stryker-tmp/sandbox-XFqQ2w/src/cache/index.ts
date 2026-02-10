// @ts-nocheck
export { stableStringify } from "./stable-stringify.js";
export { replaceEqualDeep } from "./structural-sharing.js";

export {
  type CacheKey,
  createCacheKey,
  createCacheKeyFromName,
  serializeCacheKey,
  cacheKeyMatchesPort,
} from "./cache-key.js";

export {
  type CacheEntry,
  createPendingEntry,
  createSuccessEntry,
  createErrorEntry,
  withObserverCount,
  withInvalidated,
} from "./cache-entry.js";

export {
  type QueryCache,
  type QueryCacheConfig,
  type CacheEvent,
  type CacheListener,
  type Unsubscribe,
  type GarbageCollectorConfig,
  type Clock,
  createQueryCache,
} from "./query-cache.js";

export { type RetryConfig, fetchWithRetry } from "./retry.js";
