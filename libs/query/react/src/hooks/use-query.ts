/**
 * useQuery Hook
 *
 * Subscribes to a query using useSyncExternalStore for concurrent mode
 * compatibility. Creates a QueryObserver that manages cache subscriptions
 * and automatic fetching.
 *
 * @packageDocumentation
 */

import { useRef, useCallback, useSyncExternalStore, useEffect, useState } from "react";
import { ResultAsync } from "@hex-di/result";
import type {
  QueryPort,
  QueryState,
  QueryObserver,
  QueryObserverOptions,
  QueryClient,
  QueryResolutionError,
  AnyQueryPort,
  DependencyData,
  DependencyParamsMap,
} from "@hex-di/query";
import { stableStringify } from "@hex-di/query";
import { useQueryClient } from "../context/query-client-context.js";

// =============================================================================
// UseQueryOptions
// =============================================================================

export interface UseQueryOptions<TData, _TParams = unknown, TError = unknown> {
  readonly enabled?: boolean;
  readonly staleTime?: number;
  readonly refetchOnMount?: boolean | "always";
  readonly select?: (data: TData) => unknown;
  readonly refetchInterval?: number | false;
  readonly refetchIntervalInBackground?: boolean;
  readonly throwOnError?: boolean | ((error: TError) => boolean);
  readonly structuralSharing?: boolean;
  readonly placeholderData?: TData | ((previousData: TData | undefined) => TData | undefined);
}

// =============================================================================
// Type-safe narrowing helpers (no casts)
// =============================================================================

/**
 * Type guard: checks if placeholderData is a function (vs a static value).
 */
function isPlaceholderFn<TData>(
  value: TData | ((prev: TData | undefined) => TData | undefined)
): value is (prev: TData | undefined) => TData | undefined {
  return typeof value === "function";
}

/**
 * Type guard: checks if second argument is a params mapper function (vs direct params).
 */
function isParamsMapper<TParams, TDependsOn extends ReadonlyArray<AnyQueryPort>>(
  value: TParams | ((deps: DependencyData<TDependsOn>) => TParams)
): value is (deps: DependencyData<TDependsOn>) => TParams {
  return typeof value === "function";
}

/**
 * Narrow Record<string, unknown> to DependencyData after runtime validation.
 * The overload signature asserts the narrower type; the implementation returns as-is.
 */
function narrowDependencyData<TDependsOn extends ReadonlyArray<AnyQueryPort>>(
  data: Record<string, unknown>
): DependencyData<TDependsOn>;
function narrowDependencyData(data: Record<string, unknown>): Record<string, unknown> {
  return data;
}

/**
 * Observe a type-erased dependency port (AnyQueryPort has never for TParams).
 * The overload accepts unknown params to bypass the contravariant TParams constraint.
 */
function observeAnyPort(
  client: QueryClient,
  port: AnyQueryPort,
  params: unknown
): QueryObserver<unknown, unknown>;
function observeAnyPort(
  client: { observe(port: unknown, params: unknown): unknown },
  port: unknown,
  params: unknown
): unknown {
  return client.observe(port, params);
}

/**
 * Create a no-op refetch that returns a pending ResultAsync.
 * Used for the deferred pending state before dependencies resolve.
 */
function noopRefetch<TData, TError>(): ResultAsync<TData, TError | QueryResolutionError>;
function noopRefetch(): ResultAsync<undefined, never> {
  return ResultAsync.ok(undefined);
}

/**
 * Observe a port with dependsOn type parameter erased.
 * QueryClient.observe expects QueryPort<TName, TData, TParams, TError> (TDependsOn defaults to []),
 * but our port may carry a non-empty TDependsOn. This overload bridges that boundary.
 * Also accepts TParams | undefined to handle void query params without casting.
 */
function observePort<
  TData,
  TParams,
  TError,
  TName extends string,
  TDependsOn extends ReadonlyArray<AnyQueryPort>,
>(
  client: QueryClient,
  port: QueryPort<TName, TData, TParams, TError, TDependsOn>,
  params: TParams | undefined,
  options?: QueryObserverOptions<TData, TError>
): QueryObserver<TData, TError>;
function observePort(
  client: { observe(port: unknown, params: unknown, options?: unknown): unknown },
  port: unknown,
  params: unknown,
  options?: unknown
): unknown {
  return client.observe(port, params, options);
}

/**
 * Extract dependencyParams from the options union.
 */
function extractDepParams<TDependsOn extends ReadonlyArray<AnyQueryPort>>(
  options: { readonly dependencyParams?: DependencyParamsMap<TDependsOn> } | undefined
): DependencyParamsMap<TDependsOn> | undefined;
function extractDepParams(
  options: { readonly dependencyParams?: Record<string, unknown> } | undefined
): Record<string, unknown> | undefined {
  return options?.dependencyParams;
}

