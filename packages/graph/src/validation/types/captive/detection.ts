/**
 * Captive Dependency Detection Types.
 *
 * This module provides type utilities for detecting captive dependencies
 * when adding single or multiple adapters to a graph.
 *
 * @packageDocumentation
 */

import type { Lifetime, IsNever, Prettify } from "@hex-di/core";
import type { LifetimeLevel, LifetimeName } from "./lifetime-level.js";
import type { AddLifetime, GetLifetimeLevel } from "./lifetime-map.js";
import type { IsCaptiveDependency } from "./comparison.js";
import type {
  CaptiveDependencyError,
  ReverseCaptiveDependencyError,
  MalformedAdapterError,
  ForwardReferenceMarker,
} from "./errors.js";
import type { InvalidLifetimeErrorMessage } from "../error-messages.js";
import type {
  AdapterProvidesName,
  AdapterRequiresNames,
  ExtractRequiresStrings,
  IsMalformedRequires,
} from "../adapter-extraction.js";
import type { TransformLazyPortNamesToOriginal } from "../lazy-transforms.js";

// =============================================================================
// Semantic Helper Types
// =============================================================================

/**
 * Checks if a port has a lifetime entry in the lifetime map.
 *
 * Returns `true` if the port exists in the map (has been registered),
 * `false` if the port is not in the map (unknown or forward reference).
 *
 * ## Purpose
 *
 * This helper makes conditional checks more readable:
 * - `HasLifetimeInMap<Map, Port> extends true` → "if port is registered"
 * - `HasLifetimeInMap<Map, Port> extends false` → "if port is not registered"
 *
 * Without this helper, we'd need `IsNever<GetLifetimeLevel<Map, Port>> extends false`
 * which is a confusing double-negative.
 *
 * @internal
 */
type HasLifetimeInMap<TLifetimeMap, TPortName extends string> =
  IsNever<GetLifetimeLevel<TLifetimeMap, TPortName>> extends true ? false : true;

// =============================================================================
// Debug Types
// =============================================================================

/**
 * Debug type for inspecting captive dependency detection.
 *
 * This type provides visibility into the captive detection process, showing:
 * - The port being checked
 * - Its lifetime level (or `never` if not in map)
 * - The dependent adapter's lifetime level
 * - Whether this would be a captive dependency
 *
 * Use this type when debugging why a captive error is (or isn't) being raised.
 *
 * ## Usage
 *
 * ```typescript
 * type Debug = DebugCaptiveCheck<MyLifetimeMap, 1, "ScopedService">;
 * // Hover over `Debug` in IDE to see:
 * // {
 * //   requiredPort: "ScopedService";
 * //   requiredPortLevel: 2;  // scoped
 * //   dependentLevel: 1;     // singleton
 * //   isInMap: true;
 * //   isCaptive: true;       // singleton can't depend on scoped!
 * // }
 * ```
 *
 * @typeParam TLifetimeMap - The current lifetime map
 * @typeParam TDependentLevel - The lifetime level of the dependent adapter (1=singleton, 2=scoped, 3=transient)
 * @typeParam TRequiredPortName - The name of the required port being checked
 */
export type DebugCaptiveCheck<
  TLifetimeMap,
  TDependentLevel extends number,
  TRequiredPortName extends string,
