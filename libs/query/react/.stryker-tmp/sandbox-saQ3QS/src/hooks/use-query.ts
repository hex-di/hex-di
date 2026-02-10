/**
 * useQuery Hook
 *
 * Subscribes to a query using useSyncExternalStore for concurrent mode
 * compatibility. Creates a QueryObserver that manages cache subscriptions
 * and automatic fetching.
 *
 * @packageDocumentation
 */
// @ts-nocheck
function stryNS_9fa48() {
  var g =
    (typeof globalThis === "object" && globalThis && globalThis.Math === Math && globalThis) ||
    new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (
    ns.activeMutant === undefined &&
    g.process &&
    g.process.env &&
    g.process.env.__STRYKER_ACTIVE_MUTANT__
  ) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov =
    ns.mutantCoverage ||
    (ns.mutantCoverage = {
      static: {},
      perTest: {},
    });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error("Stryker: Hit count limit reached (" + ns.hitCount + ")");
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
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
  if (stryMutAct_9fa48("321")) {
    {
    }
  } else {
    stryCov_9fa48("321");
    return stryMutAct_9fa48("324")
      ? typeof value !== "function"
      : stryMutAct_9fa48("323")
        ? false
        : stryMutAct_9fa48("322")
          ? true
          : (stryCov_9fa48("322", "323", "324"),
            typeof value === (stryMutAct_9fa48("325") ? "" : (stryCov_9fa48("325"), "function")));
  }
}

/**
 * Type guard: checks if second argument is a params mapper function (vs direct params).
 */
function isParamsMapper<TParams, TDependsOn extends ReadonlyArray<AnyQueryPort>>(
  value: TParams | ((deps: DependencyData<TDependsOn>) => TParams)
): value is (deps: DependencyData<TDependsOn>) => TParams {
  if (stryMutAct_9fa48("326")) {
    {
    }
  } else {
    stryCov_9fa48("326");
    return stryMutAct_9fa48("329")
      ? typeof value !== "function"
      : stryMutAct_9fa48("328")
        ? false
        : stryMutAct_9fa48("327")
          ? true
          : (stryCov_9fa48("327", "328", "329"),
            typeof value === (stryMutAct_9fa48("330") ? "" : (stryCov_9fa48("330"), "function")));
  }
}

/**
 * Narrow Record<string, unknown> to DependencyData after runtime validation.
 * The overload signature asserts the narrower type; the implementation returns as-is.
 */
function narrowDependencyData<TDependsOn extends ReadonlyArray<AnyQueryPort>>(
  data: Record<string, unknown>
): DependencyData<TDependsOn>;
function narrowDependencyData(data: Record<string, unknown>): Record<string, unknown> {
  if (stryMutAct_9fa48("331")) {
    {
    }
  } else {
    stryCov_9fa48("331");
    return data;
  }
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
  client: {
    observe(port: unknown, params: unknown): unknown;
  },
  port: unknown,
  params: unknown
): unknown {
  if (stryMutAct_9fa48("332")) {
    {
    }
  } else {
    stryCov_9fa48("332");
    return client.observe(port, params);
  }
}

/**
 * Create a no-op refetch that returns a pending ResultAsync.
 * Used for the deferred pending state before dependencies resolve.
 */
function noopRefetch<TData, TError>(): ResultAsync<TData, TError | QueryResolutionError>;
function noopRefetch(): ResultAsync<undefined, never> {
  if (stryMutAct_9fa48("333")) {
    {
    }
  } else {
    stryCov_9fa48("333");
    return ResultAsync.ok(undefined);
  }
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
  client: {
    observe(port: unknown, params: unknown, options?: unknown): unknown;
  },
  port: unknown,
  params: unknown,
  options?: unknown
): unknown {
  if (stryMutAct_9fa48("334")) {
    {
    }
  } else {
    stryCov_9fa48("334");
    return client.observe(port, params, options);
  }
}

/**
 * Extract dependencyParams from the options union.
 */
