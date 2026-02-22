/**
 * Builder State Types for GraphBuilder.
 *
 * This module consolidates:
 * - Empty state types (initial graph state)
 * - Builder internals (phantom type parameters)
 * - Extraction utilities (GetDepGraph, GetLifetimeMap, WithDepGraph, etc.)
 * - Merge utilities
 *
 * ## Naming Convention: Get* vs With*
 *
 * This module uses a consistent naming pattern inspired by immutable data patterns:
 *
 * | Prefix | Purpose | Example |
 * |--------|---------|---------|
 * | `Get*` | **Extractor**: Reads a value from a compound type | `GetDepGraph<T>` → extracts `TDepGraph` |
 * | `With*` | **Transformer**: Creates a new type with one field replaced | `WithDepGraph<T, New>` → T with new TDepGraph |
 *
 * This pattern is similar to:
 * - **Lens pattern**: Get = view, With = set
 * - **Immer pattern**: Get = read, With = produce
 * - **React state**: Get = state, With = setState
 *
 * ### Usage
 *
 * ```typescript
 * // Extract current dependency graph
 * type DepGraph = GetDepGraph<TInternalState>;
 *
 * // Create new state with updated dependency graph
 * type NewState = WithDepGraph<TInternalState, AddEdge<DepGraph, "A", "B">>;
 * ```
 *
 * @packageDocumentation
 */

import type { DefaultMaxDepth, InvalidLifetimeErrorMessage } from "../../validation/types/index.js";

// =============================================================================
// Empty State Types
// =============================================================================

/**
 * Unique symbol for EmptyDependencyGraph branding.
 * Using a symbol instead of a string literal prevents the brand from
 * polluting `keyof` operations (symbols are filtered by `Extract<keyof T, string>`).
 *
 * This is a runtime symbol to ensure TypeScript can name the type in `.d.ts` output.
 * @internal
 */
export const __emptyDepGraphBrand: unique symbol = Symbol.for("@hex-di/graph/emptyDepGraph");

/**
 * Unique symbol for EmptyLifetimeMap branding.
 *
 * This is a runtime symbol to ensure TypeScript can name the type in `.d.ts` output.
 * @internal
 */
export const __emptyLifetimeMapBrand: unique symbol = Symbol.for("@hex-di/graph/emptyLifetimeMap");

/**
 * Type representing an empty dependency graph map.
 * Used as the initial state for compile-time cycle detection.
 *
 * ## Why a Branded Type?
 *
 * We use a symbol-keyed branded type instead of plain `object` because:
 *
 * 1. **Not `Record<string, never>`**: Using `Record<string, never>` causes index
 *    signature pollution when intersected with specific properties. For example:
 *    `Record<string, never> & { A: "B" }` makes `["A"]` return `never & "B"` = `never`.
 *
 * 2. **Not plain `object`**: Using `object` is overly permissive - ANY non-primitive
 *    can satisfy the constraint, allowing invalid types to pass through.
 *
 * 3. **Symbol-branded empty type**: The `{ [__emptyDepGraphBrand]?: never }` pattern:
 *    - Avoids index signature pollution (no `[key: string]: never`)
 *    - Is restrictive enough that arbitrary objects don't satisfy it
 *    - Allows intersection with specific properties: `EmptyDependencyGraph & { A: "B" }`
 *    - The optional `never` property can only be satisfied by omitting the property
 *    - **Symbol key is invisible to `Extract<keyof T, string>`** (no pollution!)
 *
 * ## Why Symbols Over String Literals?
 *
 * Using `unique symbol` instead of a string literal (like `__emptyDepGraph`) means:
 * - `keyof EmptyDependencyGraph` returns the symbol type, not a string
 * - `Extract<keyof Graph, string>` correctly filters out the brand key
 * - No phantom string keys pollute graph operations
 *
 * @constraint MUST NOT BE `Record<string, never>` (causes index pollution)
 * @constraint MUST NOT BE plain `object` (overly permissive)
 * @see tests/empty-state-invariants.test-d.ts for invariant tests that catch breakage
 *
 * @internal
 */
