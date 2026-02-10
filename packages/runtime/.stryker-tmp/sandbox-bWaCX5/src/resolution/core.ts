/**
 * Shared resolution utilities for sync and async resolution engines.
 *
 * This module extracts common logic between ResolutionEngine and AsyncResolutionEngine
 * to reduce code duplication and ensure consistent behavior.
 *
 * @packageDocumentation
 * @internal
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
import type { Port, InferService } from "@hex-di/core";
import type { Lifetime } from "@hex-di/core";
import { MemoMap } from "../util/memo-map.js";
import type { InheritanceMode } from "../types.js";
import type { RuntimeAdapterFor } from "../container/internal-types.js";

// =============================================================================
// Shared Types
// =============================================================================

/**
 * Parameters for resolving a port.
 *
 * Captures all the information needed for resolution, extracted as a type
 * to reduce parameter passing duplication between engines.
 *
 * @internal
 */
export interface ResolutionParams<P extends Port<unknown, string>> {
  /** The port being resolved */
  readonly port: P;
  /** The adapter providing the service implementation */
  readonly adapter: RuntimeAdapterFor<P>;
  /** Cache for scoped instances (scope-specific) */
  readonly scopedMemo: MemoMap;
  /** ID of the scope, or null for container-level resolution */
  readonly scopeId: string | null;
  /** Inheritance mode for child container resolutions (null if not a child) */
  readonly inheritanceMode: InheritanceMode | null;
}

/**
 * Context needed for caching operations.
 *
 * @internal
 */
export interface CacheContext {
  /** Cache for singleton instances (container-wide) */
  readonly singletonMemo: MemoMap;
  /** Cache for scoped instances (scope-specific) */
  readonly scopedMemo: MemoMap;
}

// =============================================================================
// Shared Utilities
// =============================================================================

/**
 * Gets the appropriate MemoMap for caching based on lifetime.
 *
 * - `singleton`: Returns singletonMemo (container-wide cache)
 * - `scoped`: Returns scopedMemo (scope-specific cache)
 * - `transient`: Returns null (no caching)
 *
 * @param lifetime - The lifetime of the adapter
 * @param singletonMemo - Cache for singleton instances
 * @param scopedMemo - Cache for scoped instances
 * @returns The appropriate MemoMap or null for transient
 *
 * @example
 * ```typescript
 * const memo = getMemoForLifetime(adapter.lifetime, singletonMemo, scopedMemo);
 * if (memo) {
 *   return memo.getOrElseMemoize(port, factory, finalizer);
 * } else {
 *   return factory();
 * }
 * ```
 *
 * @internal
 */
export function getMemoForLifetime(
  lifetime: Lifetime,
  singletonMemo: MemoMap,
  scopedMemo: MemoMap
): MemoMap | null {
  if (stryMutAct_9fa48("1873")) {
    {
    }
  } else {
    stryCov_9fa48("1873");
    switch (lifetime) {
      case stryMutAct_9fa48("1875") ? "" : (stryCov_9fa48("1875"), "singleton"):
        if (stryMutAct_9fa48("1874")) {
        } else {
          stryCov_9fa48("1874");
          return singletonMemo;
        }
      case stryMutAct_9fa48("1877") ? "" : (stryCov_9fa48("1877"), "scoped"):
        if (stryMutAct_9fa48("1876")) {
        } else {
          stryCov_9fa48("1876");
          return scopedMemo;
        }
      case stryMutAct_9fa48("1879") ? "" : (stryCov_9fa48("1879"), "transient"):
        if (stryMutAct_9fa48("1878")) {
        } else {
          stryCov_9fa48("1878");
          return null;
        }
      default:
        if (stryMutAct_9fa48("1880")) {
        } else {
          stryCov_9fa48("1880");
          throw new Error(
            stryMutAct_9fa48("1881") ? `` : (stryCov_9fa48("1881"), `Unknown lifetime: ${lifetime}`)
          );
        }
    }
  }
}

/**
 * Resolves using the appropriate memo based on lifetime.
 *
 * This consolidates the common pattern of:
 * 1. Select the right memo based on lifetime
 * 2. Use getOrElseMemoize for singleton/scoped
 * 3. Call factory directly for transient
 *
 * @param port - The port being resolved
 * @param lifetime - The adapter's lifetime
 * @param singletonMemo - Cache for singleton instances
 * @param scopedMemo - Cache for scoped instances
 * @param factory - Factory function to create new instance
 * @param finalizer - Optional finalizer for disposal
 * @returns The resolved instance
 *
 * @internal
 */
