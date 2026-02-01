/**
 * Adapter Port Name Extraction Types.
 *
 * This module provides **canonical** type utilities for extracting port names
 * from adapter types. These are the single source of truth for port name
 * extraction across the entire validation system.
 *
 * ## Why This Module Exists
 *
 * Port name extraction was previously scattered across multiple files with
 * slightly different implementations:
 *
 * - `cycle/detection.ts`: Used `Port<unknown, infer TName>`
 * - `self-dependency.ts`: Used `{ __portName: infer TName }`
 * - `captive/detection.ts`: Used `{ __portName: infer TName } extends string`
 *
 * This inconsistency risked divergent behavior if the Port type structure changed.
 * This module consolidates all extraction logic into one place.
 *
 * ## Implementation Choice
 *
 * We use structural matching `{ __portName: infer TName }` with a `string` constraint
 * because:
 *
 * 1. **Structural compatibility**: Works with both real `Port` types and simplified
 *    mock types used in internal testing. The Port type includes `__portName`, so
 *    real Ports always match.
 *
 * 2. **Explicit string constraint**: Adding `TName extends string` ensures we always
 *    get a string literal type, filtering out any malformed structures where
 *    `__portName` might be a non-string type.
 *
 * 3. **Consistency**: All extraction paths now use identical logic, eliminating
 *    the risk of divergent behavior.
 *
 * ## Why Not `Port<unknown, infer TName>`?
 *
 * While more specific, `Port<unknown, infer>` requires the `__brand` property which:
 * - Doesn't exist in simplified mock types used for internal testing
 * - Provides no additional safety for name extraction (we only need `__portName`)
 * - Would require extensive test fixture updates for no tangible benefit
 *
 * @packageDocumentation
 */

import type { MalformedAdapterError } from "./captive/errors.js";
import type { InferenceError, IsNever } from "@hex-di/core";

// =============================================================================
// Branded Port Name Types
// =============================================================================

/**
 * Unique symbol for port name branding.
 * Using a symbol ensures the brand doesn't pollute string operations.
 * @internal
 */
declare const __portNameBrand: unique symbol;

/**
 * A branded port name type that provides nominal typing.
 *
 * This type wraps a string literal with a phantom brand, preventing accidental
 * mixing between port names extracted from real Port types and arbitrary strings
 * that happen to have the same value.
 *
 * ## Why Branding?
 *
 * Without branding, port names are just string literals. A `"Logger"` extracted
 * from a Port is indistinguishable from a `"Logger"` string literal:
 *
 * ```typescript
 * // Without branding - both are just "Logger"
 * type FromPort = AdapterProvidesName<LoggerAdapter>;  // "Logger"
 * type Arbitrary = "Logger";                           // "Logger"
 * type Same = FromPort extends Arbitrary ? true : false; // true (no distinction!)
 * ```
 *
 * With branding, extracted names are nominally typed:
 *
 * ```typescript
 * // With branding - they differ
 * type FromPort = BrandedAdapterProvidesName<LoggerAdapter>;  // BrandedPortName<"Logger">
 * type Arbitrary = "Logger";                                   // "Logger"
 * type Same = Arbitrary extends FromPort ? true : false;       // false (properly distinct!)
 * ```
 *
 * ## Usage
 *
 * You typically don't create `BrandedPortName` directly. Instead, use the
 * branded extraction utilities which return branded names:
 *
 * - `BrandedAdapterProvidesName<A>` - Returns `BrandedPortName<"...">` for valid adapters
 * - `BrandedAdapterRequiresNames<A>` - Returns union of `BrandedPortName<"...">` for dependencies
 *
 * @typeParam T - The underlying string literal type
 */
export type BrandedPortName<T extends string = string> = T & {
  readonly [__portNameBrand]: T;
};

