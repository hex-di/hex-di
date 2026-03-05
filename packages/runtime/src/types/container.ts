/**
 * Container type definitions for @hex-di/runtime.
 *
 * The Container type is the primary interface for type-safe service resolution.
 * It uses branded types for nominal typing and supports both root and child containers.
 *
 * @packageDocumentation
 */

import type {
  Port,
  InferService,
  InspectorAPI,
  AdapterConstraint,
  DisposalPhase,
} from "@hex-di/core";
import type { Result, ResultAsync } from "@hex-di/result";
import type { ContainerError, DisposalError } from "../errors/index.js";
import type { Graph, InferGraphProvides, InferGraphAsyncPorts } from "@hex-di/graph";
import { INTERNAL_ACCESS } from "../inspection/symbols.js";
import type { ContainerInternalState } from "../inspection/internal-state-types.js";
import type { ContainerPhase, ContainerKind, CreateChildOptions } from "./options.js";
import { ContainerBrand } from "./brands.js";
import type { Scope } from "./scope.js";
import type { HookType, HookHandler } from "../resolution/hooks.js";
import type { ValidateOverrideAdapter } from "./override-types.js";

// =============================================================================
// Container Type (Unified: Root + Child)
// =============================================================================

/**
 * A branded container type that provides type-safe service resolution.
 *
 * The Container type is unified to represent both root containers (created from a Graph)
 * and child containers (created via `.createChild().build()`). The `TExtends` type parameter
 * distinguishes between them:
 * - Root containers: `TExtends = never` (has `initialize()`, no `parent`)
 * - Child containers: `TExtends` is a port union (has `parent`, no `initialize()`)
 *
 * @typeParam TProvides - Union of Port types available from the container's graph or parent container.
 *
 * @typeParam TExtends - Union of Port types added via child graph extensions or `.override().extend()`.
 *
 * @typeParam TAsyncPorts - Union of Port types that have async factory functions.
 *
 * @typeParam TPhase - The initialization phase: `'uninitialized' | 'initialized'`.
 *
 * @typeParam TDisposal - The disposal phase: `'active' | 'disposed'`.
 *   This phantom type parameter tracks whether the container has been disposed.
 *   When `"active"` (default), all resolution and scope creation methods are available.
 *   When `"disposed"`, those methods are absent from the type — calling them is a type error.
 *   `dispose()` returns `Promise<Container<..., "disposed">>` to enable type-safe
 *   tracking of the disposal state transition.
 *
 * @see {@link Scope} - Child scope type with identical resolution API but separate brand
 * @see {@link createContainer} - Factory function to create root container instances
 */
export type Container<
  TProvides extends Port<string, unknown>,
  TExtends extends Port<string, unknown> = never,
  TAsyncPorts extends Port<string, unknown> = never,
  TPhase extends ContainerPhase = "uninitialized",
  TDisposal extends DisposalPhase = "active",
> = TDisposal extends "active"
  ? ActiveContainerMembers<TProvides, TExtends, TAsyncPorts, TPhase>
  : DisposedContainerMembers<TProvides, TExtends, TAsyncPorts, TPhase>;

/**
 * Alias for the full ContainerMembers type — represents an active (non-disposed) container.
 * This is the primary type used in factory/wrapper code.
 * @internal
 */
export type ContainerMembers<
  TProvides extends Port<string, unknown>,
  TExtends extends Port<string, unknown>,
  TAsyncPorts extends Port<string, unknown>,
  TPhase extends ContainerPhase,
  TDisposal extends DisposalPhase = "active",
> = TDisposal extends "active"
  ? ActiveContainerMembers<TProvides, TExtends, TAsyncPorts, TPhase>
  : DisposedContainerMembers<TProvides, TExtends, TAsyncPorts, TPhase>;

// =============================================================================
// Base Container Properties (shared by active and disposed containers)
// =============================================================================

/**
 * Properties available on all containers regardless of disposal state.
 * @internal
 */
type ContainerBase<
  TProvides extends Port<string, unknown>,
  TExtends extends Port<string, unknown>,
  TAsyncPorts extends Port<string, unknown>,
  TPhase extends ContainerPhase,