export function resolveWithMemo<P extends Port<unknown, string>>(
  port: P,
  lifetime: Lifetime,
  singletonMemo: MemoMap,
  scopedMemo: MemoMap,
  factory: () => InferService<P>,
  finalizer?: (instance: InferService<P>) => void | Promise<void>
): InferService<P> {
  if (stryMutAct_9fa48("1882")) {
    {
    }
  } else {
    stryCov_9fa48("1882");
    const memo = getMemoForLifetime(lifetime, singletonMemo, scopedMemo);
    if (
      stryMutAct_9fa48("1885")
        ? memo !== null
        : stryMutAct_9fa48("1884")
          ? false
          : stryMutAct_9fa48("1883")
            ? true
            : (stryCov_9fa48("1883", "1884", "1885"), memo === null)
    ) {
      if (stryMutAct_9fa48("1886")) {
        {
        }
      } else {
        stryCov_9fa48("1886");
        return factory();
      }
    }
    return memo.getOrElseMemoize(port, factory, finalizer);
  }
}

/**
 * Resolves asynchronously using the appropriate memo based on lifetime.
 *
 * Async version of resolveWithMemo for async factories.
 *
 * @param port - The port being resolved
 * @param lifetime - The adapter's lifetime
 * @param singletonMemo - Cache for singleton instances
 * @param scopedMemo - Cache for scoped instances
 * @param factory - Async factory function to create new instance
 * @param finalizer - Optional finalizer for disposal
 * @returns Promise resolving to the instance
 *
 * @internal
 */
export async function resolveWithMemoAsync<P extends Port<unknown, string>>(
  port: P,
  lifetime: Lifetime,
  singletonMemo: MemoMap,
  scopedMemo: MemoMap,
  factory: () => Promise<InferService<P>>,
  finalizer?: (instance: InferService<P>) => void | Promise<void>
): Promise<InferService<P>> {
  if (stryMutAct_9fa48("1887")) {
    {
    }
  } else {
    stryCov_9fa48("1887");
    const memo = getMemoForLifetime(lifetime, singletonMemo, scopedMemo);
    if (
      stryMutAct_9fa48("1890")
        ? memo !== null
        : stryMutAct_9fa48("1889")
          ? false
          : stryMutAct_9fa48("1888")
            ? true
            : (stryCov_9fa48("1888", "1889", "1890"), memo === null)
    ) {
      if (stryMutAct_9fa48("1891")) {
        {
        }
      } else {
        stryCov_9fa48("1891");
        return factory();
      }
    }
    return memo.getOrElseMemoizeAsync(port, factory, finalizer);
  }
}

/**
 * Builds the dependencies record for a factory call.
 *
 * Shared logic for resolving all required dependencies and building
 * the deps object that factories receive.
 *
 * @param requires - Array of required ports
 * @param resolve - Function to resolve each dependency
 * @returns Record mapping port names to resolved instances
 *
 * @internal
 */
export function buildDependencies(
  requires: readonly Port<unknown, string>[],
  resolve: (port: Port<unknown, string>) => unknown
): Record<string, unknown> {
  if (stryMutAct_9fa48("1892")) {
    {
    }
  } else {
    stryCov_9fa48("1892");
    const deps: Record<string, unknown> = {};
    for (const requiredPort of requires) {
      if (stryMutAct_9fa48("1893")) {
        {
        }
      } else {
        stryCov_9fa48("1893");
        deps[requiredPort.__portName] = resolve(requiredPort);
      }
    }
    return deps;
  }
}

/**
 * Builds the dependencies record asynchronously.
 *
 * Resolves all dependencies concurrently for optimal performance.
 *
 * @param requires - Array of required ports
 * @param resolve - Async function to resolve each dependency
 * @returns Promise resolving to record mapping port names to instances
 *
 * @internal
 */
export async function buildDependenciesAsync(
  requires: readonly Port<unknown, string>[],
  resolve: (port: Port<unknown, string>) => Promise<unknown>
): Promise<Record<string, unknown>> {
  if (stryMutAct_9fa48("1894")) {
    {
    }
  } else {
    stryCov_9fa48("1894");
    // Resolve all dependencies concurrently
    const results = await Promise.all(
      requires.map(
        stryMutAct_9fa48("1895")
          ? () => undefined
          : (stryCov_9fa48("1895"),
            async port =>
              stryMutAct_9fa48("1896")
                ? {}
                : (stryCov_9fa48("1896"),
                  {
                    name: port.__portName,
                    value: await resolve(port),
                  }))
      )
    );

    // Build the deps record
    const deps: Record<string, unknown> = {};
    for (const { name, value } of results) {
      if (stryMutAct_9fa48("1897")) {
        {
        }
      } else {
        stryCov_9fa48("1897");
        deps[name] = value;
      }
    }
    return deps;
  }
}
