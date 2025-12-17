/**
 * Container and Scope branded types for @hex-di/runtime.
 *
 * These types define the core container and scope interfaces with nominal typing
 * via unique symbol brands. This ensures that:
 * - Containers and Scopes cannot be confused with structurally similar objects
 * - Different TProvides type parameters produce incompatible types
 * - Container and Scope are distinct types (not interchangeable)
 *
 * @packageDocumentation
 */

import type { Port, InferService } from "@hex-di/ports";
import { INTERNAL_ACCESS } from "./inspector-symbols.js";
import type { ContainerInternalState, ScopeInternalState } from "./inspector-types.js";

// =============================================================================
// Container Phase Type
// =============================================================================

/**
 * Represents the initialization phase of a container.
 *
 * Used for type-state tracking to enforce that async ports cannot be resolved
 * synchronously before initialization.
 *
 * @remarks
 * - `'uninitialized'`: Container has not been initialized; sync resolve limited to sync-only ports
 * - `'initialized'`: All async ports have been initialized; sync resolve works for all ports
 */
export type ContainerPhase = "uninitialized" | "initialized";

// =============================================================================
// Brand Symbols
// =============================================================================

/**
 * Unique symbol used for nominal typing of Container types.
 *
 * This symbol is exported for use in the container implementation.
 * It provides true nominal typing, ensuring that Container instances
 * are distinct from structurally similar objects.
 *
 * @remarks
 * The `unique symbol` type guarantees that this brand cannot be
 * accidentally recreated elsewhere, providing true nominal typing.
 * This follows the same pattern as Port and Adapter branding.
 *
 * @internal - Exported for implementation use only, not for external consumers.
 */
export const ContainerBrand: unique symbol = Symbol("hex-di.Container");

/**
 * Unique symbol used for nominal typing of Scope types.
 *
 * This symbol is exported for use in the container implementation.
 * It provides true nominal typing, ensuring that Scope instances
 * are distinct from structurally similar objects and from Container instances.
 *
 * @remarks
 * The `unique symbol` type guarantees that this brand cannot be
 * accidentally recreated elsewhere, providing true nominal typing.
 * This follows the same pattern as Port and Adapter branding.
 *
 * @internal - Exported for implementation use only, not for external consumers.
 */
export const ScopeBrand: unique symbol = Symbol("hex-di.Scope");

/**
 * Unique symbol used for nominal typing of ChildContainer types.
 *
 * This symbol is exported for use in the container implementation.
 * It provides true nominal typing, ensuring that ChildContainer instances
 * are distinct from Container instances and structurally similar objects.
 *
 * @remarks
 * The `unique symbol` type guarantees that this brand cannot be
 * accidentally recreated elsewhere, providing true nominal typing.
 * This follows the same pattern as Container and Scope branding.
 *
 * @internal - Exported for implementation use only, not for external consumers.
 */
export const ChildContainerBrand: unique symbol = Symbol("hex-di.ChildContainer");

// =============================================================================
// Container Type
// =============================================================================