export type EmptyDependencyGraph = { readonly [__emptyDepGraphBrand]?: never };

/**
 * Type representing an empty lifetime map.
 * Used as the initial state for compile-time captive dependency detection.
 *
 * Uses the same symbol-branded empty type pattern as EmptyDependencyGraph.
 * See EmptyDependencyGraph for explanation of why this pattern is used.
 *
 * @internal
 */
export type EmptyLifetimeMap = { readonly [__emptyLifetimeMapBrand]?: never };

// =============================================================================
// Adapter Lifetime Extraction
// =============================================================================

/**
 * Extracts the lifetime directly from an adapter using property access.
 * This explicitly maps each literal to avoid inference issues with unions.
 * Returns an error message for invalid or missing lifetime values.
 * @internal
 */
export type DirectAdapterLifetime<TAdapter> = TAdapter extends { lifetime: "singleton" }
  ? "singleton"
  : TAdapter extends { lifetime: "scoped" }
    ? "scoped"
    : TAdapter extends { lifetime: "transient" }
      ? "transient"
      : InvalidLifetimeErrorMessage;

// =============================================================================
// Grouped Internal Parameters
// =============================================================================
//
// ## DISAMBIGUATION: When Do I See BuilderInternals?
//
// You'll see `TInternalState` or `BuilderInternals` in IDE tooltips when:
// - Hovering over a GraphBuilder variable
// - Looking at type errors from provide() or build()
// - Examining merged graph types
//
// ## What Should I Do With It?
//
// **IGNORE IT.** BuilderInternals is implementation detail for compile-time
// validation. Focus on these parameters instead:
//
// | Parameter    | What It Means                              |
// |--------------|-------------------------------------------|
// | `TProvides`  | Ports your graph can resolve              |
// | `TRequires`  | Ports still needed by adapters            |
// | `TAsyncPorts`| Ports requiring async initialization       |
// | `TOverrides` | Ports marked as parent overrides          |
//
// ## Why Does It Exist?
//
// BuilderInternals contains the dependency graph and lifetime map needed for
// compile-time cycle and captive dependency detection. Grouping these
// internal parameters into 1 reduces tooltip noise.
//

/**
 * Groups internal phantom type parameters for GraphBuilder.
 *
 * This type encapsulates the internal parameters that users typically don't
 * need to see in IDE tooltips. By grouping them, the GraphBuilder signature
 * becomes cleaner:
 *
 * **Before** (8 parameters):
 * ```typescript
 * GraphBuilder<TProvides, TRequires, TAsyncPorts, TDepGraph, TLifetimeMap, TOverrides, TParentProvides, TMaxDepth>
 * ```
 *
 * **After** (5 parameters):
 * ```typescript
 * GraphBuilder<TProvides, TRequires, TAsyncPorts, TOverrides, TInternalState>
 * ```
 *
 * @typeParam TDepGraph - Type-level dependency map for cycle detection
 * @typeParam TLifetimeMap - Type-level lifetime map for captive detection
 * @typeParam TParentProvides - Parent graph's provided ports (unknown if no parent)
 * @typeParam TMaxDepth - Maximum cycle detection depth
 * @typeParam TUnsafeDepthOverride - When true, depth-exceeded is a WARNING not ERROR
 * @typeParam TDepthExceededWarning - Tracks ports where depth was exceeded (never if none)
 * @typeParam TUncheckedUsed - Tracks whether provideUnchecked() was used (safety marker)
 * @typeParam TErrors - Accumulated error channel types from fallible adapters (never if all handled)
 */
export interface BuilderInternals<
  out TDepGraph = EmptyDependencyGraph,
  out TLifetimeMap = EmptyLifetimeMap,
  out TParentProvides = unknown,
  out TMaxDepth extends number = DefaultMaxDepth, // Default: 50 - covers enterprise graphs
  out TUnsafeDepthOverride extends boolean = false,
  out TDepthExceededWarning extends string = never,
  out TUncheckedUsed extends boolean = false,
  out TErrors = never,
