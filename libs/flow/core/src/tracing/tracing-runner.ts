/**
 * Tracing Runner Factory
 *
 * This module provides a factory for creating MachineRunner instances with
 * transition tracing support. The tracing runner wraps a standard runner
 * and records transitions via a FlowCollector.
 *
 * @packageDocumentation
 */

import type { Machine } from "../machine/types.js";
import type { MachineRunner, MachineSnapshot, EffectExecutor } from "../runner/types.js";
import type { ActivityManager } from "../activities/manager.js";
import type { ActivityStatus } from "../activities/types.js";
import type { EffectAny } from "../effects/types.js";
import type { FlowCollector } from "./collector.js";
import type { FlowTransitionEventAny } from "./types.js";
import { createMachineRunner } from "../runner/create-runner.js";
import { noopFlowCollector } from "./noop-collector.js";

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
      collect(event: unknown): void {
        // Transform the internal event format to FlowTransitionEventAny
        const transitionEvent = event as {
          machineId: string;
          prevState: TStateNames;
          event: { readonly type: TEventNames };
          nextState: TStateNames;
          effects: readonly EffectAny[];
          timestamp: number;
        };

        const flowEvent: FlowTransitionEventAny = {
          id: generateTransitionId(),
          machineId: transitionEvent.machineId,
          prevState: transitionEvent.prevState,
          event: transitionEvent.event,
          nextState: transitionEvent.nextState,
          effects: transitionEvent.effects,
          timestamp: transitionEvent.timestamp,
          duration: 0, // Calculated separately if needed
          isPinned: false,
        };

        collector.collect(flowEvent);
      },
    },
  });

  // Return the inner runner - it already handles recording
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

  // Track current state for recording
  let disposed = false;

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

    send(event: { readonly type: TEventNames }): readonly EffectAny[] {
      if (disposed) {
        return [];
      }

      const prevState = innerRunner.state();
      const startTime = performance.now();

      const effects = innerRunner.send(event);

      const duration = performance.now() - startTime;
      const nextState = innerRunner.state();

      // Only record if state actually changed or effects were produced
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

      return effects;
    },

    async sendAndExecute(event: { readonly type: TEventNames }): Promise<void> {
      if (disposed) {
        return;
      }

      const prevState = innerRunner.state();
      const startTime = performance.now();

      await innerRunner.sendAndExecute(event);

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
    },

    subscribe(callback: (snapshot: MachineSnapshot<TStateNames, TContext>) => void): () => void {
      return innerRunner.subscribe(callback);
    },

    getActivityStatus(id: string): ActivityStatus | undefined {
      return innerRunner.getActivityStatus(id);
    },

    async dispose(): Promise<void> {
      if (disposed) {
        return;
      }

      disposed = true;
      await innerRunner.dispose();
    },

    get isDisposed(): boolean {
      return disposed;
    },
  };

  return tracingRunner;
}
