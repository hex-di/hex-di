/**
 * GraphBuilder Signature Type for Pattern Matching.
 *
 * This module provides a structural signature type for GraphBuilder that can be
 * used for pattern matching in type-level conditionals WITHOUT importing the
 * actual GraphBuilder class.
 *
 * ## Why This Exists
 *
 * Several type modules in `src/builder/types/` need to match against GraphBuilder
 * in conditional types (e.g., `B extends GraphBuilder<...>`). Importing
 * GraphBuilder directly from `../builder.js` creates circular import chains:
 *
 * ```
 * builder.ts → types/provide.ts → types/state.ts → builder.ts (cycle!)
 * ```
 *
 * By using a structural signature type with the same type parameters, we can
 * perform pattern matching without importing the class itself.
 *
 * ## How It Works
 *
 * GraphBuilder class implements `GraphBuilderSignature` implicitly through its
 * phantom type properties (`__provides`, `__requires`, etc.). Any type that
 * extends GraphBuilder will also extend GraphBuilderSignature, allowing pattern
 * matching to work correctly.
 *
 * @packageDocumentation
 */
import type { AnyBuilderInternals, DefaultInternals } from "./state.js";
/**
 * Structural signature type for GraphBuilder pattern matching.
 *
 * This interface mirrors the phantom type parameters of GraphBuilder without
 * requiring import of the class itself. Use this for pattern matching in
 * conditional types to break import cycles.
 *
 * @typeParam TProvides - Union of port types this builder can resolve
 * @typeParam TRequires - Union of port types required by registered adapters
 * @typeParam TAsyncPorts - Union of port types requiring async initialization
 * @typeParam TOverrides - Union of port types that override parent ports
 * @typeParam TInternalState - Internal state containing dep graph and lifetime map
 *
 * @example
 * ```typescript
 * // Instead of: import type { GraphBuilder } from "../builder.js";
 * // Use:
 * type ExtractProvides<B> = B extends GraphBuilderSignature<
 *   infer TProvides, infer _R, infer _A, infer _O, infer _I
 * > ? TProvides : never;
 * ```
 */
export interface GraphBuilderSignature<TProvides = never, TRequires = never, TAsyncPorts = never, TOverrides = never, TInternalState extends AnyBuilderInternals = DefaultInternals> {
    /** Phantom property for type-level provides tracking */
    readonly __provides: TProvides;
    /** Phantom property for type-level requires tracking */
    readonly __requires: TRequires;
    /** Phantom property for type-level async ports tracking */
    readonly __asyncPorts: TAsyncPorts;
    /** Phantom property for type-level overrides tracking */
    readonly __overrides: TOverrides;
    /** Phantom property for internal state (dep graph, lifetime map, etc.) */
    readonly __internalState: TInternalState;
}