/**
 * A branded container type that provides type-safe service resolution.
 *
 * The Container type uses TypeScript's structural typing with a branded property
 * to achieve nominal typing. This ensures that:
 * - Containers cannot be confused with structurally similar objects
 * - Different TProvides type parameters produce incompatible types
 * - Only valid ports (in TProvides) can be resolved
 *
 * @typeParam TProvides - Union of Port types that this container can resolve.
 *   The resolve method is constrained to only accept ports in this union.
 * @typeParam TAsyncPorts - Union of Port types that have async factories.
 *   These ports require async initialization before sync resolution.
 * @typeParam TPhase - The initialization phase of the container.
 *   Controls whether sync resolve can access async ports.
 *
 * @remarks
 * - The brand property carries the TProvides type for nominal typing
 * - The resolve method is generic to preserve the specific port type being resolved
 * - Before initialization, sync resolve is limited to non-async ports
 * - After initialization, all ports can be resolved synchronously
 * - createScope returns a Scope with the same type parameters
 * - dispose returns a Promise to support async cleanup of resources
 *
 * @see {@link Scope} - Child scope type with identical API but separate brand
 * @see {@link createContainer} - Factory function to create container instances
 *
 * @example Basic usage
 * ```typescript
 * // Container type is parameterized by the ports it can resolve
 * type AppContainer = Container<typeof LoggerPort | typeof DatabasePort>;
 *
 * // The resolve method is type-safe
 * declare const container: AppContainer;
 * const logger = container.resolve(LoggerPort);  // Logger
 * const db = container.resolve(DatabasePort);    // Database
 *
 * // TypeScript error: UserServicePort is not in TProvides
 * // container.resolve(UserServicePort);
 * ```
 *
 * @example Async factory initialization
 * ```typescript
 * const container = createContainer(graph);
 *
 * // Before initialization, only sync ports can be resolved synchronously
 * const logger = container.resolve(LoggerPort);  // OK - sync adapter
 * // container.resolve(DatabasePort);            // Error - async port
 *
 * // Async ports can always be resolved asynchronously
 * const db = await container.resolveAsync(DatabasePort);  // OK
 *
 * // After initialization, all ports can be resolved synchronously
 * const initialized = await container.initialize();
 * const db2 = initialized.resolve(DatabasePort);  // OK
 * ```
 *
 * @example Creating scopes
 * ```typescript
 * const scope = container.createScope();
 * // scope has type Scope<typeof LoggerPort | typeof DatabasePort>
 *
 * const logger = scope.resolve(LoggerPort);  // Still type-safe
 * await scope.dispose();  // Clean up scope resources
 * ```
 */
export type Container<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = "uninitialized",
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
   * @throws {DisposedScopeError} If the container has been disposed
   * @throws {ScopeRequiredError} If resolving a scoped port from root container
   * @throws {CircularDependencyError} If a circular dependency is detected
   * @throws {FactoryError} If the adapter's factory function throws
   * @throws {AsyncInitializationRequiredError} If resolving an async port before initialization
   */
  resolve: TPhase extends "initialized"
    ? <P extends TProvides>(port: P) => InferService<P>
    : <P extends Exclude<TProvides, TAsyncPorts>>(port: P) => InferService<P>;

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
   * @throws {DisposedScopeError} If the container has been disposed
   * @throws {ScopeRequiredError} If resolving a scoped port from root container
   * @throws {CircularDependencyError} If a circular dependency is detected
   * @throws {AsyncFactoryError} If the async factory function throws
   */
  resolveAsync<P extends TProvides>(port: P): Promise<InferService<P>>;

  /**
   * Initializes all async ports in priority order.
   *
   * This method resolves all ports with async factories, caching the results.
   * After initialization, sync resolve works for all ports including async ones.
   *
   * Only available on uninitialized containers. Returns an initialized container
   * where sync resolve is unrestricted.
   *
   * @returns A promise that resolves to an initialized container
   *
   * @throws {DisposedScopeError} If the container has been disposed
   * @throws {AsyncFactoryError} If any async factory throws
   */
  initialize: TPhase extends "uninitialized"
    ? () => Promise<Container<TProvides, TAsyncPorts, "initialized">>
    : never;

  /**
   * Whether the container has been initialized.
   *
   * After initialization, all ports can be resolved synchronously.
   */
  readonly isInitialized: boolean;

  /**
   * Creates a child scope for managing scoped service lifetimes.
   *
   * Scoped services are created once per scope and shared within that scope.
   * The returned scope has the same type parameters as the container.
   *
   * @returns A new Scope instance
   */
  createScope(): Scope<TProvides, TAsyncPorts, TPhase>;

  /**
   * Creates a child container builder for hierarchical dependency injection.
   *
   * Child containers can:
   * - Override parent adapters for their scope
   * - Extend with new adapters not in parent
   * - Configure singleton inheritance modes (shared, forked, isolated)
   *
   * @returns A new ChildContainerBuilder instance
   */
  createChild(): ChildContainerBuilder<TProvides, TAsyncPorts>;

  /**
   * Disposes the container and all singleton instances.
   *
   * After disposal, the container cannot be used to resolve services.
   * Finalizers are called in LIFO order (last created first disposed).
   *
   * @returns A promise that resolves when disposal is complete
   */
  dispose(): Promise<void>;

  /**
   * Whether the container has been disposed.
   *
   * After disposal, resolve() will throw DisposedScopeError.
   * This property can be used to check if the container is still usable.
   */
  readonly isDisposed: boolean;

  /**
   * Brand property for nominal typing.
   * Contains the TProvides type parameter at the type level.
   * Value is undefined at runtime.
   */
  readonly [ContainerBrand]: { provides: TProvides };

  /**
   * Internal state accessor for DevTools inspection.
   * Returns a frozen snapshot of the container's internal state.
   *
   * @internal Use createInspector() for a higher-level inspection API
   */
  readonly [INTERNAL_ACCESS]: () => ContainerInternalState;
};

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
export type Scope<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = "uninitialized",
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
  resolve: TPhase extends "initialized"
    ? <P extends TProvides>(port: P) => InferService<P>
    : <P extends Exclude<TProvides, TAsyncPorts>>(port: P) => InferService<P>;

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
   * @returns A new Scope instance
   */
  createScope(): Scope<TProvides, TAsyncPorts, TPhase>;

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