> {
  /** Type-level dependency map for cycle detection */
  readonly depGraph: TDepGraph;
  /** Type-level lifetime map for captive detection */
  readonly lifetimeMap: TLifetimeMap;
  /** Parent graph's provided ports (unknown if no parent) */
  readonly parentProvides: TParentProvides;
  /** Maximum cycle detection depth */
  readonly maxDepth: TMaxDepth;
  /** When true, depth-exceeded is a WARNING instead of ERROR */
  readonly unsafeDepthOverride: TUnsafeDepthOverride;
  /**
   * Tracks ports where depth limit was exceeded during validation.
   * If never, no depth warnings occurred. If a string union, those ports had incomplete validation.
   * Tooling can inspect this to show depth-exceeded warnings even when unsafeDepthOverride is enabled.
   */
  readonly depthExceededWarning: TDepthExceededWarning;
  /**
   * Tracks whether provideUnchecked() was used in this graph.
   * If true, compile-time validation was bypassed for at least one adapter.
   * Tooling can inspect this to warn about incomplete type-level guarantees.
   */
  readonly uncheckedUsed: TUncheckedUsed;
  /**
   * Accumulated error channel types from fallible adapters.
   * If never, all adapters are infallible or errors have been handled.
   * If non-never, `build()` will produce a compile error requiring error handling.
   */
  readonly errors: TErrors;
}

/**
 * Default internals for a new empty GraphBuilder.
 */
export type DefaultInternals = BuilderInternals<
  EmptyDependencyGraph,
  EmptyLifetimeMap,
  unknown,
  DefaultMaxDepth, // 50 - maximum recursion depth for cycle detection
  false,
  never,
  false, // uncheckedUsed: no provideUnchecked() calls yet
  never  // errors: no unhandled error channels
>;

/**
 * Base constraint type for BuilderInternals.
 *
 * This type uses the widest possible bounds for each type parameter,
 * allowing any valid BuilderInternals to satisfy the constraint.
 *
 * ## For Users: Seeing This in Tooltips?
 *
 * If you see `AnyBuilderInternals` in IDE tooltips or type errors, you can
 * safely ignore it. This is an internal implementation detail used for
 * type constraint satisfaction.
 *
 * **Focus on these user-facing type parameters instead:**
 * - `TProvides` - Ports your graph provides (e.g., `"UserService" | "Logger"`)
 * - `TRequires` - Ports your graph still needs (e.g., `"Database"`)
 * - `TAsyncPorts` - Ports that require async initialization
 *
 * The `BuilderInternals` and `AnyBuilderInternals` types are plumbing that
 * enables compile-time validation. They do not affect runtime behavior.
 *
 * ## Why This Exists
 *
 * When you write `TInternals extends BuilderInternals`, TypeScript fills in
 * the default type parameters, resulting in:
 * ```typescript
 * TInternals extends BuilderInternals<EmptyDependencyGraph, EmptyLifetimeMap, unknown, 30>
 * ```
 *
 * This is too restrictive because the literal `30` doesn't accept `number`.
 * This type uses `number` for maxDepth so any valid BuilderInternals can
 * satisfy the constraint.
 *
 * Note: TDepGraph and TLifetimeMap use `object` instead of `unknown` to ensure
 * only valid map-like types are accepted, preventing primitives like `string`
 * or `number` from being used as dependency graphs.
 *
 * ## Usage
 *
 * ```typescript
 * // Instead of:
 * class GraphBuilder<TInternalState extends BuilderInternals = DefaultInternals>
 *
 * // Use:
 * class GraphBuilder<TInternalState extends AnyBuilderInternals = DefaultInternals>
 * ```
 *
 * @internal
 */
