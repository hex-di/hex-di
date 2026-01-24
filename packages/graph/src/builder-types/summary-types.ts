/**
 * Simplified builder summary types for IDE tooltips.
 *
 * This module provides types that extract a compact summary of GraphBuilder state
 * using port NAMES (strings) instead of port TYPES. This produces cleaner, more
 * readable IDE tooltips.
 *
 * ## Comparison
 *
 * ```typescript
 * // PrettyBuilder (port types):
 * { provides: LoggerPort | DatabasePort; unsatisfied: CachePort; ... }
 *
 * // BuilderSummary (port names):
 * { provides: "Logger" | "Database"; unsatisfied: "Cache"; isComplete: false }
 * ```
 *
 * @packageDocumentation
 */

import type { GraphBuilder } from "../graph/builder.js";
import type { UnsatisfiedDependencies, ExtractPortNames } from "../validation/index.js";
import type { IsNever, Prettify } from "../common/index.js";
import type { AnyBuilderInternals } from "./internals.js";

/**
 * Compact summary of GraphBuilder state using port names (strings).
 *
 * This type provides a cleaner IDE tooltip view by showing port names
 * instead of full port types. Use this when you need a quick overview
 * of the builder's state.
 *
 * @example
 * ```typescript
 * import { BuilderSummary, GraphBuilder, createAdapter } from "@hex-di/graph";
 *
 * const builder = GraphBuilder.create()
 *   .provide(LoggerAdapter)
 *   .provide(DatabaseAdapter);
 *
 * type Summary = BuilderSummary<typeof builder>;
 * // Hover shows: { provides: "Logger" | "Database"; unsatisfied: never; isComplete: true }
 * ```
 *
 * @example Incomplete graph
 * ```typescript
 * const incomplete = GraphBuilder.create()
 *   .provide(UserServiceAdapter); // Requires Logger, Database
 *
 * type Summary = BuilderSummary<typeof incomplete>;
 * // { provides: "UserService"; unsatisfied: "Logger" | "Database"; isComplete: false }
 * ```
 *
 * @typeParam B - The GraphBuilder type to summarize
 */
export type BuilderSummary<B> =
  B extends GraphBuilder<
    infer TProvides,
    infer TRequires,
    infer TAsyncPorts,
    infer TOverrides,
    infer _TInternalState extends AnyBuilderInternals
  >
    ? Prettify<{
        /** Port names provided by this builder (as string literals) */
        readonly provides: ExtractPortNames<TProvides>;
        /** Port names still unsatisfied (as string literals) */
        readonly unsatisfied: ExtractPortNames<UnsatisfiedDependencies<TProvides, TRequires>>;
        /** True if all dependencies are satisfied */
        readonly isComplete: IsNever<UnsatisfiedDependencies<TProvides, TRequires>> extends true
          ? true
          : false;
        /** Port names with async factories (as string literals) */
        readonly asyncPorts: ExtractPortNames<TAsyncPorts>;
        /** Port names marked as overrides (as string literals) */
        readonly overrides: ExtractPortNames<TOverrides>;
      }>
    : never;

/**
 * Minimal summary showing only completeness status.
 *
 * Use this for quick checks when you only care about whether
 * the graph is complete (all dependencies satisfied).
 *
 * @example
 * ```typescript
 * type Status = BuilderStatus<typeof builder>;
 * // { isComplete: true } or { isComplete: false; missing: "Logger" | "Database" }
 * ```
 *
 * @typeParam B - The GraphBuilder type to check
 */
export type BuilderStatus<B> =
  B extends GraphBuilder<
    infer TProvides,
    infer TRequires,
    infer _TAsyncPorts,
    infer _TOverrides,
    infer _TInternalState extends AnyBuilderInternals
  >
    ? IsNever<UnsatisfiedDependencies<TProvides, TRequires>> extends true
      ? { readonly isComplete: true }
      : {
          readonly isComplete: false;
          readonly missing: ExtractPortNames<UnsatisfiedDependencies<TProvides, TRequires>>;
        }
    : never;

/**
 * Quick check if a GraphBuilder is complete (all dependencies satisfied).
 *
 * Returns `true` if the builder can call `build()` without errors,
 * `false` otherwise.
 *
 * @example
 * ```typescript
 * type CanBuild = IsBuilderComplete<typeof builder>; // true or false
 * ```
 *
 * @typeParam B - The GraphBuilder type to check
 */
export type IsBuilderComplete<B> =
  B extends GraphBuilder<
    infer TProvides,
    infer TRequires,
    infer _TAsyncPorts,
    infer _TOverrides,
    infer _TInternalState extends AnyBuilderInternals
  >
    ? IsNever<UnsatisfiedDependencies<TProvides, TRequires>> extends true
      ? true
      : false
    : never;

/**
 * Extracts just the provided port names from a GraphBuilder.
 *
 * @example
 * ```typescript
 * type Ports = BuilderProvides<typeof builder>;
 * // "Logger" | "Database" | "UserService"
 * ```
 *
 * @typeParam B - The GraphBuilder type to extract from
 */
export type BuilderProvides<B> =
  B extends GraphBuilder<
    infer TProvides,
    infer _TRequires,
    infer _TAsyncPorts,
    infer _TOverrides,
    infer _TInternalState extends AnyBuilderInternals
  >
    ? ExtractPortNames<TProvides>
    : never;

/**
 * Extracts just the unsatisfied port names from a GraphBuilder.
 *
 * Returns `never` if all dependencies are satisfied.
 *
 * @example
 * ```typescript
 * type Missing = BuilderMissing<typeof builder>;
 * // "Logger" | "Database" or never if complete
 * ```
 *
 * @typeParam B - The GraphBuilder type to extract from
 */
export type BuilderMissing<B> =
  B extends GraphBuilder<
    infer TProvides,
    infer TRequires,
    infer _TAsyncPorts,
    infer _TOverrides,
    infer _TInternalState extends AnyBuilderInternals
  >
    ? ExtractPortNames<UnsatisfiedDependencies<TProvides, TRequires>>
    : never;
