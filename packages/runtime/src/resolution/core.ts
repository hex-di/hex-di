/**
 * Shared resolution utilities for sync and async resolution engines.
 *
 * This module extracts common logic between ResolutionEngine and AsyncResolutionEngine
 * to reduce code duplication and ensure consistent behavior.
 *
 * @packageDocumentation
 * @internal
 */

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
  switch (lifetime) {
    case "singleton":
      return singletonMemo;
    case "scoped":
      return scopedMemo;
    case "transient":
      return null;
    default:
      throw new Error(`Unknown lifetime: ${lifetime}`);
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
  const memo = getMemoForLifetime(lifetime, singletonMemo, scopedMemo);
  if (memo === null) {
    return factory();
  }
  return memo.getOrElseMemoize(port, factory, finalizer);
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
  const memo = getMemoForLifetime(lifetime, singletonMemo, scopedMemo);
  if (memo === null) {
    return factory();
  }
  return memo.getOrElseMemoizeAsync(port, factory, finalizer);
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
  const deps: Record<string, unknown> = {};
  for (const requiredPort of requires) {
    deps[requiredPort.__portName] = resolve(requiredPort);
  }
  return deps;
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
  // Resolve all dependencies concurrently
  const results = await Promise.all(
    requires.map(async port => ({
      name: port.__portName,
      value: await resolve(port),
    }))
  );

  // Build the deps record
  const deps: Record<string, unknown> = {};
  for (const { name, value } of results) {
    deps[name] = value;
  }
  return deps;
}
