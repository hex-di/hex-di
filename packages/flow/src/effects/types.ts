/**
 * Effect Types for State Machine
 *
 * This module provides typed effect descriptors that represent side effects
 * as pure data structures (commands). Effects are:
 * - Immutable data descriptors
 * - Discriminated by `_tag` property
 * - Typed for full inference of port methods, activity inputs, events
 *
 * @packageDocumentation
 */

import type { Port, InferService } from "@hex-di/ports";
import type { EventAny } from "../machine/types.js";

// =============================================================================
// Port Method Type Extraction Utilities
// =============================================================================

/**
 * Extracts all method names from a service interface.
 *
 * This utility type filters the keys of a service interface to only include
 * properties that are functions (methods).
 *
 * @typeParam TService - The service interface to extract method names from
 *
 * @example
 * ```typescript
 * interface UserService {
 *   getUser(id: string): User;
 *   updateUser(id: string, data: UserData): void;
 *   readonly count: number; // Not a method
 * }
 *
 * type Methods = MethodNames<UserService>; // "getUser" | "updateUser"
 * ```
 */
export type MethodNames<TService> = {
  [K in keyof TService]: TService[K] extends (...args: never[]) => unknown ? K : never;
}[keyof TService] &
  string;

/**
 * Extracts the parameter types of a specific method from a service interface.
 *
 * @typeParam TService - The service interface
 * @typeParam TMethod - The method name to extract parameters from
 *
 * @example
 * ```typescript
 * interface UserService {
 *   updateUser(id: string, data: { name: string }): void;
 * }
 *
 * type Params = MethodParams<UserService, "updateUser">;
 * // [id: string, data: { name: string }]
 * ```
 */
export type MethodParams<TService, TMethod extends keyof TService> = TService[TMethod] extends (
  ...args: infer P
) => unknown
  ? P
  : never;

/**
 * Extracts the return type of a specific method from a service interface.
 *
 * @typeParam TService - The service interface
 * @typeParam TMethod - The method name to extract the return type from
 *
 * @example
 * ```typescript
 * interface UserService {
 *   getUser(id: string): Promise<User>;
 * }
 *
 * type Return = MethodReturn<UserService, "getUser">;
 * // Promise<User>
 * ```
 */
export type MethodReturn<TService, TMethod extends keyof TService> = TService[TMethod] extends (
  ...args: never[]
) => infer R
  ? R
  : never;

// =============================================================================
// Base Effect Interface
// =============================================================================

/**
 * Base interface for all effect types.
 *
 * All effects have a `_tag` discriminator property that enables
 * TypeScript's discriminated union narrowing.
 *
 * @typeParam TKind - The literal string type for the effect kind
 */
interface BaseEffect<TKind extends string> {
  /**
   * Discriminator tag for effect type narrowing.
   */
  readonly _tag: TKind;
}

// =============================================================================
// InvokeEffect - Call a Port Method
// =============================================================================

/**
 * Effect descriptor for invoking a method on a port-provided service.
 *
 * This effect captures:
 * - The port token for service resolution
 * - The method name (as literal type)
 * - The method arguments (as tuple type)
 * - The expected return type (phantom type for downstream use)
 *
 * @typeParam TPort - The port type that provides the service
 * @typeParam TMethod - The method name literal type
 * @typeParam TArgs - The method arguments as a readonly tuple
 *
 * @remarks
 * The `__resultType` property is a phantom type - it exists only at the type
 * level to carry the method's return type for effect execution and result handling.
 *
 * @example
 * ```typescript
 * const effect: InvokeEffect<typeof UserServicePort, "getUser", readonly [string]> = {
 *   _tag: "Invoke",
 *   port: UserServicePort,
 *   method: "getUser",
 *   args: ["user-123"],
 *   __resultType: undefined as unknown as Promise<User>,
 * };
 * ```
 */
export interface InvokeEffect<
  TPort extends Port<unknown, string>,
  TMethod extends MethodNames<InferService<TPort>>,
  TArgs extends readonly unknown[],
> extends BaseEffect<"Invoke"> {
  /**
   * The port token for service resolution.
   */
  readonly port: TPort;

  /**
   * The method name to invoke.
   */
  readonly method: TMethod;

  /**
   * The arguments to pass to the method.
   */
  readonly args: TArgs;

  /**
   * Phantom type carrying the method's return type.
   * This property is undefined at runtime.
   */
  readonly __resultType: MethodReturn<InferService<TPort>, TMethod>;
}

// =============================================================================
// SpawnEffect - Start an Activity
// =============================================================================

/**
 * Effect descriptor for spawning a long-running activity.
 *
 * Activities are background processes that can emit events back to the machine
 * and support cancellation via AbortSignal.
 *
 * @typeParam TActivityId - The activity identifier literal type
 * @typeParam TInput - The input type for the activity
 *
 * @example
 * ```typescript
 * const effect: SpawnEffect<"fetchData", { userId: string }> = {
 *   _tag: "Spawn",
 *   activityId: "fetchData",
 *   input: { userId: "123" },
 * };
 * ```
 */
export interface SpawnEffect<TActivityId extends string, TInput> extends BaseEffect<"Spawn"> {
  /**
   * Unique identifier for this activity instance.
   */
  readonly activityId: TActivityId;

