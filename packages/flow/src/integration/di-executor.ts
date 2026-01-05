/**
 * DI Effect Executor
 *
 * This module provides the DIEffectExecutor that integrates with HexDI
 * to resolve ports from the container scope and execute effects.
 *
 * @packageDocumentation
 */

import type { Port, InferService } from "@hex-di/ports";
import type { EffectExecutor } from "../runner/types.js";
import type { EffectAny } from "../effects/types.js";
import type { ActivityManager } from "../activities/manager.js";
import type { EventSink } from "../activities/types.js";
import type { TypedEventSink } from "../activities/events.js";
import type { ActivityRegistry, ActivityDepsResolver } from "./adapter.js";

// =============================================================================
// Scope Resolver Interface
// =============================================================================

/**
 * A minimal interface for resolving ports from a scope.
 *
 * This interface matches the Scope.resolve() method signature, allowing
 * the DIEffectExecutor to work with either a real Scope or a mock resolver.
 */
export interface ScopeResolver {
  /**
   * Resolves a service instance for the given port.
   *
   * @typeParam P - The specific port type being resolved
   * @param port - The port token to resolve
   * @returns The service instance for the given port
   */
  resolve<P extends Port<unknown, string>>(port: P): InferService<P>;
}

// =============================================================================
// DIEffectExecutor Configuration
// =============================================================================

/**
 * Configuration for creating a DIEffectExecutor.
 */
export interface DIEffectExecutorConfig {
  /**
   * The scope resolver for resolving ports.
   * Uses the ScopePort pattern - the executor receives the scope at creation.
   */
  readonly scope: ScopeResolver;

  /**
   * The activity manager for spawning and stopping activities.
   */
  readonly activityManager: ActivityManager;

  /**
   * Optional event sink for routing EmitEffect events back to the machine.
   * If not provided, EmitEffect is a no-op.
   */
  readonly eventSink?: EventSink;

  /**
   * Registry of activities that can be spawned, keyed by port name.
   * If not provided, SpawnEffect will be a no-op.
   */
  readonly activityRegistry?: ActivityRegistry;

  /**
   * Resolver function for getting activity dependencies.
   * If not provided, activities will receive empty deps.
   */
  readonly activityDepsResolver?: ActivityDepsResolver;
}

// =============================================================================
// DIEffectExecutor Interface
// =============================================================================

/**
 * Extended EffectExecutor interface with DI capabilities.
 *
 * The DIEffectExecutor resolves ports from the container scope and executes
 * effects with the resolved dependencies.
 */
export interface DIEffectExecutor extends EffectExecutor {
  /**
   * Sets the event sink for routing EmitEffect events.
   * This is typically called after the MachineRunner is created.
   */
  setEventSink(sink: EventSink): void;
}

// =============================================================================
// Internal Effect Type Guards
// =============================================================================

/**
 * Type guard for InvokeEffect.
 * @internal
 */
interface InvokeEffectShape {
  readonly _tag: "Invoke";
  readonly port: Port<unknown, string>;
  readonly method: string;
  readonly args: readonly unknown[];
}

/**
 * Type guard for SpawnEffect.
 * @internal
 */
interface SpawnEffectShape {
  readonly _tag: "Spawn";
  /**
   * Activity ID is the port name of the activity to spawn.
   * This matches the activity port's __portName property.
   */
  readonly activityId: string;
  readonly input: unknown;
}

/**
 * Type guard for StopEffect.
 * @internal
 */
interface StopEffectShape {
  readonly _tag: "Stop";
  readonly activityId: string;
}

/**
 * Type guard for EmitEffect.
 * @internal
 */
interface EmitEffectShape {
  readonly _tag: "Emit";
  readonly event: { readonly type: string };
}

/**
 * Type guard for DelayEffect.
 * @internal
 */
interface DelayEffectShape {
  readonly _tag: "Delay";
  readonly milliseconds: number;
}

/**
 * Type guard for ParallelEffect.
 * @internal
 */
interface ParallelEffectShape {
  readonly _tag: "Parallel";
  readonly effects: readonly EffectAny[];
}

/**
 * Type guard for SequenceEffect.
 * @internal
 */
interface SequenceEffectShape {
  readonly _tag: "Sequence";
  readonly effects: readonly EffectAny[];
}

// =============================================================================
// DIEffectExecutor Factory
// =============================================================================

/**
 * Creates a DIEffectExecutor that resolves ports from a container scope.
 *
 * The executor follows the ScopePort pattern where it receives the scope
 * at creation time. This ensures that all port resolutions use the correct
 * scope for scoped lifetime services.
 *
 * @param config - The executor configuration
 * @returns A DIEffectExecutor instance
 *
 * @remarks
 * The executor handles all effect types:
 * - **InvokeEffect**: Resolves the port from scope, calls the method with args
 * - **SpawnEffect**: Resolves activity port from scope, starts the activity
 * - **StopEffect**: Stops a running activity via ActivityManager
 * - **EmitEffect**: Routes the event back to the machine via EventSink
 * - **DelayEffect**: Promise-based delay using setTimeout
 * - **ParallelEffect**: Executes effects concurrently using Promise.all
 * - **SequenceEffect**: Executes effects sequentially in order
 * - **NoneEffect**: No-op
 *
 * @example
 * ```typescript
 * const executor = createDIEffectExecutor({
 *   scope: scopeResolver,
 *   activityManager,
 * });
 *
 * // Execute an InvokeEffect
 * await executor.execute({
 *   _tag: 'Invoke',
 *   port: UserServicePort,
 *   method: 'getUser',
 *   args: ['user-123'],
 *   __resultType: undefined,
 * });
 * ```
 */