// =============================================================================
// ChildContainer Type
// =============================================================================

/**
 * A branded child container type that provides type-safe service resolution
 * with parent delegation.
 *
 * The ChildContainer type enables hierarchical dependency injection where:
 * - Child containers can override parent adapters for their scope
 * - Child containers can extend with new adapters not in parent
 * - Resolution delegates to parent when adapter not found in child
 * - Singletons can be shared, forked, or isolated from parent
 *
 * @typeParam TProvides - Union of Port types from parent that this child can resolve
 * @typeParam TExtends - Union of Port types added via extend() (not in parent)
 * @typeParam TAsyncPorts - Union of Port types that have async factories
 * @typeParam TPhase - The initialization phase of the container
 *
 * @remarks
 * - Child containers maintain a reference to their parent for resolution delegation
 * - Overridden adapters create separate instances in the child scope
 * - Extended ports are only resolvable from the child (not parent)
 * - Disposal cascades from parent to children (LIFO order)
 *
 * @see {@link Container} - Parent container type
 * @see {@link ChildContainerBuilder} - Builder for creating child containers
 *
 * @example Basic usage
 * ```typescript
 * const container = createContainer(graph);
 * const child = container.createChild().build();
 *
 * // Child can resolve parent's ports
 * const logger = child.resolve(LoggerPort);
 *
 * // Child has reference to parent
 * const parent = child.parent;
 * ```
 */