> = Prettify<{
  /** The port name being checked as a dependency */
  readonly requiredPort: TRequiredPortName;
  /** The lifetime level of the required port (1=singleton, 2=scoped, 3=transient, or `never` if not in map) */
  readonly requiredPortLevel: GetLifetimeLevel<TLifetimeMap, TRequiredPortName>;
  /** The lifetime level of the dependent adapter */
  readonly dependentLevel: TDependentLevel;
  /** Whether the required port is in the lifetime map */
  readonly isInMap: HasLifetimeInMap<TLifetimeMap, TRequiredPortName>;
  /** Whether this is a captive dependency (dependent has longer lifetime than required) */
  readonly isCaptive: GetLifetimeLevel<TLifetimeMap, TRequiredPortName> extends infer DepLevel
    ? IsNever<DepLevel> extends true
      ? false // Not in map, can't determine
      : DepLevel extends number
        ? IsCaptiveDependency<TDependentLevel, DepLevel>
        : false
    : false;
  /** Human-readable lifetime names for easier debugging */
  readonly dependentLifetimeName: LifetimeName<TDependentLevel>;
  readonly requiredLifetimeName: GetLifetimeLevel<
    TLifetimeMap,
    TRequiredPortName
  > extends infer DepLevel
    ? IsNever<DepLevel> extends true
      ? "unknown (not in map)"
      : DepLevel extends number
        ? LifetimeName<DepLevel>
        : "invalid"
    : "invalid";
}>;

/**
 * Finds a captive dependency for a single required port.
 *
 * ## Return Values
 *
 * | Scenario | Return Type | Meaning |
 * |----------|-------------|---------|
 * | Port not in map | `ForwardReferenceMarker<TRequiredPortName>` | Forward reference, deferred validation |
 * | Captive found | `TRequiredPortName` (string) | Error: captive dependency detected |
 * | No captive | `never` | Port is valid, no captive dependency |
 *
 * ## Forward References
 *
 * When a port is not in the lifetime map (forward reference), we now return
 * `ForwardReferenceMarker` instead of `never` for clarity:
 *
 * 1. **Debugging**: Makes forward references visible in IDE tooltips
 * 2. **Filtering**: Callers can distinguish forward refs from "no error"
 * 3. **Semantics**: `never` means "no value", `ForwardReferenceMarker` means "deferred"
 *
 * Forward references are NOT errors. Validation is deferred until:
 * 1. The port is provided (captive check happens then), or
 * 2. `build()` is called (catches missing adapters)
 *
 * @typeParam TLifetimeMap - The current lifetime map
 * @typeParam TDependentLevel - The lifetime level of the adapter being added
 * @typeParam TRequiredPortName - The name of a required port
 *
 * @returns The port name if captive, `ForwardReferenceMarker` if forward ref, or `never` if valid
 */
export type FindCaptiveDependency<
  TLifetimeMap,
  TDependentLevel extends number,
  TRequiredPortName extends string,
> =
  GetLifetimeLevel<TLifetimeMap, TRequiredPortName> extends infer DepLevel
    ? IsNever<DepLevel> extends true
      ? // Port not in lifetime map yet - this is a "forward reference".
        // Return ForwardReferenceMarker instead of `never` for clarity.
        // Forward references occur when an adapter requires a port that hasn't
        // been registered yet. At compile time, we can't validate the lifetime
        // because we don't know what it will be. This is NOT an error because:
        // 1. If the dependency is never provided, build() will catch it
        // 2. If the dependency is provided later with valid lifetime, no problem
        // 3. If the dependency is provided later with invalid lifetime (captive),
        //    the validation will occur when THAT adapter is added
        // This allows registering adapters in any order without false positives.
        ForwardReferenceMarker<TRequiredPortName>
      : DepLevel extends number
        ? IsCaptiveDependency<TDependentLevel, DepLevel> extends true
          ? TRequiredPortName // Found a captive dependency!
          : never
        : never
    : never;