> = {
  /** Whether the container has been initialized. */
  readonly isInitialized: boolean;

  /** Whether the container has been disposed. */
  readonly isDisposed: boolean;

  /** Checks if the container can resolve the given port. */
  has(port: Port<string, unknown>): boolean;

  /** Container name. */
  readonly name: string;

  /** Parent container's name, null for root containers. */
  readonly parentName: string | null;

  /** Container kind. */
  readonly kind: ContainerKind;

  /**
   * Reference to the parent container.
   * Only available on child containers (when TExtends is not never).
   */
  // NOTE: Using [T] extends [never] to prevent distribution over the never type.
  readonly parent: [TExtends] extends [never]
    ? never
    : Container<TProvides, Port<string, unknown>, TAsyncPorts, TPhase>;

  /** Inspector API for container state inspection and DevTools integration. */
  readonly inspector: InspectorAPI;

  /** Adds a resolution hook to this container. */
  addHook<T extends HookType>(type: T, handler: HookHandler<T>): void;

  /** Removes a previously installed resolution hook. */
  removeHook<T extends HookType>(type: T, handler: HookHandler<T>): void;

  /** Brand property for nominal typing. */
  readonly [ContainerBrand]: { provides: TProvides; extends: TExtends };

  /** Internal state accessor for DevTools inspection. @internal */
  readonly [INTERNAL_ACCESS]: () => ContainerInternalState;
};

// =============================================================================
// Active Container Members (TDisposal = "active")
// =============================================================================

/**
 * Container interface when the container is active (not disposed).
 * All resolution, scope creation, disposal, and override methods are available.
 * @internal
 */
export type ActiveContainerMembers<
  TProvides extends Port<string, unknown>,
  TExtends extends Port<string, unknown>,
  TAsyncPorts extends Port<string, unknown>,
  TPhase extends ContainerPhase,
> = ContainerBase<TProvides, TExtends, TAsyncPorts, TPhase> & {
  /**
   * Resolves a service instance for the given port synchronously.
   * Phase-dependent: before initialization, only non-async ports can be resolved.
   */
  resolve<
    P extends TPhase extends "initialized"
      ? TProvides | TExtends
      : Exclude<TProvides | TExtends, TAsyncPorts>,
  >(
    port: P
  ): InferService<P>;

  /** Resolves a service instance for the given port asynchronously. */
  resolveAsync<P extends TProvides | TExtends>(port: P): Promise<InferService<P>>;

  /** Resolves a service instance, returning a Result instead of throwing. */
  tryResolve<
    P extends TPhase extends "initialized"
      ? TProvides | TExtends
      : Exclude<TProvides | TExtends, TAsyncPorts>,
  >(
    port: P
  ): Result<InferService<P>, ContainerError>;

  /** Resolves a service instance asynchronously, returning a ResultAsync. */
  tryResolveAsync<P extends TProvides | TExtends>(
    port: P
  ): ResultAsync<InferService<P>, ContainerError>;

  /** Disposes the container, returning a ResultAsync instead of throwing. */
  tryDispose(): ResultAsync<void, DisposalError>;

  /**
   * Initializes all async ports, returning a ResultAsync.
   * Only available on root containers.
   */
  // NOTE: Using [T] extends [never] to prevent distribution over the never type.
  tryInitialize: [TExtends] extends [never]
    ? TPhase extends "uninitialized"
      ? () => ResultAsync<
          Container<TProvides, never, TAsyncPorts, "initialized", "active">,
          ContainerError
        >
      : never
    : never;

  /**
   * Initializes all async ports in priority order.
   * Only available on root containers.
   */
  // NOTE: Using [T] extends [never] to prevent distribution over the never type.
  initialize: [TExtends] extends [never]
    ? TPhase extends "uninitialized"
      ? () => Promise<Container<TProvides, never, TAsyncPorts, "initialized", "active">>
      : never
    : never;

  /** Creates a child scope for managing scoped service lifetimes. */
  createScope(name?: string): Scope<TProvides | TExtends, TAsyncPorts, TPhase, "active">;

  /** Creates a child container from a child graph. */
  createChild<
    TChildGraph extends Graph<Port<string, unknown>, Port<string, unknown>, Port<string, unknown>>,
  >(
    childGraph: TChildGraph,
    options: CreateChildOptions<TProvides | TExtends>
  ): Container<
    TProvides | TExtends,
    Exclude<InferGraphProvides<TChildGraph>, TProvides | TExtends>,
    TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
    "initialized",
    "active"
  >;

  /** Creates a child container asynchronously from a graph loader. */
  createChildAsync<
    TChildGraph extends Graph<Port<string, unknown>, Port<string, unknown>, Port<string, unknown>>,
  >(
    graphLoader: () => Promise<TChildGraph>,
    options: CreateChildOptions<TProvides | TExtends>
  ): Promise<
    Container<
      TProvides | TExtends,
      Exclude<InferGraphProvides<TChildGraph>, TProvides | TExtends>,
      TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
      "initialized",
      "active"
    >
  >;

  /** Creates a lazy-loading child container wrapper. */
  createLazyChild<
    TChildGraph extends Graph<Port<string, unknown>, Port<string, unknown>, Port<string, unknown>>,
  >(
    graphLoader: () => Promise<TChildGraph>,
    options: CreateChildOptions<TProvides | TExtends>
  ): LazyContainer<
    TProvides | TExtends,
    Exclude<InferGraphProvides<TChildGraph>, TProvides | TExtends>,
    TAsyncPorts | InferGraphAsyncPorts<TChildGraph>
  >;

  /**
   * Disposes the container and all singleton instances.
   * Returns a promise that resolves to the container typed as disposed.
   */
  dispose(): Promise<Container<TProvides, TExtends, TAsyncPorts, TPhase, "disposed">>;

  /** Creates an override builder for type-safe container overrides. */
  override<A extends AdapterConstraint>(
    adapter: A
  ): OverrideBuilder<TProvides | TExtends, never, TAsyncPorts, TPhase>;
};

