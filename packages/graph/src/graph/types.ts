import type { AdapterAny } from "../adapter";

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
 */
export interface Graph<TProvides = never, TAsyncPorts = never, TOverrides = never> {
  /**
   * All adapters in the graph (both new provides and overrides).
   * Uses AdapterAny for structural compatibility.
   */
  readonly adapters: readonly AdapterAny[];

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