/**
 * Finds any captive dependency among all required ports.
 *
 * A "captive dependency" occurs when a longer-lived service (e.g., singleton)
 * depends on a shorter-lived service (e.g., scoped). This is a problem because
 * the singleton would "capture" a single instance of the scoped service.
 *
 * ## Recursion Pattern: Distributive Conditional (No Explicit Recursion)
 *
 * Like `CheckEachKeyForCycle`, this type uses TypeScript's distributive
 * conditional types to iterate over a union. The pattern is identical:
 *
 * ```typescript
 * FindAnyCaptiveDependency<Map, Level, "A" | "B" | "C">
 *   // Distributes to:
 *   = FindCaptiveDependency<Map, Level, "A">
 *   | FindCaptiveDependency<Map, Level, "B">
 *   | FindCaptiveDependency<Map, Level, "C">
 * ```
 *
 * ### Result Aggregation
 *
 * Since `FindCaptiveDependency` returns either the port name, `ForwardReferenceMarker`, or `never`:
 * - If all ports pass: `never | never | never = never`
 * - If "B" is captive: `never | "B" | never = "B"`
 * - If "C" is forward ref: `never | ForwardReferenceMarker<"C"> | never` → filtered to `never`
 *
 * Note: `ForwardReferenceMarker` results are filtered out to maintain backward
 * compatibility. Use `FindCaptiveDependency` directly if you need to see forward refs.
 *
 * ### Why Distribution Works Here
 *
 * The "naked" type parameter in `TRequiredPortNames extends string` causes
 * TypeScript to check each union member separately. This is the standard
 * pattern for "for-each" iteration at the type level.
 *
 * @typeParam TLifetimeMap - The current lifetime map
 * @typeParam TDependentLevel - The lifetime level of the adapter being added (numeric)
 * @typeParam TRequiredPortNames - Union of all required port names (distributes)
 *
 * @returns The first captive port name, or `never` if none found (forward refs filtered out)
 *
 * @internal
 */
export type FindAnyCaptiveDependency<
  TLifetimeMap,
  TDependentLevel extends number,
  TRequiredPortNames extends string,
> =
  // The `TRequiredPortNames extends string` triggers distribution over the union
  TRequiredPortNames extends string
    ? // Filter out ForwardReferenceMarker - only return actual captive port names (strings)
      FindCaptiveDependency<TLifetimeMap, TDependentLevel, TRequiredPortNames> extends infer Result
      ? Result extends string
        ? Result // Real captive dependency - return the port name
        : never // ForwardReferenceMarker or never - filter out
      : never
    : never;

// =============================================================================
// Reverse Captive Dependency Detection
// =============================================================================

/**
 * Finds ports in the dependency graph that depend on the given port name.
 *
 * This type iterates over all ports in the dependency graph and returns
 * those that have `TTargetPort` in their requirements.
 *
 * @typeParam TDepGraph - The dependency graph map
 * @typeParam TTargetPort - The port name to find dependents of
 * @returns Union of port names that require TTargetPort, or `never` if none
 *
 * @example
 * ```typescript
 * type DepGraph = { Logger: never; UserService: "Logger" | "Database"; Api: "Logger" };
 * type Deps = FindDependentsOf<DepGraph, "Logger">; // "UserService" | "Api"
 * ```
 *
 * @internal
 */
type FindDependentsOf<TDepGraph, TTargetPort extends string> = Prettify<
  {
    [K in Extract<keyof TDepGraph, string>]: TTargetPort extends TDepGraph[K] ? K : never;
  }[Extract<keyof TDepGraph, string>]
>;

/**
 * Checks if a dependent port would create a reverse captive dependency.
 *
 * This happens when an existing longer-lived adapter requires a newly
 * added shorter-lived adapter (e.g., singleton requires scoped).
 *
 * ## Soundness Guarantee
 *
 * This type relies on `GetLifetimeLevel` returning either:
 * - A specific number literal (1, 2, or 3) for valid entries
 * - `never` for missing or malformed entries
 *
 * `GetLifetimeLevel` explicitly checks `extends number` before returning,
 * so it will never return `unknown` or other unexpected types. This means:
 * - `IsNever<DependentLevel>` catches missing/malformed entries
 * - `DependentLevel extends number` is always true for non-never values
 *
 * The final `else never` branch (line 289) handles the theoretical case where
 * `GetLifetimeLevel`'s contract is violated, providing defense-in-depth.
 *
 * @typeParam TLifetimeMap - The current lifetime map
 * @typeParam TDependentPortName - Name of the port that requires the new port
 * @typeParam TNewPortLevel - Lifetime level of the newly added port
 *
 * @returns The dependent port name if it creates a reverse captive, or `never`
 *
 * @internal
 */
