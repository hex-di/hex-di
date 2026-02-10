/**
 * Type-boundary overloads for the query client.
 *
 * Each function uses the overload pattern to cross a type boundary
 * (typically unknown -> T) at a point where runtime code has already
 * verified structural correctness.
 *
 * @packageDocumentation
 */

import type { Result } from "@hex-di/result";
import type { ResultAsync } from "@hex-di/result";

/** Narrow cache entry data from unknown to T after cache lookup. */
export function narrowCacheData<T>(data: unknown): T;
export function narrowCacheData(data: unknown): unknown {
  return data;
}

/** Narrow a Result<unknown, unknown> to a typed Result. */
export function narrowResult<TData, TError>(
  result: Result<unknown, unknown> | undefined
): Result<TData, TError> | undefined;
export function narrowResult(result: unknown): unknown {
  return result;
}

/** Narrow unknown callback/reference to expected type. */
export function narrowCallback<T>(ref: unknown): T;
export function narrowCallback(ref: unknown): unknown {
  return ref;
}

/** Narrow ResultAsync<unknown, unknown> to typed ResultAsync. */
export function narrowResultAsync<TData, TError>(
  raw: ResultAsync<unknown, unknown>
): ResultAsync<TData, TError>;
export function narrowResultAsync(raw: unknown): unknown {
  return raw;
}

/** Narrow inflight promise result after deduplication. */
export function narrowInflight<TData, TError>(
  result: ResultAsync<unknown, unknown>
): ResultAsync<TData, TError>;
export function narrowInflight(result: unknown): unknown {
  return result;
}

/** Narrow type-erased cache entry fields for observer. */
export function narrowEntryData<TData>(data: unknown): TData | undefined;
export function narrowEntryData(data: unknown): unknown {
  return data;
}

export function narrowEntryError<TError>(error: unknown): TError | null;
export function narrowEntryError(error: unknown): unknown {
  return error;
}

export function narrowEntryResult<TData, TError>(
  result: unknown
): Result<TData, TError> | undefined;
export function narrowEntryResult(result: unknown): unknown {
  return result;
}

/** Narrow undefined to a typed parameter (used when invalidating without specific params). */
export function narrowUndefinedAsParams<TParams>(value: undefined): TParams;
export function narrowUndefinedAsParams(value: undefined): undefined {
  return value;
}

/**
 * Narrows unknown selected data to TData via overload signature.
 * The select() function returns unknown by design, but the QueryState
 * interface requires TData. This bridges the type boundary.
 */
export function narrowSelectedData<TData>(data: unknown): TData;
export function narrowSelectedData(data: unknown): unknown {
  return data;
}