  /**
   * Input data for the activity.
   */
  readonly input: TInput;
}

// =============================================================================
// StopEffect - Stop a Running Activity
// =============================================================================

/**
 * Effect descriptor for stopping a running activity.
 *
 * This triggers the AbortSignal for the specified activity, allowing it to
 * clean up resources and terminate gracefully.
 *
 * @typeParam TActivityId - The activity identifier literal type
 *
 * @example
 * ```typescript
 * const effect: StopEffect<"fetchData"> = {
 *   _tag: "Stop",
 *   activityId: "fetchData",
 * };
 * ```
 */
export interface StopEffect<TActivityId extends string> extends BaseEffect<"Stop"> {
  /**
   * The identifier of the activity to stop.
   */
  readonly activityId: TActivityId;
}

// =============================================================================
// EmitEffect - Emit an Event Back to the Machine
// =============================================================================

/**
 * Effect descriptor for emitting an event back to the state machine.
 *
 * This is typically used by activities or effect executors to send events
 * that trigger state transitions.
 *
 * @typeParam TEvent - The event type to emit (must have a `type` property)
 *
 * @example
 * ```typescript
 * const effect: EmitEffect<Event<"SUCCESS", { data: string }>> = {
 *   _tag: "Emit",
 *   event: { type: "SUCCESS", payload: { data: "result" } },
 * };
 * ```
 */
export interface EmitEffect<TEvent extends EventAny> extends BaseEffect<"Emit"> {
  /**
   * The event to emit to the machine.
   */
  readonly event: TEvent;
}

// =============================================================================
// DelayEffect - Wait for a Duration
// =============================================================================

/**
 * Effect descriptor for waiting a specified amount of time.
 *
 * @example
 * ```typescript
 * const effect: DelayEffect = {
 *   _tag: "Delay",
 *   milliseconds: 1000,
 * };
 * ```
 */
export interface DelayEffect extends BaseEffect<"Delay"> {
  /**
   * The duration to wait in milliseconds.
   */
  readonly milliseconds: number;
}

// =============================================================================
// ParallelEffect - Run Effects Concurrently
// =============================================================================

/**
 * Effect descriptor for running multiple effects concurrently.
 *
 * All effects in the array are started simultaneously, and the executor
 * waits for all of them to complete (similar to Promise.all).
 *
 * @typeParam TEffects - The readonly array of effect types
 *
 * @example
 * ```typescript
 * const effect: ParallelEffect<readonly [InvokeEffect<...>, DelayEffect]> = {
 *   _tag: "Parallel",
 *   effects: [invokeEffect, delayEffect],
 * };
 * ```
 */
export interface ParallelEffect<
  TEffects extends readonly EffectAny[],
> extends BaseEffect<"Parallel"> {
  /**
   * The effects to run concurrently.
   */
  readonly effects: TEffects;
}

// =============================================================================
// SequenceEffect - Run Effects in Order
// =============================================================================

/**
 * Effect descriptor for running multiple effects sequentially.
 *
 * Effects are executed one at a time in array order, with each effect
 * completing before the next one starts.
 *
 * @typeParam TEffects - The readonly array of effect types
 *
 * @example
 * ```typescript
 * const effect: SequenceEffect<readonly [InvokeEffect<...>, DelayEffect]> = {
 *   _tag: "Sequence",
 *   effects: [invokeEffect, delayEffect],
 * };
 * ```
 */
export interface SequenceEffect<
  TEffects extends readonly EffectAny[],
> extends BaseEffect<"Sequence"> {
  /**
   * The effects to run sequentially.
   */
  readonly effects: TEffects;
}

// =============================================================================
// NoneEffect - No-op Effect
// =============================================================================

/**
 * Effect descriptor for a no-op effect.
 *
 * This is useful for conditional branching where one branch needs to
 * return an effect but shouldn't perform any action.
 *
 * @example
 * ```typescript
 * const effect: NoneEffect = { _tag: "None" };
 *
 * // Usage in conditional
 * const effect = shouldDoSomething ? Effect.invoke(...) : Effect.none();
 * ```
 */
export type NoneEffect = BaseEffect<"None">;

// =============================================================================
// EffectAny - Universal Constraint Type
// =============================================================================

/**
 * Structural interface matching ANY Effect without using `any`.
 *
 * This uses TypeScript's variance rules to create a type that ALL Effects
 * are assignable to:
 * - `unknown` in covariant positions (outputs/reads)
 * - `never` in contravariant positions (inputs/writes)
 *
 * When used as a constraint `<E extends EffectAny>`, the generic parameter `E`
 * preserves the EXACT effect type for full inference.
 *
 * @remarks
 * This follows the AdapterAny pattern from `@hex-di/graph` to avoid using `any`.
 *
 * @example
 * ```typescript
 * // All effects match this constraint
 * function executeEffect<E extends EffectAny>(effect: E): Promise<void> {
 *   // E is inferred as exact effect type, not widened to EffectAny
 * }
 * ```
 */
export interface EffectAny {
  /**
   * Discriminator tag for effect type narrowing.
   * All valid effect tags are included in this union.
   */
  readonly _tag: "Invoke" | "Spawn" | "Stop" | "Emit" | "Delay" | "Parallel" | "Sequence" | "None";
}