function extractDepParams<TDependsOn extends ReadonlyArray<AnyQueryPort>>(
  options:
    | {
        readonly dependencyParams?: DependencyParamsMap<TDependsOn>;
      }
    | undefined
): DependencyParamsMap<TDependsOn> | undefined;
function extractDepParams(
  options:
    | {
        readonly dependencyParams?: Record<string, unknown>;
      }
    | undefined
): Record<string, unknown> | undefined {
  if (stryMutAct_9fa48("335")) {
    {
    }
  } else {
    stryCov_9fa48("335");
    return stryMutAct_9fa48("336")
      ? options.dependencyParams
      : (stryCov_9fa48("336"), options?.dependencyParams);
  }
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
  if (stryMutAct_9fa48("337")) {
    {
    }
  } else {
    stryCov_9fa48("337");
    const [data, setData] = useState<Record<string, unknown> | undefined>(undefined);
    const observersRef = useRef<
      Array<{
        destroy(): void;
      }>
    >(stryMutAct_9fa48("338") ? ["Stryker was here"] : (stryCov_9fa48("338"), []));
    const portsKey = ports
      .map(stryMutAct_9fa48("339") ? () => undefined : (stryCov_9fa48("339"), p => p.__portName))
      .join(stryMutAct_9fa48("340") ? "" : (stryCov_9fa48("340"), "\0"));
    useEffect(
      () => {
        if (stryMutAct_9fa48("341")) {
          {
          }
        } else {
          stryCov_9fa48("341");
          if (
            stryMutAct_9fa48("344")
              ? ports.length !== 0
              : stryMutAct_9fa48("343")
                ? false
                : stryMutAct_9fa48("342")
                  ? true
                  : (stryCov_9fa48("342", "343", "344"), ports.length === 0)
          )
            return;
          for (const obs of observersRef.current) obs.destroy();
          observersRef.current = stryMutAct_9fa48("345")
            ? ["Stryker was here"]
            : (stryCov_9fa48("345"), []);
          const observers: Array<QueryObserver<unknown, unknown>> = stryMutAct_9fa48("346")
            ? ["Stryker was here"]
            : (stryCov_9fa48("346"), []);
          function check(): void {
            if (stryMutAct_9fa48("347")) {
              {
              }
            } else {
              stryCov_9fa48("347");
              const result: Record<string, unknown> = {};
              for (
                let i = 0;
                stryMutAct_9fa48("350")
                  ? i >= ports.length
                  : stryMutAct_9fa48("349")
                    ? i <= ports.length
                    : stryMutAct_9fa48("348")
                      ? false
                      : (stryCov_9fa48("348", "349", "350"), i < ports.length);
                stryMutAct_9fa48("351") ? i-- : (stryCov_9fa48("351"), i++)
              ) {
                if (stryMutAct_9fa48("352")) {
                  {
                  }
                } else {
                  stryCov_9fa48("352");
                  const state = observers[i].getState();
                  if (
                    stryMutAct_9fa48("355")
                      ? state.data !== undefined
                      : stryMutAct_9fa48("354")
                        ? false
                        : stryMutAct_9fa48("353")
                          ? true
                          : (stryCov_9fa48("353", "354", "355"), state.data === undefined)
                  )
                    return; // not all ready
                  result[ports[i].__portName] = state.data;
                }
              }
              setData(result);
            }
          }
          for (
            let i = 0;
            stryMutAct_9fa48("358")
              ? i >= ports.length
              : stryMutAct_9fa48("357")
                ? i <= ports.length
                : stryMutAct_9fa48("356")
                  ? false
                  : (stryCov_9fa48("356", "357", "358"), i < ports.length);
            stryMutAct_9fa48("359") ? i-- : (stryCov_9fa48("359"), i++)
          ) {
            if (stryMutAct_9fa48("360")) {
              {
              }
            } else {
              stryCov_9fa48("360");
              const depParams = paramsMap ? paramsMap[ports[i].__portName] : undefined;
              const obs = observeAnyPort(client, ports[i], depParams);
              observers.push(obs);
              obs.subscribe(
                stryMutAct_9fa48("361") ? () => undefined : (stryCov_9fa48("361"), () => check())
              );
            }
          }
          observersRef.current = observers;
          check(); // check immediately for cached data

          return () => {
            if (stryMutAct_9fa48("362")) {
              {
              }
            } else {
              stryCov_9fa48("362");
              for (const obs of observers) obs.destroy();
              observersRef.current = stryMutAct_9fa48("363")
                ? ["Stryker was here"]
                : (stryCov_9fa48("363"), []);
            }
          };
        }
      },
      stryMutAct_9fa48("364") ? [] : (stryCov_9fa48("364"), [client, ports, portsKey, paramsMap])
    );
    return (
      stryMutAct_9fa48("367")
        ? ports.length !== 0
        : stryMutAct_9fa48("366")
          ? false
          : stryMutAct_9fa48("365")
            ? true
            : (stryCov_9fa48("365", "366", "367"), ports.length === 0)
    )
      ? undefined
      : data;
  }
}

