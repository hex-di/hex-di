/**
 * Machine Runner Types
 *
 * This module provides the type definitions for the state machine runner:
 * - MachineSnapshot: Immutable snapshot of machine state
 * - MachineRunner: Interface for running and interacting with machines
 * - EffectExecutor: Interface for executing effect descriptors
 *
 * @packageDocumentation
 */

import type { ActivityInstance, ActivityStatus } from "../activities/types.js";
import type { EffectAny } from "../effects/types.js";

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
   * The current state name.
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
}

// =============================================================================
// MachineRunner Interface
// =============================================================================

/**
 * Interface for running and interacting with a state machine.
 *
 * The MachineRunner provides:
 * - State and context accessors
 * - Pure transition via `send()` - returns effects without executing
 * - Imperative transition via `sendAndExecute()` - transitions and executes effects
 * - Subscription for state change notifications
 * - Activity status tracking
 * - Disposal for cleanup
 *
 * @typeParam TState - The state name type (union of valid state names)
 * @typeParam TEvent - The event type (union of valid events)
 * @typeParam TContext - The context type
 *
 * @remarks
 * The runner separates concerns:
 * - `send()` is pure: computes the transition and returns effect descriptors
 * - `sendAndExecute()` is imperative: delegates to `send()` then executes effects
 *
 * This separation enables:
 * - Testing transitions without side effects
 * - Inspecting effects before execution
 * - Custom effect execution strategies
 *
 * @example
 * ```typescript
 * const runner = createMachineRunner(machine, options);
 *
 * // Pure transition - get effects without executing
 * const effects = runner.send(event);
 * console.log(effects); // [{ _tag: 'Delay', milliseconds: 100 }, ...]
 *
 * // Imperative transition - execute effects
 * await runner.sendAndExecute(event);
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
   * @returns A readonly array of effect descriptors to execute
   *
   * @remarks
   * If no valid transition exists (no transition defined or all guards fail),
   * returns an empty array and the state remains unchanged.
   *
   * @example
   * ```typescript
   * // Get effects without executing
   * const effects = runner.send({ type: 'FETCH' });
   *
   * // Effects are pure data - can be logged, tested, etc.
   * console.log(effects);
   * // [
   * //   { _tag: 'Invoke', port: UserServicePort, method: 'getUser', args: ['123'] },
   * //   { _tag: 'Delay', milliseconds: 100 }
   * // ]
   *
   * // State has already transitioned
   * console.log(runner.state()); // 'loading'
   * ```
   */
  send(event: TEvent): readonly EffectAny[];

  /**
   * Performs a state transition and executes all resulting effects.
   *
   * This method delegates to `send()` for the transition, then executes
   * each effect using the configured EffectExecutor.
   *
   * @param event - The event to send to the machine
   * @returns A promise that resolves when all effects have been executed
   *
   * @example
   * ```typescript
   * // Transition and execute effects
   * await runner.sendAndExecute({ type: 'FETCH' });
   *
   * // State has transitioned and all effects have completed
   * console.log(runner.state()); // 'success' or 'error'
   * ```
   */
  sendAndExecute(event: TEvent): Promise<void>;

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
   * @returns A promise that resolves when disposal is complete
   *
   * @remarks
   * Multiple calls to dispose are safe (subsequent calls are no-ops).
   */
  dispose(): Promise<void>;

  /**
   * Whether the runner has been disposed.
   */
  readonly isDisposed: boolean;
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
  send(event: { readonly type: string }): readonly EffectAny[];
  sendAndExecute(event: { readonly type: string }): Promise<void>;
  subscribe(callback: (snapshot: MachineSnapshot<string, unknown>) => void): () => void;
  getActivityStatus(id: string): ActivityStatus | undefined;
  dispose(): Promise<void>;
  readonly isDisposed: boolean;
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
 *   async execute(effect) {
 *     switch (effect._tag) {
 *       case 'Invoke':
 *         const service = container.resolve(effect.port);
 *         await service[effect.method](...effect.args);
 *         break;
 *       case 'Delay':
 *         await new Promise(r => setTimeout(r, effect.milliseconds));
 *         break;
 *       // ... other effect types
 *     }
 *   }
 * };
 * ```
 *
 * @example Test executor
 * ```typescript
 * const mockExecutor: EffectExecutor = {
 *   async execute(effect) {
 *     recordedEffects.push(effect);
 *   }
 * };
 * ```
 */
export interface EffectExecutor {
  /**
   * Executes a single effect descriptor.
   *
   * @param effect - The effect descriptor to execute
   * @returns A promise that resolves when the effect is complete
   */
  execute(effect: EffectAny): Promise<void>;
}
