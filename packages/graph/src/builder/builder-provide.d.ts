/**
 * Adapter Registration Functions for GraphBuilder.
 *
 * This module provides standalone functions for adding adapters to a buildable graph.
 * These functions are pure and return plain objects, which the GraphBuilder class
 * delegates to and then constructs new instances from.
 *
 * ## Design Pattern
 *
 * Following the pattern from `inspection/core.ts`:
 * - Functions operate on structural `BuildableGraph` interface
 * - Functions return plain `BuildableGraphState` objects
 * - GraphBuilder methods delegate to these functions
 * - This enables testing and composition without the class
 *
 * ## AI Navigation
 *
 * **Types Used:**
 * - `AdapterConstraint` from `../adapter/index.js`
 * - `BuildableGraph`, `BuildableGraphState` from `./builder-types.js`
 *
 * **Consumed By:**
 * - `GraphBuilder.provide()` in `./builder.ts`
 * - `GraphBuilder.provideMany()` in `./builder.ts`
 * - `GraphBuilder.override()` in `./builder.ts`
 *
 * **Type-Level Validation:**
 * - `ProvideResult` from `./types/provide-types.js`
 * - `OverrideResult` from `./types/override-types.js`
 *
 * @packageDocumentation
 */
import type { AdapterConstraint } from "../adapter/index.js";
import type { BuildableGraph, BuildableGraphState } from "./builder-types.js";
/**
 * Adds a single adapter to a buildable graph.
 *
 * Returns a new state with the adapter appended. The adapter is NOT marked
 * as an override - use `addOverrideAdapter` for that.
 *
 * @pure Returns new state; input unchanged. No side effects.
 *
 * @param buildable - The current graph state
 * @param adapter - The adapter to add
 * @returns New state with the adapter appended
 *
 * @example
 * ```typescript
 * const state = addAdapter(currentState, LoggerAdapter);
 * // state.adapters.length === currentState.adapters.length + 1
 * ```
 *
 * @internal
 */
export declare function addAdapter(buildable: BuildableGraph, adapter: AdapterConstraint): BuildableGraphState;
/**
 * Adds multiple adapters to a buildable graph.
 *
 * Returns a new state with all adapters appended in order. None are marked
 * as overrides - use `addOverrideAdapter` for individual overrides.
 *
 * @pure Returns new state; input unchanged. No side effects.
 *
 * @param buildable - The current graph state
 * @param adapters - The adapters to add
 * @returns New state with all adapters appended
 *
 * @example
 * ```typescript
 * const state = addManyAdapters(currentState, [LoggerAdapter, DatabaseAdapter]);
 * // state.adapters.length === currentState.adapters.length + 2
 * ```
 *
 * @internal
 */
export declare function addManyAdapters(buildable: BuildableGraph, adapters: readonly AdapterConstraint[]): BuildableGraphState;
/**
 * Adds an adapter to a buildable graph and marks it as an override.
 *
 * Override adapters replace parent container adapters rather than extending
 * the graph. The port name is added to the `overridePortNames` set.
 *
 * @pure Returns new state; input unchanged. No side effects.
 *
 * @param buildable - The current graph state
 * @param adapter - The adapter to add as an override
 * @returns New state with the adapter appended and marked as override
 *
 * @example
 * ```typescript
 * const state = addOverrideAdapter(currentState, MockLoggerAdapter);
 * // state.overridePortNames.has("Logger") === true
 * ```
 *
 * @internal
 */
export declare function addOverrideAdapter(buildable: BuildableGraph, adapter: AdapterConstraint): BuildableGraphState;