type CheckReverseCaptive<
  TLifetimeMap,
  TDependentPortName extends string,
  TNewPortLevel extends number,
> =
  GetLifetimeLevel<TLifetimeMap, TDependentPortName> extends infer DependentLevel
    ? IsNever<DependentLevel> extends true
      ? // Dependent port not in lifetime map - this can happen for forward references
        // that haven't been validated yet. Skip for now; will be caught when that
        // adapter is validated.
        never
      : DependentLevel extends number
        ? IsCaptiveDependency<DependentLevel, TNewPortLevel> extends true
          ? TDependentPortName // Found a reverse captive dependency!
          : never
        : // Defense-in-depth: if GetLifetimeLevel contract is violated, treat as forward ref
          never
    : never;

/**
 * Finds any reverse captive dependency when adding a new port.
 *
 * A "reverse captive dependency" occurs when an EXISTING longer-lived adapter
 * (e.g., singleton) already requires a port that is now being provided by a
 * shorter-lived adapter (e.g., scoped).
 *
 * ## The Problem This Solves
 *
 * Consider this registration order:
 * ```typescript
 * GraphBuilder.create()
 *   .provide(SingletonAdapter) // requires ScopedPort (not yet in map)
 *   .provide(ScopedAdapter);   // provides ScopedPort
 * ```
 *
 * Without reverse checking:
 * 1. SingletonAdapter is added - ScopedPort not in lifetime map, forward ref passes
 * 2. ScopedAdapter is added - only checks ScopedAdapter's requirements, passes
 * 3. Result: Captive dependency silently introduced!
 *
 * With reverse checking:
 * 1. SingletonAdapter is added - forward ref (still passes, unavoidable)
 * 2. ScopedAdapter is added - reverse check finds SingletonAdapter depends on
 *    ScopedPort with longer lifetime → ERROR
 *
 * ## Important: Only Checks Forward References
 *
 * This check ONLY applies when the port being provided is NOT already in the
 * lifetime map. If the port is already provided (duplicate), existing adapters
 * have already been validated against the existing provider's lifetime.
 *
 * ## Recursion Pattern: Distributive Conditional
 *
 * Uses the same pattern as `FindAnyCaptiveDependency`:
 * - `FindDependentsOf` returns a union of all ports requiring the new port
 * - Distribution over this union checks each dependent separately
 * - First match (captive found) propagates up as the error
 *
 * @typeParam TDepGraph - The dependency graph map
 * @typeParam TLifetimeMap - The current lifetime map
 * @typeParam TNewPortName - The port name being added
 * @typeParam TNewPortLevel - The lifetime level of the new port
 *
 * @returns The name of a dependent port that would have a captive dependency,
 *          or `never` if no reverse captive dependencies exist
 *
 * @example
 * ```typescript
 * // Singleton "Cache" requires "Session" (forward ref)
 * // Now adding "Session" as Scoped
 * type DepGraph = { Cache: "Session" };
 * type LifetimeMap = { Cache: 1 }; // Singleton, but "Session" not in map yet
 *
 * type Result = FindReverseCaptiveDependency<DepGraph, LifetimeMap, "Session", 2>;
 * // Result: "Cache" (because Singleton Cache would capture Scoped Session)
 * ```
 *
 * @internal
 */
export type FindReverseCaptiveDependency<
  TDepGraph,
  TLifetimeMap,
  TNewPortName extends string,
  TNewPortLevel extends number,
