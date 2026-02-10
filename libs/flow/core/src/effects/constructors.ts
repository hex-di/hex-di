/**
 * Effect Constructors for State Machine
 *
 * This module provides factory functions for creating effect descriptors
 * with full type inference. All constructors return immutable (frozen) objects.
 *
 * @packageDocumentation
 */

import type { Port, InferService } from "@hex-di/core";
import type { EventAny } from "../machine/types.js";
import type {
  InvokeEffect,
  SpawnEffect,
  StopEffect,
  EmitEffect,
  DelayEffect,
  ParallelEffect,
  SequenceEffect,
  NoneEffect,
  EffectAny,
  MethodNames,
  MethodParams,
  ChooseBranch,
  ChooseEffect,
  LogEffect,
  ActivityPortLike,
} from "./types.js";

// =============================================================================
// Singleton NoneEffect Instance
// =============================================================================

/**
 * Singleton instance of NoneEffect.
 * Since NoneEffect has no state, we can reuse the same instance.
 *
 * @internal
 */
const NONE_EFFECT: NoneEffect = Object.freeze({ _tag: "None" as const });

// =============================================================================
// Spawn Overloads
// =============================================================================

/**
 * Overloaded spawn function type.
 *
 * - Overload 1: Accepts an ActivityPort, extracts the port name as activityId
 *   and infers the input type from the port's phantom `__activityInput`.
 * - Overload 2: Accepts a string activityId (existing API).
 */
interface SpawnFn {
  /**
   * Creates a SpawnEffect from an ActivityPort.
   *
   * The port's `__portName` is used as the activityId, and the input type
   * is inferred from the port's phantom `__activityInput` property.
   *
   * @param port - An ActivityPort defining the activity
   * @param input - Input data matching the port's input type
   */
  <TPort extends ActivityPortLike<unknown>>(
    port: TPort,
    input: TPort extends ActivityPortLike<infer TInput> ? TInput : never
  ): SpawnEffect<
    TPort extends { readonly __portName: infer TName extends string } ? TName : string,
    TPort extends ActivityPortLike<infer TInput> ? TInput : never
  >;

  /**
   * Creates a SpawnEffect from a string activity ID.
   *
   * @param activityId - Unique identifier for this activity instance
   * @param input - Input data for the activity
   */
  <const TActivityId extends string, TInput>(
    activityId: TActivityId,
    input: TInput
  ): SpawnEffect<TActivityId, TInput>;
}

/**
 * Implementation of the overloaded spawn function.
 *
 * At runtime, checks whether the first argument is a string or an object
 * with `__portName` to extract the activityId.
 */
const spawnImpl: SpawnFn = (
  activityIdOrPort: string | { readonly __portName: string },
  input: unknown
): SpawnEffect<string, unknown> => {
  const activityId =
    typeof activityIdOrPort === "string" ? activityIdOrPort : activityIdOrPort.__portName;
  return Object.freeze({
    _tag: "Spawn",
    activityId,
    input,
  });
};

// =============================================================================
// Effect Constructors Namespace
// =============================================================================

/**
 * Namespace containing all effect constructor functions.
 *
 * Effects are pure data descriptors that represent side effects without
 * performing them. They are executed later by an EffectExecutor.
 *
 * @example
 * ```typescript
 * import { Effect } from "@hex-di/flow";
 *
 * // Invoke a port method
 * const fetchUser = Effect.invoke(UserServicePort, "getUser", ["user-123"]);
 *
 * // Spawn a background activity
 * const polling = Effect.spawn("polling", { interval: 5000 });
 *
 * // Compose effects
 * const workflow = Effect.sequence([
 *   Effect.invoke(LoggerPort, "log", ["Starting..."]),
 *   Effect.delay(1000),
 *   fetchUser,
 * ] as const);
 * ```
 */
