/**
 * Integration Types for HexDI Flow
 *
 * This module provides the FlowService type and related types for
 * integrating state machines with HexDI containers.
 *
 * @packageDocumentation
 */

import type { MachineSnapshot } from "../runner/types.js";
import type { ActivityStatus } from "../activities/types.js";
import type { EffectAny } from "../effects/types.js";

// =============================================================================
// FlowService Interface
// =============================================================================

/**
 * A wrapper interface for MachineRunner that exposes the same API.
 *
 * FlowService is the primary interface for interacting with state machines
 * within the HexDI container system. It provides:
 * - State and context accessors
 * - Pure transitions via `send()`
 * - Imperative transitions via `sendAndExecute()`
 * - Subscriptions for state change notifications
 * - Activity tracking
 * - Lifecycle management via `dispose()`
 *
 * @typeParam TState - The state name type (union of valid state names)
 * @typeParam TEvent - The event type name (union of event type names)
 * @typeParam TContext - The context type
 *
 * @remarks
 * FlowService has a scoped lifetime by default, meaning each scope gets
 * its own machine instance. This matches React component lifecycles where
 * each component instance should have its own state machine.
 *
 * The FlowService delegates to an underlying MachineRunner, which is created
 * with a DIEffectExecutor that resolves ports from the container scope.
 *
 * @example
 * ```typescript
 * // Create a port for the FlowService
 * const ModalFlowPort = createFlowPort<
 *   'closed' | 'open' | 'closing',
 *   'OPEN' | 'CLOSE' | 'ANIMATION_END',
 *   { lastAction: string }
 * >('ModalFlow');
 *
 * // Create an adapter
 * const ModalFlowAdapter = createFlowAdapter({
 *   provides: ModalFlowPort,
 *   requires: [AnimationServicePort] as const,
 *   lifetime: 'scoped',
 *   machine: modalMachine,
 * });
 *
 * // Resolve from scope
 * const scope = container.createScope();
 * const modalFlow = scope.resolve(ModalFlowPort);
 *
 * // Use the FlowService
 * modalFlow.send({ type: 'OPEN' });
 * await modalFlow.sendAndExecute({ type: 'CLOSE' });
 * ```
 */
export interface FlowService<TState extends string, TEvent extends string, TContext> {
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
   */
  send(event: { readonly type: TEvent }): readonly EffectAny[];

  /**
   * Performs a state transition and executes all resulting effects.
   *
   * This method delegates to `send()` for the transition, then executes
   * each effect using the configured DIEffectExecutor.
   *
   * @param event - The event to send to the machine
   * @returns A promise that resolves when all effects have been executed
   */
  sendAndExecute(event: { readonly type: TEvent }): Promise<void>;

  /**
   * Subscribes to state change notifications.
   *
   * The callback is invoked after each successful state transition with
   * a snapshot of the new state. Callbacks are invoked synchronously.
   *
   * @param callback - Function to call with new snapshot on state change
   * @returns An unsubscribe function
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
   * Disposes the FlowService and cleans up resources.
   *
   * This method:
   * 1. Stops all running activities
   * 2. Marks the service as disposed
   *
   * After disposal, the FlowService should not be used for transitions.
   *
   * @returns A promise that resolves when disposal is complete
   */
  dispose(): Promise<void>;

  /**
   * Whether the FlowService has been disposed.
   */
  readonly isDisposed: boolean;
}

// =============================================================================
// FlowServiceAny - Universal Constraint Type
// =============================================================================

/**
 * Structural interface matching ANY FlowService without using `any`.
 *
 * This uses TypeScript's variance rules to create a type that ALL FlowServices
 * are assignable to. It constrains only the shape of the service without
 * specifying concrete state, event, or context types.
 *
 * When used as a constraint `<F extends FlowServiceAny>`, the generic parameter `F`
 * preserves the EXACT FlowService type for full inference.
 *
 * @remarks
 * This follows the AdapterAny pattern from `@hex-di/graph` to avoid using `any`.
 */
export interface FlowServiceAny {
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
// FlowService Type Inference Utilities
// =============================================================================

/**
 * Extracts the state names union from a FlowService type.
 *
 * @typeParam F - The FlowService type
 * @returns Union of state name string literals
 *
 * @example
 * ```typescript
 * type States = InferFlowServiceState<typeof modalFlow>;
 * // 'closed' | 'open' | 'closing'
 * ```
 */
export type InferFlowServiceState<F> =
  F extends FlowService<infer TState, infer _E, infer _C> ? TState : never;

/**
 * Extracts the event names union from a FlowService type.
 *
 * @typeParam F - The FlowService type
 * @returns Union of event name string literals
 *
 * @example
 * ```typescript
 * type Events = InferFlowServiceEvent<typeof modalFlow>;
 * // 'OPEN' | 'CLOSE' | 'ANIMATION_END'
 * ```
 */
export type InferFlowServiceEvent<F> =
  F extends FlowService<infer _S, infer TEvent, infer _C> ? TEvent : never;

/**
 * Extracts the context type from a FlowService type.
 *
 * @typeParam F - The FlowService type
 * @returns The context type
 *
 * @example
 * ```typescript
 * type Context = InferFlowServiceContext<typeof modalFlow>;
 * // { lastAction: string }
 * ```
 */
export type InferFlowServiceContext<F> =
  F extends FlowService<infer _S, infer _E, infer TContext> ? TContext : never;