> =
  // First check: Is this port already in the lifetime map?
  // Using HasLifetimeInMap for clarity (avoids double-negative with IsNever)
  HasLifetimeInMap<TLifetimeMap, TNewPortName> extends true
    ? // Port already has a provider - skip the reverse check.
      // Existing adapters were already validated against the existing provider's
      // lifetime when they were added. This prevents duplicate validation.
      never
    : // Port is new (forward reference) - check for existing adapters that
      // depend on this port and would create a reverse captive dependency.
      FindDependentsOf<TDepGraph, TNewPortName> extends infer TDependents
      ? IsNever<TDependents> extends true
        ? never // No existing adapters require this port
        : TDependents extends string
          ? // Distribute over union of dependents
            CheckReverseCaptive<TLifetimeMap, TDependents, TNewPortLevel>
          : never
      : never;

// =============================================================================
// Batch Utilities
// =============================================================================

/**
 * Extracts the lifetime from an adapter for lifetime map operations.
 *
 * ## Async Adapter Handling
 *
 * Async adapters (factoryKind: "async") are ALWAYS treated as singletons
 * for captive dependency detection, regardless of what their `lifetime`
 * field says. This is because:
 * 1. Async initialization happens once at container startup
 * 2. The resulting instance is cached and reused for all resolutions
 * 3. `createAdapter()` with async factory already sets `lifetime: "singleton"` but this
 *    check provides defense-in-depth
 *
 * Returns an error message for invalid or missing lifetime values.
 * @internal
 */
type AdapterLifetimeForMap<TAdapter> =
  // Async adapters are ALWAYS singletons for captive detection
  TAdapter extends { factoryKind: "async" }
    ? "singleton"
    : // For sync adapters, read the lifetime field
      TAdapter extends { lifetime: infer TLifetime }
      ? TLifetime extends Lifetime
        ? TLifetime
        : InvalidLifetimeErrorMessage
      : InvalidLifetimeErrorMessage;

/**
 * Adds multiple adapters' lifetimes to the lifetime map.
 *
 * This type processes a tuple of adapters and adds each one's lifetime
 * to the lifetime map. Used to build the complete lifetime map before
 * or during captive dependency validation.
 *
 * ## Recursion Pattern: Tail-Recursive Fold (Accumulator Pattern)
 *
 * Processes the adapter tuple left-to-right, accumulating the lifetime map.
 * Similar to `Array.reduce` but at the type level.
 *
 * ### Base Cases
 * | Condition | Result | Reason |
 * |-----------|--------|--------|
 * | Empty tuple | `TLifetimeMap` | Return accumulated map |
 *
 * ### Recursive Case
 * For each adapter in the tuple:
 * 1. Extract port name: `AdapterProvidesName<First>`
 * 2. Extract lifetime: `AdapterLifetimeForMap<First>`
 * 3. Add to map: `AddLifetime<TLifetimeMap, Name, Lifetime>`
 * 4. Recurse with remaining adapters and updated map
 *
 * ### Why Tail-Recursive?
 *
 * The recursive call is in "tail position" - no further computation needed
 * after the recursive call returns. This pattern is more efficient for
 * TypeScript's type system and less likely to hit recursion limits.
 *
 * @typeParam TLifetimeMap - Current lifetime map (accumulator)
 * @typeParam TAdapters - Readonly tuple of adapter types
 *
 * @returns The final lifetime map with all adapters' lifetimes added
 *
 * @internal
 */
export type AddManyLifetimes<TLifetimeMap, TAdapters extends readonly unknown[]> =
  // Pattern match: Extract first adapter and rest of tuple
  TAdapters extends readonly [infer First, ...infer Rest]
    ? // Recursive Case: Add current adapter's lifetime and continue
      AddManyLifetimes<
        AddLifetime<TLifetimeMap, AdapterProvidesName<First>, AdapterLifetimeForMap<First>>,
        Rest
      >
    : // Base Case: Empty tuple, return accumulated lifetime map
      TLifetimeMap;

/**
 * Checks if adding multiple adapters would create any captive dependencies.
 * Returns the first captive error found or false if no captive dependencies.
 *
 * ## Two-Pass Algorithm for Complete Validation
 *
 * This type uses a two-pass approach to handle intra-batch forward references:
 *
 * **Pass 1**: Build complete lifetime map from ALL adapters in the batch
 * **Pass 2**: Validate each adapter against the complete map
 *
 * This ensures that forward references (e.g., singleton A requires scoped B,
 * where B is provided later in the batch) are properly validated.
 *
 * @typeParam TLifetimeMap - Current lifetime map (from existing graph)
 * @typeParam TAdapters - Adapters to check
 *
 * @internal
 */
