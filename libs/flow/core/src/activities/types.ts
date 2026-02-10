/**
 * Activity System Types
 *
 * This module provides types for long-running activities that can:
 * - Execute with typed input and output
 * - Emit events back to the machine via EventSink
 * - Be cancelled via AbortSignal
 * - Be tracked by ActivityManager
 *
 * @packageDocumentation
 */

import type { Port, PortDeps } from "@hex-di/core";
import type { ActivityPort, ActivityInput, ActivityOutput } from "./port.js";
import type { TypedEventSink } from "./events.js";

// =============================================================================
// CleanupReason Type
// =============================================================================

/**
 * Reason why activity cleanup was triggered.
 *
 * - `completed`: Activity finished successfully
 * - `cancelled`: Activity was cancelled via AbortSignal
 * - `timeout`: Activity exceeded its configured timeout
 * - `error`: Activity threw an error during execution
 */
export type CleanupReason = "completed" | "cancelled" | "timeout" | "error";

// =============================================================================
// ActivityContext Interface
// =============================================================================

/**
 * Execution context provided to activity execute and cleanup functions.
 *
 * @typeParam TRequires - The tuple of Port types for dependencies
 * @typeParam TEvents - The events definition from defineEvents
 */
export interface ActivityContext<TRequires extends readonly Port<unknown, string>[], TEvents> {
  /**
   * Resolved dependencies keyed by port name.
   */
  readonly deps: PortDeps<TRequires>;

  /**
   * Type-safe event sink for emitting events during execution.
   */
  readonly sink: TypedEventSink<TEvents>;

  /**
   * AbortSignal for cancellation support.
   */
  readonly signal: AbortSignal;
}

// =============================================================================
// ActivityConfig Interface
// =============================================================================

/**
 * Configuration object for creating an activity via the activity() factory.
 *
 * @typeParam TPort - The ActivityPort type
 * @typeParam TRequires - The tuple of Port types for dependencies
 * @typeParam TEvents - The events definition from defineEvents
 */
export interface ActivityConfig<
  TPort extends ActivityPort<unknown, unknown, string>,
  TRequires extends readonly Port<unknown, string>[],
  TEvents,
> {
  /**
   * The ports this activity depends on.
   * Use `as const` or the `const` modifier to preserve tuple types.
   */
  readonly requires: TRequires;

  /**
   * The events this activity can emit, defined via defineEvents().
   */
  readonly emits: TEvents;

  /**
   * Optional timeout in milliseconds for activity execution.
   * If exceeded, the activity will be cancelled with 'timeout' reason.
   */
  readonly timeout?: number;

  /**
   * The main execution function for the activity.
   *
   * @param input - The typed input for this activity
   * @param context - The execution context with deps, sink, and signal
   * @returns A promise resolving to the typed output
   */
  execute(
    input: ActivityInput<TPort>,
    context: ActivityContext<TRequires, TEvents>
  ): Promise<ActivityOutput<TPort>>;

  /**
   * Optional cleanup function called when activity ends.
   * Receives only deps (no sink or signal) since cleanup happens after execution.
   *
   * @param reason - Why the activity ended
   * @param context - Cleanup context with just deps
   */
  cleanup?(
    reason: CleanupReason,
    context: Pick<ActivityContext<TRequires, TEvents>, "deps">
  ): void | Promise<void>;
}

// =============================================================================
// ConfiguredActivity Interface
// =============================================================================

/**
 * A fully configured activity created by the activity() factory.
 *
 * This is the return type of activity() and contains all metadata
 * needed to spawn and execute the activity.
 *
 * @typeParam TPort - The ActivityPort type
 * @typeParam TRequires - The tuple of Port types for dependencies
 * @typeParam TEvents - The events definition from defineEvents
 */
export interface ConfiguredActivity<
  TPort extends ActivityPort<unknown, unknown, string>,
  TRequires extends readonly Port<unknown, string>[],
  TEvents,
> {
  /**
   * The activity port this configuration implements.
   */
  readonly port: TPort;

  /**
   * The ports this activity depends on.
   */
  readonly requires: TRequires;

  /**
   * The events this activity can emit.
   */
  readonly emits: TEvents;

  /**
   * The timeout in milliseconds, or undefined if no timeout.
   */
  readonly timeout: number | undefined;

  /**
   * The main execution function.
   */
  execute(
    input: ActivityInput<TPort>,
    context: ActivityContext<TRequires, TEvents>
  ): Promise<ActivityOutput<TPort>>;

  /**
   * Optional cleanup function.
   */
  cleanup?(
    reason: CleanupReason,
    context: Pick<ActivityContext<TRequires, TEvents>, "deps">
  ): void | Promise<void>;
}

// =============================================================================
// ConfiguredActivityAny - Universal Constraint Type
// =============================================================================

/**
 * Structural interface matching ANY ConfiguredActivity without using `any`.
 *
 * This uses TypeScript's variance rules to create a type that ALL
 * ConfiguredActivity types are assignable to:
 * - `unknown` in covariant positions (outputs/reads)
 * - `never` in contravariant positions (inputs/writes)
 *
 * When used as a constraint `<A extends ConfiguredActivityAny>`, the generic
 * parameter `A` preserves the EXACT activity type for full inference.
 *
 * @remarks
 * This follows the AdapterAny pattern from `@hex-di/graph` to avoid using `any`.
 */
export interface ConfiguredActivityAny {
  /**
   * The activity port (covariant - widest Port type).
   */
  readonly port: ActivityPort<unknown, unknown, string>;

  /**
   * The required dependencies (covariant - array of ports).
   */
  readonly requires: readonly Port<unknown, string>[];

