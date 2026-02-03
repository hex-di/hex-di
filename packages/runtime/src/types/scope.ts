/**
 * Scope type definitions for @hex-di/runtime.
 *
 * The Scope type provides type-safe service resolution with scoped lifetimes.
 * It uses branded types for nominal typing and is distinct from Container.
 *
 * @packageDocumentation
 */

import type { Port, InferService } from "@hex-di/core";
import { INTERNAL_ACCESS } from "../inspection/symbols.js";
import type { ScopeInternalState } from "../inspection/internal-state-types.js";
import type {
  ScopeLifecycleListener,
  ScopeSubscription,
  ScopeDisposalState,
} from "../scope/lifecycle-events.js";
import type { ContainerPhase } from "./options.js";
import { ScopeBrand } from "./brands.js";

// =============================================================================
// Scope Type
// =============================================================================

/**
 * A branded scope type that provides type-safe service resolution with scoped lifetimes.
 *
 * The Scope type uses TypeScript's structural typing with a branded property
 * to achieve nominal typing. This ensures that:
 * - Scopes cannot be confused with structurally similar objects
 * - Scopes are distinct from Containers (not interchangeable)
 * - Different TProvides type parameters produce incompatible types
 *
 * @typeParam TProvides - Union of Port types that this scope can resolve.
 *   The resolve method is constrained to only accept ports in this union.
 * @typeParam TAsyncPorts - Union of Port types that have async factories.
 *   These ports require async initialization before sync resolution.
 * @typeParam TPhase - The initialization phase of the parent container.
 *   Controls whether sync resolve can access async ports.
 *
 * @remarks
 * - The brand property carries the TProvides type for nominal typing
 * - Scopes inherit singleton instances from the parent container
 * - Scoped instances are created once per scope and not shared with siblings
 * - Request instances are created fresh on every resolve call
 * - Before initialization, sync resolve is limited to non-async ports
 * - After initialization, all ports can be resolved synchronously
 *
 * @see {@link Container} - Parent container type with identical API but separate brand
 * @see {@link Container.createScope} - Method that creates Scope instances
 *
 * @example Basic usage
 * ```typescript
 * // Scope type is parameterized by the ports it can resolve
 * type AppScope = Scope<typeof LoggerPort | typeof UserContextPort>;
 *
 * // The resolve method is type-safe
 * declare const scope: AppScope;
 * const logger = scope.resolve(LoggerPort);        // Singleton (shared)
 * const context = scope.resolve(UserContextPort);  // Scoped (per-scope)
 * ```
 *
 * @example Nested scopes
 * ```typescript
 * const parentScope = container.createScope();
 * const childScope = parentScope.createScope();
 *
 * // Child scope can resolve the same ports
 * const logger = childScope.resolve(LoggerPort);
 *
 * // Disposing child does not affect parent
 * await childScope.dispose();
 * // parentScope is still usable
 * ```
 */
// Note: Scopes don't have plugin APIs. They're pure resolution contexts.
export type Scope<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = "uninitialized",
> = ScopeMembers<TProvides, TAsyncPorts, TPhase>;

/**
 * Internal type containing Scope method definitions.
 * Exported for use in scope/impl.ts where scope objects are created.
 * @internal
 */