export type ChildContainer<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = "uninitialized",
> = {
  /**
   * Resolves a service instance for the given port synchronously.
   *
   * Resolution order:
   * 1. Check child's override map
   * 2. Check child's extend map
   * 3. Delegate to parent container
   *
   * @typeParam P - The specific port type being resolved
   * @param port - The port token to resolve
   * @returns The service instance for the given port
   */
  resolve: TPhase extends "initialized"
    ? <P extends TProvides | TExtends>(port: P) => InferService<P>
    : <P extends Exclude<TProvides | TExtends, TAsyncPorts>>(port: P) => InferService<P>;

  /**
   * Resolves a service instance for the given port asynchronously.
   *
   * @typeParam P - The specific port type being resolved
   * @param port - The port token to resolve
   * @returns A promise that resolves to the service instance
   */
  resolveAsync<P extends TProvides | TExtends>(port: P): Promise<InferService<P>>;

  /**
   * Creates a child scope for managing scoped service lifetimes.
   *
   * The returned scope uses the child container's effective adapter set.
   *
   * @returns A new Scope instance
   */
  createScope(): Scope<TProvides | TExtends, TAsyncPorts, TPhase>;

  /**
   * Creates a grandchild container builder for multi-level hierarchy.
   *
   * @returns A new ChildContainerBuilder with this child as parent
   */
  createChild(): ChildContainerBuilder<TProvides | TExtends, TAsyncPorts>;

  /**
   * Disposes the child container and all its resources.
   *
   * Disposal cascades to any grandchild containers first.
   *
   * @returns A promise that resolves when disposal is complete
   */
  dispose(): Promise<void>;

  /**
   * Whether the child container has been disposed.
   */
  readonly isDisposed: boolean;

  /**
   * Reference to the parent container.
   * This is the container from which createChild() was called.
   */
  readonly parent: Container<TProvides, TAsyncPorts, TPhase> | ChildContainer<Port<unknown, string>, Port<unknown, string>, TAsyncPorts, TPhase>;

  /**
   * Brand property for nominal typing.
   * Contains the type parameters at the type level.
   * Value is undefined at runtime.
   */
  readonly [ChildContainerBrand]: { provides: TProvides; extends: TExtends };

  /**
   * Internal state accessor for DevTools inspection.
   * Returns a frozen snapshot of the child container's internal state.
   *
   * @internal
   */
  readonly [INTERNAL_ACCESS]: () => ContainerInternalState;
};

// =============================================================================
// Inheritance Mode Types
// =============================================================================

/**
 * Defines how a child container inherits singleton instances from its parent.
 *
 * Three modes are available:
 * - `'shared'`: Child sees parent's singleton instance (live reference, mutations visible)
 * - `'forked'`: Child gets a snapshot copy at child creation time (immutable from parent's perspective)
 * - `'isolated'`: Child creates its own fresh singleton instance (ignores parent entirely)
 *
 * @remarks
 * - Default mode is `'shared'` for backwards compatibility and performance
 * - `'forked'` mode snapshots the parent's instance at child creation time
 * - `'isolated'` mode is required for async adapter overrides
 * - Mode configuration only applies to non-overridden ports (overrides always create new instances)
 *
 * @example
 * ```typescript
 * const childContainer = container
 *   .createChild()
 *   .withInheritanceMode({
 *     Logger: 'shared',    // Share parent's logger
 *     Database: 'isolated' // Create fresh database connection
 *   })
 *   .build();
 * ```
 */
export type InheritanceMode = "shared" | "forked" | "isolated";

/**
 * Map of port names to their inheritance modes.
 *
 * @typeParam TPortNames - Union of valid port name strings
 */
export type InheritanceModeMap<TPortNames extends string> = {
  [K in TPortNames]?: InheritanceMode;
};

// =============================================================================
// ChildContainerBuilder Type Utilities
// =============================================================================

import type {
  Adapter,
  Lifetime,
  FactoryKind,
  HasOverlap,
  DuplicateProviderError,
  OverridePortNotFoundError,
  InferAdapterProvides,
} from "@hex-di/graph";

/**
 * Type utility to check if a port exists in a union.
 * @internal
 */
type PortExistsIn<TPort extends Port<unknown, string>, TUnion extends Port<unknown, string>> =
  HasOverlap<TPort, TUnion>;

/**
 * The return type of `ChildContainerBuilder.override()`.
 *
 * Conditionally returns either a new `ChildContainerBuilder` with the override applied,
 * or an `OverridePortNotFoundError` if the adapter's port is not in the parent.
 *
 * @internal
 */
type OverrideResult<
  TParentProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  A extends Adapter<Port<unknown, string>, Port<unknown, string> | never, Lifetime, FactoryKind>,
> = PortExistsIn<InferAdapterProvides<A>, TParentProvides> extends true
  ? ChildContainerBuilder<TParentProvides, TAsyncPorts, TExtends>
  : OverridePortNotFoundError<InferAdapterProvides<A>>;

/**
 * The return type of `ChildContainerBuilder.extend()`.
 *
 * Conditionally returns either a new `ChildContainerBuilder` with the extension applied,
 * or a `DuplicateProviderError` if the adapter's port already exists in parent or extensions.
 *
 * @internal
 */