  /**
   * The events definition (covariant - unknown).
   */
  readonly emits: unknown;

  /**
   * The timeout (covariant).
   */
  readonly timeout: number | undefined;

  /**
   * Execute function (contravariant in params, covariant in return).
   */
  execute(input: never, context: never): Promise<unknown>;

  /**
   * Optional cleanup function (contravariant in params).
   */
  cleanup?(reason: CleanupReason, context: never): void | Promise<void>;
}

// =============================================================================
// EventSink Interface
// =============================================================================

/**
 * Interface for emitting events from activities back to the state machine.
 *
 * Activities use this sink to send events during their execution, which
 * can trigger state transitions in the machine that spawned them.
 *
 * @remarks
 * The EventSink is provided to activities at spawn time and remains valid
 * for the lifetime of the activity. Events emitted after the activity
 * completes or is cancelled may be ignored.
 *
 * @example
 * ```typescript
 * const activity: Activity<void, void> = {
 *   async execute(_input, sink, signal) {
 *     // Emit progress events during execution
 *     sink.emit({ type: 'PROGRESS', payload: { percent: 25 } });
 *     await doSomeWork();
 *     sink.emit({ type: 'PROGRESS', payload: { percent: 75 } });
 *     await doMoreWork();
 *     sink.emit({ type: 'COMPLETE' });
 *   }
 * };
 * ```
 */
export interface EventSink {
  /**
   * Emits an event to the state machine.
   *
   * @typeParam E - The event type (must have a `type` property)
   * @param event - The event to emit
   */
  emit<E extends { readonly type: string }>(event: E): void;
}

// =============================================================================
// Activity Interface
// =============================================================================

/**
 * Interface for a long-running activity that can be spawned by a state machine.
 *
 * Activities are asynchronous processes that:
 * - Receive typed input when spawned
 * - Can emit events back to the machine via EventSink
 * - Can be cancelled via AbortSignal
 * - Return a typed output when complete
 *
 * @typeParam TInput - The input data type for the activity
 * @typeParam TOutput - The output/result type when the activity completes
 *
 * @remarks
 * Activities should check the AbortSignal regularly and clean up resources
 * when cancelled. The EventSink can be used to emit progress or intermediate
 * events during execution.
 *
 * @example
 * ```typescript
 * interface FetchActivity extends Activity<{ url: string }, Response> {}
 *
 * const fetchActivity: FetchActivity = {
 *   async execute(input, sink, signal) {
 *     sink.emit({ type: 'FETCH_STARTED' });
 *
 *     const response = await fetch(input.url, { signal });
 *
 *     sink.emit({ type: 'FETCH_COMPLETED' });
 *     return response;
 *   }
 * };
 * ```
 */
export interface Activity<TInput, TOutput> {
  /**
   * Executes the activity with the given input.
   *
   * @param input - The input data for this activity instance
   * @param sink - EventSink for emitting events back to the machine
   * @param signal - AbortSignal for cancellation
   * @returns A promise that resolves with the activity output
   */
  execute(input: TInput, sink: EventSink, signal: AbortSignal): Promise<TOutput>;
}

// =============================================================================
// Activity Status
// =============================================================================

/**
 * The lifecycle status of an activity instance.
 *
 * Activities progress through these statuses:
 * - `pending`: Activity has been scheduled but not yet started
 * - `running`: Activity is currently executing
 * - `completed`: Activity finished successfully
 * - `failed`: Activity threw an error
 * - `cancelled`: Activity was stopped via AbortSignal
 */
export type ActivityStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

// =============================================================================
// Activity Instance
// =============================================================================

/**
 * Represents a tracked instance of a spawned activity.
 *
 * The ActivityManager creates and maintains ActivityInstance records for
 * each spawned activity, allowing inspection of their current status and
 * timing information.
 *
 * @remarks
 * - `startTime` is set when the activity begins execution
 * - `endTime` is set when the activity completes, fails, or is cancelled
 * - The `id` is unique within the ActivityManager's scope
 *
 * @example
 * ```typescript
 * const instance = manager.getAll().find(a => a.id === 'fetch-user');
 * if (instance?.status === 'running') {
 *   const duration = Date.now() - instance.startTime;
 *   console.log(`Activity running for ${duration}ms`);
 * }
 * ```
 */
export interface ActivityInstance {
  /**
   * Unique identifier for this activity instance.
   */
  readonly id: string;

  /**
   * Current lifecycle status of the activity.
   */
  readonly status: ActivityStatus;

  /**
   * Timestamp (ms since epoch) when the activity started.
   */
  readonly startTime: number;

  /**
   * Timestamp (ms since epoch) when the activity ended.
   * Undefined if the activity is still running or pending.
   */
  readonly endTime: number | undefined;
}

// =============================================================================
// ActivityAny - Universal Constraint Type
// =============================================================================

/**
 * Structural interface matching ANY Activity without using `any`.
 *
 * This uses TypeScript's variance rules to create a type that ALL Activities
 * are assignable to. It constrains only the shape of the `execute` method
 * without specifying concrete input/output types.
 *
 * When used as a constraint `<A extends ActivityAny>`, the generic parameter `A`
 * preserves the EXACT activity type for full inference.
 *
 * @remarks
 * This follows the AdapterAny pattern from `@hex-di/graph` to avoid using `any`.
 */
export interface ActivityAny {
  /**
   * The execute method with universal variance.
   * Uses `never` for input (contravariant) and `unknown` for output (covariant).
   */
  execute(input: never, sink: EventSink, signal: AbortSignal): Promise<unknown>;
}
