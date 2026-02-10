/**
 * Spy Adapters
 *
 * Creates mock fetchers/executors that record all calls for verification.
 *
 * @packageDocumentation
 */

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
  const _calls: SpyCall<TParams>[] = [];

  const fetcher: QueryFetcher<TData, TParams, TError> = (
    params: TParams,
    _context: FetchContext
  ) => {
    _calls.push({
      params,
      timestamp: Date.now(),
    });
    return implementation(params);
  };

  return {
    fetcher,
    get calls(): ReadonlyArray<SpyCall<TParams>> {
      return _calls;
    },
    get lastCall(): SpyCall<TParams> | undefined {
      return _calls[_calls.length - 1];
    },
    get callCount(): number {
      return _calls.length;
    },
    reset: () => {
      _calls.length = 0;
    },
  };
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
  const _calls: SpyMutationCall<TInput>[] = [];

  const executor: MutationExecutor<TData, TInput, TError> = (
    input: TInput,
    _context: MutationContext
  ) => {
    _calls.push({
      input,
      timestamp: Date.now(),
    });
    return implementation(input);
  };

  return {
    executor,
    get calls(): ReadonlyArray<SpyMutationCall<TInput>> {
      return _calls;
    },
    get lastCall(): SpyMutationCall<TInput> | undefined {
      return _calls[_calls.length - 1];
    },
    get callCount(): number {
      return _calls.length;
    },
    reset: () => {
      _calls.length = 0;
    },
  };
}
