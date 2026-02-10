/**
 * Tracing Runner Factory
 *
 * This module provides a factory for creating MachineRunner instances with
 * transition tracing support. The tracing runner wraps a standard runner
 * and records transitions via a FlowCollector.
 *
 * @packageDocumentation
 */

import { ResultAsync } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { Machine } from "../machine/types.js";
import type {
  MachineRunner,
  MachineSnapshot,
  EffectExecutor,
  TransitionHistoryEntry,
  EffectExecutionEntry,
} from "../runner/types.js";
import type { ActivityManager } from "../activities/manager.js";
import type { ActivityStatus } from "../activities/types.js";
import type { EffectAny } from "../effects/types.js";
import type { TransitionError, EffectExecutionError, DisposeError } from "../errors/index.js";
import type { FlowCollector } from "./collector.js";
import type { FlowTransitionEventAny } from "./types.js";
import { createMachineRunner } from "../runner/create-runner.js";
import { noopFlowCollector } from "./noop-collector.js";

// =============================================================================
// Internal Collector Event Type
// =============================================================================

/**
 * The shape of events passed from the inner runner's collector callback.
 * This matches the object shape emitted by `createMachineRunner`'s `recordTransition`.
 * @internal
 */
interface InternalCollectorEvent {
  readonly machineId: string;
  readonly prevState: string;
  readonly event: { readonly type: string };
  readonly nextState: string;
  readonly effects: readonly EffectAny[];
  readonly timestamp: number;
}

// =============================================================================
// ID Generator
// =============================================================================

/**
 * Simple counter-based ID generator for transition events.
 * @internal
 */
let transitionIdCounter = 0;

/**
 * Generates a unique transition ID.
 * @internal
 */
function generateTransitionId(): string {
  transitionIdCounter += 1;
  return `transition-${transitionIdCounter}`;
}

/**
 * Resets the transition ID counter (for testing only).
 * @internal
 */
export function __resetTransitionIdCounter(): void {
  transitionIdCounter = 0;
}

// =============================================================================
// Tracing Runner Options
// =============================================================================

/**
 * Options for creating a tracing MachineRunner.
 */
export interface TracingRunnerOptions {
  /**
   * The effect executor for executing effect descriptors.
   */
  readonly executor: EffectExecutor;

  /**
   * The activity manager for tracking spawned activities.
   */
  readonly activityManager: ActivityManager;

  /**
   * The flow collector for recording transitions.
   * If not provided, uses noopFlowCollector (zero overhead).
   */
  readonly collector?: FlowCollector;
}

// =============================================================================
// Tracing Runner Factory
// =============================================================================

/**
 * Creates a MachineRunner with transition tracing support.
 *
 * The tracing runner wraps a standard runner and records all state transitions
 * via the provided FlowCollector. If no collector is provided, uses the
 * noopFlowCollector for zero overhead in production.
 *
 * @typeParam TStateNames - Union of state names
 * @typeParam TEventNames - Union of event type names
 * @typeParam TContext - Context type
 *
 * @param machine - The machine definition
 * @param options - Runner options (executor, activityManager, collector)
 *
 * @returns A MachineRunner instance with tracing support
 *
 * @example
 * ```typescript
 * // Development with tracing
 * const collector = new FlowMemoryCollector();
 * const runner = createTracingRunner(machine, {
 *   executor,
 *   activityManager,
 *   collector,
 * });
 *
 * // Production without tracing overhead
 * const runner = createTracingRunner(machine, {
 *   executor,
 *   activityManager,
 *   // No collector - uses noopFlowCollector
 * });
 * ```
 */
export function createTracingRunner<
  TStateNames extends string,
  TEventNames extends string,
  TContext,
>(
  machine: Machine<TStateNames, TEventNames, TContext>,
  options: TracingRunnerOptions
): MachineRunner<TStateNames, { readonly type: TEventNames }, TContext> {
  const { executor, activityManager, collector = noopFlowCollector } = options;

  // Create the underlying runner with the collector for recording
  const innerRunner = createMachineRunner(machine, {
    executor,
    activityManager,
    collector: {
      collect(event: InternalCollectorEvent): void {
        const flowEvent: FlowTransitionEventAny = {
          id: generateTransitionId(),
          machineId: event.machineId,
          prevState: event.prevState,
          event: event.event,
          nextState: event.nextState,
          effects: event.effects,
          timestamp: event.timestamp,
          duration: 0, // Calculated separately if needed
          isPinned: false,
        };

        collector.collect(flowEvent);
      },
    },
  });

  // Return the inner runner - it already handles recording via Result types
  return innerRunner;
}