export function createDIEffectExecutor(config: DIEffectExecutorConfig): DIEffectExecutor {
  const { scope, activityManager, activityRegistry, activityDepsResolver } = config;
  let eventSink: EventSink | undefined = config.eventSink;

  /**
   * Executes an InvokeEffect by resolving the port and calling the method.
   */
  async function executeInvoke(effect: InvokeEffectShape): Promise<void> {
    const port = effect.port;
    const service = scope.resolve(port);
    const method = effect.method;
    const args = effect.args;

    // Get the method from the service
    const serviceRecord = service as Record<string, (...methodArgs: readonly unknown[]) => unknown>;
    const methodFn = serviceRecord[method];

    if (typeof methodFn === "function") {
      // Call the method with the args - use apply with a mutable array copy
      const argsCopy = [...args];
      const result = methodFn.apply(service, argsCopy);

      // If the result is a promise, await it
      if (result instanceof Promise) {
        await result;
      }
    }
  }

  /**
   * Executes a SpawnEffect by looking up the activity and starting it.
   * Returns a resolved promise for consistency with the async interface.
   */
  function executeSpawn(effect: SpawnEffectShape): Promise<void> {
    // If no activity registry, skip spawn
    if (activityRegistry === undefined || activityRegistry.size === 0) {
      return Promise.resolve();
    }

    // The activityId in SpawnEffect is the activity port name
    const portName = effect.activityId;
    const activity = activityRegistry.get(portName);

    if (activity === undefined) {
      return Promise.reject(
        new Error(
          `Activity "${portName}" not found in FlowAdapter's activities array. ` +
            `Add it to the activities array in createFlowAdapter config.`
        )
      );
    }

    // Resolve dependencies for the activity
    const deps = activityDepsResolver !== undefined ? activityDepsResolver(activity.requires) : {};

    // Create a typed event sink that routes to the machine's event sink
    const activityEventSink: TypedEventSink<unknown> = {
      emit: (...args: readonly unknown[]): void => {
        if (eventSink === undefined) {
          return;
        }

        // Handle both emit patterns:
        // 1. emit(eventObject) - object with type property
        // 2. emit(type, payload) - string type and payload
        const firstArg = args[0];

        if (typeof firstArg === "object" && firstArg !== null && "type" in firstArg) {
          // Pattern 1: emit(eventObject)
          eventSink.emit(firstArg as { readonly type: string });
        } else if (typeof firstArg === "string") {
          // Pattern 2: emit(type, payload?)
          const type = firstArg;
          const payload = args.length > 1 ? args[1] : {};

          eventSink.emit({
            type,
            ...(typeof payload === "object" && payload !== null ? payload : {}),
          } as { readonly type: string });
        }
      },
    };

    // Spawn the activity using the new API
    activityManager.spawn(activity, effect.input, activityEventSink, deps);

    return Promise.resolve();
  }

  /**
   * Executes a StopEffect by stopping the activity via ActivityManager.
   * Returns a resolved promise for consistency with the async interface.
   */
  function executeStop(effect: StopEffectShape): Promise<void> {
    activityManager.stop(effect.activityId);
    return Promise.resolve();
  }

  /**
   * Executes an EmitEffect by routing the event to the EventSink.
   * Returns a resolved promise for consistency with the async interface.
   */
  function executeEmit(effect: EmitEffectShape): Promise<void> {
    if (eventSink) {
      eventSink.emit(effect.event);
    }
    return Promise.resolve();
  }

  /**
   * Executes a DelayEffect using setTimeout.
   */
  async function executeDelay(effect: DelayEffectShape): Promise<void> {
    await new Promise<void>(resolve => setTimeout(resolve, effect.milliseconds));
  }

  /**
   * Executes a ParallelEffect by running all effects concurrently.
   */
  async function executeParallel(effect: ParallelEffectShape): Promise<void> {
    await Promise.all(effect.effects.map(e => execute(e)));
  }

  /**
   * Executes a SequenceEffect by running effects in order.
   */
  async function executeSequence(effect: SequenceEffectShape): Promise<void> {
    for (const e of effect.effects) {
      await execute(e);
    }
  }

  /**
   * Main execute function that dispatches based on effect type.
   */
  async function execute(effect: EffectAny): Promise<void> {
    switch (effect._tag) {
      case "Invoke":
        await executeInvoke(effect as InvokeEffectShape);
        break;

      case "Spawn":
        await executeSpawn(effect as SpawnEffectShape);
        break;

      case "Stop":
        await executeStop(effect as StopEffectShape);
        break;

      case "Emit":
        await executeEmit(effect as EmitEffectShape);
        break;

      case "Delay":
        await executeDelay(effect as DelayEffectShape);
        break;

      case "Parallel":
        await executeParallel(effect as ParallelEffectShape);
        break;

      case "Sequence":
        await executeSequence(effect as SequenceEffectShape);
        break;

      case "None":
        // No-op
        break;
    }
  }

  return {
    execute,
    setEventSink(sink: EventSink): void {
      eventSink = sink;
    },
  };
}