/**
 * Type guard that checks if a type is a `BrandedPortName`.
 *
 * This is useful for:
 * - Validating that extracted port names are properly branded
 * - Distinguishing port names from arbitrary strings at the type level
 * - Testing that extraction utilities return branded types
 *
 * ## Return Values
 *
 * | Input | Result |
 * |-------|--------|
 * | `BrandedPortName<"Logger">` | `true` |
 * | `BrandedPortName<"A" \| "B">` | `true` |
 * | `"Logger"` | `false` |
 * | `string` | `false` |
 * | `never` | `false` |
 *
 * @typeParam T - The type to check
 * @returns `true` if T is a BrandedPortName, `false` otherwise
 *
 * @example
 * ```typescript
 * type Extracted = AdapterProvidesName<LoggerAdapter>;
 * type IsBranded = IsBrandedPortName<Extracted>; // true
 *
 * type Plain = "Logger";
 * type NotBranded = IsBrandedPortName<Plain>; // false
 * ```
 */
export type IsBrandedPortName<T> =
  // Handle never case first
  [T] extends [never]
    ? false
    : // Check if T has the brand property with matching value
      T extends { readonly [__portNameBrand]: infer _TBrand }
      ? true
      : false;

// =============================================================================
// Provides Port Name Extraction
// =============================================================================

/**
 * Extracts the **port name string** from an adapter's `provides` property.
 *
 * Returns only the string literal name (e.g., `"Logger"`), not the full Port type.
 * This is used for dependency graph tracking, cycle detection, captive dependency
 * detection, and other validation that operates on port names.
 *
 * ## How It Works
 *
 * Uses structural matching to extract the `__portName` property:
 * ```typescript
 * { provides: { __portName: "PortName" } } --> "PortName"
 * ```
 *
 * The `TName extends string` check ensures we only return valid string names,
 * filtering out malformed structures.
 *
 * ## Comparison with InferAdapterProvides
 *
 * | Type | Input | Output | Use Case |
 * |------|-------|--------|----------|
 * | `AdapterProvidesName<A>` | Adapter | `"Logger"` | Graph tracking, validation |
 * | `InferAdapterProvides<A>` | Adapter | `Port<Logger, "Logger">` | Container resolution |
 *
 * @typeParam TAdapter - The adapter type to extract from
 * @returns The port name as a string literal type, or `never` if not a valid adapter
 *
 * @example
 * ```typescript
 * const LoggerAdapter = createAdapter({ provides: LoggerPort, ... });
 * type Name = AdapterProvidesName<typeof LoggerAdapter>; // "Logger"
 * ```
 *
 * @example Union distribution
 * ```typescript
 * type Names = AdapterProvidesName<AdapterA | AdapterB>; // "A" | "B"
 * ```
 */
export type AdapterProvidesName<TAdapter> = TAdapter extends {
  provides: { __portName: infer TName };
}
  ? TName extends string
    ? TName
    : never
  : never;

/**
 * Branded variant of `AdapterProvidesName` that returns nominally typed port names.
 *
 * This type provides nominal typing for contexts where you want to ensure
 * port names cannot be confused with arbitrary strings. The branded variant
 * is useful for:
 *
 * - Type-level APIs that want to enforce port name provenance
 * - Diagnostic tools that need to distinguish extracted names from literals
 * - Testing that values came from real Port types
 *
 * ## Comparison
 *
 * | Type | Returns | Use Case |
 * |------|---------|----------|
 * | `AdapterProvidesName<A>` | `"Logger"` | General use, comparisons |
 * | `BrandedAdapterProvidesName<A>` | `BrandedPortName<"Logger">` | Nominal safety |
 *
 * @typeParam TAdapter - The adapter type to extract from
 * @returns Branded port name, or `never` if not a valid adapter
 */
export type BrandedAdapterProvidesName<TAdapter> = TAdapter extends {
  provides: { __portName: infer TName };
}
  ? TName extends string
    ? BrandedPortName<TName>
    : never
  : never;

// =============================================================================
// Diagnostic Variant (with InferenceError for better IDE tooltips)
// =============================================================================

