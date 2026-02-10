/**
 * @hex-di/query - Typed data fetching and caching for HexDI
 *
 * @packageDocumentation
 */
// @ts-nocheck

// =============================================================================
// Ports
// =============================================================================

export {
  type QueryPort,
  type AnyQueryPort,
  type QueryPortConfig,
  createQueryPort,
  isQueryPort,
  QUERY_PORT_SYMBOL,
  type MutationPort,
  type AnyMutationPort,
  type MutationPortConfig,
  createMutationPort,
  isMutationPort,
  MUTATION_PORT_SYMBOL,
  type QueryFetcher,
  type MutationExecutor,
  type FetchContext,
  type MutationContext,
  type MutationEffects,
  type StreamedFetcher,
} from "./ports/index.js";

// =============================================================================
// Adapters
// =============================================================================

export {
  type QueryAdapter,
  type QueryAdapterConfig,
  createQueryAdapter,
  isQueryAdapter,
  QUERY_ADAPTER_SYMBOL,
  type MutationAdapter,
  type MutationAdapterConfig,
  createMutationAdapter,
  isMutationAdapter,
  MUTATION_ADAPTER_SYMBOL,
} from "./adapters/index.js";

// =============================================================================
// Cache
// =============================================================================

export {
  stableStringify,
  replaceEqualDeep,
  type CacheKey,
  createCacheKey,
  createCacheKeyFromName,
  serializeCacheKey,
  cacheKeyMatchesPort,
  type CacheEntry,
  createPendingEntry,
  type QueryCache,
  type QueryCacheConfig,
  type CacheEvent,
  type CacheListener,
  type Unsubscribe,
  type GarbageCollectorConfig,
  type Clock,
  createQueryCache,
  type RetryConfig,
  fetchWithRetry,
} from "./cache/index.js";

// =============================================================================
// Client
// =============================================================================

export {
  type QueryClient,
  type QueryClientConfig,
  type QueryClientEvent,
  createQueryClient,
  type QueryObserver,
  type QueryObserverOptions,
  createQueryObserver,
  type DehydratedState,
  dehydrate,
  hydrate,
} from "./client/index.js";

// =============================================================================
// Inspector
// =============================================================================

export {
  type QueryInspectorAPI,
  type QueryInspectorOptions,
  type QueryInspectorEvent,
  type QuerySnapshot,
  type CacheStats,
  type FetchHistoryEntry,
  type FetchHistoryFilter,
  type InvalidationGraph,
  type QueryDependencyGraph,
  type QueryDiagnosticSummary,
  type QuerySuggestion,
  createQueryInspector,
} from "./inspector/index.js";

// =============================================================================
// Types
// =============================================================================

export {
  // Errors
  type QueryResolutionError,
  type QueryFetchFailed,
  type QueryCancelled,
  type QueryTimeout,
  type QueryAdapterMissing,
  type QueryInvalidationCycle,
  type QueryDisposed,
  queryFetchFailed,
  queryCancelled,
  queryTimeout,
  queryAdapterMissing,
  queryInvalidationCycle,
  queryDisposed,

  // Options
  type QueryDefaults,
  type MutationDefaults,
  type FetchOptions,
  type PrefetchOptions,
  type EnsureOptions,
  type RefetchOptions,
  type MutateOptions,
  DEFAULT_QUERY_OPTIONS,

  // State
  type QueryState,
  type MutationState,
  type QueryStatus,
  type FetchStatus,
  type MutationStatus,

  // Inference Utilities
  type InferQueryData,
  type InferQueryParams,
  type InferQueryError,
  type InferQueryName,
  type InferQueryDependsOn,
  type InferQueryDependencyNames,
  type InferQueryTypes,
  type HasParams,
  type InferMutationData,
  type InferMutationInput,
  type InferMutationError,
  type InferMutationContext,
  type InferMutationName,
  type InferMutationTypes,
  type InferInvalidatedPorts,
  type InferRemovedPorts,

  // Compile-time Validators
  type ValidateQueryDependencies,
  type FindMissingPorts,
  type ValidateMutationEffects,
  type ValidateQueryAdapterLifetime,
} from "./types/index.js";