// =============================================================================
// Disposed Container Members (TDisposal = "disposed")
// =============================================================================

/**
 * Container interface after disposal.
 *
 * Only metadata and inspection properties are available.
 * Resolution methods, scope creation, and disposal are absent — calling
 * them on a disposed container is a compile-time type error.
 * @internal
 */
export type DisposedContainerMembers<
  TProvides extends Port<string, unknown>,
  TExtends extends Port<string, unknown>,
  TAsyncPorts extends Port<string, unknown>,
  TPhase extends ContainerPhase,
> = ContainerBase<TProvides, TExtends, TAsyncPorts, TPhase>;

// =============================================================================
// Override Builder Type
// =============================================================================

/**
 * Public interface for the override builder.
 *
 * @typeParam TProvides - Union of port types provided by the base graph
 * @typeParam TOverrides - Union of port types that have been overridden
 * @typeParam TAsyncPorts - Union of async port types from base graph
 * @typeParam TPhase - Initialization phase of the base container
 */
export interface OverrideBuilder<
  TProvides extends Port<string, unknown>,
  TOverrides extends Port<string, unknown> = never,
  TAsyncPorts extends Port<string, unknown> = never,
  TPhase extends ContainerPhase = "initialized",
> {
  /** Adds an adapter override to the builder. */
  override<A extends AdapterConstraint>(
    adapter: A
  ): ValidateOverrideAdapter<TProvides, A> extends AdapterConstraint
    ? OverrideBuilder<TProvides, TOverrides, TAsyncPorts, TPhase>
    : ValidateOverrideAdapter<TProvides, A>;

  /** Builds the child container with accumulated overrides. */
  build(): Container<TProvides, never, TAsyncPorts, "initialized", "active">;
}

// =============================================================================
// Lazy Container Type
// =============================================================================

/**
 * A lazy-loading container wrapper that defers graph loading until first use.
 *
 * @typeParam TProvides - Union of Port types inherited from the parent container.
 * @typeParam TExtends - Union of Port types added by the lazy-loaded graph.
 * @typeParam TAsyncPorts - Union of Port types that have async factories.
 */
export type LazyContainer<
  TProvides extends Port<string, unknown>,
  TExtends extends Port<string, unknown> = never,
  TAsyncPorts extends Port<string, unknown> = never,
> = LazyContainerMembers<TProvides, TExtends, TAsyncPorts>;

/**
 * Internal type containing LazyContainer method definitions.
 * @internal
 */
type LazyContainerMembers<
  TProvides extends Port<string, unknown>,
  TExtends extends Port<string, unknown>,
  TAsyncPorts extends Port<string, unknown>,
> = {
  /** Resolves a service instance for the given port asynchronously. */
  resolve<P extends TProvides | TExtends>(port: P): Promise<InferService<P>>;

  /** Resolves a service instance for the given port asynchronously. Alias for resolve(). */
  resolveAsync<P extends TProvides | TExtends>(port: P): Promise<InferService<P>>;

  /** Resolves a service instance, returning a ResultAsync instead of throwing. */
  tryResolve<P extends TProvides | TExtends>(port: P): ResultAsync<InferService<P>, ContainerError>;

  /** Resolves a service instance asynchronously, returning a ResultAsync. */
  tryResolveAsync<P extends TProvides | TExtends>(
    port: P
  ): ResultAsync<InferService<P>, ContainerError>;

  /** Disposes the lazy container, returning a ResultAsync instead of throwing. */
  tryDispose(): ResultAsync<void, DisposalError>;

  /** Explicitly loads the graph and returns the underlying container. */
  load(): Promise<Container<TProvides, TExtends, TAsyncPorts, "initialized", "active">>;

  /** Whether the graph has been loaded and the container is ready. */
  readonly isLoaded: boolean;

  /** Whether the lazy container has been disposed. */
  readonly isDisposed: boolean;

  /** Checks if a port is available for resolution. */
  has(port: Port<string, unknown>): boolean;

  /** Disposes the lazy container. */
  dispose(): Promise<void>;
};
