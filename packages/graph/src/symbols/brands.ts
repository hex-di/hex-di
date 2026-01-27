/**
 * Shared Brand Symbols for Cross-Module Access.
 *
 * This module contains brand symbols that need to be shared across module boundaries
 * (builder/ and graph/) without creating bidirectional coupling.
 *
 * ## Symbol Naming Convention
 *
 * - **`__graphBuilderBrand`** (double underscore): Type-level phantom brand
 *   - Only exists at compile time for nominal typing
 *   - No runtime footprint
 *
 * - **`GRAPH_BUILDER_BRAND`** (SCREAMING_CASE): Runtime symbol constant
 *   - Actual Symbol() value used for instanceof-like checks
 *   - Has runtime representation
 *
 * @packageDocumentation
 */

/**
 * Unique symbol used for nominal typing of GraphBuilder types at the type level.
 *
 * This is a **phantom brand** - it exists only at the type level and has no
 * runtime representation. The `declare const` ensures TypeScript treats it
 * as a unique symbol type without generating any JavaScript code.
 */
declare const __graphBuilderBrand: unique symbol;

/**
 * Export the brand symbol TYPE for use in GraphBuilder class as a computed property key.
 * Using `export type { }` ensures no runtime code is generated for these phantom symbols.
 */
export type { __graphBuilderBrand };

/**
 * Unique symbol used for the IDE tooltip helper property.
 *
 * This is exported so users can access `builder[__prettyView]` in their IDE
 * to see a simplified view of the builder's type parameters.
 *
 * @internal
 */
declare const __prettyView: unique symbol;

/**
 * Symbol type for accessing the pretty view phantom property.
 *
 * @example
 * ```typescript
 * import type { __prettyViewSymbol } from "@hex-di/graph";
 *
 * const builder = GraphBuilder.create().provide(LoggerAdapter);
 * type View = typeof builder[typeof __prettyViewSymbol];
 * // { provides: LoggerPort; unsatisfied: never; asyncPorts: never; overrides: never }
 * ```
 */
/**
 * Export the pretty view symbol TYPE for use in GraphBuilder class.
 * Using `export type { }` ensures no runtime code is generated for these phantom symbols.
 * Exported both as the original name (for internal use) and as __prettyViewSymbol (for public API).
 */
export type { __prettyView, __prettyView as __prettyViewSymbol };

/**
 * Runtime symbol used as a property key for GraphBuilder branding.
 *
 * Unlike `__graphBuilderBrand`, this is an actual runtime value that can be
 * used to verify GraphBuilder instances. The `Symbol()` call generates a
 * globally unique value that cannot be recreated.
 *
 * @internal
 */
export const GRAPH_BUILDER_BRAND = Symbol("GraphBuilder");
