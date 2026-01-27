/**
 * Captive Dependency Error Types.
 *
 * This module provides the branded error type for captive dependency violations.
 *
 * @packageDocumentation
 */

/**
 * A branded error type that produces a readable compile-time error message
 * when a captive dependency is detected.
 *
 * This type is returned by the captive dependency detection logic when
 * an adapter attempts to depend on an adapter with a shorter lifetime.
 *
 * @typeParam TDependentName - The port name of the adapter with the dependency
 * @typeParam TDependentLifetime - The lifetime name of the dependent adapter
 * @typeParam TCaptivePortName - The port name that would be captured
 * @typeParam TCaptiveLifetime - The lifetime name of the captive dependency
 *
 * @returns A branded error type with descriptive message
 *
 * @example
 * ```typescript
 * type Error = CaptiveDependencyError<"UserService", "Singleton", "Database", "Scoped">;
 * // {
 * //   __valid: false;
 * //   __errorBrand: 'CaptiveDependencyError';
 * //   __message: "Captive dependency: Singleton 'UserService' cannot depend on Scoped 'Database'";
 * // }
 * ```
 */
export type CaptiveDependencyError<
  TDependentName extends string,
  TDependentLifetime extends string,
  TCaptivePortName extends string,
  TCaptiveLifetime extends string,
> = {
  readonly __valid: false;
  readonly __errorBrand: "CaptiveDependencyError";
  readonly __message: `Captive dependency: ${TDependentLifetime} '${TDependentName}' cannot depend on ${TCaptiveLifetime} '${TCaptivePortName}'`;
};

/**
 * A branded error type for reverse captive dependency violations.
 *
 * This error occurs when a NEW adapter being added provides a port with a
 * shorter lifetime, but an EXISTING adapter with a longer lifetime already
 * requires that port.
 *
 * @typeParam TExistingName - The port name of the existing adapter with longer lifetime
 * @typeParam TExistingLifetime - The lifetime name of the existing adapter
 * @typeParam TNewPortName - The port name being added with shorter lifetime
 * @typeParam TNewLifetime - The lifetime name of the new adapter
 *
 * @example
 * ```typescript
 * // Existing: Singleton "Cache" requires "Session"
 * // Adding: Scoped "Session"
 * type Error = ReverseCaptiveDependencyError<"Cache", "Singleton", "Session", "Scoped">;
 * // {
 * //   __valid: false;
 * //   __errorBrand: 'ReverseCaptiveDependencyError';
 * //   __message: "Reverse captive dependency: Existing Singleton 'Cache' would capture new Scoped 'Session'";
 * // }
 * ```
 */
export type ReverseCaptiveDependencyError<
  TExistingName extends string,
  TExistingLifetime extends string,
  TNewPortName extends string,
  TNewLifetime extends string,
> = {
  readonly __valid: false;
  readonly __errorBrand: "ReverseCaptiveDependencyError";
  readonly __message: `Reverse captive dependency: Existing ${TExistingLifetime} '${TExistingName}' would capture new ${TNewLifetime} '${TNewPortName}'`;
};

/**
 * Known reasons for malformed adapter errors.
 *
 * These strings provide context about WHY an adapter is malformed,
 * enabling more actionable error messages.
 */
export type MalformedAdapterReason =
  | "missing-requires" // Adapter lacks `requires` property
  | "invalid-lifetime" // Adapter has invalid/missing `lifetime`
  | "invalid-requires" // Adapter's `requires` is not an array
  | "inference-failed" // Type inference failed for adapter structure
  | "unknown"; // Generic/unspecified reason

/**
 * A branded error type for malformed adapter configurations.
 *
 * This error is returned when captive dependency detection encounters an adapter
 * with invalid structure. The `TReason` parameter provides context about WHY
 * the adapter is malformed, enabling more actionable error messages.
 *
 * ## Why This Exists
 *
 * When `WouldAnyBeCaptive` encounters an adapter with an invalid structure:
 * 1. Previously: Returned `never`, which then matched `never extends CaptiveDependencyError`
 * 2. This caused `CaptiveErrorMessage<never, never, never, never>` to produce `never`
 * 3. Users saw opaque type errors with no guidance
 *
 * Now: Returns `MalformedAdapterError<TReason>`, producing a readable error
 * message with specific context about the problem.
 *
 * ## Available Reasons
 *
 * | Reason | Meaning |
 * |--------|---------|
 * | `"missing-requires"` | Adapter lacks `requires` property |
 * | `"invalid-lifetime"` | Adapter has invalid/missing `lifetime` |
 * | `"invalid-requires"` | Adapter's `requires` is not an array |
 * | `"inference-failed"` | Type inference failed for adapter structure |
 * | `"unknown"` | Generic/unspecified reason (default) |
 *
 * @typeParam TReason - The specific reason for the malformed adapter
 *
 * @example
 * ```typescript
 * // An adapter missing the 'requires' property would produce:
 * type Error = MalformedAdapterError<"missing-requires">;
 * // {
 * //   __valid: false;
 * //   __errorBrand: 'MalformedAdapterError';
 * //   reason: 'missing-requires';
 * //   __message: "ERROR[HEX020]: Malformed adapter. Reason: missing-requires...";
 * // }
 * ```
 */