/**
 * Diagnostic version of `AdapterProvidesName` that returns `InferenceError` for invalid inputs.
 *
 * Use this type when you want to see detailed error information in IDE tooltips
 * rather than just `never`. The standard `AdapterProvidesName` returns `never` for
 * invalid inputs, which is correct for type propagation but provides no diagnostics.
 *
 * ## When to Use
 *
 * - **Internal type constraints**: Use `AdapterProvidesName<T>` (returns `never` for invalid)
 * - **User-facing diagnostics**: Use `DiagnosticAdapterProvidesName<T>` (returns `InferenceError`)
 * - **Debug types**: Use `DiagnosticAdapterProvidesName<T>` for visibility in IDE tooltips
 *
 * ## Error Scenarios
 *
 * | Input | Output | Reason |
 * |-------|--------|--------|
 * | Valid adapter | `"PortName"` | Has `provides.___portName: string` |
 * | Missing `provides` | `InferenceError` | Not a valid adapter structure |
 * | Non-string `__portName` | `InferenceError` | Port name must be a string literal |
 * | `never` | `never` | Preserves empty union semantics |
 *
 * @typeParam TAdapter - The adapter type to extract from
 *
 * @returns The port name, `never` for `never` input, or `InferenceError` for invalid input
 *
 * @example Debugging invalid adapter
 * ```typescript
 * // Hover over 'Debug' in IDE to see the error:
 * // InferenceError<"AdapterProvidesName", "Adapter must have...", { invalid: true }>
 * type Debug = DiagnosticAdapterProvidesName<{ invalid: true }>;
 *
 * // Compare to standard AdapterProvidesName which just shows: never
 * type Standard = AdapterProvidesName<{ invalid: true }>;
 * ```
 *
 * @internal
 */
export type DiagnosticAdapterProvidesName<TAdapter> =
  // Preserve `never` for empty union semantics (e.g., TAdapter = never)
  [TAdapter] extends [never]
    ? never
    : TAdapter extends { provides: { __portName: infer TName } }
      ? TName extends string
        ? TName
        : InferenceError<
            "AdapterProvidesName",
            "Adapter provides.__portName must be a string literal type.",
            TAdapter
          >
      : InferenceError<
          "AdapterProvidesName",
          "Adapter must have a 'provides' property with a Port type containing __portName.",
          TAdapter
        >;

// =============================================================================
// Requires Port Names Extraction
// =============================================================================

/**
 * Extracts all required port names from an adapter as a union.
 *
 * Returns a union of all port name strings from the adapter's `requires` array.
 * If the adapter has no requirements, returns `never`. If the adapter is malformed
 * (missing the `requires` property), returns `MalformedAdapterError`.
 *
 * ## How It Works
 *
 * Uses a two-step conditional type:
 * 1. Match the `requires` property as a readonly array
 * 2. Distribute over array elements to extract `__portName` values
 *
 * ```typescript
 * { requires: [{ __portName: "A" }, { __portName: "B" }] } --> "A" | "B"
 * { requires: [] } --> never
 * { provides: P } --> MalformedAdapterError (missing requires)
 * ```
 *
 * ## Filtering Invalid Elements
 *
 * If the requires array contains non-Port types (e.g., due to a bug elsewhere),
 * they are automatically filtered out:
 * ```typescript
 * { requires: [{ __portName: "A" }, string] } --> "A" (string is filtered)
 * ```
 *
 * @typeParam TAdapter - The adapter type to extract from
 * @returns Union of required port name string literals, `never` if empty, or `MalformedAdapterError` if invalid
 *
 * @example
 * ```typescript
 * const ServiceAdapter = createAdapter({
 *   provides: ServicePort,
 *   requires: [LoggerPort, ConfigPort],
 *   ...
 * });
 * type Names = AdapterRequiresNames<typeof ServiceAdapter>; // "Logger" | "Config"
 * ```
 *
 * @example No requirements
 * ```typescript
 * const LeafAdapter = createAdapter({ provides: LeafPort, requires: [], ... });
 * type Names = AdapterRequiresNames<typeof LeafAdapter>; // never
 * ```
 *
 * @example Malformed adapter
 * ```typescript
 * type Malformed = { provides: Port; lifetime: "singleton" };
 * type Names = AdapterRequiresNames<Malformed>; // MalformedAdapterError
 * ```
 */
