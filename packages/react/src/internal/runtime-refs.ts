/**
 * Runtime reference types for React context storage.
 *
 * This module re-exports and adapts the RuntimeResolver types for use in
 * React context. The underlying types solve the variance problem when
 * storing typed containers in React state/context.
 *
 * ## Architecture
 *
 * The type erasure and conversion functions are defined in runtime-resolver.ts:
 * - `RuntimeResolver` - Type-erased interface for storage
 * - `toRuntimeResolver()` - Converts Container/Scope to RuntimeResolver
 * - `assertResolverProvides()` - Narrows back to typed resolution
 *
 * This module re-exports these types with React-specific aliases for
 * backwards compatibility and semantic clarity.
 *
 * ## ZERO CAST in React Package
 *
 * All type boundary handling is centralized in runtime-resolver.ts where:
 * 1. Container/Scope implement the required interface
 * 2. The conversion functions are properly typed
 * 3. Runtime port validation ensures safety
 *
 * @packageDocumentation
 * @internal
 */

import type { Port } from "@hex-di/ports";
import type { Graph } from "@hex-di/graph";
import type { InheritanceMode } from "@hex-di/runtime";
import {
  toRuntimeResolver,
  toRuntimeContainer,
  assertResolverProvides,
  type RuntimeResolver,
  type RuntimeContainer,
  type TypedResolver,
} from "./runtime-resolver.js";

// =============================================================================
// Re-exports with React-specific aliases
// =============================================================================

/**
 * Runtime container reference for React context storage.
 * Alias for RuntimeResolver from @hex-di/runtime.
 *
 * @internal
 */
export type RuntimeContainerRef = RuntimeResolver;

/**
 * Runtime scope reference for React context storage.
 * Alias for RuntimeResolver from @hex-di/runtime (Scope satisfies the same interface).
 *
 * @internal
 */
export type RuntimeScopeRef = RuntimeResolver;

/**
 * Union type for runtime resolver reference (container or scope).
 *
 * @internal
 */
export type RuntimeResolverRef = RuntimeResolver;

/**
 * Re-export RuntimeContainer for components that need initialize().
 * @internal
 */
export type { RuntimeContainer };

/**
 * Re-export TypedResolver for typed consumption.
 * @internal
 */
export type { TypedResolver };

// =============================================================================
// Conversion Functions
// =============================================================================

/**
 * Converts any Container (root or child) to RuntimeContainerRef.
 *
 * This function delegates to @hex-di/runtime's toRuntimeResolver, which
 * handles the type boundary safely. Works for both root containers
 * (TExtends = never) and child containers (TExtends = Port types).
 *
 * @param container - The container to convert (any Container type)
 * @returns A RuntimeContainerRef that wraps the container's methods
 *
 * @internal
 */
export function toRuntimeContainerRef<T extends ResolverLike>(container: T): RuntimeContainerRef {
  return toRuntimeResolver(container);
}

/**
 * Converts any Scope to RuntimeScopeRef for context storage.
 *
 * This function delegates to @hex-di/runtime's toRuntimeResolver, which
 * handles the type boundary safely.
 *
 * @param scope - The scope to convert (any Scope type)
 * @returns A RuntimeScopeRef that wraps the scope's methods
 *
 * @internal
 */
export function toRuntimeScopeRef<T extends ResolverLike>(scope: T): RuntimeScopeRef {
  return toRuntimeResolver(scope);
}

/**
 * Converts any Container to a RuntimeContainer for async initialization.
 *
 * This function preserves the `initialize()` method for AsyncContainerProvider.
 *
 * @param container - The container to convert
 * @returns A RuntimeContainer that wraps the container's methods
 *
 * @internal
 */
export function toRuntimeContainerWithInit<T extends ContainerLike>(
  container: T
): RuntimeContainer {
  return toRuntimeContainer(container);
}

// =============================================================================
// Typed Resolver Creation
// =============================================================================

/**
 * Creates a typed resolver from a RuntimeContainerRef or RuntimeScopeRef.
 *
 * This function bridges the gap between:
 * - RuntimeContainerRef/RuntimeScopeRef (which return `unknown`)
 * - TypedResolver<TProvides> (which returns typed results)
 *
 * The type parameter TProvides is provided by the caller (via hook usage)
 * and tells TypeScript what ports the resolver can handle.
 *
 * Safety: The caller is responsible for ensuring TProvides matches
 * the actual ports in the container. Runtime errors will occur if
 * they try to resolve ports that don't exist.
 *
 * @internal
 */
export function toTypedResolver<TProvides extends Port<unknown, string>>(
  ref: RuntimeResolverRef
): TypedResolver<TProvides> {
  return assertResolverProvides<TProvides>(ref);
}

// =============================================================================
// Internal Type Definitions
// =============================================================================

/**
 * Base graph type - widest valid Graph for structural compatibility.
 * @internal
 */
type GraphAny = Graph<Port<unknown, string>, Port<unknown, string>, Port<unknown, string>>;

/**
 * Inheritance mode map with string keys for structural compatibility.
 * @internal
 */
type InheritanceModeMap = Partial<Record<string, InheritanceMode>>;

/**
 * Internal interface describing what Container/Scope look like at runtime.
 * Used to type the conversion function parameters.
 *
 * CRITICAL: Uses method syntax (not property function syntax) for bivariance.
 * Under `strictFunctionTypes`:
 * - Method syntax `method(x: T): R` is bivariant in `T`
 * - Property syntax `method: (x: T) => R` is contravariant in `T`
 *
 * This allows Container<LoggerPort> to be assigned to ResolverLike even though
 * LoggerPort is narrower than Port<unknown, string>.
 *
 * @see https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-6.html
 * @internal
 */
interface ResolverLike {
  resolve(port: Port<unknown, string>): unknown;
  resolveAsync(port: Port<unknown, string>): Promise<unknown>;
  has(port: Port<unknown, string>): boolean;
  createScope(): ResolverLike;
  dispose(): Promise<void>;
  readonly isDisposed: boolean;
}

/**
 * Internal interface describing Container-specific methods.
 *
 * Uses method syntax for bivariance, allowing Container<TProvides>
 * to be assigned to ContainerLike regardless of TProvides.
 *
 * @internal
 */
interface ContainerLike extends ResolverLike {
  initialize?(): Promise<ResolverLike>;
  readonly isInitialized?: boolean;
  createChild?(graph: GraphAny, inheritanceModes?: InheritanceModeMap): ResolverLike;
}
