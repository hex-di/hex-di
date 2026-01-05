/**
 * Effect Constructors for State Machine
 *
 * This module provides factory functions for creating effect descriptors
 * with full type inference. All constructors return immutable (frozen) objects.
 *
 * @packageDocumentation
 */

import type { Port, InferService } from "@hex-di/ports";
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
const NONE_EFFECT: NoneEffect = Object.freeze({ _tag: "None" }) as NoneEffect;

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
   * Activities are background processes that can:
   * - Emit events back to the machine via EventSink
   * - Be cancelled via AbortSignal
   * - Have typed input data
   *
   * @typeParam TActivityId - The activity identifier literal type (inferred)
   * @typeParam TInput - The input data type (inferred)
   *
   * @param activityId - Unique identifier for this activity instance
   * @param input - Input data for the activity
   *
   * @returns An immutable SpawnEffect descriptor
   *
   * @example
   * ```typescript
   * // Spawn with typed input
   * const effect = Effect.spawn("fetchData", { userId: "123", page: 1 });
   * // effect.activityId === "fetchData"
   * // effect.input === { userId: "123", page: 1 }
   *
   * // Spawn without input
   * const heartbeat = Effect.spawn("heartbeat", undefined);
   * ```
   */
  spawn<const TActivityId extends string, TInput>(
    activityId: TActivityId,
    input: TInput
  ): SpawnEffect<TActivityId, TInput> {
    return Object.freeze({
      _tag: "Spawn",
      activityId,
      input,
    });
  },

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
} as const;
