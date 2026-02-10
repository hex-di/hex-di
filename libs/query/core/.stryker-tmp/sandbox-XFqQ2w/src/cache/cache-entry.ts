/**
 * Cache entry type and helpers.
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
import type { Result } from "@hex-di/result";
import type { QueryStatus } from "../types/state.js";

// =============================================================================
// CacheEntry
// =============================================================================

export interface CacheEntry<TData, TError = Error> {
  /**
   * Source of truth for the last fetch outcome.
   * `undefined` when pending (no fetch has completed).
   */
  readonly result: Result<TData, TError> | undefined;

  /** Derived: `result?.isOk() ? result.value : undefined` */
  readonly data: TData | undefined;

  /** Derived: `result?.isErr() ? result.error : null` */
  readonly error: TError | null;

  /** Current status */
  readonly status: QueryStatus;

  /** Timestamp when data was last fetched successfully */
  readonly dataUpdatedAt: number | undefined;

  /** Timestamp when error was last set */
  readonly errorUpdatedAt: number | undefined;

  /** How many times this query has been fetched */
  readonly fetchCount: number;

  /** Number of active observers */
  readonly observerCount: number;

  /** Whether marked as invalidated */
  readonly isInvalidated: boolean;
}

// =============================================================================
// CacheEntry Factory
// =============================================================================

export function createPendingEntry<TData, TError>(): CacheEntry<TData, TError> {
  if (stryMutAct_9fa48("44")) {
    {
    }
  } else {
    stryCov_9fa48("44");
    return Object.freeze(
      stryMutAct_9fa48("45")
        ? {}
        : (stryCov_9fa48("45"),
          {
            result: undefined,
            data: undefined,
            error: null,
            status: "pending" as const,
            dataUpdatedAt: undefined,
            errorUpdatedAt: undefined,
            fetchCount: 0,
            observerCount: 0,
            isInvalidated: stryMutAct_9fa48("46") ? true : (stryCov_9fa48("46"), false),
          })
    );
  }
}
export function createSuccessEntry<TData, TError>(
  result: Result<TData, TError>,
  data: TData,
  now: number,
  prev?: CacheEntry<TData, TError>
): CacheEntry<TData, TError> {
  if (stryMutAct_9fa48("47")) {
    {
    }
  } else {
    stryCov_9fa48("47");
    return Object.freeze(
      stryMutAct_9fa48("48")
        ? {}
        : (stryCov_9fa48("48"),
          {
            result,
            data,
            error: null,
            status: "success" as const,
            dataUpdatedAt: now,
            errorUpdatedAt: stryMutAct_9fa48("49")
              ? prev.errorUpdatedAt
              : (stryCov_9fa48("49"), prev?.errorUpdatedAt),
            fetchCount: stryMutAct_9fa48("50")
              ? (prev?.fetchCount ?? 0) - 1
              : (stryCov_9fa48("50"),
                (stryMutAct_9fa48("51")
                  ? prev?.fetchCount && 0
                  : (stryCov_9fa48("51"),
                    (stryMutAct_9fa48("52")
                      ? prev.fetchCount
                      : (stryCov_9fa48("52"), prev?.fetchCount)) ?? 0)) + 1),
            observerCount: stryMutAct_9fa48("53")
              ? prev?.observerCount && 0
              : (stryCov_9fa48("53"),
                (stryMutAct_9fa48("54")
                  ? prev.observerCount
                  : (stryCov_9fa48("54"), prev?.observerCount)) ?? 0),
            isInvalidated: stryMutAct_9fa48("55") ? true : (stryCov_9fa48("55"), false),
          })
    );
  }
}
export function createErrorEntry<TData, TError>(
  result: Result<TData, TError>,
  error: TError,
  now: number,
  prev?: CacheEntry<TData, TError>
): CacheEntry<TData, TError> {
  if (stryMutAct_9fa48("56")) {
    {
    }
  } else {
    stryCov_9fa48("56");
    return Object.freeze(
      stryMutAct_9fa48("57")
        ? {}
        : (stryCov_9fa48("57"),
          {
            result,
            data: stryMutAct_9fa48("58") ? prev.data : (stryCov_9fa48("58"), prev?.data),
            error,
            status: "error" as const,
            dataUpdatedAt: stryMutAct_9fa48("59")
              ? prev.dataUpdatedAt
              : (stryCov_9fa48("59"), prev?.dataUpdatedAt),
            errorUpdatedAt: now,
            fetchCount: stryMutAct_9fa48("60")
              ? (prev?.fetchCount ?? 0) - 1
              : (stryCov_9fa48("60"),
                (stryMutAct_9fa48("61")
                  ? prev?.fetchCount && 0
                  : (stryCov_9fa48("61"),
                    (stryMutAct_9fa48("62")
                      ? prev.fetchCount
                      : (stryCov_9fa48("62"), prev?.fetchCount)) ?? 0)) + 1),
            observerCount: stryMutAct_9fa48("63")
              ? prev?.observerCount && 0
              : (stryCov_9fa48("63"),
                (stryMutAct_9fa48("64")
                  ? prev.observerCount
                  : (stryCov_9fa48("64"), prev?.observerCount)) ?? 0),
            isInvalidated: stryMutAct_9fa48("65") ? true : (stryCov_9fa48("65"), false),
          })
    );
  }
}
export function withObserverCount<TData, TError>(
  entry: CacheEntry<TData, TError>,
  observerCount: number
): CacheEntry<TData, TError> {
  if (stryMutAct_9fa48("66")) {
    {
    }
  } else {
    stryCov_9fa48("66");
    return Object.freeze(
      stryMutAct_9fa48("67")
        ? {}
        : (stryCov_9fa48("67"),
          {
            ...entry,
            observerCount,
          })
    );
  }
}
export function withInvalidated<TData, TError>(
  entry: CacheEntry<TData, TError>
): CacheEntry<TData, TError> {
  if (stryMutAct_9fa48("68")) {
    {
    }
  } else {
    stryCov_9fa48("68");
    return Object.freeze(
      stryMutAct_9fa48("69")
        ? {}
        : (stryCov_9fa48("69"),
          {
            ...entry,
            isInvalidated: stryMutAct_9fa48("70") ? false : (stryCov_9fa48("70"), true),
          })
    );
  }
}
