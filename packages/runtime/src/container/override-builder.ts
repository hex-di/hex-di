/**
 * Override builder for type-safe container overrides.
 *
 * This module implements a fluent API for building container overrides
 * with compile-time validation that ports exist in the graph.
 *
 * Follows GraphBuilder's immutable builder pattern where each method
 * returns a new instance with updated phantom types.
 *
 * @packageDocumentation
 */

import type { Port, AdapterConstraint } from "@hex-di/core";
import type { Graph, InferGraphProvides, InferGraphAsyncPorts } from "@hex-di/graph";
import type { Container } from "../types/container.js";
import type { ValidateOverrideAdapter } from "../types/override-types.js";

/**
 * Graph structure for override operations.
 *
 * Uses `declare` for phantom types to satisfy Graph interface constraint
 * without requiring runtime values. This follows the same pattern as
 * GraphBuilder's phantom type properties.
 *
 * Since overrides only replace existing implementations (no new ports),
 * all phantom types are `never`.
 *
 * @internal
 */
class OverrideGraph {
  readonly adapters: readonly AdapterConstraint[];
  readonly overridePortNames: ReadonlySet<string>;

  // Phantom properties for type inference via InferGraph* utilities.
  // These exist at the type level only - no runtime value needed.
  declare readonly __provides: never;
  declare readonly __asyncPorts: never;
  declare readonly __overrides: never;

  constructor(adapters: readonly AdapterConstraint[]) {
    const portNames = new Set(adapters.map(a => a.provides.__portName));
    this.adapters = Object.freeze([...adapters]);
    this.overridePortNames = portNames;
    Object.freeze(this);
  }
}

/**
 * Thunk type for lazy container access.
 * Zero runtime overhead - just a function call.
 * This pattern solves the self-reference problem in a fully type-safe way.
 *
 * @typeParam T - The container type being accessed lazily
 * @internal
 */
type ContainerThunk<T> = () => T;

/**
 * Minimal container interface required by OverrideBuilder.
 *
 * This interface captures only what OverrideBuilder needs from a container,
 * allowing it to work with both root containers (`TExtends = never`) and
 * child containers (`TExtends` != `never`).
 *
 * The key insight is that OverrideBuilder only needs:
 * 1. The container name (for naming the override child)
 * 2. The createChild method (to create the override child container)
 *
 * By using this minimal interface instead of full `Container<..., never, ...>`,
 * we avoid the type mismatch with the `parent` property that differs between
 * root containers (parent: never) and child containers (parent: Container).
 *
 * The `createChild` method is generic to match the actual container's signature.
 * When called with `OverrideGraph` (which has `__provides: never` and `__asyncPorts: never`),
 * TypeScript will correctly compute:
 * - `Exclude<never, TProvides>` = `never`
 * - `TAsyncPorts | never` = `TAsyncPorts`
 *
 * @typeParam TProvides - Union of port types the container provides
 * @typeParam TAsyncPorts - Union of async port types
 */
export interface ContainerForOverride<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
> {
  readonly name: string;
  createChild<
    TChildGraph extends Graph<Port<unknown, string>, Port<unknown, string>, Port<unknown, string>>,
  >(
    childGraph: TChildGraph,
    options: { readonly name: string }
  ): Container<
    TProvides,
    Exclude<InferGraphProvides<TChildGraph>, TProvides>,
    TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
    "initialized"
  >;
}

/**
 * Immutable builder for creating type-safe container overrides.
 *
 * The OverrideBuilder follows the Type-State Pattern from GraphBuilder,
 * using phantom type parameters to track:
 * - `TProvides`: Union of ports provided by the base graph
 * - `TOverrides`: Union of ports that have been overridden
 *
 * Each `.override()` call:
 * 1. Validates the adapter's port exists in the base graph (compile-time)
 * 2. Validates the adapter's dependencies are satisfied (compile-time)
 * 3. Returns a new OverrideBuilder instance (immutable)
 * 4. Accumulates the adapter for later graph building
 *
 * The `.build()` method:
 * 1. Creates an override graph fragment using GraphBuilder
 * 2. Creates a child container with that graph
 * 3. Returns typed Container with overrides applied
 *
 * @typeParam TProvides - Union of port types provided by the base graph
 * @typeParam TOverrides - Union of port types that have been overridden
 * @typeParam TAsyncPorts - Union of async port types from base graph
 * @typeParam TPhase - Initialization phase of the base container
 *
 * @example
 * ```typescript
 * const testContainer = container
 *   .override(MockLoggerAdapter)     // Validates Logger exists in graph
 *   .override(MockDatabaseAdapter)   // Validates Database exists in graph
 *   .build();                         // Creates child container with overrides
 *
 * // Type error: Port doesn't exist
 * container.override(UnknownAdapter); // ERROR: Port 'Unknown' not found in graph
 * ```
 */
