/**
 * Query resolution error types.
 *
 * QueryResolutionError is a tagged union representing all infrastructure-level
 * query failures produced by the QueryClient.
 *
 * @packageDocumentation
 */

// =============================================================================
// QueryResolutionError Tagged Union
// =============================================================================

export type QueryResolutionError =
  | QueryFetchFailed
  | QueryCancelled
  | QueryTimeout
  | QueryAdapterMissing
  | QueryInvalidationCycle
  | QueryDisposed
  | BatchExecutionFailed;

export interface QueryFetchFailed {
  readonly _tag: "QueryFetchFailed";
  readonly portName: string;
  readonly params: unknown;
  readonly retryAttempt: number;
  readonly cause: unknown;
}

export interface QueryCancelled {
  readonly _tag: "QueryCancelled";
  readonly portName: string;
  readonly params: unknown;
}

export interface QueryTimeout {
  readonly _tag: "QueryTimeout";
  readonly portName: string;
  readonly params: unknown;
  readonly timeoutMs: number;
}

export interface QueryAdapterMissing {
  readonly _tag: "QueryAdapterMissing";
  readonly portName: string;
}

export interface QueryInvalidationCycle {
  readonly _tag: "QueryInvalidationCycle";
  readonly chain: readonly string[];
  readonly depth: number;
}

export interface QueryDisposed {
  readonly _tag: "QueryDisposed";
  readonly portName: string;
}

// =============================================================================
// Constructor Functions
// =============================================================================

import { createError } from "@hex-di/result";

const _queryFetchFailed = createError("QueryFetchFailed");
export function queryFetchFailed(
  portName: string,
  params: unknown,
  retryAttempt: number,
  cause: unknown
): QueryFetchFailed {
  return _queryFetchFailed({ portName, params, retryAttempt, cause });
}

const _queryCancelled = createError("QueryCancelled");
export function queryCancelled(portName: string, params: unknown): QueryCancelled {
  return _queryCancelled({ portName, params });
}

const _queryTimeout = createError("QueryTimeout");
export function queryTimeout(portName: string, params: unknown, timeoutMs: number): QueryTimeout {
  return _queryTimeout({ portName, params, timeoutMs });
}

const _queryAdapterMissing = createError("QueryAdapterMissing");
export function queryAdapterMissing(portName: string): QueryAdapterMissing {
  return _queryAdapterMissing({ portName });
}

const _queryInvalidationCycle = createError("QueryInvalidationCycle");
export function queryInvalidationCycle(
  chain: readonly string[],
  depth: number
): QueryInvalidationCycle {
  return _queryInvalidationCycle({ chain, depth });
}

const _queryDisposed = createError("QueryDisposed");
export function queryDisposed(portName: string): QueryDisposed {
  return _queryDisposed({ portName });
}

// =============================================================================
// BatchExecutionFailed
// =============================================================================

export interface BatchExecutionFailed {
  readonly _tag: "BatchExecutionFailed";
  readonly cause: unknown;
  readonly code: "BATCH_EXECUTION_FAILED";
  readonly isProgrammingError: false;
  readonly message: string;
}

const _batchExecutionFailed = createError("BatchExecutionFailed");
export function BatchExecutionFailed(fields: { readonly cause: unknown }): BatchExecutionFailed {
  const causeMessage = fields.cause instanceof Error ? fields.cause.message : String(fields.cause);
  return _batchExecutionFailed({
    ...fields,
    code: "BATCH_EXECUTION_FAILED" as const,
    isProgrammingError: false as const,
    message: `Batch execution failed: ${causeMessage}. Deferred notifications flushed.`,
  });
}
