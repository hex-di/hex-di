/**
 * Mock Adapter Factories
 *
 * Creates mock query fetchers and mutation executors with controlled responses
 * for testing. No MSW or network mocking needed.
 *
 * These return the fetcher/executor functions directly (the service types
 * of QueryPort and MutationPort). Register them on a test container:
 *
 * ```typescript
 * const container = createTestContainer();
 * container.register(UsersPort, createMockQueryFetcher(UsersPort, { data: [...] }));
 * ```
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
import { ResultAsync } from "@hex-di/result";
import type {
  QueryPort,
  AnyQueryPort,
  MutationPort,
  QueryFetcher,
  MutationExecutor,
  FetchContext,
  MutationContext,
} from "@hex-di/query";

// =============================================================================
// Type guards for data factory vs static value
// =============================================================================

function isDataFactory<T, P>(value: T | ((params: P) => T)): value is (params: P) => T {
  if (stryMutAct_9fa48("79")) {
    {
    }
  } else {
    stryCov_9fa48("79");
    return stryMutAct_9fa48("82")
      ? typeof value !== "function"
      : stryMutAct_9fa48("81")
        ? false
        : stryMutAct_9fa48("80")
          ? true
          : (stryCov_9fa48("80", "81", "82"),
            typeof value === (stryMutAct_9fa48("83") ? "" : (stryCov_9fa48("83"), "function")));
  }
}

/**
 * Returns undefined narrowed to TData via overload signature (no cast).
 * Used when no data is configured for mock adapters.
 */
function undefinedAsData<TData>(): TData;
function undefinedAsData(): undefined {
  if (stryMutAct_9fa48("84")) {
    {
    }
  } else {
    stryCov_9fa48("84");
    return undefined;
  }
}

// =============================================================================
// createMockQueryFetcher
// =============================================================================

/**
 * Options for creating a mock query fetcher.
 *
 * Provide either `data` (for success) or `error` (for failure).
 * `delay` adds artificial latency to simulate network requests.
 */
export interface MockQueryAdapterOptions<TData, TParams, TError> {
  /** Static data or dynamic function returning data. Internally wraps with ResultAsync.ok. */
  readonly data?: TData | ((params: TParams) => TData);
  /** Error to return. Internally wraps with ResultAsync.err. */
  readonly error?: TError;
  /** Delay in milliseconds before returning the result */
  readonly delay?: number;
}
declare function setTimeout(callback: () => void, ms: number): unknown;
function wait(ms: number): Promise<void> {
  if (stryMutAct_9fa48("85")) {
    {
    }
  } else {
    stryCov_9fa48("85");
    return new Promise<void>(resolve => {
      if (stryMutAct_9fa48("86")) {
        {
        }
      } else {
        stryCov_9fa48("86");
        setTimeout(resolve, ms);
      }
    });
  }
}

/**
 * Creates a mock query fetcher with controlled responses.
 *
 * Returns a `QueryFetcher<TData, TParams, TError>` — the service type
 * of a QueryPort. Register it on a container or test container.
 *
 * @example
 * ```typescript
 * // Static data
 * const fetcher = createMockQueryFetcher(UsersPort, {
 *   data: [{ id: "1", name: "Alice" }],
 * });
 * container.register(UsersPort, fetcher);
 *
 * // Dynamic data
 * const fetcher = createMockQueryFetcher(UserByIdPort, {
 *   data: (params) => ({ id: params.id, name: `User ${params.id}` }),
 * });
 *
 * // Error response
 * const fetcher = createMockQueryFetcher(UsersPort, {
 *   error: { _tag: "NetworkError", message: "Failed" },
 * });
 * ```
 */
export function createMockQueryFetcher<
  TName extends string,
  TData,
  TParams,
  TError,
  TDependsOn extends ReadonlyArray<AnyQueryPort>,