export type WouldAnyBeCaptive<TLifetimeMap, TAdapters extends readonly unknown[]> =
  // Pass 1: Build complete lifetime map from ALL adapters in batch
  AddManyLifetimes<TLifetimeMap, TAdapters> extends infer TCompleteMap
    ? // Pass 2: Validate each adapter against the complete map
      ValidateAllAgainstMap<TCompleteMap, TAdapters>
    : // SOUNDNESS: If AddManyLifetimes fails to infer, return MalformedAdapterError
      // rather than `never`. Returning `never` would match CaptiveDependencyError
      // pattern and produce opaque errors via CaptiveErrorMessage<never, never, never, never>.
      MalformedAdapterError;

/**
 * Validates all adapters against a complete lifetime map.
 *
 * This is the second pass of the two-pass algorithm. Each adapter's
 * requirements are checked against the complete lifetime map (which
 * includes lifetimes from ALL adapters in the batch).
 *
 * @internal
 */
type ValidateAllAgainstMap<
  TLifetimeMap,
  TAdapters extends readonly unknown[],
> = TAdapters extends readonly [infer First, ...infer Rest]
  ? // SOUNDNESS: First check if the adapter has a valid lifetime.
    // If LifetimeLevel returns `never`, the adapter is malformed.
    IsNever<LifetimeLevel<AdapterLifetimeForMap<First>>> extends true
    ? // Invalid lifetime - return MalformedAdapterError with descriptive message.
      // This catches malformed adapters with missing or invalid lifetime property.
      // Previously returned `never`, which caused opaque type errors.
      MalformedAdapterError
    : // SOUNDNESS: Check if the adapter's requires is malformed (missing property).
      // Use IsMalformedRequires to distinguish between:
      // - `never` (valid: empty requires array) -> proceed
      // - `MalformedAdapterError` (invalid: missing requires property) -> error
      IsMalformedRequires<AdapterRequiresNames<First>> extends true
      ? // Invalid requires structure - return MalformedAdapterError
        MalformedAdapterError
      : // Valid lifetime and requires - proceed with captive dependency check
        FindAnyCaptiveDependency<
            TLifetimeMap,
            LifetimeLevel<AdapterLifetimeForMap<First>>,
            ExtractRequiresStrings<TransformLazyPortNamesToOriginal<AdapterRequiresNames<First>>>
          > extends infer CaptivePort
        ? IsNever<CaptivePort> extends true
          ? ValidateAllAgainstMap<TLifetimeMap, Rest>
          : CaptivePort extends string
            ? CaptiveDependencyError<
                AdapterProvidesName<First>,
                LifetimeName<LifetimeLevel<AdapterLifetimeForMap<First>>>,
                CaptivePort,
                LifetimeName<GetLifetimeLevel<TLifetimeMap, CaptivePort>>
              >
            : // SOUNDNESS: If CaptivePort is not `never` and not `string`, something
              // is wrong with the adapter structure. Return MalformedAdapterError.
              MalformedAdapterError
        : // SOUNDNESS: If `infer CaptivePort` fails (shouldn't happen), return error.
          MalformedAdapterError
  : // Base case: empty tuple, no adapters left to check, no captive found.
    // This `false` is correct - it indicates successful validation.
    false;

// =============================================================================
// Reverse Captive Detection for Batch Operations
// =============================================================================