export type MalformedAdapterError<TReason extends string = "unknown"> = {
  readonly __valid: false;
  readonly __errorBrand: "MalformedAdapterError";
  readonly reason: TReason;
  readonly __message: `ERROR[HEX020]: Malformed adapter configuration. Reason: ${TReason}. Verify the adapter was created using createAdapter() or createAsyncAdapter() with all required properties.`;
};

/**
 * Type guard to check if a type is the MalformedAdapterError.
 *
 * Returns `true` if `T` is any `MalformedAdapterError` (regardless of reason),
 * `false` otherwise. This is useful for checking if `AdapterRequiresNames`
 * returned an error before attempting to use the result as a string.
 *
 * @typeParam T - The type to check
 * @returns `true` if `T` is `MalformedAdapterError`, `false` otherwise
 *
 * @example
 * ```typescript
 * type Names = AdapterRequiresNames<SomeAdapter>;
 * type Check = IsMalformedAdapterError<Names>;
 * // If SomeAdapter is malformed: Check = true
 * // If SomeAdapter is valid: Check = false
 * ```
 */
export type IsMalformedAdapterError<T> = [T] extends [never]
  ? false
  : T extends MalformedAdapterError<string>
    ? true
    : false;

// =============================================================================
// Forward Reference Marker
// =============================================================================

/**
 * Unique symbol for forward reference branding.
 * Uses a symbol to prevent structural typing conflicts.
 */
declare const __forwardRefBrand: unique symbol;

/**
 * A branded marker type indicating a forward reference in captive detection.
 *
 * When an adapter references a port that hasn't been registered yet, captive
 * dependency detection cannot validate the lifetime relationship. Previously
 * this returned `never`, which was indistinguishable from "no error found".
 *
 * `ForwardReferenceMarker` makes this case explicit, enabling:
 * 1. **Debugging**: Developers can see which ports are forward references
 * 2. **Tooling**: IDE tooltips show forward reference status
 * 3. **Filtering**: Code can distinguish forward refs from real errors
 *
 * ## Why Not Just Return `never`?
 *
 * Returning `never` for forward references was problematic because:
 * - `never` means "no value" in TypeScript's type system
 * - It's indistinguishable from "validation passed"
 * - Makes debugging captive dependency issues difficult
 *
 * ## Usage Pattern
 *
 * Forward references are NOT errors - they indicate deferred validation:
 * 1. If the port is never provided, `build()` catches it as missing adapter
 * 2. If provided later with valid lifetime, no problem
 * 3. If provided later with invalid lifetime (captive), error occurs then
 *
 * @typeParam TPortName - The port name that is a forward reference
 *
 * @example
 * ```typescript
 * // Singleton A requires Scoped B, but B isn't registered yet
 * type Result = FindCaptiveDependency<EmptyMap, 1, "B">;
 * // Result = ForwardReferenceMarker<"B"> (not `never`)
 *
 * // Check if it's a forward reference
 * type IsFwdRef = IsForwardReference<Result>; // true
 * ```
 */
export type ForwardReferenceMarker<TPortName extends string> = {
  readonly [__forwardRefBrand]: true;
  readonly portName: TPortName;
};

/**
 * Type guard to check if a type is a ForwardReferenceMarker.
 *
 * Returns `true` if `T` is any `ForwardReferenceMarker`, `false` otherwise.
 * Uses the unique symbol brand to ensure accurate detection.
 *
 * ## Special Handling for `never`
 *
 * Uses `[T] extends [never]` pattern to check for `never` first, since
 * `never extends X` is always `never` (distributes to nothing), not `true/false`.
 *
 * @typeParam T - The type to check
 * @returns `true` if `T` is a `ForwardReferenceMarker`, `false` otherwise
 *
 * @example
 * ```typescript
 * type A = IsForwardReference<ForwardReferenceMarker<"Port">>; // true
 * type B = IsForwardReference<"Port">;                         // false
 * type C = IsForwardReference<never>;                          // false
 * ```
 */
export type IsForwardReference<T> = [T] extends [never]
  ? false // never is not a forward reference
  : T extends ForwardReferenceMarker<string>
    ? true
    : false;