>(
  _port: QueryPort<TName, TData, TParams, TError, TDependsOn>,
  options?: MockQueryAdapterOptions<TData, TParams, TError>
): QueryFetcher<TData, TParams, TError> {
  if (stryMutAct_9fa48("87")) {
    {
    }
  } else {
    stryCov_9fa48("87");
    const delay = stryMutAct_9fa48("88")
      ? options?.delay && 0
      : (stryCov_9fa48("88"),
        (stryMutAct_9fa48("89") ? options.delay : (stryCov_9fa48("89"), options?.delay)) ?? 0);
    return (params: TParams, _context: FetchContext) => {
      if (stryMutAct_9fa48("90")) {
        {
        }
      } else {
        stryCov_9fa48("90");
        const makeResult = (): ResultAsync<TData, TError> => {
          if (stryMutAct_9fa48("91")) {
            {
            }
          } else {
            stryCov_9fa48("91");
            if (
              stryMutAct_9fa48("94")
                ? options !== undefined || options.error !== undefined
                : stryMutAct_9fa48("93")
                  ? false
                  : stryMutAct_9fa48("92")
                    ? true
                    : (stryCov_9fa48("92", "93", "94"),
                      (stryMutAct_9fa48("96")
                        ? options === undefined
                        : stryMutAct_9fa48("95")
                          ? true
                          : (stryCov_9fa48("95", "96"), options !== undefined)) &&
                        (stryMutAct_9fa48("98")
                          ? options.error === undefined
                          : stryMutAct_9fa48("97")
                            ? true
                            : (stryCov_9fa48("97", "98"), options.error !== undefined)))
            ) {
              if (stryMutAct_9fa48("99")) {
                {
                }
              } else {
                stryCov_9fa48("99");
                const error: TError = options.error;
                return ResultAsync.err(error);
              }
            }
            if (
              stryMutAct_9fa48("102")
                ? options === undefined && options.data === undefined
                : stryMutAct_9fa48("101")
                  ? false
                  : stryMutAct_9fa48("100")
                    ? true
                    : (stryCov_9fa48("100", "101", "102"),
                      (stryMutAct_9fa48("104")
                        ? options !== undefined
                        : stryMutAct_9fa48("103")
                          ? false
                          : (stryCov_9fa48("103", "104"), options === undefined)) ||
                        (stryMutAct_9fa48("106")
                          ? options.data !== undefined
                          : stryMutAct_9fa48("105")
                            ? false
                            : (stryCov_9fa48("105", "106"), options.data === undefined)))
            ) {
              if (stryMutAct_9fa48("107")) {
                {
                }
              } else {
                stryCov_9fa48("107");
                return ResultAsync.ok(undefinedAsData<TData>());
              }
            }
            const data = options.data;
            if (
              stryMutAct_9fa48("109")
                ? false
                : stryMutAct_9fa48("108")
                  ? true
                  : (stryCov_9fa48("108", "109"), isDataFactory<TData, TParams>(data))
            ) {
              if (stryMutAct_9fa48("110")) {
                {
                }
              } else {
                stryCov_9fa48("110");
                const value: TData = data(params);
                return ResultAsync.ok(value);
              }
            }

            // Static data case: data is TData (narrowed by type guard above)
            return ResultAsync.ok(data);
          }
        };
        if (
          stryMutAct_9fa48("114")
            ? delay <= 0
            : stryMutAct_9fa48("113")
              ? delay >= 0
              : stryMutAct_9fa48("112")
                ? false
                : stryMutAct_9fa48("111")
                  ? true
                  : (stryCov_9fa48("111", "112", "113", "114"), delay > 0)
        ) {
          if (stryMutAct_9fa48("115")) {
            {
            }
          } else {
            stryCov_9fa48("115");
            return ResultAsync.fromSafePromise(wait(delay)).andThen<TData, TError>(
              stryMutAct_9fa48("116") ? () => undefined : (stryCov_9fa48("116"), () => makeResult())
            );
          }
        }
        return makeResult();
      }
    };
  }
}

// =============================================================================
// createMockMutationExecutor
// =============================================================================

/**
 * Options for creating a mock mutation executor.
 */
export interface MockMutationAdapterOptions<TData, TInput, TError> {
  /** Static data or dynamic function returning data. Internally wraps with ResultAsync.ok. */
  readonly data?: TData | ((input: TInput) => TData);
  /** Error to return. Internally wraps with ResultAsync.err. */
  readonly error?: TError;
  /** Delay in milliseconds before returning the result */
  readonly delay?: number;
}

