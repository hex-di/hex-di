/**
 * Integration Types for HexDI Flow
 *
 * This module provides the FlowService type and related types for
 * integrating state machines with HexDI containers.
 *
 * All methods that can fail return Result or ResultAsync.
 *
 * @packageDocumentation
 */

import type { Result } from "@hex-di/result";
import type { ResultAsync } from "@hex-di/result";
import { port, createLibraryInspectorPort, type Port } from "@hex-di/core";
import type { MachineSnapshot } from "../runner/types.js";
import type { ActivityStatus } from "../activities/types.js";
import type { EffectAny } from "../effects/types.js";
import type { TransitionError, EffectExecutionError, DisposeError } from "../errors/index.js";
import type { FlowInspector, FlowRegistry } from "../introspection/types.js";
import type { FlowEventBus } from "../event-bus/index.js";

// =============================================================================
// FlowService Interface
// =============================================================================

/**
 * A wrapper interface for MachineRunner that exposes the same API.
 *
 * FlowService is the primary interface for interacting with state machines
 * within the HexDI container system. It provides:
 * - State and context accessors
 * - Pure transitions via `send()` returning Result
 * - Imperative transitions via `sendAndExecute()` returning ResultAsync
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
 * @example
 * ```typescript
 * const modalFlow = scope.resolve(ModalFlowPort);
 *
 * // Pure transition
 * const result = modalFlow.send({ type: 'OPEN' });
 * if (result._tag === 'Ok') { ... }
 *
 * // Imperative transition
 * const execResult = await modalFlow.sendAndExecute({ type: 'CLOSE' });
 * ```
 */
export interface FlowService<TState extends string, TEvent extends string, TContext> {
  /**
   * Returns a snapshot of the current machine state.
   */
  snapshot(): MachineSnapshot<TState, TContext>;

  /**
   * Returns the current state name.
   */
  state(): TState;

  /**
   * Returns the current context value.
   */
  context(): TContext;

  /**
   * Performs a pure state transition.
   *
   * @param event - The event to send to the machine
   * @returns Result with effects on success, or TransitionError on failure
   */
  send(event: { readonly type: TEvent }): Result<readonly EffectAny[], TransitionError>;

  /**
   * Sends multiple events in a batch.
   *
   * Events are processed sequentially. Subscribers are notified once at the end.
   * Short-circuits on first error.
   *
   * @param events - The events to send in order
   * @returns Result with all accumulated effects, or TransitionError on first failure
   */
  sendBatch(
    events: readonly { readonly type: TEvent }[]
  ): Result<readonly EffectAny[], TransitionError>;

  /**
   * Performs a state transition and executes all resulting effects.
   *
   * @param event - The event to send to the machine
   * @returns ResultAsync that resolves on success, or error on failure
   */
  sendAndExecute(event: {
    readonly type: TEvent;
  }): ResultAsync<void, TransitionError | EffectExecutionError>;

  /**
   * Subscribes to state change notifications.
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
   * @returns ResultAsync that resolves on success
   */
  dispose(): ResultAsync<void, DisposeError>;

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
 */
export interface FlowServiceAny {
  snapshot(): MachineSnapshot<string, unknown>;
  state(): string;
  context(): unknown;
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
}

// =============================================================================
// FlowService Type Inference Utilities
// =============================================================================

/**
 * Extracts the state names union from a FlowService type.
 */
export type InferFlowServiceState<F> =
  F extends FlowService<infer TState, infer _E, infer _C> ? TState : never;

/**
 * Extracts the event names union from a FlowService type.
 */
export type InferFlowServiceEvent<F> =
  F extends FlowService<infer _S, infer TEvent, infer _C> ? TEvent : never;

/**
 * Extracts the context type from a FlowService type.
 */
export type InferFlowServiceContext<F> =
  F extends FlowService<infer _S, infer _E, infer TContext> ? TContext : never;

// =============================================================================
// FlowInspector and FlowRegistry DI Ports
// =============================================================================

/**
 * DI Port for resolving a FlowInspector from the container.
 *
 * When used with a graph, this allows any component to query machine state,
 * transition history, and health information via dependency injection.
 *
 * @example
 * ```typescript
 * const graph = GraphBuilder.create()
 *   .provide(FlowInspectorAdapter)
 *   .build();
 *
 * const inspector = scope.resolve(FlowInspectorPort);
 * const snapshot = inspector.getMachineState('Modal', 'Modal-1');
 * ```
 */
export const FlowInspectorPort: Port<FlowInspector, "FlowInspector"> = port<FlowInspector>()({
  name: "FlowInspector",
  description: "Read-only query API for inspecting flow machine state and history",
  category: "flow",
});

/**
 * DI Port for resolving a FlowRegistry from the container.
 *
 * When used with a graph, this allows any component to track live machine
 * instances via dependency injection.
 *
 * @example
 * ```typescript
 * const graph = GraphBuilder.create()
 *   .provide(FlowRegistryAdapter)
 *   .build();
 *
 * const registry = scope.resolve(FlowRegistryPort);
 * const machines = registry.getAllMachines();
 * ```
 */
export const FlowRegistryPort: Port<FlowRegistry, "FlowRegistry"> = port<FlowRegistry>()({
  name: "FlowRegistry",
  description: "Registry for tracking live machine instances",
  category: "flow",
});

/**
 * DI Port for resolving a FlowLibraryInspector from the container.
 *
 * When used with a graph, this provides a LibraryInspector bridge that
 * integrates flow machine inspection into the container's unified
 * Library Inspector Protocol.
 *
 * @example
 * ```typescript
 * const inspector = scope.resolve(FlowLibraryInspectorPort);
 * container.inspector.registerLibrary(inspector);
 * ```
 */
export const FlowLibraryInspectorPort = createLibraryInspectorPort({
  name: "FlowLibraryInspector",
  description: "Library inspector bridge for flow machines",
});

// =============================================================================
// FlowEventBus DI Port
// =============================================================================

/**
 * DI Port for resolving a FlowEventBus from the container.
 *
 * When used with a graph, this allows multiple FlowAdapters to share a
 * single event bus for cross-machine event routing.
 *
 * @example
 * ```typescript
 * const graph = GraphBuilder.create()
 *   .provide(FlowEventBusAdapter)
 *   .build();
 *
 * const bus = scope.resolve(FlowEventBusPort);
 * bus.subscribe(event => console.log(event.type));
 * ```
 */
export const FlowEventBusPort: Port<FlowEventBus, "FlowEventBus"> = port<FlowEventBus>()({
  name: "FlowEventBus",
  description: "Cross-machine event pub/sub bus",
  category: "flow",
});
