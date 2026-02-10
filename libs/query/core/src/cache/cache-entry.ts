/**
 * Reactive cache entry backed by alien-signals.
 *
 * Each cache entry is a mutable signal container rather than an immutable
 * frozen object. Source signals hold the raw data, and computed signals
 * derive the convenience booleans (isPending, isSuccess, etc.).
 *
 * @packageDocumentation
 */

import type { Result } from "@hex-di/result";
import type { QueryStatus, FetchStatus } from "../types/state.js";
import { createSignal, createComputed } from "../reactivity/signals.js";
import type { Signal, Computed } from "../reactivity/signals.js";
import type { ReactiveSystemInstance } from "../reactivity/system-factory.js";

// =============================================================================
// ReactiveCacheEntry
// =============================================================================

/**
 * A signal-backed cache entry. Source signals are written by the cache;
 * computed signals derive convenience state for observers and hooks.
 */
export interface ReactiveCacheEntry<TData, TError = Error> {
  /** The cache key this entry belongs to (for identification) */
  readonly key: string;

  // === Source Signals ===
  readonly result$: Signal<Result<TData, TError> | undefined>;
  readonly fetchStatus$: Signal<FetchStatus>;
  readonly fetchCount$: Signal<number>;
  readonly isInvalidated$: Signal<boolean>;
  readonly dataUpdatedAt$: Signal<number | undefined>;
  readonly errorUpdatedAt$: Signal<number | undefined>;

  // === Derived Computeds ===
  readonly status: Computed<QueryStatus>;
  readonly data: Computed<TData | undefined>;
  readonly error: Computed<TError | null>;
  readonly isPending: Computed<boolean>;
  readonly isSuccess: Computed<boolean>;
  readonly isError: Computed<boolean>;
  readonly isFetching: Computed<boolean>;
  readonly isLoading: Computed<boolean>;
  readonly isRefetching: Computed<boolean>;
}

// =============================================================================
// CacheEntrySnapshot — non-reactive plain object
// =============================================================================

export interface CacheEntrySnapshot<TData = unknown, TError = unknown> {
  readonly result: Result<TData, TError> | undefined;
  readonly data: TData | undefined;
  readonly error: TError | null;
  readonly status: QueryStatus;
  readonly fetchStatus: FetchStatus;
  readonly dataUpdatedAt: number | undefined;
  readonly errorUpdatedAt: number | undefined;
  readonly fetchCount: number;
  readonly isInvalidated: boolean;
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Creates a reactive cache entry with signal-backed state.
 *
 * @param key - Serialized cache key identifying this entry
 * @param system - Optional isolated reactive system for per-scope isolation
 */
export function createReactiveCacheEntry<TData, TError>(
  key: string,
  system?: ReactiveSystemInstance
): ReactiveCacheEntry<TData, TError> {
  // Source signals
  const result$ = createSignal<Result<TData, TError> | undefined>(undefined, system);
  const fetchStatus$ = createSignal<FetchStatus>("idle", system);
  const fetchCount$ = createSignal<number>(0, system);
  const isInvalidated$ = createSignal<boolean>(false, system);
  const dataUpdatedAt$ = createSignal<number | undefined>(undefined, system);
  const errorUpdatedAt$ = createSignal<number | undefined>(undefined, system);

  // Derived computeds
  const status = createComputed<QueryStatus>(() => {
    const r = result$.get();
    if (r === undefined) return "pending";
    return r.isOk() ? "success" : "error";
  }, system);

  const data = createComputed<TData | undefined>(() => {
    const r = result$.get();
    if (r === undefined) return undefined;
    return r.isOk() ? r.value : undefined;
  }, system);

  const error = createComputed<TError | null>(() => {
    const r = result$.get();
    if (r === undefined) return null;
    return r.isErr() ? r.error : null;
  }, system);

  const isPending = createComputed<boolean>(() => status.get() === "pending", system);
  const isSuccess = createComputed<boolean>(() => status.get() === "success", system);
  const isError = createComputed<boolean>(() => status.get() === "error", system);
  const isFetching = createComputed<boolean>(() => fetchStatus$.get() === "fetching", system);
  const isLoading = createComputed<boolean>(() => isPending.get() && isFetching.get(), system);
  const isRefetching = createComputed<boolean>(() => isSuccess.get() && isFetching.get(), system);

  return {
    key,
    result$,
    fetchStatus$,
    fetchCount$,
    isInvalidated$,
    dataUpdatedAt$,
    errorUpdatedAt$,
    status,
    data,
    error,
    isPending,
    isSuccess,
    isError,
    isFetching,
    isLoading,
    isRefetching,
  };
}

// =============================================================================
// Snapshot
// =============================================================================

/**
 * Creates a non-reactive snapshot from a reactive cache entry.
 * Reads all signals via `.peek()` (no tracking).
 */
export function getSnapshot<TData, TError>(
  entry: ReactiveCacheEntry<TData, TError>
): CacheEntrySnapshot<TData, TError> {
  return {
    result: entry.result$.peek(),
    data: entry.data.peek(),
    error: entry.error.peek(),
    status: entry.status.peek(),
    fetchStatus: entry.fetchStatus$.peek(),
    dataUpdatedAt: entry.dataUpdatedAt$.peek(),
    errorUpdatedAt: entry.errorUpdatedAt$.peek(),
    fetchCount: entry.fetchCount$.peek(),
    isInvalidated: entry.isInvalidated$.peek(),
  };
}

// =============================================================================
// Subscriber Detection
// =============================================================================

/**
 * Returns `true` if the given reactive cache entry has active subscribers
 * (effects tracking its signals).
 *
 * This creates a temporary effect that reads the entry's result$ signal.
 * If result$ has subscribers from other effects, the entry is "observed".
 *
 * Implementation: We use a heuristic — create a disposable effect that reads
 * the signal and check if any external effect is already tracking it.
 * For simplicity we expose this via a marker signal that observers set.
 */
const _subscriberCounts = new WeakMap<object, number>();

export function incrementSubscribers(entry: ReactiveCacheEntry<unknown, unknown>): void {
  const current = _subscriberCounts.get(entry) ?? 0;
  _subscriberCounts.set(entry, current + 1);
}

export function decrementSubscribers(entry: ReactiveCacheEntry<unknown, unknown>): void {
  const current = _subscriberCounts.get(entry) ?? 0;
  if (current <= 1) {
    _subscriberCounts.delete(entry);
  } else {
    _subscriberCounts.set(entry, current - 1);
  }
}

export function hasSubscribers(entry: ReactiveCacheEntry<unknown, unknown>): boolean {
  return (_subscriberCounts.get(entry) ?? 0) > 0;
}

export function getSubscriberCount(entry: ReactiveCacheEntry<unknown, unknown>): number {
  return _subscriberCounts.get(entry) ?? 0;
}

// =============================================================================
// Legacy compatibility: CacheEntry snapshot type
// =============================================================================

/**
 * Legacy CacheEntry interface for backward compatibility.
 * Code that consumed the old immutable CacheEntry can use CacheEntrySnapshot instead.
 */
export type CacheEntry<TData = unknown, TError = unknown> = CacheEntrySnapshot<TData, TError>;

/**
 * Creates a pending snapshot (legacy compat).
 */
export function createPendingEntry<TData, TError>(): CacheEntrySnapshot<TData, TError> {
  return {
    result: undefined,
    data: undefined,
    error: null,
    status: "pending",
    fetchStatus: "idle",
    dataUpdatedAt: undefined,
    errorUpdatedAt: undefined,
    fetchCount: 0,
    isInvalidated: false,
  };
}