export type AnyBuilderInternals = BuilderInternals<
  object,
  object,
  unknown,
  number,
  boolean,
  string,
  boolean,
  unknown
>;

// =============================================================================
// Extraction & Transformation Utilities (Get* and With* pattern)
// =============================================================================
//
// These types follow the Get*/With* naming convention:
// - Get* types extract a single field from BuilderInternals (read-only accessor)
// - With* types create a new BuilderInternals with one field replaced (immutable update)
//
// See module documentation for detailed explanation.

/**
 * Extracts the dependency graph from BuilderInternals.
 *
 * Uses indexed access for simplicity: `T['depGraph']` instead of pattern matching.
 *
 * @internal
 */
export type GetDepGraph<T extends AnyBuilderInternals> = T["depGraph"];

/**
 * Extracts the lifetime map from BuilderInternals.
 *
 * @internal
 */
export type GetLifetimeMap<T extends AnyBuilderInternals> = T["lifetimeMap"];

/**
 * Extracts the parent provides from BuilderInternals.
 *
 * @internal
 */
export type GetParentProvides<T extends AnyBuilderInternals> = T["parentProvides"];

/**
 * Extracts the max depth from BuilderInternals.
 *
 * @internal
 */
export type GetMaxDepth<T extends AnyBuilderInternals> = T["maxDepth"];

/**
 * Extracts the extended depth flag from BuilderInternals.
 *
 * @internal
 */
export type GetExtendedDepth<T extends AnyBuilderInternals> = T["unsafeDepthOverride"];

/**
 * Extracts the depth-exceeded warning ports from BuilderInternals.
 *
 * Returns the union of port names where depth limit was exceeded during validation,
 * or `never` if no depth warnings occurred.
 *
 * @internal
 */
export type GetDepthExceededWarning<T extends AnyBuilderInternals> = T["depthExceededWarning"];

/**
 * Extracts the unchecked-used flag from BuilderInternals.
 *
 * Returns true if provideUnchecked() was used anywhere in this graph,
 * or false if all adapters were validated at compile time.
 *
 * @internal
 */
export type GetUncheckedUsed<T extends AnyBuilderInternals> = T["uncheckedUsed"];

/**
 * Extracts the accumulated error channel types from BuilderInternals.
 *
 * Returns the union of all unhandled error types from fallible adapters,
 * or `never` if all adapters are infallible or errors have been handled.
 *
 * @internal
 */
export type GetErrors<T extends AnyBuilderInternals> = T["errors"];

/**
 * Creates a new BuilderInternals with an updated dependency graph.
 *
 * Uses indexed access for simplicity.
 *
 * @internal
 */
export type WithDepGraph<T extends AnyBuilderInternals, TNewDepGraph> = BuilderInternals<
  TNewDepGraph,
  T["lifetimeMap"],
  T["parentProvides"],
  T["maxDepth"],
  T["unsafeDepthOverride"],
  T["depthExceededWarning"],
  T["uncheckedUsed"],
  T["errors"]
>;

/**
 * Creates a new BuilderInternals with an updated lifetime map.
 *
 * @internal
 */
export type WithLifetimeMap<T extends AnyBuilderInternals, TNewLifetimeMap> = BuilderInternals<
  T["depGraph"],
  TNewLifetimeMap,
  T["parentProvides"],
  T["maxDepth"],
  T["unsafeDepthOverride"],
  T["depthExceededWarning"],
  T["uncheckedUsed"],
  T["errors"]
>;

/**
 * Creates a new BuilderInternals with updated dependency graph and lifetime map.
 *
 * @internal
 */
export type WithDepGraphAndLifetimeMap<
  T extends AnyBuilderInternals,
  TNewDepGraph,
  TNewLifetimeMap,
> = BuilderInternals<
  TNewDepGraph,
  TNewLifetimeMap,
  T["parentProvides"],
  T["maxDepth"],
  T["unsafeDepthOverride"],
  T["depthExceededWarning"],
  T["uncheckedUsed"],
  T["errors"]
