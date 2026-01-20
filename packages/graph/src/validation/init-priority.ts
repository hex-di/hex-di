/**
 * Init Priority Type Utilities for @hex-di/graph.
 *
 * This module provides type-level infrastructure for tracking async adapter
 * initialization priorities. These types enable future compile-time validation
 * of init priority ordering.
 *
 * ## Current Status
 *
 * Init priority validation is currently **runtime-only**. The types in this module
 * are infrastructure for future compile-time validation.
 *
 * ## Design Constraints
 *
 * TypeScript cannot perform arbitrary numeric comparison at the type level.
 * Two approaches are possible:
 *
 * 1. **Priority Bands** ('early' | 'normal' | 'late') - Simpler, faster type-checking
 * 2. **Peano Arithmetic** - Exact comparison, but O(n²) and hits recursion limits
 *
 * See ARCHITECTURE.md for detailed discussion of trade-offs.
 *
 * @packageDocumentation
 */

// =============================================================================
// Priority Band Types (Recommended Approach)
// =============================================================================

/**
 * Priority bands for simplified compile-time validation.
 *
 * These bands map to numeric ranges:
 * - `early`: 0-33 (initialized first)
 * - `normal`: 34-66 (default)
 * - `late`: 67-100 (initialized last)
 *
 * @remarks
 * This is a potential alternative to numeric initPriority for compile-time validation.
 * The granularity trade-off is acceptable for most use cases since exact ordering
 * within a band is rarely important.
 */
export type PriorityBand = "early" | "normal" | "late";

/**
 * Numeric ordering for priority bands.
 * Lower number = initialized earlier.
 */
export type PriorityBandLevel = {
  early: 0;
  normal: 1;
  late: 2;
};

/**
 * Extracts the priority band level from a band name.
 *
 * @typeParam TBand - The priority band name
 * @returns The numeric level (0, 1, or 2)
 */
export type GetBandLevel<TBand extends PriorityBand> = PriorityBandLevel[TBand];

/**
 * Checks if a dependent's priority band is valid given its dependency's band.
 *
 * The rule: A dependent's priority must be >= its dependency's priority.
 * In band terms: dependent's band level must be >= dependency's band level.
 *
 * @typeParam TDependencyBand - The dependency's priority band
 * @typeParam TDependentBand - The dependent's (consumer's) priority band
 * @returns `true` if the ordering is valid, `false` otherwise
 *
 * @example
 * ```typescript
 * type Valid1 = IsValidBandOrder<'early', 'normal'>; // true (normal >= early)
 * type Valid2 = IsValidBandOrder<'early', 'early'>;  // true (equal is ok)
 * type Invalid = IsValidBandOrder<'late', 'early'>;  // false (early < late)
 * ```
 */
export type IsValidBandOrder<
  TDependencyBand extends PriorityBand,
  TDependentBand extends PriorityBand,
> =
  GetBandLevel<TDependentBand> extends 0
    ? GetBandLevel<TDependencyBand> extends 0
      ? true
      : false // early can only depend on early
    : GetBandLevel<TDependentBand> extends 1
      ? GetBandLevel<TDependencyBand> extends 2
        ? false // normal cannot depend on late
        : true
      : true; // late can depend on anything

// =============================================================================
// Init Priority Map Types
// =============================================================================

/**
 * Type representing an empty init priority map.
 */
export type EmptyInitPriorityMap = { [K in never]: never };

/**
 * Adds an init priority entry to the map.
 *
 * @typeParam TMap - The current priority map
 * @typeParam TPortName - The port name to add
 * @typeParam TPriority - The priority value (number literal or 'default')
 * @returns The updated map with the new entry
 */
export type AddInitPriority<
  TMap,
  TPortName extends string,
  TPriority extends number | "default",
> = TMap & { [K in TPortName]: TPriority };

/**
 * Gets the init priority for a port from the map.
 *
 * @typeParam TMap - The priority map
 * @typeParam TPortName - The port name to look up
 * @returns The priority value, or 'default' (100) if not found
 */
export type GetInitPriority<TMap, TPortName extends string> = TPortName extends keyof TMap
  ? TMap[TPortName]
  : "default";

/**
 * Default init priority value.
 */
export type DefaultInitPriority = 100;

// =============================================================================
// Adapter Init Priority Extraction
// =============================================================================

/**
 * Extracts the init priority from an adapter type.
 *
 * @typeParam TAdapter - The adapter type
 * @returns The initPriority value, or 'default' if not specified
 */
export type InferAdapterInitPriority<TAdapter> = TAdapter extends { initPriority: infer P }
  ? P extends number
    ? P
    : "default"
  : "default";

// =============================================================================
// Priority Validation Types (Future Use)
// =============================================================================

/**
 * Error message for invalid init priority ordering.
 *
 * @typeParam TDependentName - Name of the dependent adapter
 * @typeParam TDependentPriority - Priority of the dependent
 * @typeParam TDependencyName - Name of the dependency
 * @typeParam TDependencyPriority - Priority of the dependency
 */
export type InitPriorityErrorMessage<
  TDependentName extends string,
  TDependentPriority extends number | string,
  TDependencyName extends string,
  TDependencyPriority extends number | string,
> = `ERROR: Invalid init priority: '${TDependentName}' (priority ${TDependentPriority & string}) cannot depend on '${TDependencyName}' (priority ${TDependencyPriority & string}). Fix: Increase '${TDependentName}' priority to >= ${TDependencyPriority & string}.`;

// =============================================================================
// Merge Utilities
// =============================================================================

/**
 * Merges two init priority maps.
 *
 * @typeParam TMapA - First priority map
 * @typeParam TMapB - Second priority map
 * @returns Combined map (B's values override A's for same keys)
 */
export type MergeInitPriorityMaps<TMapA, TMapB> = TMapA & TMapB;

/**
 * Adds init priorities from multiple adapters to a map.
 *
 * @typeParam TMap - The current priority map
 * @typeParam TAdapters - Array of adapters to add
 * @returns Updated map with all adapter priorities
 */
export type AddManyInitPriorities<
  TMap,
  TAdapters extends readonly unknown[],
> = TAdapters extends readonly [infer First, ...infer Rest]
  ? First extends { provides: { __portName: infer Name }; initPriority?: infer P }
    ? AddManyInitPriorities<
        AddInitPriority<TMap, Name & string, P extends number ? P : "default">,
        Rest
      >
    : AddManyInitPriorities<TMap, Rest>
  : TMap;
