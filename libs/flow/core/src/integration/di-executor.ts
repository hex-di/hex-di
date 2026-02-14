/**
 * DI Effect Executor
 *
 * This module provides the DIEffectExecutor that integrates with HexDI
 * to resolve ports from the container scope and execute effects.
 *
 * @packageDocumentation
 */

import type { Port, InferService } from "@hex-di/core";
import { ok, err, ResultAsync } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { EffectExecutor } from "../runner/types.js";
import type { EffectAny } from "../effects/types.js";
import type { ActivityManager } from "../activities/manager.js";
import type { EventSink } from "../activities/types.js";
import type { TypedEventSink } from "../activities/events.js";
import type { ActivityRegistry, ActivityDepsResolver, ScopeResolver } from "./types.js";
import type { FlowEventBus } from "../event-bus/index.js";
import type { HealthEvent } from "../introspection/types.js";
import type {
  EffectExecutionError,
  InvokeError,
  SpawnError,
  StopError,
  SequenceAborted,
  ParallelErrors,
} from "../errors/index.js";
import {
  InvokeError as InvokeErrorCtor,
  SpawnError as SpawnErrorCtor,
  StopError as StopErrorCtor,
  SequenceAborted as SequenceAbortedCtor,
  ParallelErrors as ParallelErrorsCtor,
} from "../errors/index.js";

// =============================================================================
// Runtime Helpers
// =============================================================================

/**
 * Safely index into an unknown object by key.
 *
 * Performs runtime `typeof` checks to verify the value is a non-null object
 * before accessing the property, avoiding casts.
 *
 * @param obj - The value to index into
 * @param key - The property name to access
 * @returns The property value, or `undefined` if not accessible
 * @internal
 */
function indexObject(obj: unknown, key: string): unknown {
  if (typeof obj !== "object" || obj === null) {
    return undefined;
  }
  if (key in obj) {
    // Using Object.getOwnPropertyDescriptor to safely access without casting
    const descriptor = Object.getOwnPropertyDescriptor(obj, key);
    return descriptor !== undefined ? descriptor.value : undefined;
  }
  return undefined;
}

/**
 * Type guard for objects with a `type` property that is a string.
 *
 * @param value - The value to check
 * @returns `true` if the value is an object with a string `type` property
 * @internal
 */
function isTypedEvent(value: unknown): value is { readonly type: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof indexObject(value, "type") === "string"
  );
}

/**
 * Builds a typed event object from a type string and optional payload.
 *
 * Constructs a plain object with `type` property and spread payload properties,
 * validated via isTypedEvent before returning.
 *
 * @param type - The event type string
 * @param payload - Optional payload to spread into the event
 * @returns A typed event object, or undefined if validation fails
 * @internal
 */
