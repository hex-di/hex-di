/**
 * Spy Adapters
 *
 * Creates mock fetchers/executors that record all calls for verification.
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
import type { ResultAsync } from "@hex-di/result";
import type {
  QueryPort,
  AnyQueryPort,
  QueryFetcher,
  FetchContext,
  MutationPort,
  MutationExecutor,
  MutationContext,
} from "@hex-di/query";

// =============================================================================
// SpyCall
// =============================================================================

/** A recorded call to the spy fetcher */
export interface SpyCall<TParams> {
  readonly params: TParams;
  readonly timestamp: number;
}

// =============================================================================
// SpyQueryAdapterResult
// =============================================================================

/** The result from creating a spy query fetcher */
export interface SpyQueryAdapterResult<TData, TParams, TError> {
  /** The fetcher to register with the container */
  readonly fetcher: QueryFetcher<TData, TParams, TError>;
  /** All recorded calls */
  readonly calls: ReadonlyArray<SpyCall<TParams>>;
  /** The most recent call, or undefined if no calls made */
  readonly lastCall: SpyCall<TParams> | undefined;
  /** Number of calls made */
  readonly callCount: number;
  /** Reset all recorded calls */
  readonly reset: () => void;
}

// =============================================================================
// createSpyQueryAdapter
// =============================================================================

/**
 * Creates a spy query fetcher that records all fetch calls.
 *
 * Returns a fetcher function (QueryFetcher) and spy metadata.
 * Register the `.fetcher` on the container.
 *
 * @example
 * ```typescript
 * const spy = createSpyQueryAdapter(UsersPort, (params) =>
 *   ResultAsync.ok([{ id: "1", name: "Alice" }])
 * );
 *
 * container.register(UsersPort, spy.fetcher);
 * const client = createQueryClient({ container });
 *
 * await client.fetchQuery(UsersPort, { role: "admin" });
 *
 * expect(spy.callCount).toBe(1);
 * expect(spy.calls[0].params).toEqual({ role: "admin" });
 * ```
 */
export function createSpyQueryAdapter<
  TName extends string,
  TData,
  TParams,
  TError,
  TDependsOn extends ReadonlyArray<AnyQueryPort>,
>(
  _port: QueryPort<TName, TData, TParams, TError, TDependsOn>,
  implementation: (params: TParams) => ResultAsync<TData, TError>
): SpyQueryAdapterResult<TData, TParams, TError> {
  if (stryMutAct_9fa48("157")) {
    {
    }
  } else {
    stryCov_9fa48("157");
    const _calls: SpyCall<TParams>[] = stryMutAct_9fa48("158")
      ? ["Stryker was here"]
      : (stryCov_9fa48("158"), []);
    const fetcher: QueryFetcher<TData, TParams, TError> = (
      params: TParams,
      _context: FetchContext
    ) => {
      if (stryMutAct_9fa48("159")) {
        {
        }
      } else {
        stryCov_9fa48("159");
        _calls.push(
          stryMutAct_9fa48("160")
            ? {}
            : (stryCov_9fa48("160"),
              {
                params,
                timestamp: Date.now(),
              })
        );
        return implementation(params);
      }
    };
    return stryMutAct_9fa48("161")
      ? {}
      : (stryCov_9fa48("161"),
        {
          fetcher,
          get calls(): ReadonlyArray<SpyCall<TParams>> {
            if (stryMutAct_9fa48("162")) {
              {
              }
            } else {
              stryCov_9fa48("162");
              return _calls;
            }
          },
          get lastCall(): SpyCall<TParams> | undefined {
            if (stryMutAct_9fa48("163")) {
              {
              }
            } else {
              stryCov_9fa48("163");
              return _calls[
                stryMutAct_9fa48("164")
                  ? _calls.length + 1
                  : (stryCov_9fa48("164"), _calls.length - 1)
              ];
            }
          },
          get callCount(): number {
            if (stryMutAct_9fa48("165")) {
              {
              }
            } else {
              stryCov_9fa48("165");
              return _calls.length;
            }
          },
          reset: () => {
            if (stryMutAct_9fa48("166")) {
              {
              }
            } else {
              stryCov_9fa48("166");
              _calls.length = 0;
            }
          },
        });
  }
}

