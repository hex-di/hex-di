/**
 * Initialization order types for GraphBuilder.
 *
 * This module provides types for inspecting async adapter initialization order.
 * The actual initialization order is determined at runtime via topological sort,
 * but these types help understand the dependency relationships.
 *
 * ## Initialization Tiers
 *
 * Async adapters are organized into initialization tiers:
 * - **Tier 0**: Async adapters with no dependencies on other async adapters
 * - **Tier 1**: Async adapters that depend only on Tier 0 adapters
 * - **Tier 2**: Async adapters that depend on Tier 1 or lower
 * - ...and so on
 *
 * Adapters in the same tier can be initialized in parallel.
 *
 * @packageDocumentation
 */

import type { GraphBuilderSignature } from "./builder-signature.js";
import type { AnyBuilderInternals, GetDepGraph } from "./state.js";
import type { GetDirectDeps } from "../../validation/types/index.js";
import type { IsNever, Prettify } from "../../types/type-utilities.js";

/**
 * Checks if a port has any async dependencies in the dependency graph.
 *
 * Returns `true` if the port directly depends on any async port.
 *
 * @internal
 */
export type HasAsyncDependency<TDepGraph, TAsyncPorts, TPort extends string> =
  GetDirectDeps<TDepGraph, TPort> extends infer TDeps
    ? TDeps extends string
      ? TDeps extends ExtractAsyncPortNames<TAsyncPorts>
        ? true
        : false
      : false
    : false;

/**
 * Extracts port names from async port types.
 *
 * @internal
 */
type ExtractAsyncPortNames<TAsyncPorts> = TAsyncPorts extends { readonly __portName: infer N }
  ? N
  : never;

/**
 * Identifies async ports that have no async dependencies (Tier 0).
 *
 * These ports can be initialized first and in parallel.
 *
 * @typeParam TDepGraph - The dependency graph
 * @typeParam TAsyncPorts - Union of async port types
 *
 * @internal
 */
export type Tier0Ports<TDepGraph, TAsyncPorts> = TAsyncPorts extends infer P
  ? P extends { readonly __portName: infer N extends string }
    ? HasAsyncDependency<TDepGraph, TAsyncPorts, N> extends false
      ? P
      : never
    : never
  : never;

/**
 * Summary of async initialization for a GraphBuilder.
 *
 * This type provides a high-level view of async adapter dependencies,
 * useful for understanding initialization order and debugging.
 *
 * @example
 * ```typescript
 * import { AsyncInitSummary, GraphBuilder } from "@hex-di/graph";
 *
 * const builder = GraphBuilder.create()
 *   .provideAsync(ConfigAdapter)    // No async deps
 *   .provideAsync(DatabaseAdapter)  // Depends on Config
 *   .provideAsync(CacheAdapter);    // No async deps
 *
 * type Summary = AsyncInitSummary<typeof builder>;
 * // {
 * //   asyncPorts: ConfigPort | DatabasePort | CachePort;
 * //   tier0: ConfigPort | CachePort;  // Can init in parallel first
 * //   hasAsyncDeps: true;
 * // }
 * ```
 *
 * @typeParam B - The GraphBuilder type
 */
export type AsyncInitSummary<B> =
  B extends GraphBuilderSignature<
    infer _TProvides,
    infer _TRequires,
    infer TAsyncPorts,
    infer _TOverrides,
    infer TInternalState extends AnyBuilderInternals
  >
    ? Prettify<{
        /** All async ports in the graph */
        readonly asyncPorts: TAsyncPorts;
        /** Async ports with no async dependencies (can initialize first) */
        readonly tier0: Tier0Ports<GetDepGraph<TInternalState>, TAsyncPorts>;
        /** Whether there are any async ports */
        readonly hasAsyncPorts: IsNever<TAsyncPorts> extends true ? false : true;
        /** Count of async ports (approximate via union check) */
        readonly needsInitialize: IsNever<TAsyncPorts> extends true ? false : true;
      }>
    : never;

/**
 * Checks if a specific port is an async port in the builder.
 *
 * @example
 * ```typescript
 * type IsConfigAsync = IsAsyncPort<typeof builder, typeof ConfigPort>;
 * // true or false
 * ```
 *
 * @typeParam B - The GraphBuilder type
 * @typeParam TPort - The port type to check
 */
export type IsAsyncPort<B, TPort> =
  B extends GraphBuilderSignature<
    infer _TProvides,
    infer _TRequires,
    infer TAsyncPorts,
    infer _TOverrides,
    infer _TInternalState extends AnyBuilderInternals
  >
    ? TPort extends TAsyncPorts
      ? true
      : false
    : never;

/**
 * Extracts async port names from a GraphBuilder.
 *
 * @example
 * ```typescript
 * type Names = AsyncPortNames<typeof builder>;
 * // "Config" | "Database" | "Cache"
 * ```
 *
 * @typeParam B - The GraphBuilder type
 */
export type AsyncPortNames<B> =
  B extends GraphBuilderSignature<
    infer _TProvides,
    infer _TRequires,
    infer TAsyncPorts,
    infer _TOverrides,
    infer _TInternalState extends AnyBuilderInternals
  >
    ? ExtractAsyncPortNames<TAsyncPorts>
    : never;

/**
 * Checks if a GraphBuilder requires initialization (has async ports).
 *
 * When this returns `true`, you must call `container.initialize()` before
 * resolving services from the container.
 *
 * @example
 * ```typescript
 * type NeedsInit = RequiresInitialization<typeof builder>;
 * if (NeedsInit) {
 *   await container.initialize();
 * }
 * ```
 *
 * @typeParam B - The GraphBuilder type
 */
export type RequiresInitialization<B> =
  B extends GraphBuilderSignature<
    infer _TProvides,
    infer _TRequires,
    infer TAsyncPorts,
    infer _TOverrides,
    infer _TInternalState extends AnyBuilderInternals
  >
    ? IsNever<TAsyncPorts> extends true
      ? false
      : true
    : never;
