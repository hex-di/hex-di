/**
 * Machine Runner Types
 *
 * This module provides the type definitions for the state machine runner:
 * - MachineSnapshot: Immutable snapshot of machine state
 * - MachineRunner: Interface for running and interacting with machines
 * - EffectExecutor: Interface for executing effect descriptors
 *
 * All methods that can fail return Result or ResultAsync instead of throwing.
 *
 * @packageDocumentation
 */

import type { Result } from "@hex-di/result";
import { ResultAsync } from "@hex-di/result";
import type { ActivityInstance, ActivityStatus } from "../activities/types.js";
import type { EffectAny } from "../effects/types.js";
import type { TransitionError, EffectExecutionError, DisposeError } from "../errors/index.js";

// =============================================================================
// StateValue Type
// =============================================================================

/**
 * Represents the active state configuration of a machine.
 *
 * - For flat (atomic) states: a plain string (e.g., `'idle'`)
 * - For compound states: a nested object (e.g., `{ active: 'loading' }`)
 * - For deeply nested compounds: `{ active: { editing: 'unsaved' } }`
 */
export type StateValue = string | { readonly [key: string]: StateValue };

// Re-export ResultAsync for convenience (consumers need it for type annotations)
export { ResultAsync };

// =============================================================================
// PendingEvent Type
// =============================================================================

/**
 * An event waiting in the queue during re-entrant send processing.
 */
export interface PendingEvent {
  /** The event type string. */
  readonly type: string;
  /** Optional payload attached to the event. */
  readonly payload?: unknown;
  /** Source of the event: emit (from effect), delay (from timer), or external (user send). */
  readonly source: "emit" | "delay" | "external";
  /** Timestamp when the event was enqueued. */
  readonly enqueuedAt: number;
}

// =============================================================================
// History Types
// =============================================================================

/**
 * A recorded transition for the history buffer.
 */
export interface TransitionHistoryEntry {
  readonly prevState: string;
  readonly nextState: string;
  readonly eventType: string;
  readonly effectCount: number;
  readonly timestamp: number;
}

/**
 * A recorded effect execution for the history buffer.
 */
export interface EffectExecutionEntry {
  readonly effectTag: string;
  readonly ok: boolean;
  readonly timestamp: number;
  readonly duration: number;
}

/**
 * Configuration for history recording in MachineRunner.
 */
export interface HistoryConfig {
  /** Whether history recording is enabled. Disabled by default for zero overhead. */
  readonly enabled: boolean;
  /** Maximum number of transitions to keep. @default 50 */
  readonly transitionBufferSize?: number;
  /** Maximum number of effect executions to keep. @default 100 */
  readonly effectBufferSize?: number;
}

// =============================================================================
// MachineSnapshot Type
// =============================================================================

/**
 * Immutable snapshot of a machine's current state.
 *
 * A snapshot captures the complete state of a machine at a point in time:
 * - The current state name
 * - The current context value
 * - All running activity instances
 *
 * Snapshots are used for:
 * - Reading current machine state
 * - Subscription callbacks
 * - React integration (useSyncExternalStore)
 *
 * @typeParam TState - The state name type (union of valid state names)
 * @typeParam TContext - The context type
 *
 * @remarks
 * Snapshots are immutable - once created, they never change.
 * Each state transition produces a new snapshot.
 *
 * @example
 * ```typescript
 * const runner = createMachineRunner(machine, options);
 *
 * const snapshot = runner.snapshot();
 * console.log(snapshot.state);    // 'idle'
 * console.log(snapshot.context);  // { count: 0 }
 * console.log(snapshot.activities); // []
 * ```
 */
export interface MachineSnapshot<TState extends string, TContext> {
  /**
   * The current top-level state name.
   */
  readonly state: TState;

  /**
   * The current context value.
   */
  readonly context: TContext;

  /**
   * All activity instances tracked by the machine.
   * Includes running, completed, failed, and cancelled activities.
   */
  readonly activities: readonly ActivityInstance[];

  /**
   * Events waiting in the queue during re-entrant processing.
   * Empty unless the machine is currently processing a transition.
   */
  readonly pendingEvents: readonly PendingEvent[];

  /**
   * The full active state configuration.
   *
   * - For flat states: a plain string (e.g., `'idle'`)
   * - For compound states: a nested object (e.g., `{ active: 'loading' }`)
   */
  readonly stateValue: StateValue;

  /**
   * Checks if the current state matches a dot-separated path.
   *
   * The path must start with a valid top-level state name. For compound states,
   * you can use dot notation to match nested states (e.g., `'active.loading'`).
   *
   * @example
   * ```typescript
   * snapshot.matches('active');          // true if in any child of active
   * snapshot.matches('active.loading');  // true if in active.loading specifically
   * ```
   */
  matches(path: TState | `${TState}.${string}`): boolean;

  /**
   * Checks whether an event would trigger a valid transition from the current state.
   * Includes events handled by parent compound states (event bubbling).
   */
  can(event: { readonly type: string }): boolean;
}

