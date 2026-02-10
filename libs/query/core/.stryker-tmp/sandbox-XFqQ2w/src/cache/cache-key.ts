/**
 * Branded CacheKey type and factory.
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
import { stableStringify } from "./stable-stringify.js";

// =============================================================================
// Brand Symbol
// =============================================================================

declare const __cacheKeyBrand: unique symbol;

// =============================================================================
// CacheKey Type
// =============================================================================

/**
 * A branded cache key tuple: [portName, paramsHash].
 *
 * The brand prevents ad-hoc construction of cache keys outside of
 * `createCacheKey`, ensuring all keys pass through deterministic
 * serialization.
 */
export type CacheKey<TName extends string = string> = readonly [
  portName: TName,
  paramsHash: string,
] & {
  readonly [__cacheKeyBrand]: true;
};

// =============================================================================
// PortLike - minimal interface for key creation
// =============================================================================

/**
 * Minimal interface for creating cache keys.
 * Accepts any object with a `__portName` property, avoiding variance
 * issues with the full QueryPort type.
 */
interface PortLike<TName extends string = string> {
  readonly __portName: TName;
}

// =============================================================================
// Brand Helper
// =============================================================================

/**
 * BRAND_CAST: Single documented coercion point for CacheKey branded types.
 * CacheKey is a branded tuple that cannot be constructed without this helper.
 * The brand ensures cache keys always pass through deterministic serialization.
 */
function brandAsCacheKey<TName extends string>(tuple: readonly [string, string]): CacheKey<TName> {
  if (stryMutAct_9fa48("71")) {
    {
    }
  } else {
    stryCov_9fa48("71");
    return tuple as CacheKey<TName>;
  }
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a CacheKey from a port-like object and params.
 * Ensures deterministic parameter serialization via stableStringify.
 */
export function createCacheKey<TName extends string>(
  port: PortLike<TName>,
  params: unknown
): CacheKey<TName> {
  if (stryMutAct_9fa48("72")) {
    {
    }
  } else {
    stryCov_9fa48("72");
    const tuple: readonly [string, string] = stryMutAct_9fa48("73")
      ? []
      : (stryCov_9fa48("73"), [port.__portName, stableStringify(params)]);
    return brandAsCacheKey<TName>(tuple);
  }
}

/**
 * Create a cache key from a port name and params directly.
 * Used internally when the port object is not available.
 */
export function createCacheKeyFromName(portName: string, params: unknown): CacheKey {
  if (stryMutAct_9fa48("74")) {
    {
    }
  } else {
    stryCov_9fa48("74");
    const tuple: readonly [string, string] = stryMutAct_9fa48("75")
      ? []
      : (stryCov_9fa48("75"), [portName, stableStringify(params)]);
    return brandAsCacheKey(tuple);
  }
}

/**
 * Serialize a CacheKey to a single string for use as Map key.
 */
export function serializeCacheKey(key: CacheKey): string {
  if (stryMutAct_9fa48("76")) {
    {
    }
  } else {
    stryCov_9fa48("76");
    return key[0] + (stryMutAct_9fa48("77") ? "" : (stryCov_9fa48("77"), "\0")) + key[1];
  }
}

/**
 * Check if a cache key belongs to a given port (by name prefix).
 */
export function cacheKeyMatchesPort(key: CacheKey, portName: string): boolean {
  if (stryMutAct_9fa48("78")) {
    {
    }
  } else {
    stryCov_9fa48("78");
    return stryMutAct_9fa48("81")
      ? key[0] !== portName
      : stryMutAct_9fa48("80")
        ? false
        : stryMutAct_9fa48("79")
          ? true
          : (stryCov_9fa48("79", "80", "81"), key[0] === portName);
  }
}
