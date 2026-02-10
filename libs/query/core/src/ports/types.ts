/**
 * Port type definitions for query and mutation ports.
 *
 * @packageDocumentation
 */

import type { ResultAsync } from "@hex-di/result";
import type { AnyQueryPort } from "./query-port.js";

// =============================================================================
// QueryFetcher - Service type for query ports
// =============================================================================

export type QueryFetcher<TData, TParams, TError> = (
  params: TParams,
  context: FetchContext
) => ResultAsync<TData, TError>;

// =============================================================================
// MutationExecutor - Service type for mutation ports
// =============================================================================

export type MutationExecutor<TData, TInput, TError> = (
  input: TInput,
  context: MutationContext
) => ResultAsync<TData, TError>;

// =============================================================================
// FetchContext
// =============================================================================

export interface FetchContext {
  /** AbortSignal for cancellation */
  readonly signal: AbortSignal;

  /** Custom metadata passed to the fetcher */
  readonly meta?: Readonly<Record<string, unknown>>;

  /** Page parameter for infinite queries */
  readonly pageParam?: unknown;

  /** Direction for infinite queries */
  readonly direction?: "forward" | "backward";

  /**
   * Optional callback for progressive/streaming cache updates.
   * Called with intermediate reduced values as chunks arrive,
   * enabling UI updates before the full stream completes.
   */
  readonly onProgress?: (intermediateData: unknown) => void;
}

// =============================================================================
// MutationContext
// =============================================================================

export interface MutationContext {
  /** AbortSignal for cancellation */
  readonly signal: AbortSignal;

  /** Custom metadata */
  readonly meta?: Readonly<Record<string, unknown>>;
}

// =============================================================================
// Mutation Effects
// =============================================================================

/**
 * Unvalidated effects -- used in createMutationPort config where graph
 * context is not yet available. Accepts any QueryPort.
 */
export interface MutationEffects {
  /** Query ports to mark stale and refetch. Active queries refetch immediately. */
  readonly invalidates?: ReadonlyArray<AnyQueryPort>;

  /** Query ports to remove from cache entirely. */
  readonly removes?: ReadonlyArray<AnyQueryPort>;
}

// =============================================================================
// Streamed Fetcher
// =============================================================================

export type StreamedFetcher<TData, TParams, TError, TChunk> = (
  params: TParams,
  context: FetchContext
) => ResultAsync<
  {
    stream: AsyncIterable<TChunk>;
    reducer: (acc: TData, chunk: TChunk) => TData;
    initialValue: TData;
    refetchMode?: "reset" | "append" | "replace";
  },
  TError
>;
