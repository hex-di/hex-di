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

import type { Port } from "@hex-di/core";
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
export function toTypedResolver<TProvides extends Port<string, unknown>>(
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
type GraphAny = Graph<Port<string, unknown>, Port<string, unknown>, Port<string, unknown>>;

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
 * LoggerPort is narrower than Port<string, unknown>.
 *
 * @see https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-6.html
 * @internal
 */
interface ResolverLike {
  resolve(port: Port<string, unknown>): unknown;
  resolveAsync(port: Port<string, unknown>): Promise<unknown>;
  has(port: Port<string, unknown>): boolean;
  createScope(name?: string): ResolverLike;
  dispose(): Promise<unknown>;
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
  createChild?(
    graph: GraphAny,
    options?: { readonly name: string; readonly inheritanceModes?: InheritanceModeMap }
  ): ResolverLike;
}

/**
 * Internal interface describing what LazyContainer looks like at runtime.
 *
 * CRITICAL: Uses method syntax (not property function syntax) for bivariance.
 *
 * @internal
 */
interface LazyContainerLike {
  load(): Promise<ResolverLike>;
  has(port: Port<string, unknown>): boolean;
  dispose(): Promise<unknown>;
  readonly isLoaded: boolean;
  readonly isDisposed: boolean;
}

// =============================================================================
// LazyContainer Support
// =============================================================================

/**
 * Runtime lazy container reference for React context storage.
 *
 * Provides a type-erased interface for storing LazyContainer in React state
 * without complex generic propagation. The `load()` method returns a
 * RuntimeResolver that can be stored and used for resolution.
 *
 * @internal
 */
export interface RuntimeLazyContainer {
  /**
   * Loads the lazy container and returns the underlying container as RuntimeResolver.
   * Concurrent calls share the same promise. Failed loads allow retry.
   */
  load(): Promise<RuntimeResolver>;

  /**
   * Checks if a port is available.
   * Before loading, delegates to parent. After loading, includes child ports.
   */
  has(port: Port<string, unknown>): boolean;

  /**
   * Disposes the lazy container.
   */
  dispose(): Promise<void>;

  /**
   * Whether the graph has been loaded.
   */
  readonly isLoaded: boolean;

  /**
   * Whether the lazy container has been disposed.
   */
  readonly isDisposed: boolean;
}

/**
 * Converts any LazyContainer to a RuntimeLazyContainer for React storage.
 *
 * This function wraps the LazyContainer's methods to return RuntimeResolver
 * instead of typed Container, enabling storage in React state/context without
 * complex generic propagation.
 *
 * @param lazyContainer - The lazy container to convert
 * @returns A RuntimeLazyContainer that wraps the lazy container's methods
 *
 * @example
 * ```typescript
 * const runtimeLazy = toRuntimeLazyContainer(lazyContainer);
 * const loadedResolver = await runtimeLazy.load();
 * // loadedResolver is RuntimeResolver, can be stored in React state
 * ```
 *
 * @internal
 */
export function toRuntimeLazyContainer<T extends LazyContainerLike>(
  lazyContainer: T
): RuntimeLazyContainer {
  return {
    async load(): Promise<RuntimeResolver> {
      const loaded = await lazyContainer.load();
      return toRuntimeResolver(loaded);
    },
    has(port: Port<string, unknown>): boolean {
      return lazyContainer.has(port);
    },
    async dispose(): Promise<void> {
      await lazyContainer.dispose();
    },
    get isLoaded(): boolean {
      return lazyContainer.isLoaded;
    },
    get isDisposed(): boolean {
      return lazyContainer.isDisposed;
    },
  };
}