type ExtendResult<
  TParentProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  A extends Adapter<Port<unknown, string>, Port<unknown, string> | never, Lifetime, FactoryKind>,
> = PortExistsIn<InferAdapterProvides<A>, TParentProvides | TExtends> extends true
  ? DuplicateProviderError<InferAdapterProvides<A>>
  : ChildContainerBuilder<TParentProvides, TAsyncPorts, TExtends | InferAdapterProvides<A>>;

/**
 * Method signature for override with type-level validation.
 * @internal
 */
type OverrideMethod<
  TParentProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
> = <A extends Adapter<Port<unknown, string>, Port<unknown, string> | never, Lifetime, FactoryKind>>(
  adapter: A
) => OverrideResult<TParentProvides, TExtends, TAsyncPorts, A>;

/**
 * Method signature for extend with type-level validation.
 * @internal
 */
type ExtendMethod<
  TParentProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
> = <A extends Adapter<Port<unknown, string>, Port<unknown, string> | never, Lifetime, FactoryKind>>(
  adapter: A
) => ExtendResult<TParentProvides, TExtends, TAsyncPorts, A>;

// =============================================================================
// WithInheritanceMode Type Utilities
// =============================================================================

/**
 * Extracts port names from a union of Port types.
 * @internal
 */
type ExtractPortNames<T extends Port<unknown, string>> = T extends Port<infer _S, infer TName>
  ? TName
  : never;

/**
 * Valid inheritance mode configuration map.
 * Keys are restricted to port names from TProvides.
 * @internal
 */
type InheritanceModeConfig<TProvides extends Port<unknown, string>> = {
  [K in ExtractPortNames<TProvides>]?: InheritanceMode;
};

/**
 * Method signature for withInheritanceMode.
 * Validates that all keys in the config are valid port names from TProvides.
 * @internal
 */
type WithInheritanceModeMethod<
  TParentProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
> = <TConfig extends InheritanceModeConfig<TParentProvides>>(
  config: TConfig
) => ChildContainerBuilder<TParentProvides, TAsyncPorts, TExtends>;

// =============================================================================
// ChildContainerBuilder Type
// =============================================================================

/**
 * An immutable builder for constructing child containers with overrides and extensions.
 *
 * ChildContainerBuilder follows the immutable fluent API pattern established by GraphBuilder.
 * Each method returns a new builder instance, enabling composable configuration.
 *
 * @typeParam TParentProvides - Union of ports provided by the parent container
 * @typeParam TAsyncPorts - Union of ports with async factories from parent
 * @typeParam TExtends - Union of ports added via extend() (not in parent)
 *
 * @remarks
 * - Builder instances are frozen and immutable
 * - Each method returns a new builder with accumulated state
 * - `.build()` creates a frozen ChildContainer
 * - Override validates adapter's port exists in parent
 * - Extend validates adapter's port does NOT exist in parent
 *
 * @see {@link ChildContainer} - The container type created by .build()
 * @see {@link Container.createChild} - Entry point for creating builders
 *
 * @example Basic usage with override
 * ```typescript
 * const child = container.createChild()
 *   .override(MockLoggerAdapter)
 *   .build();
 * ```
 *
 * @example Basic usage with extend
 * ```typescript
 * const child = container.createChild()
 *   .extend(NewFeatureAdapter)
 *   .build();
 * ```
 *
 * @example Configuring inheritance modes
 * ```typescript
 * const child = container.createChild()
 *   .withInheritanceMode({
 *     Logger: 'shared',    // Share parent's instance
 *     Database: 'isolated' // Create fresh instance
 *   })
 *   .build();
 * ```
 */
export type ChildContainerBuilder<
  TParentProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
  TExtends extends Port<unknown, string> = never,