/**
 * Checks if adding multiple adapters would create any REVERSE captive dependencies.
 *
 * A "reverse captive dependency" in batch context occurs when an EXISTING adapter
 * in the graph (registered before the batch) already requires a port that is now
 * being provided by a batch adapter with a shorter lifetime.
 *
 * ## The Problem This Solves
 *
 * Consider this registration order:
 * ```typescript
 * GraphBuilder.create()
 *   .provide(SingletonAdapter)   // requires ScopedPort (forward ref, not yet in map)
 *   .provideMany([ScopedAdapter]); // provides ScopedPort
 * ```
 *
 * Without reverse checking:
 * 1. SingletonAdapter is added - ScopedPort not in map, forward ref passes
 * 2. provideMany([ScopedAdapter]) - WouldAnyBeCaptive only checks ScopedAdapter's
 *    requirements, not adapters that require ScopedPort
 * 3. Result: Captive dependency silently introduced!
 *
 * With reverse checking:
 * 1. SingletonAdapter is added - forward ref (still passes, unavoidable)
 * 2. provideMany([ScopedAdapter]) - WouldAnyCreateReverseCaptive finds that
 *    SingletonAdapter (existing, level 1) requires ScopedPort (batch, level 2) -> ERROR
 *
 * ## Algorithm
 *
 * For each adapter in the batch:
 * 1. Extract the port name it provides
 * 2. Extract its lifetime level
 * 3. Call `FindReverseCaptiveDependency` to check if any EXISTING adapter
 *    (in the current dep graph) depends on this port with a longer lifetime
 * 4. Return the first error found, or `false` if no reverse captive exists
 *
 * ## Why Separate from WouldAnyBeCaptive?
 *
 * `WouldAnyBeCaptive` handles "forward captive" (batch adapter depends on shorter-lived port)
 * and "intra-batch captive" (batch adapter A depends on shorter-lived batch adapter B).
 *
 * `WouldAnyCreateReverseCaptive` handles "reverse captive" where EXISTING graph
 * adapters would capture batch adapters. These are orthogonal checks.
 *
 * @typeParam TDepGraph - The EXISTING dependency graph (before batch is added)
 * @typeParam TLifetimeMap - The EXISTING lifetime map (before batch is added)
 * @typeParam TAdapters - Readonly tuple of adapters to check
 *
 * @returns A `ReverseCaptiveDependencyError` if found, `MalformedAdapterError` if
 *          adapter is malformed, or `false` if no reverse captive dependencies exist
 *
 * @internal
 */
export type WouldAnyCreateReverseCaptive<
  TDepGraph,
  TLifetimeMap,
  TAdapters extends readonly unknown[],
> = TAdapters extends readonly [infer First, ...infer Rest]
  ? // SOUNDNESS: First check if the adapter has a valid lifetime.
    // If LifetimeLevel returns `never`, the adapter is malformed.
    IsNever<LifetimeLevel<AdapterLifetimeForMap<First>>> extends true
    ? MalformedAdapterError
    : // Valid lifetime - check for reverse captive dependency
      FindReverseCaptiveDependency<
          TDepGraph,
          TLifetimeMap,
          AdapterProvidesName<First>,
          LifetimeLevel<AdapterLifetimeForMap<First>>
        > extends infer TReverseCaptivePort
      ? IsNever<TReverseCaptivePort> extends true
        ? // No reverse captive for this adapter, check the rest
          WouldAnyCreateReverseCaptive<TDepGraph, TLifetimeMap, Rest>
        : TReverseCaptivePort extends string
          ? // Found a reverse captive dependency!
            ReverseCaptiveDependencyError<
              TReverseCaptivePort,
              LifetimeName<GetLifetimeLevel<TLifetimeMap, TReverseCaptivePort>>,
              AdapterProvidesName<First>,
              LifetimeName<LifetimeLevel<AdapterLifetimeForMap<First>>>
            >
          : // SOUNDNESS: If TReverseCaptivePort is not `never` and not `string`,
            // something is wrong with the adapter structure.
            MalformedAdapterError
      : // SOUNDNESS: If infer fails (shouldn't happen), return error.
        MalformedAdapterError
  : // Base case: empty tuple, no reverse captive dependencies found.
    false;
