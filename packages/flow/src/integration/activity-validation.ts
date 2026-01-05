/**
 * Activity Validation Type Utilities
 *
 * This module provides type-level validation utilities for ensuring
 * activities registered with a FlowAdapter have their requirements
 * satisfied by the adapter's available ports.
 *
 * @packageDocumentation
 */

import type { Port, InferPortName } from "@hex-di/ports";
import type { ConfiguredActivityAny } from "../activities/types.js";

// =============================================================================
// Error Type Utilities
// =============================================================================

/**
 * Error type for when an activity requires a port not available in the FlowAdapter.
 *
 * This type produces a descriptive error message at the type level when
 * activity requirements validation fails.
 *
 * @typeParam TActivityName - The name of the activity with missing requirements
 * @typeParam TMissingPort - The port(s) that are required but not available
 */
export interface ActivityRequiresUnavailablePortError<TActivityName extends string, TMissingPort> {
  readonly __error: "ActivityRequiresUnavailablePort";
  readonly __message: `Activity "${TActivityName}" requires port(s) not available in FlowAdapter`;
  readonly __activityName: TActivityName;
  readonly __missingPorts: TMissingPort;
}

/**
 * Error type for duplicate activity ports in the activities array.
 *
 * @typeParam TDuplicateName - The name of the duplicated activity port
 */
export interface DuplicateActivityPortError<TDuplicateName extends string> {
  readonly __error: "DuplicateActivityPort";
  readonly __message: `Duplicate activity port: "${TDuplicateName}"`;
  readonly __duplicateName: TDuplicateName;
}

// =============================================================================
// Port Extraction Utilities
// =============================================================================

/**
 * Extracts the port name from an activity's port.
 *
 * @typeParam TActivity - The activity to extract the port name from
 */
export type ActivityPortName<TActivity extends ConfiguredActivityAny> =
  TActivity["port"]["__portName"];

/**
 * Extracts all port names from the requires tuple of an activity.
 *
 * @typeParam TActivity - The activity to extract required port names from
 */
export type ActivityRequiredPortNames<TActivity extends ConfiguredActivityAny> =
  TActivity["requires"] extends readonly (infer P)[]
    ? P extends Port<unknown, string>
      ? InferPortName<P>
      : never
    : never;

/**
 * Extracts all port names from an array of ports.
 *
 * @typeParam TPorts - The tuple of ports to extract names from
 */
export type PortNamesUnion<TPorts extends readonly Port<unknown, string>[]> =
  TPorts[number] extends infer P
    ? P extends Port<unknown, string>
      ? InferPortName<P>
      : never
    : never;

// =============================================================================
// Requirement Validation
// =============================================================================

/**
 * Validates that an activity's requirements are satisfied by available ports.
 *
 * Returns the activity type if validation passes, or an error type if it fails.
 *
 * @typeParam TActivity - The activity to validate
 * @typeParam TAvailablePortNames - Union of available port names from FlowAdapter
 *
 * @remarks
 * This type checks if all ports in the activity's `requires` tuple have
 * their names present in the `TAvailablePortNames` union. If any required
 * port is missing, it returns an error type with details about the missing ports.
 */
export type ValidateActivityRequirements<
  TActivity extends ConfiguredActivityAny,
  TAvailablePortNames extends string,
> =
  ActivityRequiredPortNames<TActivity> extends TAvailablePortNames
    ? TActivity
    : ActivityRequiresUnavailablePortError<
        ActivityPortName<TActivity>,
        Exclude<ActivityRequiredPortNames<TActivity>, TAvailablePortNames>
      >;

/**
 * Assertion type that returns true if requirements are satisfied.
 *
 * @typeParam TActivity - The activity to check
 * @typeParam TAvailablePortNames - Union of available port names
 *
 * @returns true if all requirements are satisfied, error type otherwise
 */
export type AssertActivityRequirements<
  TActivity extends ConfiguredActivityAny,
  TAvailablePortNames extends string,
