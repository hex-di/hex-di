/**
 * Query Assertion Helpers
 *
 * Fluent assertion helpers for QueryState, cache entries, and query results.
 *
 * @packageDocumentation
 */

import { expect } from "vitest";
import type { Result } from "@hex-di/result";
import type { QueryState } from "@hex-di/query";

// =============================================================================
// expectQueryState
// =============================================================================

/**
 * Fluent assertions for QueryState.
 *
 * @example
 * ```typescript
 * const state = observer.getCurrentState();
 * expectQueryState(state).toBeSuccess([{ id: "1", name: "Alice" }]);
 * ```
 */
export function expectQueryState<TData, TError>(
  state: QueryState<TData, TError>
): QueryStateAssertions<TData, TError> {
  return {
    toBeLoading() {
      expect(state.isFetching).toBe(true);
      expect(state.status).toBe("pending");
    },
    toBeSuccess(data?: TData) {
      expect(state.status).toBe("success");
      expect(state.isSuccess).toBe(true);
      if (data !== undefined) {
        expect(state.data).toEqual(data);
      }
    },
    toBeError(error?: TError) {
      expect(state.status).toBe("error");
      expect(state.isError).toBe(true);
      if (error !== undefined) {
        expect(state.error).toEqual(error);
      }
    },
    toBeRefetching() {
      expect(state.isRefetching).toBe(true);
      expect(state.isFetching).toBe(true);
    },
    toBeFresh() {
      expect(state.isStale).toBe(false);
    },
    toBeStale() {
      expect(state.isStale).toBe(true);
    },
  };
}

export interface QueryStateAssertions<TData, TError> {
  /** Assert state is loading (pending + fetching) */
  toBeLoading(): void;
  /** Assert state is success, optionally checking data */
  toBeSuccess(data?: TData): void;
  /** Assert state is error, optionally checking error value */
  toBeError(error?: TError): void;
  /** Assert state is refetching */
  toBeRefetching(): void;
  /** Assert data is fresh (not stale) */
  toBeFresh(): void;
  /** Assert data is stale */
  toBeStale(): void;
}

// =============================================================================
// expectQueryResult
// =============================================================================

/**
 * Fluent assertions for query Results.
 *
 * @example
 * ```typescript
 * const result = await queryClient.fetch(UsersPort, {});
 * expectQueryResult(result).toBeOk([{ id: "1", name: "Alice" }]);
 * ```
 */
export function expectQueryResult<TData, TError>(
  result: Result<TData, TError> | undefined
): QueryResultAssertions<TData, TError> {
  return {
    toBeOk(data?: TData) {
      expect(result).toBeDefined();
      if (result === undefined) return;
      expect(result._tag).toBe("Ok");
      if (data !== undefined && result._tag === "Ok") {
        expect(result.value).toEqual(data);
      }
    },
    toBeErr(error?: TError) {
      expect(result).toBeDefined();
      if (result === undefined) return;
      expect(result._tag).toBe("Err");
      if (error !== undefined && result._tag === "Err") {
        expect(result.error).toEqual(error);
      }
    },
    toBeUndefined() {
      expect(result).toBeUndefined();
    },
  };
}

export interface QueryResultAssertions<TData, TError> {
  /** Assert result is Ok, optionally checking value */
  toBeOk(data?: TData): void;
  /** Assert result is Err, optionally checking error */
  toBeErr(error?: TError): void;
  /** Assert result is undefined */
  toBeUndefined(): void;
}