> = {
  /**
   * Overrides a parent adapter with a new adapter for the child's scope.
   *
   * The adapter's port must exist in the parent's TProvides.
   * Returns an error type if the port is not found in parent.
   *
   * @typeParam A - The adapter type being used for override
   * @param adapter - The adapter that provides a port in the parent
   * @returns A new builder with the override registered, or OverridePortNotFoundError
   */
  override: OverrideMethod<TParentProvides, TExtends, TAsyncPorts>;

  /**
   * Extends the child container with a new adapter not in the parent.
   *
   * The adapter's port must NOT exist in the parent's TProvides.
   * Returns an error type if the port already exists in parent.
   *
   * @typeParam A - The adapter type being used for extension
   * @param adapter - The adapter that provides a port not in parent
   * @returns A new builder with the extension registered, or DuplicateProviderError
   */
  extend: ExtendMethod<TParentProvides, TExtends, TAsyncPorts>;

  /**
   * Configures per-port singleton inheritance modes.
   *
   * Defines how the child container inherits singleton instances from its parent:
   * - `'shared'`: Child sees parent's singleton instance (live reference, mutations visible)
   * - `'forked'`: Child gets a snapshot copy at creation time (immutable from parent's perspective)
   * - `'isolated'`: Child creates its own fresh singleton instance (ignores parent entirely)
   *
   * The default mode is `'shared'` for all ports not explicitly configured.
   * Mode configuration applies only to non-overridden ports (overrides always create new instances).
   *
   * @param config - Object mapping port names to inheritance modes
   * @returns A new builder with the mode configuration applied
   *
   * @example
   * ```typescript
   * const child = container.createChild()
   *   .withInheritanceMode({
   *     Counter: 'forked',   // Snapshot parent's Counter at child creation
   *     Database: 'isolated' // Create fresh Database in child
   *   })
   *   .build();
   * ```
   */
  withInheritanceMode: WithInheritanceModeMethod<TParentProvides, TAsyncPorts, TExtends>;

  /**
   * Builds the child container with the current configuration.
   *
   * @returns A frozen ChildContainer instance
   */
  build(): ChildContainer<TParentProvides, TExtends, TAsyncPorts>;
};

// =============================================================================
// Type Utility Functions
// =============================================================================

/**
 * Extracts the TProvides type parameter from a Container type.
 *
 * Uses conditional type inference to extract the port union from Container.
 * Returns `never` if the input type is not a Container.
 *
 * @typeParam T - The type to extract TProvides from
 *
 * @returns The TProvides type parameter, or `never` if T is not a Container
 *
 * @remarks
 * This utility is useful for:
 * - Generic functions that need to work with Container types
 * - Type-level validation that a container provides certain ports
 * - Extracting the available ports from an existing container type
 *
 * @see {@link InferScopeProvides} - Similar utility for Scope types
 * @see {@link Container} - The Container type this utility extracts from
 *
 * @example Basic extraction
 * ```typescript
 * type MyContainer = Container<typeof LoggerPort | typeof DatabasePort>;
 * type Provides = InferContainerProvides<MyContainer>;
 * // typeof LoggerPort | typeof DatabasePort
 * ```
 *
 * @example Non-container type returns never
 * ```typescript
 * type NotContainer = { foo: string };
 * type Provides = InferContainerProvides<NotContainer>;
 * // never
 * ```
 */
export type InferContainerProvides<T> = T extends Container<infer P> ? P : never;

/**
 * Extracts the TProvides type parameter from a Scope type.
 *
 * Uses conditional type inference to extract the port union from Scope.
 * Returns `never` if the input type is not a Scope.
 *
 * @typeParam T - The type to extract TProvides from
 *
 * @returns The TProvides type parameter, or `never` if T is not a Scope
 *
 * @remarks
 * This utility is useful for:
 * - Generic functions that need to work with Scope types
 * - Type-level validation that a scope provides certain ports
 * - Extracting the available ports from an existing scope type
 *
 * @see {@link InferContainerProvides} - Similar utility for Container types
 * @see {@link Scope} - The Scope type this utility extracts from
 *
 * @example Basic extraction
 * ```typescript
 * type MyScope = Scope<typeof LoggerPort | typeof DatabasePort>;
 * type Provides = InferScopeProvides<MyScope>;
 * // typeof LoggerPort | typeof DatabasePort
 * ```
 *
 * @example Non-scope type returns never
 * ```typescript
 * type NotScope = { foo: string };
 * type Provides = InferScopeProvides<NotScope>;
 * // never
 * ```
 */