>;

/**
 * Creates a new BuilderInternals with a specified parent provides.
 *
 * @internal
 */
export type WithParentProvides<
  T extends AnyBuilderInternals,
  TNewParentProvides,
> = BuilderInternals<
  T["depGraph"],
  T["lifetimeMap"],
  TNewParentProvides,
  T["maxDepth"],
  T["unsafeDepthOverride"],
  T["depthExceededWarning"],
  T["uncheckedUsed"],
  T["errors"]
>;

/**
 * Creates a new BuilderInternals with a specified max depth.
 *
 * @internal
 */
export type WithMaxDepth<
  T extends AnyBuilderInternals,
  TNewMaxDepth extends number,
> = BuilderInternals<
  T["depGraph"],
  T["lifetimeMap"],
  T["parentProvides"],
  TNewMaxDepth,
  T["unsafeDepthOverride"],
  T["depthExceededWarning"],
  T["uncheckedUsed"],
  T["errors"]
>;

/**
 * Creates a new BuilderInternals with a specified extended depth flag.
 *
 * @internal
 */
export type WithExtendedDepth<
  T extends AnyBuilderInternals,
  TNewExtendedDepth extends boolean,
> = BuilderInternals<
  T["depGraph"],
  T["lifetimeMap"],
  T["parentProvides"],
  T["maxDepth"],
  TNewExtendedDepth,
  T["depthExceededWarning"],
  T["uncheckedUsed"],
  T["errors"]
>;

/**
 * Creates a new BuilderInternals with an updated depth-exceeded warning.
 *
 * Unions the new warning port with existing warnings.
 *
 * @internal
 */
export type WithDepthExceededWarning<
  T extends AnyBuilderInternals,
  TNewDepthExceededWarning extends string,
> = BuilderInternals<
  T["depGraph"],
  T["lifetimeMap"],
  T["parentProvides"],
  T["maxDepth"],
  T["unsafeDepthOverride"],
  T["depthExceededWarning"] | TNewDepthExceededWarning,
  T["uncheckedUsed"],
  T["errors"]
>;

/**
 * Creates a new BuilderInternals with uncheckedUsed set to true.
 *
 * This is used by provideUnchecked() to mark that compile-time validation
 * was bypassed for at least one adapter.
 *
 * @internal
 */
export type WithUncheckedUsed<T extends AnyBuilderInternals> = BuilderInternals<
  T["depGraph"],
  T["lifetimeMap"],
  T["parentProvides"],
  T["maxDepth"],
  T["unsafeDepthOverride"],
  T["depthExceededWarning"],
  true,
  T["errors"]
>;

/**
 * Creates a new BuilderInternals with additional error channel types.
 *
 * Unions the new error types with existing accumulated errors.
 * Used by provide operations to track unhandled adapter error channels.
 *
 * @internal
 */
export type WithErrors<T extends AnyBuilderInternals, TNewErrors> = BuilderInternals<
  T["depGraph"],
  T["lifetimeMap"],
  T["parentProvides"],
  T["maxDepth"],
  T["unsafeDepthOverride"],
  T["depthExceededWarning"],
  T["uncheckedUsed"],
  T["errors"] | TNewErrors
>;

/**
 * Creates a new BuilderInternals with updated dependency graph, lifetime map, AND depth warning.
 *
 * This is used when depth is exceeded with unsafeDepthOverride enabled - we proceed with
 * the validation but record the warning in the internal state so tooling can detect it.
 *
 * @internal
 */
export type WithDepGraphLifetimeAndWarning<
  T extends AnyBuilderInternals,
  TNewDepGraph,
  TNewLifetimeMap,
  TWarningPort extends string,
> = BuilderInternals<
  TNewDepGraph,
  TNewLifetimeMap,
  T["parentProvides"],
  T["maxDepth"],
  T["unsafeDepthOverride"],
  T["depthExceededWarning"] | TWarningPort,
  T["uncheckedUsed"],
  T["errors"]
