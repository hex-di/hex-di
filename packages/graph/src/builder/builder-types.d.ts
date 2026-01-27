/**
 * GraphBuilder Structural Types.
 *
 * This module contains structural interfaces for the standalone operation functions.
 * Brand symbols have been moved to `../symbols/` to avoid bidirectional coupling
 * between builder/ and graph/ modules.
 *
 * @packageDocumentation
 */
import type { AdapterConstraint } from "../adapter/index.js";
export type { __graphBuilderBrand, __prettyView, __prettyViewSymbol, } from "../symbols/index.js";
export { GRAPH_BUILDER_BRAND } from "../symbols/index.js";
/**
 * Structural type for graph-like objects that can have adapters added to them.
 *
 * This type captures only the runtime-necessary fields for provide operations,
 * allowing standalone functions to operate on builder-like structures without
 * requiring the full GraphBuilder class.
 *
 * @internal
 */
export interface BuildableGraph {
    readonly adapters: readonly AdapterConstraint[];
    readonly overridePortNames: ReadonlySet<string>;
}
/**
 * Result of adding adapter(s) to a buildable graph.
 *
 * This is a plain object returned by standalone functions, which the GraphBuilder
 * class then uses to construct a new instance.
 *
 * @internal
 */
export interface BuildableGraphState {
    readonly adapters: readonly AdapterConstraint[];
    readonly overridePortNames: ReadonlySet<string>;
}
