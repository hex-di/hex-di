/**
 * Machine Runner Factory
 *
 * This module provides the factory function for creating MachineRunner instances.
 * The runner manages the state machine lifecycle:
 * - State transitions via interpreter
 * - Effect execution via executor
 * - Activity management
 * - Subscriptions
 * - Disposal
 *
 * @packageDocumentation
 */

import type { MachineAny, Machine } from "../machine/types.js";
import type { ActivityInstance, ActivityStatus } from "../activities/types.js";
import type { ActivityManager } from "../activities/manager.js";
import type { EffectAny } from "../effects/types.js";
import type { MachineRunner, MachineSnapshot, EffectExecutor } from "./types.js";
import { transition } from "./interpreter.js";

// =============================================================================
// Runner Options Type
// =============================================================================

/**
 * Options for creating a MachineRunner.
 */
export interface MachineRunnerOptions {
  /**
   * The effect executor for executing effect descriptors.
   */
  readonly executor: EffectExecutor;

  /**
   * The activity manager for tracking spawned activities.
   */
  readonly activityManager: ActivityManager;

  /**
   * Optional collector for tracing transitions (DevTools integration).
   * Will be implemented in the tracing module.
   */
  readonly collector?: {
    collect(event: unknown): void;
  };
}

// =============================================================================
// Subscription Manager
// =============================================================================

/**
 * Internal subscription manager.
 * @internal
 */
interface SubscriptionManager<TState extends string, TContext> {
  add(callback: (snapshot: MachineSnapshot<TState, TContext>) => void): () => void;
  notify(snapshot: MachineSnapshot<TState, TContext>): void;
}

/**
 * Creates a subscription manager for handling state change listeners.
 * @internal
 */
function createSubscriptionManager<TState extends string, TContext>(): SubscriptionManager<
  TState,
  TContext
> {
  // Use a Set for efficient add/remove/iteration
  const subscribers = new Set<(snapshot: MachineSnapshot<TState, TContext>) => void>();

  return {
    add(callback: (snapshot: MachineSnapshot<TState, TContext>) => void): () => void {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },

    notify(snapshot: MachineSnapshot<TState, TContext>): void {
      // Create a copy of subscribers to handle unsubscribe during iteration
      const currentSubscribers = Array.from(subscribers);
      for (const callback of currentSubscribers) {
        callback(snapshot);
      }
    },
  };
}

// =============================================================================
// Machine Runner Factory
// =============================================================================

/**
 * Creates a MachineRunner instance for a given machine.
 *
 * The runner provides:
 * - Pure transitions via `send()` (returns effects without executing)
 * - Imperative transitions via `sendAndExecute()` (executes effects)
 * - Subscriptions for state change notifications
 * - Activity status tracking
 * - Disposal for cleanup
 *
 * @typeParam TStateNames - Union of state names
 * @typeParam TEventNames - Union of event type names
 * @typeParam TContext - Context type
 *
 * @param machine - The machine definition
 * @param options - Runner options (executor, activityManager, collector)
 *
 * @returns A MachineRunner instance
 *
 * @example
 * ```typescript
 * const runner = createMachineRunner(machine, {
 *   executor: diExecutor,
 *   activityManager: createActivityManager(),
 * });
 *
 * // Pure transition
 * const effects = runner.send({ type: 'FETCH' });
 *
 * // Imperative transition
 * await runner.sendAndExecute({ type: 'FETCH' });
 *
 * // Subscribe
 * const unsub = runner.subscribe((snapshot) => {
 *   console.log(snapshot.state);
 * });
 *
 * // Cleanup
 * await runner.dispose();
 * ```
 */
export function createMachineRunner<
  TStateNames extends string,
  TEventNames extends string,
  TContext,
>(
  machine: Machine<TStateNames, TEventNames, TContext>,
  options: MachineRunnerOptions
): MachineRunner<TStateNames, { readonly type: TEventNames }, TContext> {
  const { executor, activityManager, collector } = options;

  // Cast machine to MachineAny for internal use
  const machineAny = machine as MachineAny;

  // Initialize state
  let currentState: TStateNames = machine.initial;
  let currentContext: TContext = machine.context;
  let disposed = false;

  // Subscription manager
  const subscriptions = createSubscriptionManager<TStateNames, TContext>();

  /**
   * Creates an immutable snapshot of current state.
   */
  function createSnapshot(): MachineSnapshot<TStateNames, TContext> {
    const activities: readonly ActivityInstance[] = activityManager.getAll();
    return Object.freeze({
      state: currentState,
      context: currentContext,
      activities,
    });
  }

  /**
   * Notifies all subscribers of state change.
   */
  function notifySubscribers(): void {
    const snapshot = createSnapshot();
    subscriptions.notify(snapshot);
  }

  /**
   * Records a transition event if collector is provided.
   */
  function recordTransition(
    prevState: TStateNames,
    event: { readonly type: TEventNames },
    nextState: TStateNames,
    effects: readonly EffectAny[]
  ): void {
    if (collector) {
      collector.collect({
        machineId: machine.id,
        prevState,
        event,
        nextState,
        effects,
        timestamp: Date.now(),
      });
    }
  }

  // ==========================================================================
  // MachineRunner Implementation
  // ==========================================================================

  const runner: MachineRunner<TStateNames, { readonly type: TEventNames }, TContext> = {
    snapshot(): MachineSnapshot<TStateNames, TContext> {
      return createSnapshot();
    },

    state(): TStateNames {
      return currentState;
    },

    context(): TContext {
      return currentContext;
    },

    send(event: { readonly type: TEventNames }): readonly EffectAny[] {
      if (disposed) {
        // Return empty effects for disposed runner
        return [];
      }

      const prevState = currentState;

      // Use interpreter for pure transition
      const result = transition(currentState, currentContext, event, machineAny);

      if (!result.transitioned) {
        // No valid transition - return empty effects
        return [];
      }

      // Update state and context
      if (result.newState !== undefined) {
        currentState = result.newState;
      }
      if (result.newContext !== undefined) {
        currentContext = result.newContext;
      }

      // Record transition for tracing
      recordTransition(prevState, event, currentState, result.effects);

      // Notify subscribers
      notifySubscribers();

      return result.effects;
    },

    async sendAndExecute(event: { readonly type: TEventNames }): Promise<void> {
      const effects = this.send(event);

      // Execute all effects
      for (const effect of effects) {
        await executor.execute(effect);
      }
    },

    subscribe(callback: (snapshot: MachineSnapshot<TStateNames, TContext>) => void): () => void {
      return subscriptions.add(callback);
    },

    getActivityStatus(id: string): ActivityStatus | undefined {
      return activityManager.getStatus(id);
    },

    async dispose(): Promise<void> {
      if (disposed) {
        // Already disposed - no-op
        return;
      }

      disposed = true;

      // Dispose activity manager to stop all running activities
      await activityManager.dispose();
    },

    get isDisposed(): boolean {
      return disposed;
    },
  };

  return runner;
}
