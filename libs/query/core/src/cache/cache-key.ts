/**
 * Branded CacheKey type and factory.
 *
 * @packageDocumentation
 */

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
function brandAsCacheKey<TName extends string>(tuple: readonly [TName, string]): CacheKey<TName>;
function brandAsCacheKey(tuple: readonly [string, string]): readonly [string, string] {
  return tuple;
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
  const tuple: readonly [TName, string] = [port.__portName, stableStringify(params)];
  return brandAsCacheKey(tuple);
}

/**
 * Create a cache key from a port name and params directly.
 * Used internally when the port object is not available.
 */
export function createCacheKeyFromName(portName: string, params: unknown): CacheKey {
  const tuple: readonly [string, string] = [portName, stableStringify(params)];
  return brandAsCacheKey(tuple);
}

/**
 * Serialize a CacheKey to a single string for use as Map key.
 */
export function serializeCacheKey(key: CacheKey): string {
  return key[0] + "\0" + key[1];
}

/**
 * Check if a cache key belongs to a given port (by name prefix).
 */
export function cacheKeyMatchesPort(key: CacheKey, portName: string): boolean {
  return key[0] === portName;
}
