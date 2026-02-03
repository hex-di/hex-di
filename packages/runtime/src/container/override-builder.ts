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

import type { Port, AdapterConstraint, InferAdapterProvides } from "@hex-di/core";
import { GraphBuilder, type Graph } from "@hex-di/graph";
import type { Container } from "../types/container.js";
import type { ValidateOverrideAdapter } from "../types/override-types.js";

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
   * Reference to the base container.
   * Used to access the graph and create child containers.
   * @internal
   */
  private readonly container: Container<TProvides, never, TAsyncPorts, TPhase>;

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
   * Private constructor to enforce immutable pattern.
   * @internal
   */
  constructor(
    container: Container<TProvides, never, TAsyncPorts, TPhase>,
    adapters: readonly AdapterConstraint[] = [],
    containerName?: string
  ) {
    this.container = container;
    this.adapters = Object.freeze([...adapters]);
    this.containerName = containerName ?? `${container.name}-override`;
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
    return new OverrideBuilder(this.container, [...this.adapters, adapter], this.containerName);
  }

  /**
   * Builds the child container with accumulated overrides.
   *
   * Creates:
   * 1. An override graph fragment using GraphBuilder
   * 2. A child container from the base container with that graph
   *
   * The child container inherits all parent ports but resolves
   * overridden ports using the provided adapters.
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
  build(): Container<TProvides, TOverrides, TAsyncPorts, "initialized"> {
    // Create a minimal Graph-like object for forParent type tracking
    // We only need the type parameters, not the full implementation
    const parentGraphLike = {} as Graph<TProvides, TAsyncPorts, never>;

    // Build override graph fragment using GraphBuilder
    // Type assertions are safe because we validated all ports exist at compile time in override()
    let builder = GraphBuilder.forParent(parentGraphLike) as unknown;

    // Add all adapters as overrides
    for (const adapter of this.adapters) {
      builder = (builder as { override(a: AdapterConstraint): unknown }).override(adapter);
    }

    // Build the fragment
    const overrideGraph = (
      builder as {
        buildFragment(): Graph<Port<unknown, string>, Port<unknown, string>, Port<unknown, string>>;
      }
    ).buildFragment();

    // Create child container with override graph
    // Type assertion is safe because we validated all ports exist at compile time
    return this.container.createChild(overrideGraph, {
      name: this.containerName,
    }) as unknown as Container<TProvides, TOverrides, TAsyncPorts, "initialized">;
  }
}