// =============================================================================
// MachineRunner Interface
// =============================================================================

/**
 * Interface for running and interacting with a state machine.
 *
 * The MachineRunner provides:
 * - State and context accessors
 * - Pure transition via `send()` - returns Result with effects
 * - Imperative transition via `sendAndExecute()` - returns ResultAsync
 * - Subscription for state change notifications
 * - Activity status tracking
 * - Disposal for cleanup
 *
 * @typeParam TState - The state name type (union of valid state names)
 * @typeParam TEvent - The event type (union of valid events)
 * @typeParam TContext - The context type
 *
 * @remarks
 * All methods that can fail return Result/ResultAsync:
 * - `send()` returns `Result<readonly EffectAny[], TransitionError>`
 * - `sendAndExecute()` returns `ResultAsync<void, TransitionError | EffectExecutionError>`
 * - `dispose()` returns `ResultAsync<void, DisposeError>`
 *
 * @example
 * ```typescript
 * const runner = createMachineRunner(machine, options);
 *
 * // Pure transition - get effects without executing
 * const result = runner.send(event);
 * if (result._tag === 'Ok') {
 *   console.log(result.value); // effects array
 * }
 *
 * // Imperative transition - execute effects
 * const execResult = await runner.sendAndExecute(event);
 *
 * // Subscribe to changes
 * const unsubscribe = runner.subscribe((snapshot) => {
 *   console.log('New state:', snapshot.state);
 * });
 *
 * // Cleanup
 * await runner.dispose();
 * ```
 */
export interface MachineRunner<
  TState extends string,
  TEvent extends { readonly type: string },
  TContext,
> {
  /**
   * Returns a snapshot of the current machine state.
   *
   * The snapshot includes the current state, context, and activities.
   * Each call returns a new (potentially cached) snapshot object.
   *
   * @returns An immutable snapshot of the machine state
   */
  snapshot(): MachineSnapshot<TState, TContext>;

  /**
   * Returns the current state name.
   *
   * @returns The current state name
   */
  state(): TState;

  /**
   * Returns the current context value.
   *
   * @returns The current context
   */
  context(): TContext;

  /**
   * Returns the active state value.
   *
   * For flat machines: returns the state name string (e.g., `'idle'`).
   * For compound machines: returns a nested object (e.g., `{ active: 'loading' }`).
   */
  stateValue(): StateValue;

  /**
   * Performs a pure state transition.
   *
   * This method:
   * 1. Finds matching transitions for the event in the current state
   * 2. Evaluates guards in definition order
   * 3. Applies actions to produce new context
   * 4. Updates the state and context
   * 5. Collects and returns all effects (exit, transition, entry)
   *
   * **Does NOT execute effects** - the caller is responsible for effect execution.
   * This enables testing transitions without side effects.
   *
   * @param event - The event to send to the machine
   * @returns Result with effects on success, or TransitionError on failure
   *
   * @remarks
   * If no valid transition exists (no transition defined or all guards fail),
   * returns ok with empty array and the state remains unchanged.
   *
   * @example
   * ```typescript
   * const result = runner.send({ type: 'FETCH' });
   * if (result._tag === 'Ok') {
   *   // result.value is readonly EffectAny[]
   *   console.log(result.value);
   * } else {
   *   // result.error is TransitionError
   *   switch (result.error._tag) {
   *     case 'Disposed': // machine was disposed
   *     case 'GuardThrew': // guard threw an exception
   *   }
   * }
   * ```
   */
  send(event: TEvent): Result<readonly EffectAny[], TransitionError>;

  /**
   * Performs a state transition and executes all resulting effects.
   *
   * This method delegates to `send()` for the transition, then executes
   * each effect using the configured EffectExecutor.
   *
   * @param event - The event to send to the machine
   * @returns ResultAsync that resolves on success, or error on failure
   *
   * @example
   * ```typescript
   * const result = await runner.sendAndExecute({ type: 'FETCH' });
   * if (result._tag === 'Err') {
   *   console.log('Failed:', result.error._tag);
   * }
   * ```
   */
  sendAndExecute(event: TEvent): ResultAsync<void, TransitionError | EffectExecutionError>;

  /**
   * Sends multiple events in a batch.
   *
   * Events are processed sequentially. Subscribers are notified once
   * after all events have been processed (not after each individual event).
   * Short-circuits on first error - remaining events are not processed.
   *
   * **Does NOT execute effects** - returns all accumulated effects.
   *
   * @param events - The events to send in order
   * @returns Result with all accumulated effects, or TransitionError on first failure
   *
   * @example
   * ```typescript
   * const result = runner.sendBatch([
   *   { type: 'SET_NAME', name: 'Alice' },
   *   { type: 'SET_AGE', age: 30 },
   *   { type: 'SUBMIT' },
   * ]);
   *
   * if (result._tag === 'Ok') {
   *   // result.value is all effects from all transitions
   *   console.log('All events processed, effects:', result.value);
   * }
   * ```
   */
  sendBatch(events: readonly TEvent[]): Result<readonly EffectAny[], TransitionError>;

  /**
   * Subscribes to state change notifications.
   *
   * The callback is invoked after each successful state transition with
   * a snapshot of the new state. Callbacks are invoked synchronously.
   *
   * @param callback - Function to call with new snapshot on state change
   * @returns An unsubscribe function
   *
   * @remarks
   * - Callbacks are NOT invoked for the initial state (only transitions)
   * - Callbacks are invoked after `send()` and `sendAndExecute()`
   * - Unsubscribing during a callback is safe
   *
   * @example
   * ```typescript
   * const unsubscribe = runner.subscribe((snapshot) => {
   *   console.log('State changed to:', snapshot.state);
   *   console.log('New context:', snapshot.context);
   * });
   *
   * // Later, when no longer needed
   * unsubscribe();
   * ```
   */
  subscribe(callback: (snapshot: MachineSnapshot<TState, TContext>) => void): () => void;

  /**
   * Gets the status of an activity by ID.
   *
   * @param id - The activity identifier
   * @returns The activity status, or undefined if not found
   */
  getActivityStatus(id: string): ActivityStatus | undefined;

  /**
   * Disposes the runner and cleans up resources.
   *
   * This method:
   * 1. Stops all running activities via ActivityManager.dispose()
   * 2. Marks the runner as disposed
   *
   * After disposal, the runner should not be used (though state/context
   * can still be read).
   *
   * @returns ResultAsync that resolves on success
   *
   * @remarks
   * Multiple calls to dispose are safe (subsequent calls are no-ops).
   */
  dispose(): ResultAsync<void, DisposeError>;

  /**
   * Whether the runner has been disposed.
   */
  readonly isDisposed: boolean;

  /**
   * Returns recorded transition history entries.
   * Returns empty array if history is not enabled.
   */
  getTransitionHistory(): readonly TransitionHistoryEntry[];

  /**
   * Returns recorded effect execution entries.
   * Returns empty array if history is not enabled.
   */
  getEffectHistory(): readonly EffectExecutionEntry[];
}

