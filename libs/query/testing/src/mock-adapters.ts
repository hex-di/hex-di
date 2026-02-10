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
  return typeof value === "function";
}

/**
 * Returns undefined narrowed to TData via overload signature (no cast).
 * Used when no data is configured for mock adapters.
 */
function undefinedAsData<TData>(): TData;
function undefinedAsData(): undefined {
  return undefined;
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
  return new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });
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
  const delay = options?.delay ?? 0;

  return (params: TParams, _context: FetchContext) => {
    const makeResult = (): ResultAsync<TData, TError> => {
      if (options !== undefined && options.error !== undefined) {
        const error: TError = options.error;
        return ResultAsync.err(error);
      }

      if (options === undefined || options.data === undefined) {
        return ResultAsync.ok(undefinedAsData<TData>());
      }

      const data = options.data;
      if (isDataFactory<TData, TParams>(data)) {
        const value: TData = data(params);
        return ResultAsync.ok(value);
      }

      // Static data case: data is TData (narrowed by type guard above)
      return ResultAsync.ok(data);
    };

    if (delay > 0) {
      return ResultAsync.fromSafePromise(wait(delay)).andThen<TData, TError>(() => makeResult());
    }

    return makeResult();
  };
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
  const delay = options?.delay ?? 0;

  return (input: TInput, _context: MutationContext) => {
    const makeResult = (): ResultAsync<TData, TError> => {
      if (options !== undefined && options.error !== undefined) {
        const error: TError = options.error;
        return ResultAsync.err(error);
      }

      if (options === undefined || options.data === undefined) {
        return ResultAsync.ok(undefinedAsData<TData>());
      }

      const data = options.data;
      if (isDataFactory<TData, TInput>(data)) {
        const value: TData = data(input);
        return ResultAsync.ok(value);
      }

      return ResultAsync.ok(data);
    };

    if (delay > 0) {
      return ResultAsync.fromSafePromise(wait(delay)).andThen<TData, TError>(() => makeResult());
    }

    return makeResult();
  };
}
