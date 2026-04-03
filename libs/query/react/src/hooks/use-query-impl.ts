/**
 * useQuery implementation - core hook logic.
 *
 * @packageDocumentation
 */

import { useRef, useCallback, useSyncExternalStore, useEffect } from "react";
import type {
  QueryPort,
  QueryState,
  QueryObserver,
  QueryObserverOptions,
  AnyQueryPort,
  DependencyData,
  DependencyParamsMap,
} from "@hex-di/query";
import { stableStringify } from "@hex-di/query";
import { useQueryClient } from "../context/query-client-context.js";
import {
  isPlaceholderFn,
  isParamsMapper,
  narrowDependencyData,
  extractDepParams,
  observePort,
  createPendingState,
} from "./use-query-helpers.js";
import { useDependencyData } from "./use-dependency-data.js";

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
// Internal helpers to reduce cyclomatic complexity
// =============================================================================

function syncObserver<TData, TParams, TError, TDependsOn extends ReadonlyArray<AnyQueryPort> = []>(
  observerRef: React.MutableRefObject<QueryObserver<TData, TError> | null>,
  prevParamsKeyRef: React.MutableRefObject<string>,
  paramsInitializedRef: React.MutableRefObject<boolean>,
  paramsReady: boolean,
  paramsKey: string,
  client: ReturnType<typeof useQueryClient>,
  port: QueryPort<string, TData, TParams, TError, TDependsOn>,
  effectiveParams: TParams | undefined,
  effectiveEnabled: boolean,
  options: UseQueryOptions<TData, TParams, TError> | undefined
): void {
  const paramsChanged = paramsInitializedRef.current && paramsKey !== prevParamsKeyRef.current;
  if (!paramsReady) return;
  if (observerRef.current !== null && !observerRef.current.isDestroyed && !paramsChanged) return;

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

function derivePlaceholderState<TData, TError>(
  state: QueryState<TData, TError>,
  placeholderData: TData | ((previousData: TData | undefined) => TData | undefined),
  previousDataRef: React.MutableRefObject<TData | undefined>,
  placeholderStateRef: React.MutableRefObject<QueryState<TData, TError> | null>
): QueryState<TData, TError> | undefined {
  if (
    placeholderStateRef.current !== null &&
    placeholderStateRef.current.status === state.status &&
    placeholderStateRef.current.fetchStatus === state.fetchStatus
  ) {
    return placeholderStateRef.current;
  }
  let placeholder: TData | undefined;
  if (isPlaceholderFn<TData>(placeholderData)) {
    placeholder = placeholderData(previousDataRef.current);
  } else {
    placeholder = placeholderData;
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
  return undefined;
}

function useRefetchInterval<TData, TError>(
  observer: QueryObserver<TData, TError> | null,
  refetchInterval: number | false | undefined,
  refetchIntervalInBackground: boolean | undefined
): void {
  useEffect(() => {
    if (
      refetchInterval === undefined ||
      refetchInterval === false ||
      refetchInterval <= 0 ||
      observer === null
    ) {
      return;
    }

    const timer = setInterval(() => {
      if (
        !refetchIntervalInBackground &&
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        return;
      }
      void observer.refetch();
    }, refetchInterval);

    return () => {
      clearInterval(timer);
    };
  }, [observer, refetchInterval, refetchIntervalInBackground]);
}

function checkThrowOnError<TData, TError>(
  state: QueryState<TData, TError>,
  throwOnError: boolean | ((error: TError) => boolean) | undefined
): void {
  if (!state.isError || state.error === null || !throwOnError) return;
  const shouldThrow = typeof throwOnError === "function" ? throwOnError(state.error) : throwOnError;
  if (shouldThrow) {
    throw state.error;
  }
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
  syncObserver(
    observerRef,
    prevParamsKeyRef,
    paramsInitializedRef,
    paramsReady,
    paramsKey,
    client,
    port,
    effectiveParams,
    effectiveEnabled,
    options
  );

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
  useRefetchInterval(observer, options?.refetchInterval, options?.refetchIntervalInBackground);

  // Cached placeholder state for referential stability when placeholderData is active
  const placeholderStateRef = useRef<QueryState<TData, TError> | null>(null);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (observer === null) {
        return () => {};
      }
      return observer.subscribe(() => {
        placeholderStateRef.current = null;
        onStoreChange();
      });
    },
    [observer]
  );

  const getSnapshot = useCallback((): QueryState<TData, TError> => {
    if (observer === null) {
      if (pendingStateRef.current === null) {
        pendingStateRef.current = createPendingState<TData, TError>();
      }
      return pendingStateRef.current;
    }

    const state = observer.getState();

    if (state.data !== undefined) {
      previousDataRef.current = state.data;
    }

    if (state.isPending && options?.placeholderData !== undefined) {
      const derived = derivePlaceholderState(
        state,
        options.placeholderData,
        previousDataRef,
        placeholderStateRef
      );
      if (derived !== undefined) return derived;
    }

    return state;
  }, [observer, options?.placeholderData]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // throwOnError: throw error for error boundaries (must happen after all hooks)
  checkThrowOnError(state, options?.throwOnError);

  return state;
}