// =============================================================================
// Pending state factory
// =============================================================================

function createPendingState<TData, TError>(): QueryState<TData, TError> {
  if (stryMutAct_9fa48("368")) {
    {
    }
  } else {
    stryCov_9fa48("368");
    return stryMutAct_9fa48("369")
      ? {}
      : (stryCov_9fa48("369"),
        {
          status: stryMutAct_9fa48("370") ? "" : (stryCov_9fa48("370"), "pending"),
          fetchStatus: stryMutAct_9fa48("371") ? "" : (stryCov_9fa48("371"), "idle"),
          isPending: stryMutAct_9fa48("372") ? false : (stryCov_9fa48("372"), true),
          isSuccess: stryMutAct_9fa48("373") ? true : (stryCov_9fa48("373"), false),
          isError: stryMutAct_9fa48("374") ? true : (stryCov_9fa48("374"), false),
          isFetching: stryMutAct_9fa48("375") ? true : (stryCov_9fa48("375"), false),
          isRefetching: stryMutAct_9fa48("376") ? true : (stryCov_9fa48("376"), false),
          isLoading: stryMutAct_9fa48("377") ? true : (stryCov_9fa48("377"), false),
          isStale: stryMutAct_9fa48("378") ? false : (stryCov_9fa48("378"), true),
          isPlaceholderData: stryMutAct_9fa48("379") ? true : (stryCov_9fa48("379"), false),
          isPaused: stryMutAct_9fa48("380") ? true : (stryCov_9fa48("380"), false),
          result: undefined,
          data: undefined,
          error: null,
          dataUpdatedAt: undefined,
          errorUpdatedAt: undefined,
          refetch: stryMutAct_9fa48("381")
            ? () => undefined
            : (stryCov_9fa48("381"), () => noopRefetch<TData, TError>()),
        });
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
  if (stryMutAct_9fa48("382")) {
    {
    }
  } else {
    stryCov_9fa48("382");
    const client = useQueryClient();

    // --- Dependency resolution (always called, no-op when no dependsOn) ---
    const mapperMode = isParamsMapper<TParams, TDependsOn>(paramsOrMapper);
    const dependsOnPorts: ReadonlyArray<AnyQueryPort> = mapperMode
      ? stryMutAct_9fa48("383")
        ? port.config.dependsOn && []
        : (stryCov_9fa48("383"),
          port.config.dependsOn ??
            (stryMutAct_9fa48("384") ? ["Stryker was here"] : (stryCov_9fa48("384"), [])))
      : stryMutAct_9fa48("385")
        ? ["Stryker was here"]
        : (stryCov_9fa48("385"), []);
    const depParamsMap = extractDepParams<TDependsOn>(options);
    const depData = useDependencyData(client, dependsOnPorts, depParamsMap);

    // Compute effective params: undefined while deps are pending in mapper mode
    const effectiveParams: TParams | undefined = mapperMode
      ? (
          stryMutAct_9fa48("388")
            ? depData === undefined
            : stryMutAct_9fa48("387")
              ? false
              : stryMutAct_9fa48("386")
                ? true
                : (stryCov_9fa48("386", "387", "388"), depData !== undefined)
        )
        ? paramsOrMapper(narrowDependencyData<TDependsOn>(depData))
        : undefined
      : paramsOrMapper;

    // In mapper mode, disable the query while dependencies are pending
    const depsReady = stryMutAct_9fa48("391")
      ? !mapperMode && depData !== undefined
      : stryMutAct_9fa48("390")
        ? false
        : stryMutAct_9fa48("389")
          ? true
          : (stryCov_9fa48("389", "390", "391"),
            (stryMutAct_9fa48("392") ? mapperMode : (stryCov_9fa48("392"), !mapperMode)) ||
              (stryMutAct_9fa48("394")
                ? depData === undefined
                : stryMutAct_9fa48("393")
                  ? false
                  : (stryCov_9fa48("393", "394"), depData !== undefined)));
    const effectiveEnabled = depsReady
      ? stryMutAct_9fa48("395")
        ? options?.enabled && true
        : (stryCov_9fa48("395"),
          (stryMutAct_9fa48("396") ? options.enabled : (stryCov_9fa48("396"), options?.enabled)) ??
            (stryMutAct_9fa48("397") ? false : (stryCov_9fa48("397"), true)))
      : stryMutAct_9fa48("398")
        ? true
        : (stryCov_9fa48("398"), false);

    // Stable reference for the observer across renders
    const observerRef = useRef<QueryObserver<TData, TError> | null>(null);
    // Cached pending state for when observer is null (mapper mode, deps pending)
    const pendingStateRef = useRef<QueryState<TData, TError> | null>(null);
    // Track previous data for placeholderData function
    const previousDataRef = useRef<TData | undefined>(undefined);
    // Serialized previous params for structural equality comparison
    const prevParamsKeyRef = useRef<string>(
      stryMutAct_9fa48("399") ? "Stryker was here!" : (stryCov_9fa48("399"), "")
    );
    // Track whether params have been set at least once (distinguishes void from "not yet available")
    const paramsInitializedRef = useRef(
      stryMutAct_9fa48("400") ? true : (stryCov_9fa48("400"), false)
    );

    // In non-mapper mode, params are always ready (even when undefined for void queries).
    // In mapper mode, params are only ready when dependency data resolves.
    const paramsReady = stryMutAct_9fa48("403")
      ? !mapperMode && depData !== undefined
      : stryMutAct_9fa48("402")
        ? false
        : stryMutAct_9fa48("401")
          ? true
          : (stryCov_9fa48("401", "402", "403"),
            (stryMutAct_9fa48("404") ? mapperMode : (stryCov_9fa48("404"), !mapperMode)) ||
              (stryMutAct_9fa48("406")
                ? depData === undefined
                : stryMutAct_9fa48("405")
                  ? false
                  : (stryCov_9fa48("405", "406"), depData !== undefined)));

    // Serialize params for structural comparison (avoids re-creating observer
    // when params are structurally equal but referentially different, e.g. `{}`)
    const paramsKey = paramsReady
      ? stableStringify(effectiveParams)
      : stryMutAct_9fa48("407")
        ? "Stryker was here!"
        : (stryCov_9fa48("407"), "");

    // Lazily create/recreate observer when params change or observer is destroyed
    const paramsChanged = stryMutAct_9fa48("410")
      ? paramsInitializedRef.current || paramsKey !== prevParamsKeyRef.current
      : stryMutAct_9fa48("409")
        ? false
        : stryMutAct_9fa48("408")
          ? true
          : (stryCov_9fa48("408", "409", "410"),
            paramsInitializedRef.current &&
              (stryMutAct_9fa48("412")
                ? paramsKey === prevParamsKeyRef.current
                : stryMutAct_9fa48("411")
                  ? true
                  : (stryCov_9fa48("411", "412"), paramsKey !== prevParamsKeyRef.current)));
    if (
      stryMutAct_9fa48("415")
        ? paramsReady ||
          observerRef.current === null ||
          observerRef.current.isDestroyed ||
          paramsChanged
        : stryMutAct_9fa48("414")
          ? false
          : stryMutAct_9fa48("413")
            ? true
            : (stryCov_9fa48("413", "414", "415"),
              paramsReady &&
                (stryMutAct_9fa48("417")
                  ? (observerRef.current === null || observerRef.current.isDestroyed) &&
                    paramsChanged
                  : stryMutAct_9fa48("416")
                    ? true
                    : (stryCov_9fa48("416", "417"),
                      (stryMutAct_9fa48("419")
                        ? observerRef.current === null && observerRef.current.isDestroyed
                        : stryMutAct_9fa48("418")
                          ? false
                          : (stryCov_9fa48("418", "419"),
                            (stryMutAct_9fa48("421")
                              ? observerRef.current !== null
                              : stryMutAct_9fa48("420")
                                ? false
                                : (stryCov_9fa48("420", "421"), observerRef.current === null)) ||
                              observerRef.current.isDestroyed)) || paramsChanged)))
    ) {
      if (stryMutAct_9fa48("422")) {
        {
        }
      } else {
        stryCov_9fa48("422");
        // Destroy previous observer if params changed
        if (
          stryMutAct_9fa48("425")
            ? (observerRef.current !== null && !observerRef.current.isDestroyed) || paramsChanged
            : stryMutAct_9fa48("424")
              ? false
              : stryMutAct_9fa48("423")
                ? true
                : (stryCov_9fa48("423", "424", "425"),
                  (stryMutAct_9fa48("427")
                    ? observerRef.current !== null || !observerRef.current.isDestroyed
                    : stryMutAct_9fa48("426")
                      ? true
                      : (stryCov_9fa48("426", "427"),
                        (stryMutAct_9fa48("429")
                          ? observerRef.current === null
                          : stryMutAct_9fa48("428")
                            ? true
                            : (stryCov_9fa48("428", "429"), observerRef.current !== null)) &&
                          (stryMutAct_9fa48("430")
                            ? observerRef.current.isDestroyed
                            : (stryCov_9fa48("430"), !observerRef.current.isDestroyed)))) &&
                    paramsChanged)
        ) {
          if (stryMutAct_9fa48("431")) {
            {
            }
          } else {
            stryCov_9fa48("431");
            observerRef.current.destroy();
          }
        }
        const observerOptions: QueryObserverOptions<TData, TError> = stryMutAct_9fa48("432")
          ? {}
          : (stryCov_9fa48("432"),
            {
              enabled: effectiveEnabled,
              staleTime: stryMutAct_9fa48("433")
                ? options.staleTime
                : (stryCov_9fa48("433"), options?.staleTime),
              refetchOnMount: stryMutAct_9fa48("434")
                ? options.refetchOnMount
                : (stryCov_9fa48("434"), options?.refetchOnMount),
              select: stryMutAct_9fa48("435")
                ? options.select
                : (stryCov_9fa48("435"), options?.select),
            });
        observerRef.current = observePort(client, port, effectiveParams, observerOptions);
        prevParamsKeyRef.current = paramsKey;
        paramsInitializedRef.current = stryMutAct_9fa48("436")
          ? false
          : (stryCov_9fa48("436"), true);
      }
    }
    const observer = observerRef.current;

    // Cleanup observer on unmount
    useEffect(
      () => {
        if (stryMutAct_9fa48("437")) {
          {
          }
        } else {
          stryCov_9fa48("437");
          return () => {
            if (stryMutAct_9fa48("438")) {
              {
              }
            } else {
              stryCov_9fa48("438");
              if (
                stryMutAct_9fa48("441")
                  ? observer === null
                  : stryMutAct_9fa48("440")
                    ? false
                    : stryMutAct_9fa48("439")
                      ? true
                      : (stryCov_9fa48("439", "440", "441"), observer !== null)
              ) {
                if (stryMutAct_9fa48("442")) {
                  {
                  }
                } else {
                  stryCov_9fa48("442");
                  observer.destroy();
                }
              }
            }
          };
        }
      },
      stryMutAct_9fa48("443") ? [] : (stryCov_9fa48("443"), [observer])
    );

    // refetchInterval effect
    useEffect(
      () => {
        if (stryMutAct_9fa48("444")) {
          {
          }
        } else {
          stryCov_9fa48("444");
          const interval = stryMutAct_9fa48("445")
            ? options.refetchInterval
            : (stryCov_9fa48("445"), options?.refetchInterval);
          if (
            stryMutAct_9fa48("448")
              ? (interval === undefined || interval === false || interval <= 0) && observer === null
              : stryMutAct_9fa48("447")
                ? false
                : stryMutAct_9fa48("446")
                  ? true
                  : (stryCov_9fa48("446", "447", "448"),
                    (stryMutAct_9fa48("450")
                      ? (interval === undefined || interval === false) && interval <= 0
                      : stryMutAct_9fa48("449")
                        ? false
                        : (stryCov_9fa48("449", "450"),
                          (stryMutAct_9fa48("452")
                            ? interval === undefined && interval === false
                            : stryMutAct_9fa48("451")
                              ? false
                              : (stryCov_9fa48("451", "452"),
                                (stryMutAct_9fa48("454")
                                  ? interval !== undefined
                                  : stryMutAct_9fa48("453")
                                    ? false
                                    : (stryCov_9fa48("453", "454"), interval === undefined)) ||
                                  (stryMutAct_9fa48("456")
                                    ? interval !== false
                                    : stryMutAct_9fa48("455")
                                      ? false
                                      : (stryCov_9fa48("455", "456"),
                                        interval ===
                                          (stryMutAct_9fa48("457")
                                            ? true
                                            : (stryCov_9fa48("457"), false)))))) ||
                            (stryMutAct_9fa48("460")
                              ? interval > 0
                              : stryMutAct_9fa48("459")
                                ? interval < 0
                                : stryMutAct_9fa48("458")
                                  ? false
                                  : (stryCov_9fa48("458", "459", "460"), interval <= 0)))) ||
                      (stryMutAct_9fa48("462")
                        ? observer !== null
                        : stryMutAct_9fa48("461")
                          ? false
                          : (stryCov_9fa48("461", "462"), observer === null)))
          ) {
            if (stryMutAct_9fa48("463")) {
              {
              }
            } else {
              stryCov_9fa48("463");
              return;
            }
          }
          const timer = setInterval(() => {
            if (stryMutAct_9fa48("464")) {
              {
              }
            } else {
              stryCov_9fa48("464");
              // Skip refetch when document is hidden unless refetchIntervalInBackground is set
              if (
                stryMutAct_9fa48("467")
                  ? (!options?.refetchIntervalInBackground && typeof document !== "undefined") ||
                    document.visibilityState === "hidden"
                  : stryMutAct_9fa48("466")
                    ? false
                    : stryMutAct_9fa48("465")
                      ? true
                      : (stryCov_9fa48("465", "466", "467"),
                        (stryMutAct_9fa48("469")
                          ? !options?.refetchIntervalInBackground || typeof document !== "undefined"
                          : stryMutAct_9fa48("468")
                            ? true
                            : (stryCov_9fa48("468", "469"),
                              (stryMutAct_9fa48("470")
                                ? options?.refetchIntervalInBackground
                                : (stryCov_9fa48("470"),
                                  !(stryMutAct_9fa48("471")
                                    ? options.refetchIntervalInBackground
                                    : (stryCov_9fa48("471"),
                                      options?.refetchIntervalInBackground)))) &&
                                (stryMutAct_9fa48("473")
                                  ? typeof document === "undefined"
                                  : stryMutAct_9fa48("472")
                                    ? true
                                    : (stryCov_9fa48("472", "473"),
                                      typeof document !==
                                        (stryMutAct_9fa48("474")
                                          ? ""
                                          : (stryCov_9fa48("474"), "undefined")))))) &&
                          (stryMutAct_9fa48("476")
                            ? document.visibilityState !== "hidden"
                            : stryMutAct_9fa48("475")
                              ? true
                              : (stryCov_9fa48("475", "476"),
                                document.visibilityState ===
                                  (stryMutAct_9fa48("477")
                                    ? ""
                                    : (stryCov_9fa48("477"), "hidden")))))
              ) {
                if (stryMutAct_9fa48("478")) {
                  {
                  }
                } else {
                  stryCov_9fa48("478");
                  return;
                }
              }
              void observer.refetch();
            }
          }, interval);
          return () => {
            if (stryMutAct_9fa48("479")) {
              {
              }
            } else {
              stryCov_9fa48("479");
              clearInterval(timer);
            }
          };
        }
      },
      stryMutAct_9fa48("480")
        ? []
        : (stryCov_9fa48("480"),
          [
            observer,
            stryMutAct_9fa48("481")
              ? options.refetchInterval
              : (stryCov_9fa48("481"), options?.refetchInterval),
            stryMutAct_9fa48("482")
              ? options.refetchIntervalInBackground
              : (stryCov_9fa48("482"), options?.refetchIntervalInBackground),
          ])
    );

    // Cached placeholder state for referential stability when placeholderData is active
    const placeholderStateRef = useRef<QueryState<TData, TError> | null>(null);
    const subscribe = useCallback(
      (onStoreChange: () => void) => {
        if (stryMutAct_9fa48("483")) {
          {
          }
        } else {
          stryCov_9fa48("483");
          if (
            stryMutAct_9fa48("486")
              ? observer !== null
              : stryMutAct_9fa48("485")
                ? false
                : stryMutAct_9fa48("484")
                  ? true
                  : (stryCov_9fa48("484", "485", "486"), observer === null)
          ) {
            if (stryMutAct_9fa48("487")) {
              {
              }
            } else {
              stryCov_9fa48("487");
              // No observer yet (deps pending) — no-op subscription
              return () => {};
            }
          }
          return observer.subscribe(() => {
            if (stryMutAct_9fa48("488")) {
              {
              }
            } else {
              stryCov_9fa48("488");
              // Clear placeholder cache on state change so getSnapshot re-derives it
              placeholderStateRef.current = null;
              onStoreChange();
            }
          });
        }
      },
      stryMutAct_9fa48("489") ? [] : (stryCov_9fa48("489"), [observer])
    );
    const getSnapshot = useCallback(
      (): QueryState<TData, TError> => {
        if (stryMutAct_9fa48("490")) {
          {
          }
        } else {
          stryCov_9fa48("490");
          if (
            stryMutAct_9fa48("493")
              ? observer !== null
              : stryMutAct_9fa48("492")
                ? false
                : stryMutAct_9fa48("491")
                  ? true
                  : (stryCov_9fa48("491", "492", "493"), observer === null)
          ) {
            if (stryMutAct_9fa48("494")) {
              {
              }
            } else {
              stryCov_9fa48("494");
              // Dependencies still pending — return a cached pending state for referential stability
              if (
                stryMutAct_9fa48("497")
                  ? pendingStateRef.current !== null
                  : stryMutAct_9fa48("496")
                    ? false
                    : stryMutAct_9fa48("495")
                      ? true
                      : (stryCov_9fa48("495", "496", "497"), pendingStateRef.current === null)
              ) {
                if (stryMutAct_9fa48("498")) {
                  {
                  }
                } else {
                  stryCov_9fa48("498");
                  pendingStateRef.current = createPendingState<TData, TError>();
                }
              }
              return pendingStateRef.current;
            }
          }

          // Observer guarantees referential stability: getState() returns the same
          // object when the underlying data hasn't changed.
          const state = observer.getState();

          // Track previous data for placeholderData function
          if (
            stryMutAct_9fa48("501")
              ? state.data === undefined
              : stryMutAct_9fa48("500")
                ? false
                : stryMutAct_9fa48("499")
                  ? true
                  : (stryCov_9fa48("499", "500", "501"), state.data !== undefined)
          ) {
            if (stryMutAct_9fa48("502")) {
              {
              }
            } else {
              stryCov_9fa48("502");
              previousDataRef.current = state.data;
            }
          }

          // placeholderData: provide placeholder while pending
          if (
            stryMutAct_9fa48("505")
              ? state.isPending || options?.placeholderData !== undefined
              : stryMutAct_9fa48("504")
                ? false
                : stryMutAct_9fa48("503")
                  ? true
                  : (stryCov_9fa48("503", "504", "505"),
                    state.isPending &&
                      (stryMutAct_9fa48("507")
                        ? options?.placeholderData === undefined
                        : stryMutAct_9fa48("506")
                          ? true
                          : (stryCov_9fa48("506", "507"),
                            (stryMutAct_9fa48("508")
                              ? options.placeholderData
                              : (stryCov_9fa48("508"), options?.placeholderData)) !== undefined)))
          ) {
            if (stryMutAct_9fa48("509")) {
              {
              }
            } else {
              stryCov_9fa48("509");
              // Return cached placeholder state if underlying state hasn't changed
              if (
                stryMutAct_9fa48("512")
                  ? (placeholderStateRef.current !== null &&
                      placeholderStateRef.current.status === state.status) ||
                    placeholderStateRef.current.fetchStatus === state.fetchStatus
                  : stryMutAct_9fa48("511")
                    ? false
                    : stryMutAct_9fa48("510")
                      ? true
                      : (stryCov_9fa48("510", "511", "512"),
                        (stryMutAct_9fa48("514")
                          ? placeholderStateRef.current !== null ||
                            placeholderStateRef.current.status === state.status
                          : stryMutAct_9fa48("513")
                            ? true
                            : (stryCov_9fa48("513", "514"),
                              (stryMutAct_9fa48("516")
                                ? placeholderStateRef.current === null
                                : stryMutAct_9fa48("515")
                                  ? true
                                  : (stryCov_9fa48("515", "516"),
                                    placeholderStateRef.current !== null)) &&
                                (stryMutAct_9fa48("518")
                                  ? placeholderStateRef.current.status !== state.status
                                  : stryMutAct_9fa48("517")
                                    ? true
                                    : (stryCov_9fa48("517", "518"),
                                      placeholderStateRef.current.status === state.status)))) &&
                          (stryMutAct_9fa48("520")
                            ? placeholderStateRef.current.fetchStatus !== state.fetchStatus
                            : stryMutAct_9fa48("519")
                              ? true
                              : (stryCov_9fa48("519", "520"),
                                placeholderStateRef.current.fetchStatus === state.fetchStatus)))
              ) {
                if (stryMutAct_9fa48("521")) {
                  {
                  }
                } else {
                  stryCov_9fa48("521");
                  return placeholderStateRef.current;
                }
              }
              let placeholder: TData | undefined;
              if (
                stryMutAct_9fa48("523")
                  ? false
                  : stryMutAct_9fa48("522")
                    ? true
                    : (stryCov_9fa48("522", "523"), isPlaceholderFn<TData>(options.placeholderData))
              ) {
                if (stryMutAct_9fa48("524")) {
                  {
                  }
                } else {
                  stryCov_9fa48("524");
                  placeholder = options.placeholderData(previousDataRef.current);
                }
              } else {
                if (stryMutAct_9fa48("525")) {
                  {
                  }
                } else {
                  stryCov_9fa48("525");
                  placeholder = options.placeholderData;
                }
              }
              if (
                stryMutAct_9fa48("528")
                  ? placeholder === undefined
                  : stryMutAct_9fa48("527")
                    ? false
                    : stryMutAct_9fa48("526")
                      ? true
                      : (stryCov_9fa48("526", "527", "528"), placeholder !== undefined)
              ) {
                if (stryMutAct_9fa48("529")) {
                  {
                  }
                } else {
                  stryCov_9fa48("529");
                  const placeholderState: QueryState<TData, TError> = stryMutAct_9fa48("530")
                    ? {}
                    : (stryCov_9fa48("530"),
                      {
                        ...state,
                        data: placeholder,
                        isPlaceholderData: stryMutAct_9fa48("531")
                          ? false
                          : (stryCov_9fa48("531"), true),
                      });
                  placeholderStateRef.current = placeholderState;
                  return placeholderState;
                }
              }
            }
          }
          return state;
        }
      },
      stryMutAct_9fa48("532")
        ? []
        : (stryCov_9fa48("532"),
          [
            observer,
            stryMutAct_9fa48("533")
              ? options.placeholderData
              : (stryCov_9fa48("533"), options?.placeholderData),
          ])
    );
    const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    // throwOnError: throw error for error boundaries (must happen after all hooks)
    if (
      stryMutAct_9fa48("536")
        ? (state.isError && state.error !== null) || options?.throwOnError
        : stryMutAct_9fa48("535")
          ? false
          : stryMutAct_9fa48("534")
            ? true
            : (stryCov_9fa48("534", "535", "536"),
              (stryMutAct_9fa48("538")
                ? state.isError || state.error !== null
                : stryMutAct_9fa48("537")
                  ? true
                  : (stryCov_9fa48("537", "538"),
                    state.isError &&
                      (stryMutAct_9fa48("540")
                        ? state.error === null
                        : stryMutAct_9fa48("539")
                          ? true
                          : (stryCov_9fa48("539", "540"), state.error !== null)))) &&
                (stryMutAct_9fa48("541")
                  ? options.throwOnError
                  : (stryCov_9fa48("541"), options?.throwOnError)))
    ) {
      if (stryMutAct_9fa48("542")) {
        {
        }
      } else {
        stryCov_9fa48("542");
        const shouldThrow = (
          stryMutAct_9fa48("545")
            ? typeof options.throwOnError !== "function"
            : stryMutAct_9fa48("544")
              ? false
              : stryMutAct_9fa48("543")
                ? true
                : (stryCov_9fa48("543", "544", "545"),
                  typeof options.throwOnError ===
                    (stryMutAct_9fa48("546") ? "" : (stryCov_9fa48("546"), "function")))
        )
          ? options.throwOnError(state.error)
          : options.throwOnError;
        if (
          stryMutAct_9fa48("548")
            ? false
            : stryMutAct_9fa48("547")
              ? true
              : (stryCov_9fa48("547", "548"), shouldThrow)
        ) {
          if (stryMutAct_9fa48("549")) {
            {
            }
          } else {
            stryCov_9fa48("549");
            throw state.error;
          }
        }
      }
    }
    return state;
  }
}