export type AdapterRequiresNames<TAdapter> = TAdapter extends {
  requires: readonly (infer TRequired)[];
}
  ? TRequired extends { __portName: infer TName }
    ? TName extends string
      ? TName
      : never
    : never
  : MalformedAdapterError<"missing-requires">;

/**
 * Branded variant of `AdapterRequiresNames` that returns nominally typed port names.
 *
 * This type provides nominal typing for contexts where you want to ensure
 * required port names cannot be confused with arbitrary strings.
 *
 * @typeParam TAdapter - The adapter type to extract from
 * @returns Union of branded port names, `never` if empty, or `MalformedAdapterError` if invalid
 */
export type BrandedAdapterRequiresNames<TAdapter> = TAdapter extends {
  requires: readonly (infer TRequired)[];
}
  ? TRequired extends { __portName: infer TName }
    ? TName extends string
      ? BrandedPortName<TName>
      : never
    : never
  : MalformedAdapterError<"missing-requires">;

// =============================================================================
// Requires Validation Helpers
// =============================================================================

/**
 * Filters requires union to only valid string port names.
 *
 * This utility filters out `MalformedAdapterError` and other non-string types
 * from a union that might include port names. It's commonly used after
 * `AdapterRequiresNames` to ensure only valid port name strings remain.
 *
 * ## Why This Is Needed
 *
 * `AdapterRequiresNames` returns either:
 * - A union of string literal port names (valid)
 * - `MalformedAdapterError` (invalid adapter structure)
 * - `never` (empty requires array)
 *
 * Some downstream type utilities need to work only with valid string names.
 * This type filters out the error case.
 *
 * ## How It Works
 *
 * Uses distributive conditional types:
 * 1. First checks if T is `MalformedAdapterError` -> returns `never`
 * 2. Then checks if T is a string -> passes it through
 * 3. Otherwise -> returns `never`
 *
 * @typeParam T - The type to filter (typically from AdapterRequiresNames)
 * @returns Only the string literal types from T, filtering out errors
 *
 * @example
 * ```typescript
 * type RequiresResult = AdapterRequiresNames<SomeAdapter>;
 * // Could be "Logger" | "Config" | MalformedAdapterError
 *
 * type ValidNames = ExtractRequiresStrings<RequiresResult>;
 * // Only "Logger" | "Config" (MalformedAdapterError filtered out)
 * ```
 */
export type ExtractRequiresStrings<T> =
  T extends MalformedAdapterError<string> ? never : T extends string ? T : never;

/**
 * Detects if requires extraction produced a malformed adapter error.
 *
 * This type guard checks if the result from `AdapterRequiresNames` indicates
 * a malformed adapter (missing or invalid `requires` property).
 *
 * ## Return Values
 *
 * | Input | Result | Meaning |
 * |-------|--------|---------|
 * | `never` | `false` | Empty requires = valid (no dependencies) |
 * | `string` | `false` | Valid port name(s) |
 * | `MalformedAdapterError` | `true` | Invalid adapter structure |
 *
 * ## Why Check for `never` First?
 *
 * An empty `requires: []` array produces `never` from `AdapterRequiresNames`,
 * which is a valid state (adapter has no dependencies). We must distinguish
 * this from an actual error.
 *
 * @typeParam T - The type to check (typically from AdapterRequiresNames)
 * @returns `true` if T indicates a malformed adapter, `false` otherwise
 *
 * @example
 * ```typescript
 * type Result1 = IsMalformedRequires<"Logger" | "Config">; // false
 * type Result2 = IsMalformedRequires<never>; // false (empty requires)
 * type Result3 = IsMalformedRequires<MalformedAdapterError>; // true
 * ```
 */
export type IsMalformedRequires<T> =
  IsNever<T> extends true
    ? false // never = valid (empty requires or all filtered out)
    : T extends MalformedAdapterError<string>
      ? true // MalformedAdapterError (any reason) = invalid structure
      : false; // string = valid port names
