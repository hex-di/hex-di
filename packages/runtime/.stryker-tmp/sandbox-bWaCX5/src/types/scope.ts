/**
 * Scope type definitions for @hex-di/runtime.
 *
 * The Scope type provides type-safe service resolution with scoped lifetimes.
 * It uses branded types for nominal typing and is distinct from Container.
 *
 * @packageDocumentation
 */
// @ts-nocheck

import type { Port, InferService } from "@hex-di/core";
import type { Result, ResultAsync } from "@hex-di/result";
import type { ContainerError, DisposalError } from "../errors/index.js";
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
 *   For scopes created from a container, this is the container's effective provides
 *   union: `ContainerTProvides | ContainerTExtends`. For scopes created from another
 *   scope, this is inherited from the parent scope. This type parameter determines
 *   which ports can be passed to `resolve()` and `resolveAsync()`. Unlike containers,
 *   scopes don't have an `TExtends` parameter because they don't support graph
 *   extensions - they purely inherit resolution capability from their parent.
 *
 * @typeParam TAsyncPorts - Union of Port types that have async factory functions.
 *   Inherited from the parent container through the scope chain. These ports require
 *   special handling before initialization:
 *   - Before parent initialization: Cannot be resolved synchronously (throws AsyncInitializationRequiredError)
 *   - After parent initialization: Can be resolved synchronously (using cached result)
 *   This type parameter is propagated unchanged through scope creation, ensuring
 *   that all scopes in a chain have consistent async resolution behavior based on
 *   the root container's initialization state.
 *
 * @typeParam TPhase - The initialization phase: `'uninitialized' | 'initialized'`.
 *   Inherited from the parent container at scope creation time and reflects the root
 *   container's initialization state. Scopes cannot change their phase independently:
 *   - `'uninitialized'`: Root container not initialized, sync resolve limited to non-async ports
 *   - `'initialized'`: Root container initialized, all ports resolvable synchronously
 *   This phase is captured at scope creation and remains fixed even if the root container
 *   is later initialized. To access newly-initialized async ports, create a new scope
 *   after initialization.
 *
 * @remarks
 * **Nominal Typing via Branding:**
 * The `[ScopeBrand]` property carries `TProvides` at the type level, making scopes
 * with different type parameters structurally incompatible. This prevents accidentally
 * passing a scope with the wrong ports to a function. The brand also distinguishes
 * Scope from Container despite having similar method signatures.
 *
 * **Lifetime Behavior:**
 * Scopes manage service lifetimes within a request or operation:
 * - **Singleton**: Shared across the entire container hierarchy (resolved from root)
 * - **Scoped**: Created once per scope, shared within that scope and its children
 * - **Request**: Created fresh on every `resolve()` call, never cached
 *
 * Scopes inherit singleton instances from the container but maintain their own cache
 * for scoped instances. This enables request-scoped services (e.g., user context,
 * database transactions) while still sharing application-level singletons (e.g., loggers).
 *
 * **Resolution Behavior:**
 * - The `resolve` method accepts only `TProvides` (unlike Container which accepts `TProvides | TExtends`)
 * - Before initialization, only `Exclude<TProvides, TAsyncPorts>` is resolvable
 * - After initialization, all `TProvides` ports are resolvable synchronously
 * - `resolveAsync` always accepts all `TProvides` regardless of phase
 * - Scopes can resolve scoped-lifetime ports (Containers cannot - they throw ScopeRequiredError)
 *
 * **Scope Hierarchy:**
 * Scopes can be nested arbitrarily deep via `createScope()`. Child scopes:
 * - Inherit singleton instances from the root container
 * - Inherit scoped instances from parent scope (if configured as "shared")
 * - Maintain their own cache for scoped instances
 * - Dispose independently without affecting parent or siblings
 *
 * **Phase Inheritance Gotcha:**
 * A scope created before container initialization will remain in the 'uninitialized'
 * phase even after the container is initialized. This is by design - the scope's
 * type reflects the container state at creation time. If you need access to newly
 * initialized async ports, create a new scope after calling `container.initialize()`.
 *
 * @see {@link Container} - Parent container type with identical API but separate brand
 * @see {@link Container.createScope} - Method that creates Scope instances
 * @see {@link Scope.createScope} - Create nested child scopes
 *
 * @example Basic usage with lifetime behavior
 * ```typescript
 * // Scope type is parameterized by the ports it can resolve
 * type AppScope = Scope<typeof LoggerPort | typeof UserContextPort, never, 'initialized'>;
 * //                    ^- can resolve both ports            ^- no async ports  ^- initialized
 *
 * declare const scope: AppScope;
 * const logger = scope.resolve(LoggerPort);        // Singleton (shared from container)
 * const context = scope.resolve(UserContextPort);  // Scoped (created for this scope)
 * const context2 = scope.resolve(UserContextPort); // Same instance (cached in scope)
 * ```
 *
 * @example Nested scopes with lifecycle
 * ```typescript
 * const parentScope = container.createScope("parent");
 * const childScope = parentScope.createScope("child");
 *
 * // Child scope can resolve the same ports
 * const logger = childScope.resolve(LoggerPort);      // Singleton (from container)
 * const parentCtx = parentScope.resolve(UserContextPort); // Scoped instance A
 * const childCtx = childScope.resolve(UserContextPort);   // Scoped instance B (separate)
 *
 * // Disposing child does not affect parent
 * await childScope.dispose(); // Disposes instance B
 * // parentScope is still usable, instance A still valid
 * const stillValid = parentScope.resolve(UserContextPort); // Same instance A
 * ```
 *
 * @example Phase inheritance behavior
 * ```typescript
 * const container = createContainer(graph);
 * // Type: Container<..., never, AsyncPort, 'uninitialized'>
 *
 * const earlyScope = container.createScope();
 * // Type: Scope<..., AsyncPort, 'uninitialized'>
 * // earlyScope.resolve(AsyncPort); // ERROR: async port not initialized
 *
 * await container.initialize();
 * // Container now: Container<..., never, AsyncPort, 'initialized'>
 *
 * // earlyScope still has 'uninitialized' phase (type captured at creation)
 * // earlyScope.resolve(AsyncPort); // Still ERROR at compile time
 *
 * const lateScope = container.createScope();
 * // Type: Scope<..., AsyncPort, 'initialized'>
 * const db = lateScope.resolve(AsyncPort); // OK: scope created after initialization
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
   * Resolves a service instance, returning a Result instead of throwing.
   *
   * Same port constraints as `resolve()` - phase-dependent for async ports.
   * Returns `Ok(service)` on success, `Err(ContainerError)` on failure.
   *
   * @typeParam P - The specific port type being resolved
   * @param port - The port token to resolve
   * @returns A Result containing the service instance or a ContainerError
   */
  tryResolve<P extends TPhase extends "initialized" ? TProvides : Exclude<TProvides, TAsyncPorts>>(
    port: P
  ): Result<InferService<P>, ContainerError>;

  /**
   * Resolves a service instance asynchronously, returning a ResultAsync instead of throwing.
   *
   * Same port constraints as `resolveAsync()`.
   * Returns `Ok(service)` on success, `Err(ContainerError)` on failure.
   *
   * @typeParam P - The specific port type being resolved
   * @param port - The port token to resolve
   * @returns A ResultAsync containing the service instance or a ContainerError
   */
  tryResolveAsync<P extends TProvides>(port: P): ResultAsync<InferService<P>, ContainerError>;

  /**
   * Disposes the scope, returning a ResultAsync instead of throwing.
   *
   * Returns `Ok(void)` on clean disposal, `Err(DisposalError)` if finalizers threw.
   *
   * @returns A ResultAsync that resolves to void or a DisposalError
   */
  tryDispose(): ResultAsync<void, DisposalError>;

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