/**
 * Creates a MachineRunner with duration tracking and tracing support.
 *
 * This variant measures the duration of each transition and includes it
 * in the transition event. Use this when you need accurate duration metrics.
 *
 * @typeParam TStateNames - Union of state names
 * @typeParam TEventNames - Union of event type names
 * @typeParam TContext - Context type
 *
 * @param machine - The machine definition
 * @param options - Runner options (executor, activityManager, collector)
 *
 * @returns A MachineRunner instance with duration tracking
 *
 * @example
 * ```typescript
 * const collector = new FlowMemoryCollector({ slowThresholdMs: 50 });
 * const runner = createTracingRunnerWithDuration(machine, {
 *   executor,
 *   activityManager,
 *   collector,
 * });
 *
 * // Transitions with duration >= 50ms will be auto-pinned
 * await runner.sendAndExecute({ type: 'SLOW_OPERATION' });
 * ```
 */
export function createTracingRunnerWithDuration<
  TStateNames extends string,
  TEventNames extends string,
  TContext,
>(
  machine: Machine<TStateNames, TEventNames, TContext>,
  options: TracingRunnerOptions
): MachineRunner<TStateNames, { readonly type: TEventNames }, TContext> {
  const { executor, activityManager, collector = noopFlowCollector } = options;

  // Create the underlying runner without collector (we'll handle recording manually)
  const innerRunner = createMachineRunner(machine, {
    executor,
    activityManager,
  });

  // Create a wrapper that measures duration
  const tracingRunner: MachineRunner<TStateNames, { readonly type: TEventNames }, TContext> = {
    snapshot(): MachineSnapshot<TStateNames, TContext> {
      return innerRunner.snapshot();
    },

    state(): TStateNames {
      return innerRunner.state();
    },

    context(): TContext {
      return innerRunner.context();
    },

    stateValue() {
      return innerRunner.stateValue();
    },

    send(event: { readonly type: TEventNames }): Result<readonly EffectAny[], TransitionError> {
      const prevState = innerRunner.state();
      const startTime = performance.now();

      const result = innerRunner.send(event);

      const duration = performance.now() - startTime;
      const nextState = innerRunner.state();

      // Only record if transition succeeded and state actually changed or effects were produced
      if (result._tag === "Ok") {
        const effects = result.value;
        if (prevState !== nextState || effects.length > 0) {
          const flowEvent: FlowTransitionEventAny = {
            id: generateTransitionId(),
            machineId: machine.id,
            prevState,
            event,
            nextState,
            effects,
            timestamp: Date.now(),
            duration,
            isPinned: false,
          };

          collector.collect(flowEvent);
        }
      }

      return result;
    },

    sendAndExecute(event: {
      readonly type: TEventNames;
    }): ResultAsync<void, TransitionError | EffectExecutionError> {
      const prevState = innerRunner.state();
      const startTime = performance.now();

      return innerRunner.sendAndExecute(event).map(() => {
        const duration = performance.now() - startTime;
        const nextState = innerRunner.state();

        // Record the transition with effects execution time included
        if (prevState !== nextState) {
          const flowEvent: FlowTransitionEventAny = {
            id: generateTransitionId(),
            machineId: machine.id,
            prevState,
            event,
            nextState,
            effects: [], // Effects already executed
            timestamp: Date.now(),
            duration,
            isPinned: false,
          };

          collector.collect(flowEvent);
        }
      });
    },

    sendBatch(
      events: readonly { readonly type: TEventNames }[]
    ): Result<readonly EffectAny[], TransitionError> {
      return innerRunner.sendBatch(events);
    },

    subscribe(callback: (snapshot: MachineSnapshot<TStateNames, TContext>) => void): () => void {
      return innerRunner.subscribe(callback);
    },

    getActivityStatus(id: string): ActivityStatus | undefined {
      return innerRunner.getActivityStatus(id);
    },

    dispose(): ResultAsync<void, DisposeError> {
      return innerRunner.dispose();
    },

    get isDisposed(): boolean {
      return innerRunner.isDisposed;
    },

    getTransitionHistory(): readonly TransitionHistoryEntry[] {
      return innerRunner.getTransitionHistory();
    },

    getEffectHistory(): readonly EffectExecutionEntry[] {
      return innerRunner.getEffectHistory();
    },
  };

  return tracingRunner;
}
