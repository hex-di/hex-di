/**
 * Configuration options for queries and mutations.
 *
 * @packageDocumentation
 */

// =============================================================================
// Query Defaults
// =============================================================================

/**
 * Default configuration values for queries.
 * Specified at port level, overridable per-use.
 */
export interface QueryDefaults {
  /** Time before data is considered stale (ms). Default: 0 */
  readonly staleTime: number;

  /** Time to keep unused data in cache after last observer detaches (ms). Default: 300_000 (5 min) */
  readonly cacheTime: number;

  /** Number of retry attempts on failure. Default: 3 */
  readonly retry: number | boolean | ((failureCount: number, error: unknown) => boolean);

  /** Delay between retries. Default: exponential backoff */
  readonly retryDelay: number | ((attempt: number, error: unknown) => number);

  /** Refetch on component mount. Default: true */
  readonly refetchOnMount: boolean | "always";

  /** Refetch on window focus. Default: true */
  readonly refetchOnWindowFocus: boolean | "always";

  /** Refetch on network reconnect. Default: true */
  readonly refetchOnReconnect: boolean | "always";

  /** Auto-refetch interval (ms). Default: false (disabled) */
  readonly refetchInterval: number | false;

  /** Continue polling when window is not focused. Default: false */
  readonly refetchIntervalInBackground: boolean;

  /** Network mode. Default: "online" */
  readonly networkMode: "online" | "always" | "offlineFirst";

  /** Structural sharing for stable references. Default: true */
  readonly structuralSharing: boolean;
}

/**
 * Global default values for query configuration.
 */
export const DEFAULT_QUERY_OPTIONS: QueryDefaults = {
  staleTime: 0,
  cacheTime: 300_000,
  retry: 3,
  retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 30_000),
  refetchOnMount: true,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchInterval: false,
  refetchIntervalInBackground: false,
  networkMode: "online",
  structuralSharing: true,
};

// =============================================================================
// Mutation Defaults
// =============================================================================

/**
 * Default configuration values for mutations.
 */
export interface MutationDefaults {
  readonly retry?: number | boolean;
  readonly retryDelay?: number;
}

// =============================================================================
// Fetch Options
// =============================================================================

export interface FetchOptions {
  readonly staleTime?: number;
  readonly signal?: AbortSignal;
  readonly meta?: Readonly<Record<string, unknown>>;
}

export interface PrefetchOptions {
  readonly staleTime?: number;
  readonly signal?: AbortSignal;
}

export interface EnsureOptions {
  readonly staleTime?: number;
  readonly signal?: AbortSignal;
}

// =============================================================================
// Refetch Options
// =============================================================================

export interface RefetchOptions {
  readonly cancelRefetch?: boolean;
}

// =============================================================================
// Mutate Options
// =============================================================================

export interface MutateOptions<TData, TInput, TError, TContext> {
  readonly signal?: AbortSignal;
  readonly meta?: Readonly<Record<string, unknown>>;
  readonly onMutate?: (input: TInput) => TContext | Promise<TContext>;
  readonly onSuccess?: (data: TData, input: TInput, context: TContext | undefined) => void;
  readonly onError?: (error: TError, input: TInput, context: TContext | undefined) => void;
  readonly onSettled?: (
    data: TData | undefined,
    error: TError | undefined,
    input: TInput,
    context: TContext | undefined
  ) => void;
}