export class OverrideBuilder<
  TProvides extends Port<unknown, string>,
  TOverrides extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends "uninitialized" | "initialized" = "initialized",
> {
  /**
   * Phantom type property for provided ports.
   * @internal
   */
  declare private readonly __provides: TProvides;

  /**
   * Phantom type property for overridden ports.
   * @internal
   */
  declare private readonly __overrides: TOverrides;

  /**
   * Phantom type property for async ports.
   * @internal
   */
  declare private readonly __asyncPorts: TAsyncPorts;

  /**
   * Phantom type property for phase tracking.
   * @internal
   */
  declare private readonly __phase: TPhase;

  /**
   * Thunk to lazily access the base container.
   * Using a thunk solves the self-reference problem type-safely.
   *
   * Uses `ContainerForOverride` instead of full `Container` type to allow
   * both root and child containers to use the override API without type
   * conflicts from the `parent` property.
   *
   * @internal
   */
  private readonly getContainer: ContainerThunk<ContainerForOverride<TProvides, TAsyncPorts>>;

  /**
   * Accumulated adapters for override graph.
   * @internal
   */
  private readonly adapters: readonly AdapterConstraint[];

  /**
   * Container name for the override child container.
   * @internal
   */
  private readonly containerName: string;

  /**
   * Constructor using thunk pattern for lazy container access.
   *
   * The thunk pattern allows the container to reference itself in the
   * override method without forward reference issues or type casts.
   *
   * @param getContainer - Thunk that returns the container (uses minimal interface)
   * @param adapters - Accumulated adapters for override
   * @param containerName - Optional name for the child container
   * @internal
   */
  constructor(
    getContainer: ContainerThunk<ContainerForOverride<TProvides, TAsyncPorts>>,
    adapters: readonly AdapterConstraint[] = [],
    containerName?: string
  ) {
    this.getContainer = getContainer;
    this.adapters = Object.freeze([...adapters]);
    // Lazily get container name only when needed
    this.containerName = containerName ?? `${getContainer().name}-override`;
    Object.freeze(this);
  }

  /**
   * Adds an adapter override to the builder.
   *
   * Returns a new OverrideBuilder instance with the adapter added.
   * The type signature validates at compile time that:
   * 1. The adapter's port exists in the base graph
   * 2. The adapter's dependencies are satisfied
   *
   * @typeParam A - The adapter type to add
   * @param adapter - The adapter instance to override with
   * @returns New OverrideBuilder with the adapter added, or error string if validation fails
   *
   * @example
   * ```typescript
   * const builder = new OverrideBuilder(container)
   *   .override(MockLoggerAdapter)
   *   .override(MockDatabaseAdapter);
   * ```
   */
  override<A extends AdapterConstraint>(
    adapter: A
  ): ValidateOverrideAdapter<TProvides, A> extends AdapterConstraint
    ? OverrideBuilder<TProvides, TOverrides, TAsyncPorts, TPhase>
    : ValidateOverrideAdapter<TProvides, A>;
  override<A extends AdapterConstraint>(adapter: A): unknown {
    return new OverrideBuilder(this.getContainer, [...this.adapters, adapter], this.containerName);
  }

  /**
   * Builds the child container with accumulated overrides.
   *
   * Creates:
   * 1. An override graph with all adapters marked as overrides
   * 2. A child container from the base container with that graph
   *
   * The child container inherits all parent ports but resolves
   * overridden ports using the provided adapters.
   *
   * Since overrides replace existing implementations (not new ports),
   * the child container has the same `TProvides` as the parent with
   * `TExtends = never`.
   *
   * @returns Child Container with overrides applied
   *
   * @example
   * ```typescript
   * const testContainer = container
   *   .override(MockLoggerAdapter)
   *   .build();
   *
   * const logger = testContainer.resolve(LoggerPort);
   * // Returns mock instance from MockLoggerAdapter
   * ```
   */
  build(): Container<TProvides, never, TAsyncPorts, "initialized"> {
    // Create override graph with all adapters marked as overrides.
    // OverrideGraph uses `declare` for phantom types, satisfying Graph
    // interface constraint without runtime values or casts.
    const overrideGraph = new OverrideGraph(this.adapters);

    // Get the container and create child with override graph
    const container = this.getContainer();
    const childContainer = container.createChild(overrideGraph, {
      name: this.containerName,
    });

    return childContainer;
  }
}
