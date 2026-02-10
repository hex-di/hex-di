/**
 * Query resolution error types.
 *
 * QueryResolutionError is a tagged union representing all infrastructure-level
 * query failures produced by the QueryClient.
 *
 * @packageDocumentation
 */
// @ts-nocheck

// =============================================================================
// QueryResolutionError Tagged Union
// =============================================================================

export type QueryResolutionError =
  | QueryFetchFailed
  | QueryCancelled
  | QueryTimeout
  | QueryAdapterMissing
  | QueryInvalidationCycle
  | QueryDisposed;

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

export function queryFetchFailed(
  portName: string,
  params: unknown,
  retryAttempt: number,
  cause: unknown
): QueryFetchFailed {
  return { _tag: "QueryFetchFailed", portName, params, retryAttempt, cause };
}

export function queryCancelled(portName: string, params: unknown): QueryCancelled {
  return { _tag: "QueryCancelled", portName, params };
}

export function queryTimeout(portName: string, params: unknown, timeoutMs: number): QueryTimeout {
  return { _tag: "QueryTimeout", portName, params, timeoutMs };
}

export function queryAdapterMissing(portName: string): QueryAdapterMissing {
  return { _tag: "QueryAdapterMissing", portName };
}

export function queryInvalidationCycle(
  chain: readonly string[],
  depth: number
): QueryInvalidationCycle {
  return { _tag: "QueryInvalidationCycle", chain, depth };
}

export function queryDisposed(portName: string): QueryDisposed {
  return { _tag: "QueryDisposed", portName };
}
