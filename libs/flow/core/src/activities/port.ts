/**
 * Activity Port Factory
 *
 * This module provides a port factory for activity definitions, following
 * the same Port pattern used for services in `@hex-di/core`.
 *
 * Activity ports allow type-safe references to activities in effect
 * constructors and dependency injection contexts. They extend the base
 * Port type with phantom properties for input/output type extraction.
 *
 * @packageDocumentation
 */

import { type Port } from "@hex-di/core";
import type { Activity } from "./types.js";

// =============================================================================
// Activity Port Type
// =============================================================================

/**
 * A port type for an Activity with typed input and output.
 *
 * This type extends the base Port type with phantom properties that carry
 * the activity's input and output types at the type level. These phantom
 * properties enable type utilities to extract I/O types without accessing
 * the underlying Activity interface.
 *
 * @typeParam TInput - The input type for the activity
 * @typeParam TOutput - The output type of the activity
 * @typeParam TName - The literal string type for the port name
 *
 * @remarks
 * The `__activityInput` and `__activityOutput` properties are phantom types:
 * - They exist only at the type level for compile-time inference
 * - They have no runtime representation (zero overhead)
 * - They enable direct type extraction via indexed access types
 *
 * @example
 * ```typescript
 * // Create an activity port
 * const FetchUserPort = activityPort<{ userId: string }, User>()('FetchUser');
 *
 * // Extract types via phantom properties
 * type Input = typeof FetchUserPort['__activityInput'];   // { userId: string }
 * type Output = typeof FetchUserPort['__activityOutput']; // User
 *
 * // Or use the utility types
 * type Input2 = ActivityInput<typeof FetchUserPort>;
 * type Output2 = ActivityOutput<typeof FetchUserPort>;
 * ```
 */
export type ActivityPort<TInput, TOutput, TName extends string> = Port<
  Activity<TInput, TOutput>,
  TName
> & {
  /**
   * Phantom property carrying the activity's input type.
   * Exists only at the type level for compile-time inference.
   */
  readonly __activityInput: TInput;

  /**
   * Phantom property carrying the activity's output type.
   * Exists only at the type level for compile-time inference.
   */
  readonly __activityOutput: TOutput;
};

// =============================================================================
// Type Utilities
// =============================================================================

/**
 * Extracts the input type from an ActivityPort.
 *
 * This utility type uses conditional type inference to extract the input
 * type parameter from an ActivityPort. For non-ActivityPort types, it
 * returns `never`.
 *
 * @typeParam P - The ActivityPort type to extract the input from
 * @returns The activity input type, or `never` if P is not an ActivityPort
 *
 * @example
 * ```typescript
 * const FetchUserPort = activityPort<{ userId: string }, User>()('FetchUser');
 *
 * type Input = ActivityInput<typeof FetchUserPort>;
 * // Input = { userId: string }
 * ```
 */
export type ActivityInput<P> =
  P extends ActivityPort<infer TInput, infer _TOutput, string> ? TInput : never;

/**
 * Extracts the output type from an ActivityPort.
 *
 * This utility type uses conditional type inference to extract the output
 * type parameter from an ActivityPort. For non-ActivityPort types, it
 * returns `never`.
 *
 * @typeParam P - The ActivityPort type to extract the output from
 * @returns The activity output type, or `never` if P is not an ActivityPort
 *
 * @example
 * ```typescript
 * const FetchUserPort = activityPort<{ userId: string }, User>()('FetchUser');
 *
 * type Output = ActivityOutput<typeof FetchUserPort>;
 * // Output = User
 * ```
 */
export type ActivityOutput<P> =
  P extends ActivityPort<infer _TInput, infer TOutput, string> ? TOutput : never;

// =============================================================================
// Internal Port Creation Helper
// =============================================================================