>;

// =============================================================================
// Merge Utilities
// =============================================================================

/**
 * OR of two boolean type parameters.
 *
 * Used by `UnifiedMergeInternals` to preserve unsafe depth override if
 * EITHER graph had it enabled. This respects user intent - if they
 * explicitly opted into unsafe mode on any graph, the merged result
 * should honor that choice.
 *
 * @internal
 */
export type BoolOr<A extends boolean, B extends boolean> = A extends true
  ? true
  : B extends true
    ? true
    : false;

/**
 * Checks if a type is exactly `unknown` (not just assignable to unknown).
 *
 * Used for detecting "no parent" state in builders, where `unknown` is used
 * as a marker for "can't override anything".
 *
 * @internal
 */
type IsExactlyUnknown<T> = [T] extends [unknown] ? ([unknown] extends [T] ? true : false) : false;

/**
 * Merges parentProvides from two builders during merge operations.
 *
 * ## Semantics
 *
 * - `unknown` means "no parent" - the builder was created with `create()`, not `forParent()`
 * - Specific ports means "these can be overridden from parent"
 *
 * ## Merge Rules
 *
 * | T1 | T2 | Result | Rationale |
 * |----|----|----|-----------|
 * | `unknown` | `unknown` | `unknown` | Neither has parent context |
 * | `unknown` | `PortA` | `PortA` | Preserve T2's override capability |
 * | `PortA` | `unknown` | `PortA` | Preserve T1's override capability |
 * | `PortA` | `PortB` | `PortA \| PortB` | Combine both parents' ports |
 *
 * ## Why Not Just Union?
 *
 * Simple `T1 | T2` doesn't work because:
 * - `unknown | PortA = unknown` (unknown is top type, absorbs everything)
 * - This would LOSE the specific parent's override capability
 *
 * We need to filter out `unknown` to preserve override capabilities.
 *
 * @internal
 */
export type MergeParentProvides<T1, T2> =
  // If T1 is exactly unknown (no parent)
  IsExactlyUnknown<T1> extends true
    ? T2 // Use T2 (could be unknown or specific)
    : // If T2 is exactly unknown (no parent)
      IsExactlyUnknown<T2> extends true
      ? T1 // T1 is specific, use it
      : T1 | T2; // Both specific, union them

/**
 * Creates merged BuilderInternals with pre-resolved maxDepth.
 *
 * This unified type is the foundation for eliminating merge type duplication.
 * Instead of computing maxDepth within the merge internals (which required
 * separate code paths for merge() vs mergeWith()), we pre-resolve maxDepth
 * at the entry points and pass it directly.
 *
 * The merged result:
 * - Uses pre-merged dependency graph and lifetime map
 * - Merges parent provides from both internals (preserves override capability)
 * - Uses the pre-resolved maxDepth (caller decides how to compute it)
 * - Preserves unsafe depth override from EITHER internals (OR semantics)
 * - Merges depth-exceeded warnings from both internals (union semantics)
 * - Preserves unchecked-used flag from EITHER internals (OR semantics)
 *
 * @internal
 */
export type UnifiedMergeInternals<
  T1 extends AnyBuilderInternals,
  T2 extends AnyBuilderInternals,
  TMergedDepGraph,
  TMergedLifetimeMap,
  TResolvedMaxDepth extends number,
> = BuilderInternals<
  TMergedDepGraph,
  TMergedLifetimeMap,
  MergeParentProvides<GetParentProvides<T1>, GetParentProvides<T2>>,
  TResolvedMaxDepth,
  BoolOr<GetExtendedDepth<T1>, GetExtendedDepth<T2>>,
  GetDepthExceededWarning<T1> | GetDepthExceededWarning<T2>,
  BoolOr<GetUncheckedUsed<T1>, GetUncheckedUsed<T2>>,
  GetErrors<T1> | GetErrors<T2>
>;