export type InferScopeProvides<T> = T extends Scope<infer P> ? P : never;

/**
 * Type predicate that returns `true` if a port is resolvable from a container or scope.
 *
 * Checks whether TPort extends the TProvides of the given container or scope type.
 * Works with both Container and Scope types.
 *
 * @typeParam TContainer - A Container or Scope type to check against
 * @typeParam TPort - The port type to check for resolvability
 *
 * @returns `true` if TPort is in TContainer's TProvides, `false` otherwise
 *
 * @remarks
 * This utility uses a union of InferContainerProvides and InferScopeProvides
 * to work with both Container and Scope types seamlessly.
 *
 * @see {@link InferContainerProvides} - Extracts TProvides from Container
 * @see {@link InferScopeProvides} - Extracts TProvides from Scope
 * @see {@link ServiceFromContainer} - Extracts service type if resolvable
 *
 * @example Container with resolvable port
 * ```typescript
 * type MyContainer = Container<typeof LoggerPort | typeof DatabasePort>;
 *
 * type CanResolveLogger = IsResolvable<MyContainer, typeof LoggerPort>;
 * // true
 *
 * type CanResolveConfig = IsResolvable<MyContainer, typeof ConfigPort>;
 * // false
 * ```
 *
 * @example Works with Scope types
 * ```typescript
 * type MyScope = Scope<typeof LoggerPort>;
 *
 * type CanResolveLogger = IsResolvable<MyScope, typeof LoggerPort>;
 * // true
 * ```
 */
export type IsResolvable<TContainer, TPort extends Port<unknown, string>> =
  TPort extends (InferContainerProvides<TContainer> | InferScopeProvides<TContainer>)
    ? true
    : false;

/**
 * Extracts the service type for a given port from a container or scope.
 *
 * Returns the service type (via InferService) if the port is resolvable,
 * or `never` if the port is not in the container's or scope's TProvides.
 *
 * @typeParam TContainer - A Container or Scope type to extract from
 * @typeParam TPort - The port type to get the service type for
 *
 * @returns The service type if TPort is resolvable, `never` otherwise
 *
 * @remarks
 * This utility combines IsResolvable and InferService to provide a safe way
 * to extract service types. It works with both Container and Scope types.
 *
 * @see {@link IsResolvable} - Checks if port is in TProvides
 * @see {@link InferService} - Extracts service type from port
 * @see {@link InferContainerProvides} - Extracts TProvides from Container
 * @see {@link InferScopeProvides} - Extracts TProvides from Scope
 *
 * @example Resolvable port returns service type
 * ```typescript
 * interface Logger { log(msg: string): void; }
 * const LoggerPort = createPort<'Logger', Logger>('Logger');
 *
 * type MyContainer = Container<typeof LoggerPort>;
 * type LoggerService = ServiceFromContainer<MyContainer, typeof LoggerPort>;
 * // Logger
 * ```
 *
 * @example Non-resolvable port returns never
 * ```typescript
 * type MyContainer = Container<typeof LoggerPort>;
 * type ConfigService = ServiceFromContainer<MyContainer, typeof ConfigPort>;
 * // never
 * ```
 *
 * @example Works with Scope types
 * ```typescript
 * type MyScope = Scope<typeof LoggerPort>;
 * type LoggerService = ServiceFromContainer<MyScope, typeof LoggerPort>;
 * // Logger
 * ```
 */
export type ServiceFromContainer<TContainer, TPort extends Port<unknown, string>> =
  IsResolvable<TContainer, TPort> extends true
    ? InferService<TPort>
    : never;