// =============================================================================
// SpyMutationCall
// =============================================================================

/** A recorded call to the spy mutation executor */
export interface SpyMutationCall<TInput> {
  readonly input: TInput;
  readonly timestamp: number;
}

// =============================================================================
// SpyMutationAdapterResult
// =============================================================================

/** The result from creating a spy mutation executor */
export interface SpyMutationAdapterResult<TData, TInput, TError> {
  /** The executor to register with the container */
  readonly executor: MutationExecutor<TData, TInput, TError>;
  /** All recorded calls */
  readonly calls: ReadonlyArray<SpyMutationCall<TInput>>;
  /** The most recent call, or undefined if no calls made */
  readonly lastCall: SpyMutationCall<TInput> | undefined;
  /** Number of calls made */
  readonly callCount: number;
  /** Reset all recorded calls */
  readonly reset: () => void;
}

// =============================================================================
// createSpyMutationAdapter
// =============================================================================

/**
 * Creates a spy mutation executor that records all mutation calls.
 *
 * Returns an executor function (MutationExecutor) and spy metadata.
 * Register the `.executor` on the container.
 *
 * @example
 * ```typescript
 * const spy = createSpyMutationAdapter(CreateUserPort, (input) =>
 *   ResultAsync.ok({ id: "1", ...input })
 * );
 *
 * container.register(CreateUserPort, spy.executor);
 * const client = createQueryClient({ container });
 *
 * await client.mutate(CreateUserPort, { name: "Alice" });
 *
 * expect(spy.callCount).toBe(1);
 * expect(spy.calls[0].input).toEqual({ name: "Alice" });
 * ```
 */
export function createSpyMutationAdapter<TName extends string, TData, TInput, TError, TContext>(
  _port: MutationPort<TName, TData, TInput, TError, TContext>,
  implementation: (input: TInput) => ResultAsync<TData, TError>
): SpyMutationAdapterResult<TData, TInput, TError> {
  if (stryMutAct_9fa48("167")) {
    {
    }
  } else {
    stryCov_9fa48("167");
    const _calls: SpyMutationCall<TInput>[] = stryMutAct_9fa48("168")
      ? ["Stryker was here"]
      : (stryCov_9fa48("168"), []);
    const executor: MutationExecutor<TData, TInput, TError> = (
      input: TInput,
      _context: MutationContext
    ) => {
      if (stryMutAct_9fa48("169")) {
        {
        }
      } else {
        stryCov_9fa48("169");
        _calls.push(
          stryMutAct_9fa48("170")
            ? {}
            : (stryCov_9fa48("170"),
              {
                input,
                timestamp: Date.now(),
              })
        );
        return implementation(input);
      }
    };
    return stryMutAct_9fa48("171")
      ? {}
      : (stryCov_9fa48("171"),
        {
          executor,
          get calls(): ReadonlyArray<SpyMutationCall<TInput>> {
            if (stryMutAct_9fa48("172")) {
              {
              }
            } else {
              stryCov_9fa48("172");
              return _calls;
            }
          },
          get lastCall(): SpyMutationCall<TInput> | undefined {
            if (stryMutAct_9fa48("173")) {
              {
              }
            } else {
              stryCov_9fa48("173");
              return _calls[
                stryMutAct_9fa48("174")
                  ? _calls.length + 1
                  : (stryCov_9fa48("174"), _calls.length - 1)
              ];
            }
          },
          get callCount(): number {
            if (stryMutAct_9fa48("175")) {
              {
              }
            } else {
              stryCov_9fa48("175");
              return _calls.length;
            }
          },
          reset: () => {
            if (stryMutAct_9fa48("176")) {
              {
              }
            } else {
              stryCov_9fa48("176");
              _calls.length = 0;
            }
          },
        });
  }
}