export const Effect = {
  /**
   * Creates an InvokeEffect for calling a method on a port-provided service.
   *
   * This constructor infers all types from the port token:
   * - Method names are constrained to actual methods on the service
   * - Arguments are type-checked against method parameters
   * - Return type is captured for downstream use
   *
   * @typeParam TPort - The port type (inferred from `port` argument)
   * @typeParam TMethod - The method name literal type (inferred from `method` argument)
   *
   * @param port - The port token for service resolution
   * @param method - The method name to invoke
   * @param args - The arguments to pass to the method
   *
   * @returns An immutable InvokeEffect descriptor
   *
   * @example
   * ```typescript
   * interface UserService {
   *   getUser(id: string): Promise<User>;
   *   updateUser(id: string, data: UserData): Promise<void>;
   * }
   *
   * const UserServicePort = createPort<"UserService", UserService>("UserService");
   *
   * // Type-safe invocation - all types inferred from port
   * const effect = Effect.invoke(UserServicePort, "getUser", ["user-123"]);
   * // effect.method === "getUser"
   * // effect.args === ["user-123"]
   * // effect.__resultType is Promise<User>
   *
   * // Type error: "invalidMethod" is not a method on UserService
   * // Effect.invoke(UserServicePort, "invalidMethod", []);
   *
   * // Type error: wrong argument type
   * // Effect.invoke(UserServicePort, "getUser", [123]);
   * ```
   */
  invoke<TPort extends Port<unknown, string>, TMethod extends MethodNames<InferService<TPort>>>(
    port: TPort,
    method: TMethod,
    args: MethodParams<InferService<TPort>, TMethod> extends readonly unknown[]
      ? readonly [...MethodParams<InferService<TPort>, TMethod>]
      : never
  ): InvokeEffect<TPort, TMethod, readonly [...MethodParams<InferService<TPort>, TMethod>]> {
    // The __resultType is a phantom type - undefined at runtime
    // @ts-expect-error - Intentional phantom type gap: __resultType exists only at type level
    return Object.freeze({
      _tag: "Invoke",
      port,
      method,
      args,
    });
  },

  /**
   * Creates a SpawnEffect for starting a long-running activity.
   *
   * Supports two calling conventions:
   * - **Port-based**: Pass an ActivityPort to extract the activityId from
   *   `__portName` and infer the input type from the port's phantom properties.
   * - **String-based**: Pass a string activityId directly (existing API).
   *
   * @example
   * ```typescript
   * // Port-based: type-safe input inference
   * const FetchPort = activityPort<{ userId: string }, User>()('FetchUser');
   * const effect = Effect.spawn(FetchPort, { userId: "123" });
   * // effect.activityId === "FetchUser"
   *
   * // String-based: explicit ID
   * const effect2 = Effect.spawn("heartbeat", undefined);
   * ```
   */
  spawn: spawnImpl,

  /**
   * Creates a StopEffect for stopping a running activity.
   *
   * This triggers the AbortSignal for the specified activity, allowing it
   * to clean up resources and terminate gracefully.
   *
   * @typeParam TActivityId - The activity identifier literal type (inferred)
   *
   * @param activityId - The identifier of the activity to stop
   *
   * @returns An immutable StopEffect descriptor
   *
   * @example
   * ```typescript
   * const effect = Effect.stop("fetchData");
   * // effect.activityId === "fetchData"
   * ```
   */
  stop<const TActivityId extends string>(activityId: TActivityId): StopEffect<TActivityId> {
    return Object.freeze({
      _tag: "Stop",
      activityId,
    });
  },

  /**
   * Creates an EmitEffect for sending an event back to the state machine.
   *
   * This is typically used by activities or in effect chains to trigger
   * state transitions.
   *
   * @typeParam TEvent - The event type (inferred)
   *
   * @param event - The event to emit
   *
   * @returns An immutable EmitEffect descriptor
   *
   * @example
   * ```typescript
   * const createSuccess = event<"SUCCESS", { data: string }>("SUCCESS");
   *
   * const effect = Effect.emit(createSuccess({ data: "result" }));
   * // effect.event.type === "SUCCESS"
   * // effect.event.payload === { data: "result" }
   * ```
   */
  emit<TEvent extends EventAny>(event: TEvent): EmitEffect<TEvent> {
    return Object.freeze({
      _tag: "Emit",
      event,
    });
  },

  /**
   * Creates a DelayEffect for waiting a specified duration.
   *
   * @param milliseconds - The duration to wait in milliseconds
   *
   * @returns An immutable DelayEffect descriptor
   *
   * @example
   * ```typescript
   * const effect = Effect.delay(1000); // Wait 1 second
   * // effect.milliseconds === 1000
   * ```
   */
  delay(milliseconds: number): DelayEffect {
    return Object.freeze({
      _tag: "Delay",
      milliseconds,
    });
  },

  /**
   * Creates a ParallelEffect for running multiple effects concurrently.
   *
   * All effects in the array are started simultaneously, and the executor
   * waits for all of them to complete (similar to Promise.all).
   *
   * @typeParam TEffects - The readonly array of effect types (inferred)
   *
   * @param effects - The effects to run concurrently
   *
   * @returns An immutable ParallelEffect descriptor
   *
   * @example
   * ```typescript
   * const effect = Effect.parallel([
   *   Effect.invoke(LoggerPort, "log", ["Starting..."]),
   *   Effect.delay(100),
   *   Effect.invoke(AnalyticsPort, "track", ["event_start"]),
   * ] as const);
   * ```
   */
  parallel<TEffects extends readonly EffectAny[]>(effects: TEffects): ParallelEffect<TEffects> {
    return Object.freeze({
      _tag: "Parallel",
      effects,
    });
  },

  /**
   * Creates a SequenceEffect for running multiple effects sequentially.
   *
   * Effects are executed one at a time in array order, with each effect
   * completing before the next one starts.
   *
   * @typeParam TEffects - The readonly array of effect types (inferred)
   *
   * @param effects - The effects to run sequentially
   *
   * @returns An immutable SequenceEffect descriptor
   *
   * @example
   * ```typescript
   * const effect = Effect.sequence([
   *   Effect.invoke(LoggerPort, "log", ["Step 1"]),
   *   Effect.delay(500),
   *   Effect.invoke(LoggerPort, "log", ["Step 2"]),
   *   Effect.delay(500),
   *   Effect.invoke(LoggerPort, "log", ["Done!"]),
   * ] as const);
   * ```
   */
  sequence<TEffects extends readonly EffectAny[]>(effects: TEffects): SequenceEffect<TEffects> {
    return Object.freeze({
      _tag: "Sequence",
      effects,
    });
  },

  /**
   * Returns the singleton NoneEffect instance.
   *
   * This is useful for conditional branching where one branch needs to
   * return an effect but shouldn't perform any action.
   *
   * @returns The singleton NoneEffect instance (frozen)
   *
   * @example
   * ```typescript
   * const effect = shouldLog
   *   ? Effect.invoke(LoggerPort, "log", [message])
   *   : Effect.none();
   * ```
   */
  none(): NoneEffect {
    return NONE_EFFECT;
  },

  /**
   * Creates a ChooseEffect for conditionally selecting effects based on guards.
   *
   * Branches are evaluated in order. The first branch whose guard returns true
   * (or has no guard) is selected, and its effects are executed.
   *
   * @param branches - The branches to evaluate
   * @returns An immutable ChooseEffect descriptor
   */
  choose(branches: readonly ChooseBranch[]): ChooseEffect {
    return Object.freeze({
      _tag: "Choose",
      branches,
    });
  },

  /**
   * Creates a LogEffect for logging a message.
   *
   * @param message - A static string or function producing a dynamic message
   * @returns An immutable LogEffect descriptor
   */
  log(
    message: string | ((context: unknown, event: { readonly type: string }) => string)
  ): LogEffect {
    return Object.freeze({
      _tag: "Log",
      message,
    });
  },
} as const;
