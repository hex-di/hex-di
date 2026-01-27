/**
 * Shared Symbols Module.
 *
 * This module exports brand symbols that need to be shared across module boundaries
 * without creating bidirectional coupling. Both builder/ and graph/ modules can
 * import from here without depending on each other.
 *
 * @packageDocumentation
 */
export type { __graphBuilderBrand, __prettyView, __prettyViewSymbol, } from "./brands.js";
export { GRAPH_BUILDER_BRAND } from "./brands.js";