/**
 * Creates an ActivityPort value with phantom type parameters.
 *
 * ## SAFETY DOCUMENTATION
 *
 * The ActivityPort type has properties that exist ONLY at the type level:
 * - `[__brand]`: The Port's brand property for nominal typing
 * - `__activityInput`: Phantom property for input type inference
 * - `__activityOutput`: Phantom property for output type inference
 *
 * At runtime, only `__portName` exists on the frozen object.
 *
 * This is safe because:
 *
 * 1. **Phantom properties are never accessed at runtime**: The `__activityInput`
 *    and `__activityOutput` properties are used exclusively for compile-time
 *    type inference via indexed access types and conditional types.
 *
 * 2. **Brand is never accessed**: The `__brand` symbol property is used only
 *    for compile-time nominal typing discrimination.
 *
 * 3. **Immutability guaranteed**: `Object.freeze()` prevents any mutation,
 *    ensuring the runtime object cannot be modified to invalidate type assumptions.
 *
 * 4. **Single creation point**: This is the ONLY location where ActivityPort
 *    values are created, ensuring all ports have consistent structure.
 *
 * 5. **Phantom type pattern**: This follows the well-established phantom type
 *    pattern where type parameters carry compile-time information without
 *    runtime representation. See: https://wiki.haskell.org/Phantom_type
 *
 * @internal - Not part of public API. Use activityPort() instead.
 */
function unsafeCreateActivityPort<TInput, TOutput, TName extends string>(
  name: TName
): ActivityPort<TInput, TOutput, TName> {
  // @ts-expect-error - Intentional phantom type gap: __brand, __activityInput, and __activityOutput exist only at type level
  return Object.freeze({ __portName: name });
}

// =============================================================================
// Activity Port Factory
// =============================================================================

/**
 * Creates a typed port token for an Activity with partial type inference.
 *
 * This is a curried function that enables an ergonomic API:
 * - You explicitly specify the input and output types
 * - The port name is automatically inferred from the string argument
 *
 * @typeParam TInput - The input type for the activity (explicitly provided)
 * @typeParam TOutput - The output type of the activity (explicitly provided)
 *
 * @returns A function that accepts the port name and returns an ActivityPort
 *
 * @remarks
 * This uses the curried function pattern to work around TypeScript's limitation
 * that prevents partial type argument inference. By splitting the type parameters
 * across two function calls, we can infer the name while explicitly specifying
 * the input and output types.
 *
 * The returned ActivityPort:
 * - Is frozen and immutable
 * - Has phantom properties for type extraction
 * - Is compatible with the base Port type from @hex-di/core
 * - Can be used for activity registration and spawning
 *
 * @see {@link ActivityPort} - The branded port type returned
 * @see {@link ActivityInput} - Utility to extract the input type from a port
 * @see {@link ActivityOutput} - Utility to extract the output type from a port
 *
 * @example Basic usage
 * ```typescript
 * interface User {
 *   id: string;
 *   name: string;
 * }
 *
 * // Create activity ports with curried syntax
 * const FetchUserPort = activityPort<{ userId: string }, User>()('FetchUser');
 * const PollingPort = activityPort<{ interval: number }, void>()('Polling');
 *
 * // Port names are correctly inferred as literal types
 * type FetchName = typeof FetchUserPort['__portName'];  // 'FetchUser'
 * type PollName = typeof PollingPort['__portName'];     // 'Polling'
 * ```
 *
 * @example Extracting types
 * ```typescript
 * const FetchUserPort = activityPort<{ userId: string }, User>()('FetchUser');
 *
 * // Extract input/output types for use elsewhere
 * type Input = ActivityInput<typeof FetchUserPort>;   // { userId: string }
 * type Output = ActivityOutput<typeof FetchUserPort>; // User
 *
 * // Or use phantom property access
 * type Input2 = typeof FetchUserPort['__activityInput'];
 * type Output2 = typeof FetchUserPort['__activityOutput'];
 * ```
 *
 * @example Use in effect constructors
 * ```typescript
 * // Spawn an activity by port
 * const effect = Effect.spawn(FetchUserPort, { userId: '123' });
 *
 * // Register in container
 * container.register(FetchUserPort, fetchUserAdapter);
 * ```
 */
export function activityPort<TInput, TOutput>(): <const TName extends string>(
  name: TName
) => ActivityPort<TInput, TOutput, TName> {
  return <const TName extends string>(name: TName): ActivityPort<TInput, TOutput, TName> => {
    return unsafeCreateActivityPort<TInput, TOutput, TName>(name);
  };
}