> =
  ActivityRequiredPortNames<TActivity> extends TAvailablePortNames
    ? true
    : ActivityRequiresUnavailablePortError<
        ActivityPortName<TActivity>,
        Exclude<ActivityRequiredPortNames<TActivity>, TAvailablePortNames>
      >;

// =============================================================================
// Uniqueness Validation
// =============================================================================

/**
 * Checks if a port name appears in the remaining activities.
 *
 * @internal
 */
type PortNameInRest<
  TName extends string,
  TRest extends readonly ConfiguredActivityAny[],
> = TRest extends readonly [infer Head, ...infer Tail]
  ? Head extends ConfiguredActivityAny
    ? TName extends ActivityPortName<Head>
      ? true
      : Tail extends readonly ConfiguredActivityAny[]
        ? PortNameInRest<TName, Tail>
        : false
    : false
  : false;

/**
 * Validates that all activities have unique port names.
 *
 * Recursively checks that no activity port name appears more than once
 * in the activities array.
 *
 * @typeParam TActivities - The tuple of activities to check
 *
 * @returns true if all ports are unique, error type otherwise
 */
export type AssertUniqueActivityPorts<TActivities extends readonly ConfiguredActivityAny[]> =
  TActivities extends readonly []
    ? true
    : TActivities extends readonly [infer Head, ...infer Tail]
      ? Head extends ConfiguredActivityAny
        ? Tail extends readonly ConfiguredActivityAny[]
          ? PortNameInRest<ActivityPortName<Head>, Tail> extends true
            ? DuplicateActivityPortError<ActivityPortName<Head>>
            : AssertUniqueActivityPorts<Tail>
          : true
        : true
      : true;

// =============================================================================
// Composite Validation
// =============================================================================

/**
 * Validates a single activity in the context of FlowAdapter requirements.
 *
 * @typeParam TActivity - The activity to validate
 * @typeParam TAvailablePortNames - Union of available port names
 */
export type ValidateSingleActivity<
  TActivity extends ConfiguredActivityAny,
  TAvailablePortNames extends string,
> = ValidateActivityRequirements<TActivity, TAvailablePortNames>;

/**
 * Maps over an activities tuple and validates each one.
 *
 * @typeParam TActivities - The tuple of activities to validate
 * @typeParam TAvailablePortNames - Union of available port names
 */
export type ValidateActivitiesArray<
  TActivities extends readonly ConfiguredActivityAny[],
  TAvailablePortNames extends string,
> = {
  [K in keyof TActivities]: TActivities[K] extends ConfiguredActivityAny
    ? ValidateSingleActivity<TActivities[K], TAvailablePortNames>
    : TActivities[K];
};

/**
 * Full validation of activities array for FlowAdapter.
 *
 * Performs both:
 * 1. Requirements validation (each activity's requires subset of available)
 * 2. Uniqueness validation (no duplicate activity ports)
 *
 * @typeParam TActivities - The tuple of activities to validate
 * @typeParam TAvailablePortNames - Union of available port names
 */
export type ValidateActivities<
  TActivities extends readonly ConfiguredActivityAny[],
  TAvailablePortNames extends string,
> =
  AssertUniqueActivityPorts<TActivities> extends true
    ? ValidateActivitiesArray<TActivities, TAvailablePortNames>
    : AssertUniqueActivityPorts<TActivities>;

// =============================================================================
// Helper Types for Runtime
// =============================================================================

/**
 * Checks if a type is an error type (has __error property).
 */
export type IsValidationError<T> = T extends { readonly __error: string } ? true : false;

/**
 * Extracts the first validation error from a validated activities array.
 */
export type FirstValidationError<TValidated extends readonly unknown[]> =
  TValidated extends readonly [infer Head, ...infer Tail]
    ? IsValidationError<Head> extends true
      ? Head
      : Tail extends readonly unknown[]
        ? FirstValidationError<Tail>
        : never
    : never;