// =============================================================================
// useDependencyData Hook
// =============================================================================

/**
 * Manages observers for dependency ports and produces a merged data object
 * once all dependencies have resolved. Returns undefined while any dependency
 * is still pending.
 *
 * Always calls useState/useRef/useEffect unconditionally (React rules of hooks).
 */
function useDependencyData(
  client: QueryClient,
  ports: ReadonlyArray<AnyQueryPort>,
  paramsMap: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  const [data, setData] = useState<Record<string, unknown> | undefined>(undefined);
  const observersRef = useRef<Array<{ destroy(): void }>>([]);
  const portsKey = ports.map(p => p.__portName).join("\0");

  useEffect(() => {
    if (ports.length === 0) return;

    for (const obs of observersRef.current) obs.destroy();
    observersRef.current = [];

    const observers: Array<QueryObserver<unknown, unknown>> = [];

    function check(): void {
      const result: Record<string, unknown> = {};
      for (let i = 0; i < ports.length; i++) {
        const state = observers[i].getState();
        if (state.data === undefined) return; // not all ready
        result[ports[i].__portName] = state.data;
      }
      setData(result);
    }

    for (let i = 0; i < ports.length; i++) {
      const depParams = paramsMap ? paramsMap[ports[i].__portName] : undefined;
      const obs = observeAnyPort(client, ports[i], depParams);
      observers.push(obs);
      obs.subscribe(() => check());
    }
    observersRef.current = observers;
    check(); // check immediately for cached data

    return () => {
      for (const obs of observers) obs.destroy();
      observersRef.current = [];
    };
  }, [client, ports, portsKey, paramsMap]);

  return ports.length === 0 ? undefined : data;
}

// =============================================================================
// Pending state factory
// =============================================================================

function createPendingState<TData, TError>(): QueryState<TData, TError> {
  return {
    status: "pending",
    fetchStatus: "idle",
    isPending: true,
    isSuccess: false,
    isError: false,
    isFetching: false,
    isRefetching: false,
    isLoading: false,
    isStale: true,
    isPlaceholderData: false,
    isPaused: false,
    result: undefined,
    data: undefined,
    error: null,
    dataUpdatedAt: undefined,
    errorUpdatedAt: undefined,
    refetch: () => noopRefetch<TData, TError>(),
  };
}

// =============================================================================
// useQuery Hook — Overloads
// =============================================================================

/** Overload 1: standard query (direct params) */
export function useQuery<TData, TParams, TError, TName extends string>(
  port: QueryPort<TName, TData, TParams, TError>,
  params: TParams,
  options?: UseQueryOptions<TData, TParams, TError>
): QueryState<TData, TError>;

/** Overload 2: dependsOn params mapper (auto-deferred until dependency data available) */
export function useQuery<
  TData,
  TParams,
  TError,
  TName extends string,
  TDependsOn extends ReadonlyArray<AnyQueryPort>,
>(
  port: QueryPort<TName, TData, TParams, TError, TDependsOn>,
  paramsMapper: (deps: DependencyData<TDependsOn>) => TParams,
  options: UseQueryOptions<TData, TParams, TError> & {
    readonly dependencyParams: DependencyParamsMap<TDependsOn>;
  }
): QueryState<TData, TError>;

// =============================================================================
// useQuery Hook — Implementation
// =============================================================================

export function useQuery<
  TData,
  TParams,
  TError,
  TName extends string,
  TDependsOn extends ReadonlyArray<AnyQueryPort> = [],