export type ScopeMembers<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends ContainerPhase,
> = {
  /**
   * Resolves a service instance for the given port synchronously.
   *
   * The port must be in the TProvides union, enforced at compile time.
   * The return type is inferred from the port's phantom service type.
   *
   * **Phase-dependent behavior:**
   * - Before initialization: Only non-async ports can be resolved
   * - After initialization: All ports can be resolved
   *
   * @typeParam P - The specific port type being resolved
   * @param port - The port token to resolve
   * @returns The service instance for the given port
   *
   * @throws {DisposedScopeError} If the scope has been disposed
   * @throws {CircularDependencyError} If a circular dependency is detected
   * @throws {FactoryError} If the adapter's factory function throws
   * @throws {AsyncInitializationRequiredError} If resolving an async port before initialization
   */
  resolve<P extends TPhase extends "initialized" ? TProvides : Exclude<TProvides, TAsyncPorts>>(
    port: P
  ): InferService<P>;

  /**
   * Resolves a service instance for the given port asynchronously.
   *
   * The port must be in the TProvides union, enforced at compile time.
   * This method can resolve any port regardless of whether it has an async factory.
   *
   * @typeParam P - The specific port type being resolved (must extend TProvides)
   * @param port - The port token to resolve
   * @returns A promise that resolves to the service instance
   *
   * @throws {DisposedScopeError} If the scope has been disposed
   * @throws {CircularDependencyError} If a circular dependency is detected
   * @throws {AsyncFactoryError} If the async factory function throws
   */
  resolveAsync<P extends TProvides>(port: P): Promise<InferService<P>>;

  /**
   * Creates a child scope for managing nested scoped service lifetimes.
   *
   * The returned scope inherits singletons from the root container
   * and scoped instances from this scope (if configured).
   *
   * @param name - Optional custom name for the scope (for DevTools identification)
   * @returns A new Scope instance
   */
  createScope(name?: string): Scope<TProvides, TAsyncPorts, TPhase>;

  /**
   * Disposes the scope and all scoped instances.
   *
   * After disposal, the scope cannot be used to resolve services.
   * Child scopes are disposed before this scope's instances.
   * Finalizers are called in LIFO order (last created first disposed).
   *
   * @returns A promise that resolves when disposal is complete
   */
  dispose(): Promise<void>;

  /**
   * Whether the scope has been disposed.
   *
   * After disposal, resolve() will throw DisposedScopeError.
   * This property is useful for checking scope validity before resolution,
   * especially in React StrictMode where scopes may be disposed and recreated.
   */
  readonly isDisposed: boolean;

  /**
   * Checks if the scope can resolve the given port.
   *
   * @param port - The port token to check
   * @returns true if the port is provided by this scope or its container
   */
  has(port: Port<unknown, string>): boolean;

  /**
   * Subscribe to scope lifecycle events.
   *
   * Enables reactive UI patterns where components can respond to scope
   * disposal triggered from outside React (e.g., logout, connection loss).
   *
   * @param listener - Callback invoked with lifecycle events
   * @returns Unsubscribe function
   *
   * @remarks
   * - `'disposing'` is emitted synchronously when dispose() is called
   * - `'disposed'` is emitted after async disposal completes
   * - Useful with React's useSyncExternalStore for reactive unmounting
   *
   * @example
   * ```typescript
   * const unsubscribe = scope.subscribe((event) => {
   *   if (event === 'disposing') {
   *     console.log('Scope is being disposed');
   *   }
   * });
   *
   * // Later: cleanup
   * unsubscribe();
   * ```
   */
  subscribe(listener: ScopeLifecycleListener): ScopeSubscription;

  /**
   * Get current disposal state synchronously.
   *
   * Designed for use with React's useSyncExternalStore getSnapshot.
   *
   * @returns Current disposal state: 'active', 'disposing', or 'disposed'
   *
   * @example
   * ```typescript
   * const state = scope.getDisposalState();
   * if (state === 'active') {
   *   // Safe to resolve services
   * }
   * ```
   */
  getDisposalState(): ScopeDisposalState;

  /**
   * Brand property for nominal typing.
   * Contains the TProvides type parameter at the type level.
   * Value is undefined at runtime.
   */
  readonly [ScopeBrand]: { provides: TProvides };

  /**
   * Internal state accessor for DevTools inspection.
   * Returns a frozen snapshot of the scope's internal state.
   *
   * @internal Use createInspector() for a higher-level inspection API
   */
  readonly [INTERNAL_ACCESS]: () => ScopeInternalState;
};
