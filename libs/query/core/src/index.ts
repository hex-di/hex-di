/**
 * @hex-di/query - Typed data fetching and caching for HexDI
 *
 * @packageDocumentation
 */

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
  type QueryAdapterConfigNoDeps,
  type QueryAdapterConfigWithDeps,
  createQueryAdapter,
  type MutationAdapterConfigNoDeps,
  type MutationAdapterConfigWithDeps,
  createMutationAdapter,
  type StreamedQueryAdapterConfigNoDeps,
  type StreamedQueryAdapterConfigWithDeps,
  createStreamedQueryAdapter,
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
  type CacheEntrySnapshot,
  type ReactiveCacheEntry,
  createPendingEntry,
  createReactiveCacheEntry,
  getSnapshot,
  hasSubscribers,
  incrementSubscribers,
  decrementSubscribers,
  getSubscriberCount,
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
  type QueryContainer,
  type FetchTrigger,
  createQueryClient,
  type QueryObserver,
  type QueryObserverOptions,
  createQueryObserver,
  type MutationObserver,
  type MutationObserverOptions,
  createMutationObserver,
  type DehydratedState,
  dehydrate,
  hydrate,
} from "./client/index.js";

// =============================================================================
// Reactivity
// =============================================================================

export {
  createSignal,
  createComputed,
  createEffect,
  untracked,
  batch,
  isInBatch,
  getBatchDepth,
  batchTargets,
  setBatchDiagnostics,
  createIsolatedReactiveSystem,
} from "./reactivity/index.js";

export type {
  Signal,
  Computed,
  ReactiveEffect,
  ReactiveSystemInstance,
} from "./reactivity/index.js";

// =============================================================================
// Persistence
// =============================================================================

export {
  type CachePersister,
  type PersistenceError,
  type PersistenceConfig,
  type PersistenceManager,
  createPersistenceManager,
} from "./persistence/index.js";

// =============================================================================
// Inspector
// =============================================================================

export {
  type QueryInspectorAPI,
  type QueryInspectorOptions,
  type QueryInspectorEvent,
  type QuerySnapshot,
  type QueryEntrySnapshot,
  type InFlightSnapshot,
  type CacheStats,
  type FetchHistoryEntry,
  type FetchHistoryFilter,
  type InvalidationGraph,
  type RuntimeInvalidationEdge,
  type QueryDependencyGraph,
  type QueryDiagnosticSummary,
  type QuerySuggestion,
  type QueryPortInfo,
  createQueryInspector,
  QueryInspectorPort,
} from "./inspector/index.js";

// =============================================================================
// Integration
// =============================================================================

export {
  createQueryLibraryInspector,
  QueryLibraryInspectorAdapter,
  QueryLibraryInspectorPort,
} from "./integration/index.js";

// =============================================================================
// Tracing
// =============================================================================

export {
  type TracerLike,
  type QueryFetchSpanAttributes,
  type QueryFetchEndAttributes,
  type QueryMutationSpanAttributes,
  type QueryMutationEndAttributes,
  type QueryTracingHook,
  type QueryTracingHookOptions,
  type QueryTracingBridgeConfig,
  createQueryTracingHook,
  createQueryTracingBridge,
} from "./tracing/index.js";

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
  BatchExecutionFailed,
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
  type DependencyData,
  type DependencyParamsMap,

  // Compile-time Validators
  type ValidateQueryDependencies,
  type FindMissingPorts,
  type ValidateMutationEffects,
  type ValidateQueryAdapterLifetime,
  type AdjacencyMap,
  type AddEdge,
  type IsReachable,
  type IsReachableViaNeighbors,
} from "./types/index.js";