>(
  port: QueryPort<TName, TData, TParams, TError, TDependsOn>,
  paramsOrMapper: TParams | ((deps: DependencyData<TDependsOn>) => TParams),
  options?: UseQueryOptions<TData, TParams, TError> & {
    readonly dependencyParams?: DependencyParamsMap<TDependsOn>;
  }
): QueryState<TData, TError> {
  const client = useQueryClient();

  // --- Dependency resolution (always called, no-op when no dependsOn) ---
  const mapperMode = isParamsMapper<TParams, TDependsOn>(paramsOrMapper);
  const dependsOnPorts: ReadonlyArray<AnyQueryPort> = mapperMode
    ? (port.config.dependsOn ?? [])
    : [];
  const depParamsMap = extractDepParams<TDependsOn>(options);
  const depData = useDependencyData(client, dependsOnPorts, depParamsMap);

  // Compute effective params: undefined while deps are pending in mapper mode
  const effectiveParams: TParams | undefined = mapperMode
    ? depData !== undefined
      ? paramsOrMapper(narrowDependencyData<TDependsOn>(depData))
      : undefined
    : paramsOrMapper;

  // In mapper mode, disable the query while dependencies are pending
  const depsReady = !mapperMode || depData !== undefined;
  const effectiveEnabled = depsReady ? (options?.enabled ?? true) : false;

  // Stable reference for the observer across renders
  const observerRef = useRef<QueryObserver<TData, TError> | null>(null);
  // Cached pending state for when observer is null (mapper mode, deps pending)
  const pendingStateRef = useRef<QueryState<TData, TError> | null>(null);
  // Track previous data for placeholderData function
  const previousDataRef = useRef<TData | undefined>(undefined);
  // Serialized previous params for structural equality comparison
  const prevParamsKeyRef = useRef<string>("");
  // Track whether params have been set at least once (distinguishes void from "not yet available")
  const paramsInitializedRef = useRef(false);

  // In non-mapper mode, params are always ready (even when undefined for void queries).
  // In mapper mode, params are only ready when dependency data resolves.
  const paramsReady = !mapperMode || depData !== undefined;

  // Serialize params for structural comparison (avoids re-creating observer
  // when params are structurally equal but referentially different, e.g. `{}`)
  const paramsKey = paramsReady ? stableStringify(effectiveParams) : "";

  // Lazily create/recreate observer when params change or observer is destroyed
  const paramsChanged = paramsInitializedRef.current && paramsKey !== prevParamsKeyRef.current;
  if (
    paramsReady &&
    (observerRef.current === null || observerRef.current.isDestroyed || paramsChanged)
  ) {
    // Destroy previous observer if params changed
    if (observerRef.current !== null && !observerRef.current.isDestroyed && paramsChanged) {
      observerRef.current.destroy();
    }
    const observerOptions: QueryObserverOptions<TData, TError> = {
      enabled: effectiveEnabled,
      staleTime: options?.staleTime,
      refetchOnMount: options?.refetchOnMount,
      select: options?.select,
    };
    observerRef.current = observePort(client, port, effectiveParams, observerOptions);
    prevParamsKeyRef.current = paramsKey;
    paramsInitializedRef.current = true;
  }

  const observer = observerRef.current;

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observer !== null) {
        observer.destroy();
      }
    };
  }, [observer]);

  // refetchInterval effect
  useEffect(() => {
    const interval = options?.refetchInterval;
    if (interval === undefined || interval === false || interval <= 0 || observer === null) {
      return;
    }

    const timer = setInterval(() => {
      // Skip refetch when document is hidden unless refetchIntervalInBackground is set
      if (
        !options?.refetchIntervalInBackground &&
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        return;
      }
      void observer.refetch();
    }, interval);

    return () => {
      clearInterval(timer);
    };
  }, [observer, options?.refetchInterval, options?.refetchIntervalInBackground]);

  // Cached placeholder state for referential stability when placeholderData is active
  const placeholderStateRef = useRef<QueryState<TData, TError> | null>(null);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (observer === null) {
        // No observer yet (deps pending) — no-op subscription
        return () => {};
      }
      return observer.subscribe(() => {
        // Clear placeholder cache on state change so getSnapshot re-derives it
        placeholderStateRef.current = null;
        onStoreChange();
      });
    },
    [observer]
  );

  const getSnapshot = useCallback((): QueryState<TData, TError> => {
    if (observer === null) {
      // Dependencies still pending — return a cached pending state for referential stability
      if (pendingStateRef.current === null) {
        pendingStateRef.current = createPendingState<TData, TError>();
      }
      return pendingStateRef.current;
    }

    // Observer guarantees referential stability: getState() returns the same
    // object when the underlying data hasn't changed.
    const state = observer.getState();

    // Track previous data for placeholderData function
    if (state.data !== undefined) {
      previousDataRef.current = state.data;
    }

    // placeholderData: provide placeholder while pending
    if (state.isPending && options?.placeholderData !== undefined) {
      // Return cached placeholder state if underlying state hasn't changed
      if (
        placeholderStateRef.current !== null &&
        placeholderStateRef.current.status === state.status &&
        placeholderStateRef.current.fetchStatus === state.fetchStatus
      ) {
        return placeholderStateRef.current;
      }
      let placeholder: TData | undefined;
      if (isPlaceholderFn<TData>(options.placeholderData)) {
        placeholder = options.placeholderData(previousDataRef.current);
      } else {
        placeholder = options.placeholderData;
      }
      if (placeholder !== undefined) {
        const placeholderState: QueryState<TData, TError> = {
          ...state,
          data: placeholder,
          isPlaceholderData: true,
        };
        placeholderStateRef.current = placeholderState;
        return placeholderState;
      }
    }

    return state;
  }, [observer, options?.placeholderData]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // throwOnError: throw error for error boundaries (must happen after all hooks)
  if (state.isError && state.error !== null && options?.throwOnError) {
    const shouldThrow =
      typeof options.throwOnError === "function"
        ? options.throwOnError(state.error)
        : options.throwOnError;
    if (shouldThrow) {
      throw state.error;
    }
  }

  return state;
}
