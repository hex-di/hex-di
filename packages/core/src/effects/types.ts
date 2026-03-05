/**
 * Effect-Capability Unified Types
 *
 * Type-level encoding of the duality between error channels (effects)
 * and capabilities. A service's error type IS its capability profile.
 *
 * @packageDocumentation
 */

// =============================================================================
// CapabilityError
// =============================================================================

/**
 * Error tags carry capability metadata.
 * The _capability field records which capability this error relates to.
 */
export interface CapabilityError<
  TTag extends string,
  TCapability extends string,
  _TFields extends Record<string, unknown> = Record<string, never>,
> {
  readonly _tag: TTag;
  readonly _capability: TCapability;
}

/**
 * Construct a CapabilityError type with optional fields spread into the type.
 * When TFields is Record<string, never> (empty), the result omits fields.
 */
export type MakeCapabilityError<
  TTag extends string,
  TCapability extends string,
  TFields extends Record<string, unknown> = Record<string, never>,
> = [TFields] extends [Record<string, never>]
  ? Readonly<{ _tag: TTag; _capability: TCapability }>
  : Readonly<{ _tag: TTag; _capability: TCapability } & TFields>;

// =============================================================================
// Capability Extraction
// =============================================================================

/** Extract all capability names from an error union. */
export type CapabilitiesExercised<E> = E extends { _capability: infer C extends string }
  ? C
  : never;

/** Extract errors related to a specific capability. */
export type ErrorsByCapability<E, Cap extends string> = Extract<E, { _capability: Cap }>;

/** Check if an error union exercises a specific capability. */
export type ExercisesCapability<E, Cap extends string> =
  Extract<E, { _capability: Cap }> extends never ? false : true;

// =============================================================================
// Pure Computation
// =============================================================================

/**
 * A pure computation exercises no capabilities.
 * Equivalent to: the error type is `never`.
 */
export type IsPureComputation<E> = [E] extends [never] ? true : false;

// =============================================================================
// Capability Profile
// =============================================================================

/**
 * Capability profile: the complete set of capabilities a service exercises.
 * Derived from the error union.
 */
export type CapabilityProfile<E> = {
  readonly [Cap in CapabilitiesExercised<E>]: Extract<E, { _capability: Cap }>;
};

// =============================================================================
// Capability Verification
// =============================================================================

/**
 * Verify that a service's error type only exercises capabilities it was granted.
 * Granted capabilities come from the adapter's `requires` list.
 */
export type VerifyCapabilityUsage<ErrorType, GrantedCapabilities extends string> =
  Exclude<CapabilitiesExercised<ErrorType>, GrantedCapabilities> extends never
    ? true
    : {
        readonly _error: "UNAUTHORIZED_CAPABILITY_USAGE";
        readonly unauthorized: Exclude<CapabilitiesExercised<ErrorType>, GrantedCapabilities>;
        readonly granted: GrantedCapabilities;
      };