// =============================================================================
// MachineRunnerAny - Universal Constraint Type
// =============================================================================

/**
 * Structural interface matching ANY MachineRunner without using `any`.
 *
 * This uses TypeScript's variance rules to create a type that ALL MachineRunners
 * are assignable to. It constrains only the shape of the runner without
 * specifying concrete state, event, or context types.
 *
 * When used as a constraint `<R extends MachineRunnerAny>`, the generic parameter `R`
 * preserves the EXACT runner type for full inference.
 *
 * @remarks
 * This follows the AdapterAny pattern from `@hex-di/graph` to avoid using `any`.
 */
export interface MachineRunnerAny {
  snapshot(): MachineSnapshot<string, unknown>;
  state(): string;
  context(): unknown;
  stateValue(): StateValue;
  send(event: { readonly type: string }): Result<readonly EffectAny[], TransitionError>;
  sendBatch(
    events: readonly { readonly type: string }[]
  ): Result<readonly EffectAny[], TransitionError>;
  sendAndExecute(event: {
    readonly type: string;
  }): ResultAsync<void, TransitionError | EffectExecutionError>;
  subscribe(callback: (snapshot: MachineSnapshot<string, unknown>) => void): () => void;
  getActivityStatus(id: string): ActivityStatus | undefined;
  dispose(): ResultAsync<void, DisposeError>;
  readonly isDisposed: boolean;
  getTransitionHistory(): readonly TransitionHistoryEntry[];
  getEffectHistory(): readonly EffectExecutionEntry[];
}

// =============================================================================
// EffectExecutor Interface
// =============================================================================

/**
 * Interface for executing effect descriptors.
 *
 * Effect executors are responsible for interpreting effect descriptors
 * and performing the actual side effects. Different executors can be
 * used for different contexts (production, testing, etc.).
 *
 * @remarks
 * The default executor (DIEffectExecutor) integrates with HexDI to:
 * - Resolve ports from the container scope
 * - Invoke methods on resolved services
 * - Spawn/stop activities
 * - Handle delays
 * - Route emitted events back to the machine
 *
 * For testing, a mock executor can be used to record effects without
 * actually executing them.
 *
 * @example Production executor
 * ```typescript
 * const executor: EffectExecutor = {
 *   execute(effect) {
 *     switch (effect._tag) {
 *       case 'Invoke':
 *         return ResultAsync.fromPromise(
 *           container.resolve(effect.port)[effect.method](...effect.args),
 *           (e) => InvokeError({ portName: '', method: '', cause: e })
 *         );
 *       // ... other effect types
 *     }
 *   }
 * };
 * ```
 */
export interface EffectExecutor {
  /**
   * Executes a single effect descriptor.
   *
   * @param effect - The effect descriptor to execute
   * @returns ResultAsync that resolves on success or contains an EffectExecutionError
   */
  execute(effect: EffectAny): ResultAsync<void, EffectExecutionError>;
}