/**
 * Creates a mock mutation executor with controlled responses.
 *
 * Returns a `MutationExecutor<TData, TInput, TError>` — the service type
 * of a MutationPort. Register it on a container or test container.
 *
 * @example
 * ```typescript
 * const executor = createMockMutationExecutor(CreateUserPort, {
 *   data: (input) => ({ id: "new-1", ...input }),
 * });
 * container.register(CreateUserPort, executor);
 * ```
 */
export function createMockMutationExecutor<TName extends string, TData, TInput, TError, TContext>(
  _port: MutationPort<TName, TData, TInput, TError, TContext>,
  options?: MockMutationAdapterOptions<TData, TInput, TError>
): MutationExecutor<TData, TInput, TError> {
  if (stryMutAct_9fa48("117")) {
    {
    }
  } else {
    stryCov_9fa48("117");
    const delay = stryMutAct_9fa48("118")
      ? options?.delay && 0
      : (stryCov_9fa48("118"),
        (stryMutAct_9fa48("119") ? options.delay : (stryCov_9fa48("119"), options?.delay)) ?? 0);
    return (input: TInput, _context: MutationContext) => {
      if (stryMutAct_9fa48("120")) {
        {
        }
      } else {
        stryCov_9fa48("120");
        const makeResult = (): ResultAsync<TData, TError> => {
          if (stryMutAct_9fa48("121")) {
            {
            }
          } else {
            stryCov_9fa48("121");
            if (
              stryMutAct_9fa48("124")
                ? options !== undefined || options.error !== undefined
                : stryMutAct_9fa48("123")
                  ? false
                  : stryMutAct_9fa48("122")
                    ? true
                    : (stryCov_9fa48("122", "123", "124"),
                      (stryMutAct_9fa48("126")
                        ? options === undefined
                        : stryMutAct_9fa48("125")
                          ? true
                          : (stryCov_9fa48("125", "126"), options !== undefined)) &&
                        (stryMutAct_9fa48("128")
                          ? options.error === undefined
                          : stryMutAct_9fa48("127")
                            ? true
                            : (stryCov_9fa48("127", "128"), options.error !== undefined)))
            ) {
              if (stryMutAct_9fa48("129")) {
                {
                }
              } else {
                stryCov_9fa48("129");
                const error: TError = options.error;
                return ResultAsync.err(error);
              }
            }
            if (
              stryMutAct_9fa48("132")
                ? options === undefined && options.data === undefined
                : stryMutAct_9fa48("131")
                  ? false
                  : stryMutAct_9fa48("130")
                    ? true
                    : (stryCov_9fa48("130", "131", "132"),
                      (stryMutAct_9fa48("134")
                        ? options !== undefined
                        : stryMutAct_9fa48("133")
                          ? false
                          : (stryCov_9fa48("133", "134"), options === undefined)) ||
                        (stryMutAct_9fa48("136")
                          ? options.data !== undefined
                          : stryMutAct_9fa48("135")
                            ? false
                            : (stryCov_9fa48("135", "136"), options.data === undefined)))
            ) {
              if (stryMutAct_9fa48("137")) {
                {
                }
              } else {
                stryCov_9fa48("137");
                return ResultAsync.ok(undefinedAsData<TData>());
              }
            }
            const data = options.data;
            if (
              stryMutAct_9fa48("139")
                ? false
                : stryMutAct_9fa48("138")
                  ? true
                  : (stryCov_9fa48("138", "139"), isDataFactory<TData, TInput>(data))
            ) {
              if (stryMutAct_9fa48("140")) {
                {
                }
              } else {
                stryCov_9fa48("140");
                const value: TData = data(input);
                return ResultAsync.ok(value);
              }
            }
            return ResultAsync.ok(data);
          }
        };
        if (
          stryMutAct_9fa48("144")
            ? delay <= 0
            : stryMutAct_9fa48("143")
              ? delay >= 0
              : stryMutAct_9fa48("142")
                ? false
                : stryMutAct_9fa48("141")
                  ? true
                  : (stryCov_9fa48("141", "142", "143", "144"), delay > 0)
        ) {
          if (stryMutAct_9fa48("145")) {
            {
            }
          } else {
            stryCov_9fa48("145");
            return ResultAsync.fromSafePromise(wait(delay)).andThen<TData, TError>(
              stryMutAct_9fa48("146") ? () => undefined : (stryCov_9fa48("146"), () => makeResult())
            );
          }
        }
        return makeResult();
      }
    };
  }
}
