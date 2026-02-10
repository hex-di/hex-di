/**
 * Query and mutation state types.
 *
 * @packageDocumentation
 */
// @ts-nocheck

import type { Result, ResultAsync } from "@hex-di/result";
import type { QueryResolutionError } from "./errors.js";
import type { RefetchOptions } from "./options.js";

// =============================================================================
// Query Status
// =============================================================================

export type QueryStatus = "pending" | "success" | "error";
export type FetchStatus = "idle" | "fetching";

// =============================================================================
// Query State
// =============================================================================

export interface QueryState<TData, TError = Error> {
  // === Status ===
  readonly status: QueryStatus;
  readonly fetchStatus: FetchStatus;

  // === Derived Booleans ===
  readonly isPending: boolean;
  readonly isSuccess: boolean;
  readonly isError: boolean;
  readonly isFetching: boolean;
  readonly isRefetching: boolean;
  readonly isLoading: boolean;
  readonly isStale: boolean;
  readonly isPlaceholderData: boolean;

  // === Result ===
  readonly result: Result<TData, TError> | undefined;

  // === Derived Data ===
  readonly data: TData | undefined;
  readonly error: TError | null;

  // === Timestamps ===
  readonly dataUpdatedAt: number | undefined;
  readonly errorUpdatedAt: number | undefined;

  // === Actions ===
  readonly refetch: (options?: RefetchOptions) => ResultAsync<TData, TError | QueryResolutionError>;
}

// =============================================================================
// Mutation State
// =============================================================================

export type MutationStatus = "idle" | "pending" | "success" | "error";

export interface MutationState<TData, TError = Error> {
  readonly status: MutationStatus;
  readonly isPending: boolean;
  readonly isSuccess: boolean;
  readonly isError: boolean;
  readonly isIdle: boolean;

  readonly result: Result<TData, TError> | undefined;
  readonly data: TData | undefined;
  readonly error: TError | null;
}
