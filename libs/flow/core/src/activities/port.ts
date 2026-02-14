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

import { createPort } from "@hex-di/core";
import type { ActivityPort } from "./types.js";

// =============================================================================
// Branded Type Boundary
// =============================================================================

/**
 * BRAND_CAST: Single documented coercion point for ActivityPort branded types.
 *
 * Bridges the type gap between the runtime DirectedPort (from createPort) and
 * the phantom-branded ActivityPort type. The phantom properties (__activityInput,
 * __activityOutput, __brand) exist only at the type level for inference.
 *
 * Uses function overloads (the branded type boundary pattern) so the typed
 * overload declares the return type while the implementation returns the
 * object as-is.
 */
function brandAsActivityPort<TInput, TOutput, TName extends string>(port: {
  readonly __portName: TName;
}): ActivityPort<TInput, TOutput, TName>;
function brandAsActivityPort(port: object): object {
  return port;
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
    const base = createPort<TName, { execute: (input: TInput) => Promise<TOutput> }>({
      name,
      category: "flow/activity",
    });
    return brandAsActivityPort<TInput, TOutput, TName>(base);
  };
}