function buildTypedEvent(type: string, payload: unknown): { readonly type: string } | undefined {
  const spreadPayload = typeof payload === "object" && payload !== null ? payload : {};

  // Build object manually to avoid Object.create(null) casts
  const eventObj: { type: string; [key: string]: unknown } = { type };

  // Copy payload properties onto the event object
  if (typeof spreadPayload === "object" && spreadPayload !== null) {
    const keys = Object.keys(spreadPayload);
    for (const key of keys) {
      if (key !== "type") {
        eventObj[key] = indexObject(spreadPayload, key);
      }
    }
  }

  if (isTypedEvent(eventObj)) {
    return eventObj;
  }
  return undefined;
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

  /**
   * Optional event bus for cross-machine event routing.
   * When provided, EmitEffect events are published to the bus in addition
   * to the local eventSink.
   */
  readonly eventBus?: FlowEventBus;

  /**
   * Optional context provider for Choose/Log effects.
   * Returns the current machine context and event.
   */
  readonly contextProvider?: () => { context: unknown; event: { readonly type: string } };

  /**
   * Optional callback for emitting health events on effect execution errors.
   */
  readonly onHealthEvent?: (event: HealthEvent) => void;

  /**
   * Optional machine ID for health event attribution.
   */
  readonly machineId?: string;
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

  /**
   * Sets the context provider for Choose/Log effects.
   */
  setContextProvider(provider: () => { context: unknown; event: { readonly type: string } }): void;

  /**
   * Sets the source-aware send function for tagging re-entrant events.
   * When set, emit effects use this to send events with "emit" or "delay" source
   * rather than going through the event sink.
   */
  setSendInternal(
    fn: (event: { readonly type: string }, source: "emit" | "delay" | "external") => unknown
  ): void;
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

/**
 * Type guard for ChooseEffect.
 * @internal
 */
interface ChooseEffectShape {
  readonly _tag: "Choose";
  readonly branches: readonly {
    readonly guard?: (context: unknown, event: { readonly type: string }) => boolean;
    readonly effects: readonly EffectAny[];
  }[];
}

/**
 * Type guard for LogEffect.
 * @internal
 */
interface LogEffectShape {
  readonly _tag: "Log";
  readonly message: string | ((context: unknown, event: { readonly type: string }) => string);
}

// =============================================================================
// Effect Shape Type Guards
// =============================================================================

/**
 * Runtime type guard for InvokeEffectShape.
 * @internal
 */
function isInvokeEffect(effect: EffectAny): effect is EffectAny & InvokeEffectShape {
  return (
    effect._tag === "Invoke" &&
    "port" in effect &&
    "method" in effect &&
    "args" in effect &&
    typeof indexObject(effect, "method") === "string"
  );
}

/**
 * Runtime type guard for SpawnEffectShape.
 * @internal
 */
function isSpawnEffect(effect: EffectAny): effect is EffectAny & SpawnEffectShape {
  return (
    effect._tag === "Spawn" &&
    "activityId" in effect &&
    typeof indexObject(effect, "activityId") === "string"
  );
}

/**
 * Runtime type guard for StopEffectShape.
 * @internal
 */
function isStopEffect(effect: EffectAny): effect is EffectAny & StopEffectShape {
  return (
    effect._tag === "Stop" &&
    "activityId" in effect &&
    typeof indexObject(effect, "activityId") === "string"
  );
}

/**
 * Runtime type guard for EmitEffectShape.
 * @internal
 */
function isEmitEffect(effect: EffectAny): effect is EffectAny & EmitEffectShape {
  return effect._tag === "Emit" && "event" in effect && isTypedEvent(indexObject(effect, "event"));
}

/**
 * Runtime type guard for DelayEffectShape.
 * @internal
 */
function isDelayEffect(effect: EffectAny): effect is EffectAny & DelayEffectShape {
  return (
    effect._tag === "Delay" &&
    "milliseconds" in effect &&
    typeof indexObject(effect, "milliseconds") === "number"
  );
}

/**
 * Runtime type guard for ParallelEffectShape.
 * @internal
 */
function isParallelEffect(effect: EffectAny): effect is EffectAny & ParallelEffectShape {
  return (
    effect._tag === "Parallel" &&
    "effects" in effect &&
    Array.isArray(indexObject(effect, "effects"))
  );
}

/**
 * Runtime type guard for SequenceEffectShape.
 * @internal
 */
function isSequenceEffect(effect: EffectAny): effect is EffectAny & SequenceEffectShape {
  return (
    effect._tag === "Sequence" &&
    "effects" in effect &&
    Array.isArray(indexObject(effect, "effects"))
  );
}

/**
 * Runtime type guard for ChooseEffectShape.
 * @internal
 */
function isChooseEffect(effect: EffectAny): effect is EffectAny & ChooseEffectShape {
  return (
    effect._tag === "Choose" &&
    "branches" in effect &&
    Array.isArray(indexObject(effect, "branches"))
  );
}

/**
 * Runtime type guard for LogEffectShape.
 * @internal
 */
function isLogEffect(effect: EffectAny): effect is EffectAny & LogEffectShape {
  return effect._tag === "Log" && "message" in effect;
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
 * - **ChooseEffect**: Evaluates guards and executes matching branch
 * - **LogEffect**: Logs a message via console.debug
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
  const {
    scope,
    activityManager,
    activityRegistry,
    activityDepsResolver,
    eventBus,
    onHealthEvent,
    machineId,
  } = config;
  let eventSink: EventSink | undefined = config.eventSink;
  let contextProvider: (() => { context: unknown; event: { readonly type: string } }) | undefined =
    config.contextProvider;

  // Source-aware send function from the runner (set via setSendInternal)
  let sendInternalFn:
    | ((event: { readonly type: string }, source: "emit" | "delay" | "external") => unknown)
    | undefined;

  // Tracks whether a delay effect just completed, so the next emit is tagged "delay"
  let afterDelaySource = false;

  // -------------------------------------------------------------------------
  // Health event tracking: consecutive failure counter + degraded/recovered
  // -------------------------------------------------------------------------

  let consecutiveFailures = 0;
  const DEGRADED_THRESHOLD = 3;

  function recordFailure(state: string): void {
    consecutiveFailures += 1;
    if (onHealthEvent !== undefined && machineId !== undefined) {
      onHealthEvent({
        type: "flow-error",
        machineId,
        state,
        timestamp: Date.now(),
      });
      if (consecutiveFailures === DEGRADED_THRESHOLD) {
        onHealthEvent({
          type: "flow-degraded",
          machineId,
          failureCount: consecutiveFailures,
          timestamp: Date.now(),
        });
      }
    }
  }

  function recordSuccess(state: string): void {
    if (consecutiveFailures > 0 && onHealthEvent !== undefined && machineId !== undefined) {
      onHealthEvent({
        type: "flow-recovered",
        machineId,
        fromState: state,
        timestamp: Date.now(),
      });
    }
    consecutiveFailures = 0;
  }

  /**
   * Executes an InvokeEffect by resolving the port and calling the method.
   */
  function executeInvoke(effect: InvokeEffectShape): ResultAsync<void, InvokeError> {
    const port = effect.port;
    const method = effect.method;
    const portName = port.__portName;

    return ResultAsync.fromPromise(
      Promise.resolve().then(() => {
        const service = scope.resolve(port);
        const methodFn = indexObject(service, method);

        if (typeof methodFn !== "function") {
          return;
        }

        // Call the method with the args - use apply with a mutable array copy
        const argsCopy = [...effect.args];
        const result: unknown = methodFn.apply(service, argsCopy);

        // If the result is a promise, await it
        if (result instanceof Promise) {
          return result.then(() => undefined);
        }
      }),
      cause => {
        recordFailure("invoke-effect");
        return InvokeErrorCtor({ portName, method, cause });
      }
    );
  }

  /**
   * Executes a SpawnEffect by looking up the activity and starting it.
   */
  function executeSpawn(effect: SpawnEffectShape): ResultAsync<void, SpawnError> {
    // If no activity registry, skip spawn
    if (activityRegistry === undefined || activityRegistry.size === 0) {
      return ResultAsync.ok(undefined);
    }

    // The activityId in SpawnEffect is the activity port name
    const portName = effect.activityId;
    const activity = activityRegistry.get(portName);

    if (activity === undefined) {
      return ResultAsync.err(
        SpawnErrorCtor({
          activityId: portName,
          cause: new Error(
            `Activity "${portName}" not found in FlowAdapter's activities array. ` +
              `Add it to the activities array in createFlowAdapter config.`
          ),
        })
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

        if (isTypedEvent(firstArg)) {
          // Pattern 1: emit(eventObject)
          eventSink.emit(firstArg);
        } else if (typeof firstArg === "string") {
          // Pattern 2: emit(type, payload?)
          const payload = args.length > 1 ? args[1] : {};
          const eventObj = buildTypedEvent(firstArg, payload);
          if (eventObj !== undefined) {
            eventSink.emit(eventObj);
          }
        }
      },
    };

    return ResultAsync.fromPromise(
      Promise.resolve().then(() => {
        // Spawn the activity using the new API
        activityManager.spawn(activity, effect.input, activityEventSink, deps);
      }),
      cause => {
        recordFailure("spawn-effect");
        return SpawnErrorCtor({ activityId: portName, cause });
      }
    );
  }

  /**
   * Executes a StopEffect by stopping the activity via ActivityManager.
   */
  function executeStop(effect: StopEffectShape): ResultAsync<void, StopError> {
    return ResultAsync.fromPromise(
      Promise.resolve().then(() => {
        activityManager.stop(effect.activityId);
      }),
      cause => {
        recordFailure("stop-effect");
        return StopErrorCtor({ activityId: effect.activityId, cause });
      }
    );
  }

  /**
   * Executes an EmitEffect by routing the event to the EventSink and
   * optionally to the cross-machine event bus.
   *
   * Uses `sendInternalFn` when available to tag the event source:
   * - "delay" if a DelayEffect just completed (afterDelaySource flag)
   * - "emit" otherwise
   */
  function executeEmit(effect: EmitEffectShape): ResultAsync<void, never> {
    if (eventSink) {
      if (sendInternalFn !== undefined) {
        const source: "emit" | "delay" = afterDelaySource ? "delay" : "emit";
        afterDelaySource = false;
        sendInternalFn(effect.event, source);
      } else {
        eventSink.emit(effect.event);
      }
    }
    if (eventBus) {
      eventBus.emit(effect.event);
    }
    return ResultAsync.ok(undefined);
  }

  /**
   * Executes a DelayEffect using setTimeout.
   * After the delay resolves, marks subsequent emit events as "delay" source.
   */
  function executeDelay(effect: DelayEffectShape): ResultAsync<void, never> {
    return ResultAsync.fromSafePromise(
      new Promise<void>(resolve => setTimeout(resolve, effect.milliseconds))
    ).map(() => {
      // After a delay completes, any emitted events should be tagged "delay"
      afterDelaySource = true;
    });
  }

  /**
   * Executes a ParallelEffect by running all effects concurrently.
   *
   * Collects all results via Promise.all (which never rejects since ResultAsync
   * captures errors), then analyzes the collected Result values.
   */
  function executeParallel(effect: ParallelEffectShape): ResultAsync<void, ParallelErrors> {
    const asyncResults = effect.effects.map(e => dispatch(e));

    return ResultAsync.fromResult(
      Promise.all(
        asyncResults.map(ra => ra.then((r: Result<void, EffectExecutionError>) => r))
      ).then((results): Result<void, ParallelErrors> => {
        const errors: unknown[] = [];
        for (const result of results) {
          if (result._tag === "Err") {
            errors.push(result.error);
          }
        }
        return errors.length > 0 ? err(ParallelErrorsCtor({ errors })) : ok(undefined);
      })
    );
  }

  /**
   * Executes a SequenceEffect by running effects in order.
   *
   * Uses an async loop with early return on error, wrapped in ResultAsync.fromResult.
   * Each step's error is wrapped in SequenceAborted with its step index.
   */
  function executeSequence(effect: SequenceEffectShape): ResultAsync<void, SequenceAborted> {
    return ResultAsync.fromResult(
      (async (): Promise<Result<void, SequenceAborted>> => {
        for (let i = 0; i < effect.effects.length; i++) {
          const eff = effect.effects[i];
          const result = await dispatch(eff);
          if (result._tag === "Err") {
            return err(SequenceAbortedCtor({ stepIndex: i, cause: result.error }));
          }
        }
        return ok(undefined);
      })()
    );
  }

  /**
   * Executes a ChooseEffect by evaluating guards in order.
   */
  function executeChoose(effect: ChooseEffectShape): ResultAsync<void, EffectExecutionError> {
    const ctx =
      contextProvider !== undefined
        ? contextProvider()
        : { context: undefined, event: { type: "" } };

    for (const branch of effect.branches) {
      if (branch.guard === undefined || branch.guard(ctx.context, ctx.event)) {
        // Execute the first matching branch's effects sequentially
        return executeSequence({ _tag: "Sequence", effects: branch.effects });
      }
    }

    // No branch matched - no-op
    return ResultAsync.ok(undefined);
  }

  /**
   * Executes a LogEffect by resolving the message.
   */
  function executeLog(effect: LogEffectShape): ResultAsync<void, never> {
    const message =
      typeof effect.message === "function"
        ? effect.message(
            contextProvider !== undefined ? contextProvider().context : undefined,
            contextProvider !== undefined ? contextProvider().event : { type: "" }
          )
        : effect.message;

    // Log via console.debug (no external logger dependency for now)
    console.debug(`[flow:log] ${message}`);
    return ResultAsync.ok(undefined);
  }

  /**
   * Internal dispatch function that maps effect types to their handlers.
   */
  function dispatch(effect: EffectAny): ResultAsync<void, EffectExecutionError> {
    switch (effect._tag) {
      case "Invoke":
        if (isInvokeEffect(effect)) {
          return executeInvoke(effect);
        }
        return ResultAsync.ok(undefined);

      case "Spawn":
        if (isSpawnEffect(effect)) {
          return executeSpawn(effect);
        }
        return ResultAsync.ok(undefined);

      case "Stop":
        if (isStopEffect(effect)) {
          return executeStop(effect);
        }
        return ResultAsync.ok(undefined);

      case "Emit":
        if (isEmitEffect(effect)) {
          return executeEmit(effect);
        }
        return ResultAsync.ok(undefined);

      case "Delay":
        if (isDelayEffect(effect)) {
          return executeDelay(effect);
        }
        return ResultAsync.ok(undefined);

      case "Parallel":
        if (isParallelEffect(effect)) {
          return executeParallel(effect);
        }
        return ResultAsync.ok(undefined);

      case "Sequence":
        if (isSequenceEffect(effect)) {
          return executeSequence(effect);
        }
        return ResultAsync.ok(undefined);

      case "None":
        // No-op
        return ResultAsync.ok(undefined);

      case "Choose":
        if (isChooseEffect(effect)) {
          return executeChoose(effect);
        }
        return ResultAsync.ok(undefined);

      case "Log":
        if (isLogEffect(effect)) {
          return executeLog(effect);
        }
        return ResultAsync.ok(undefined);

      default:
        // Unreachable: all 10 effect tags are handled above
        return ResultAsync.ok(undefined);
    }
  }

  /**
   * Main execute function that dispatches based on effect type
   * and tracks success/failure for health events.
   */
  function execute(effect: EffectAny): ResultAsync<void, EffectExecutionError> {
    return dispatch(effect).inspect(() => {
      recordSuccess(effect._tag);
    });
  }

  return {
    execute,
    setEventSink(sink: EventSink): void {
      eventSink = sink;
    },
    setContextProvider(
      provider: () => { context: unknown; event: { readonly type: string } }
    ): void {
      contextProvider = provider;
    },
    setSendInternal(
      fn: (event: { readonly type: string }, source: "emit" | "delay" | "external") => unknown
    ): void {
      sendInternalFn = fn;
    },
  };
}
