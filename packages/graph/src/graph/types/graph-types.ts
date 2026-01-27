/**
 * Core graph types.
 *
 * This module defines the Graph type - the output of GraphBuilder.build().
 * A Graph represents a validated, frozen collection of adapters ready for
 * runtime container creation.
 *
 * @packageDocumentation
 */

import type { AdapterConstraint } from "../../adapter/types/adapter-types.js";

/**
 * Unique symbol for nominal typing of Graph.
 * Ensures Graph instances are distinguishable from structurally similar objects.
 * @internal
 */
declare const __graphBrand: unique symbol;

/**
 * The validated dependency graph returned by `GraphBuilder.build()`.
 *
 * This type represents a complete, validated graph where all dependencies
 * have been satisfied. It contains the readonly array of adapters that
 * can be used by `@hex-di/runtime` to create a container.
 *
 * ## Root vs Child Graphs
 *
 * - **Root graphs**: Created with `provide()` only, `overridePortNames` is empty
 * - **Child graphs**: Can use `override()` to mark adapters as replacements for parent adapters
 *
 * The runtime uses `overridePortNames` to distinguish between:
 * - **Overrides**: Adapters that replace parent's adapter for the same port
 * - **Extensions**: New adapters that extend the container with new ports
 *
 * ## Nominal Typing
 *
 * The `__graphBrand` property provides nominal typing (like Adapter and GraphBuilder)
 * to prevent accidental structural compatibility with plain objects that happen
 * to have the same shape.
 */
export interface Graph<out TProvides = never, out TAsyncPorts = never, out TOverrides = never> {
  /**
   * Nominal type brand to prevent structural confusion.
   * The optional `?` allows this to be a phantom property that doesn't
   * require a runtime value.
   * @internal
   */
  readonly [__graphBrand]?: [TProvides, TAsyncPorts, TOverrides];
  /**
   * All adapters in the graph (both new provides and overrides).
   * Uses AdapterConstraint for structural compatibility.
   */
  readonly adapters: readonly AdapterConstraint[];

  /**
   * Set of port names that are marked as overrides.
   * Used by runtime to distinguish overrides from extensions.
   */
  readonly overridePortNames: ReadonlySet<string>;

  /**
   * Phantom type property for compile-time type tracking.
   * @internal
   */
  readonly __provides: TProvides;

  /**
   * Phantom type property for compile-time async port tracking.
   * @internal
   */
  readonly __asyncPorts: TAsyncPorts;

  /**
   * Phantom type property for compile-time override port tracking.
   * Used to track which ports are overrides vs new provides.
   * @internal
   */
  readonly __overrides: TOverrides;
}
