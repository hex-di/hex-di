/**
 * Activity Manager
 *
 * This module provides the ActivityManager that tracks and manages the lifecycle
 * of spawned activities. It handles:
 * - Spawning activities with AbortController
 * - Tracking activity status
 * - Stopping activities via abort
 * - Disposing all running activities
 * - Timeout handling with three-layer fallback
 * - Cleanup orchestration (called exactly once)
 * - Result capture
 *
 * @packageDocumentation
 */

import type { Result } from "@hex-di/result";
import { ok, err, ResultAsync } from "@hex-di/result";
import { callErased } from "../utils/type-bridge.js";
import type {
  Activity,
  ActivityInstance,
  ActivityStatus,
  EventSink,
  ConfiguredActivity,
  CleanupReason,
  ActivityContext,
} from "./types.js";
import type { Port, PortDeps } from "@hex-di/core";
import type { TypedEventSink } from "./events.js";
import type { ActivityPort, ActivityInput } from "./types.js";
import { ActivityNotFound, DisposeError } from "../errors/index.js";

// =============================================================================
// Spawn Type Helpers
// =============================================================================

/**
 * Type constraint for activities that can be spawned.
 *
 * This type uses specific generic parameters rather than the widened
 * ConfiguredActivityAny to ensure proper type inference when calling
 * execute and cleanup methods.
 */
type SpawnableActivity<
  TPort extends ActivityPort<unknown, unknown, string>,
  TRequires extends readonly Port<string, unknown>[],
  TEvents,
> = ConfiguredActivity<TPort, TRequires, TEvents>;

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Configuration options for creating an ActivityManager.
 */
export interface ActivityManagerConfig {
  /**
   * Default timeout in milliseconds for activity execution.
   * This is used when neither the spawn options nor the activity definition
   * specifies a timeout.
   *
   * @remarks
   * The timeout fallback chain is:
   * 1. SpawnOptions.timeout (highest precedence)
   * 2. Activity.timeout (activity definition)
   * 3. ActivityManagerConfig.defaultTimeout (lowest precedence)
   */
  readonly defaultTimeout?: number;

  /**
   * Pluggable clock for deterministic timestamps (GxP F12).
   * @default Date.now
   */
  readonly clock?: { now(): number };

  /**
   * ID generator for activity instance IDs (GxP F6).
   * @default crypto.randomUUID based generator
   */
  readonly idGenerator?: () => string;
}

/**
 * Options for spawning an activity.
 */
export interface SpawnOptions {
  /**
   * Timeout in milliseconds for this specific activity spawn.
   * Overrides both the activity's timeout and the manager's default timeout.
   */
  readonly timeout?: number;
}

// =============================================================================
// Internal Activity Tracking
// =============================================================================

/**
 * Internal mutable state for tracking an activity.
 *
 * @internal
 */
interface MutableActivityState {
  id: string;
  status: ActivityStatus;
  startTime: number;
  endTime: number | undefined;
  controller: AbortController;
  promise: Promise<void>;
  /** Captured result on successful completion */
  result: unknown;
  /** Whether cleanup has been called */
  cleanupCalled: boolean;
  /** The cleanup reason (for tracking) */
  cleanupReason: CleanupReason | undefined;
  /** Timeout ID for cleanup */
  timeoutId: ReturnType<typeof setTimeout> | undefined;
}

// =============================================================================
// ActivityManager Interface
// =============================================================================

/**
 * Manager for tracking and controlling spawned activities.
 *
 * The ActivityManager provides lifecycle management for activities:
 * - Spawn activities with automatic AbortController creation
 * - Track running, completed, failed, and cancelled activities
 * - Stop individual activities by ID
 * - Dispose all activities on cleanup
 * - Handle timeouts with three-layer fallback
 * - Orchestrate cleanup callbacks
 * - Capture and retrieve activity results
 *
 * @remarks
 * Each activity is assigned an AbortController when spawned. The controller's
 * signal is passed to the activity's execute method, and calling `stop(id)`
 * triggers the controller's abort method.
 *
 * @example
 * ```typescript
 * const manager = createActivityManager({ defaultTimeout: 30000 });
 *
 * // Spawn an activity with new API
 * const id = manager.spawn(
 *   TaskActivity,
 *   { taskId: '123' },
 *   eventSink,
 *   deps,
 *   { timeout: 5000 }
 * );
 *
 * // Check status
 * if (manager.getStatus(id) === 'running') {
 *   manager.stop(id);
 * }
 *
 * // Get result after completion
 * const result = manager.getResult<TaskResult>(id);
 *
 * // Clean up
 * await manager.dispose();
 * ```
 */
export interface ActivityManager {
  /**
   * Spawns a new ConfiguredActivity with dependencies and event sink.
   *
   * The activity will be started immediately with a new AbortController.
   * The activity's status will be set to 'running' and tracked until
   * it completes, fails, or is cancelled/timed out.
   *
   * @typeParam TPort - The ActivityPort type
   * @typeParam TRequires - The tuple of required port dependencies
   * @typeParam TEvents - The events definition type
   *
   * @param activity - The configured activity to execute
   * @param input - Input data to pass to the activity
   * @param eventSink - TypedEventSink for the activity to emit events
   * @param deps - Resolved dependencies matching the activity's requires
   * @param options - Optional spawn options (timeout override)
   * @returns Unique identifier for this activity instance
   */
  spawn<
    TPort extends ActivityPort<unknown, unknown, string>,
    TRequires extends readonly Port<string, unknown>[],
    TEvents,
  >(
    activity: SpawnableActivity<TPort, TRequires, TEvents>,
    input: ActivityInput<TPort>,
    eventSink: TypedEventSink<TEvents>,
    deps: PortDeps<TRequires>,
    options?: SpawnOptions
  ): string;

  /**
   * Spawns a legacy Activity with an explicit ID.
   *
   * @deprecated Use the new spawn signature with ConfiguredActivity instead.
   *
   * This legacy signature is maintained for backward compatibility with
   * the old Activity API.
   *
   * @typeParam TInput - The input type
   * @typeParam TOutput - The output type
   *
   * @param id - Unique identifier for this activity instance
   * @param activity - Legacy activity with execute(input, sink, signal) signature
   * @param input - Input data to pass to the activity
   * @param eventSink - EventSink for the activity to emit events
   * @returns The provided activity ID
   */
  spawn<TInput, TOutput>(
    id: string,
    activity: Activity<TInput, TOutput>,
    input: TInput,
    eventSink: EventSink
  ): string;

  /**
   * Stops a running activity by ID.
   *
   * This triggers the AbortController.abort() for the activity, which
   * signals the activity to clean up and terminate. The activity's status
   * will be set to 'cancelled'.
   *
   * @param id - The identifier of the activity to stop
   *
   * @remarks
   * Calling stop on a non-existent or already-stopped activity is a no-op.
   */
  stop(id: string): void;

  /**
   * Gets the current status of an activity by ID.
   *
   * @param id - The activity identifier
   * @returns The activity status, or undefined if not found
   */
  getStatus(id: string): ActivityStatus | undefined;

  /**
   * Gets the result of a completed activity.
   *
   * @typeParam TOutput - The expected output type
   * @param id - The activity identifier
   * @returns Result with the activity output if found and completed, or ActivityNotFound
   */
  getResult<TOutput>(id: string): Result<TOutput, ActivityNotFound>;

  /**
   * Gets all tracked activity instances.
   *
   * @returns A readonly array of all activity instances (running and completed)
   */
  getAll(): readonly ActivityInstance[];

  /**
   * Disposes the manager by stopping all running activities.
   *
   * This method:
   * 1. Aborts all running activities
   * 2. Waits for all activities to complete/cancel
   * 3. Ensures cleanup is called for all activities
   *
   * @returns ResultAsync that resolves on success
   */
  dispose(): ResultAsync<void, DisposeError>;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if first argument is a string (legacy API).
 */
function isLegacySpawn(firstArg: unknown): firstArg is string {
  return typeof firstArg === "string";
}

/**
 * Type guard to check if an object is a ConfiguredActivity (has port property).
 */
function isConfiguredActivity(
  obj: unknown
): obj is SpawnableActivity<
  ActivityPort<unknown, unknown, string>,
  readonly Port<string, unknown>[],
  unknown
> {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "port" in obj &&
    "execute" in obj &&
    "requires" in obj &&
    "emits" in obj
  );
}

/**
 * Type guard to check if an object is a legacy Activity (has execute but no port).
 */
function isLegacyActivity(obj: unknown): obj is Activity<unknown, unknown> {
  return typeof obj === "object" && obj !== null && "execute" in obj && !("port" in obj);
}

/**
 * Type guard to check if an object is an EventSink (has emit method).
 */
function isEventSink(obj: unknown): obj is TypedEventSink<unknown> {
  if (typeof obj !== "object" || obj === null || !("emit" in obj)) {
    return false;
  }
  return typeof obj.emit === "function";
}

/**
 * Type guard to check if a value is a SpawnOptions object.
 */
function isSpawnOptions(obj: unknown): obj is SpawnOptions {
  if (obj === undefined) {
    return true;
  }
  return typeof obj === "object" && obj !== null;
}

// =============================================================================
// ID Generation
// =============================================================================

/**
 * Generates a unique activity instance ID using crypto.randomUUID (GxP F6).
 */
function generateDefaultActivityId(): string {
  return `activity-${globalThis.crypto.randomUUID()}`;
}

// =============================================================================
// ActivityManager Factory
// =============================================================================

/**
 * Creates a new ActivityManager instance.
 *
 * @param config - Optional configuration for the manager
 * @returns A new ActivityManager for tracking and controlling activities
 *
 * @example
 * ```typescript
 * // Without config
 * const manager = createActivityManager();
 *
 * // With default timeout
 * const managerWithTimeout = createActivityManager({ defaultTimeout: 30000 });
 *
 * // Use the manager...
 *
 * // Clean up when done
 * await manager.dispose();
 * ```
 */
export function createActivityManager(config?: ActivityManagerConfig): ActivityManager {
  const activities = new Map<string, MutableActivityState>();
  const defaultTimeout = config?.defaultTimeout;
  const clock = config?.clock ?? { now: () => Date.now() };
  const idGenerator = config?.idGenerator ?? generateDefaultActivityId;

  /**
   * Updates an activity's status and optionally sets its end time.
   */
  function updateStatus(id: string, status: ActivityStatus, endTime?: number): void {
    const state = activities.get(id);
    if (state) {
      state.status = status;
      if (endTime !== undefined) {
        state.endTime = endTime;
      }
    }
  }

  /**
   * Creates an immutable ActivityInstance snapshot from mutable state.
   */
  function toActivityInstance(state: MutableActivityState): ActivityInstance {
    return Object.freeze({
      id: state.id,
      status: state.status,
      startTime: state.startTime,
      endTime: state.endTime,
    });
  }

  /**
   * Calls cleanup on an activity exactly once.
   *
   * Uses a generic type for the cleanup function to preserve type safety
   * while allowing any compatible cleanup signature.
   */
  function callCleanup<TDeps>(
    state: MutableActivityState,
    reason: CleanupReason,
    cleanup:
      | ((reason: CleanupReason, context: { deps: TDeps }) => void | Promise<void>)
      | undefined,
    deps: TDeps
  ): ResultAsync<void, never> {
    // Ensure cleanup is only called once
    if (state.cleanupCalled) {
      return ResultAsync.ok(undefined);
    }
    state.cleanupCalled = true;
    state.cleanupReason = reason;

    // Clear timeout if set
    if (state.timeoutId !== undefined) {
      clearTimeout(state.timeoutId);
      state.timeoutId = undefined;
    }

    if (!cleanup) {
      return ResultAsync.ok(undefined);
    }

    // Wrap user-provided cleanup in ResultAsync; swallow errors
    // (cleanup errors are logged but not propagated)
    return ResultAsync.fromPromise(
      Promise.resolve(cleanup(reason, { deps })).then(() => undefined),
      () => undefined
    ).orElse(() => ok(undefined));
  }

  /**
   * Calculates the effective timeout using three-layer fallback.
   * Precedence: spawn options > activity definition > manager default
   */
  function calculateTimeout(
    spawnTimeout: number | undefined,
    activityTimeout: number | undefined
  ): number | undefined {
    if (spawnTimeout !== undefined) {
      return spawnTimeout;
    }
    if (activityTimeout !== undefined) {
      return activityTimeout;
    }
    return defaultTimeout;
  }

  /**
   * Handles the result of an activity execution promise, updating status
   * and capturing the result. Used to avoid try/catch in activity spawning.
   */
  function handleActivitySuccess<TOutput>(
    id: string,
    state: MutableActivityState,
    controller: AbortController,
    result: TOutput,
    timeoutTriggered: boolean
  ): CleanupReason {
    if (controller.signal.aborted) {
      updateStatus(id, "cancelled", clock.now());
      return timeoutTriggered ? "timeout" : "cancelled";
    }
    // Success - capture result
    state.result = result;
    updateStatus(id, "completed", clock.now());
    return "completed";
  }

  /**
   * Handles activity execution failure, updating status appropriately.
   */
  function handleActivityFailure(
    id: string,
    controller: AbortController,
    timeoutTriggered: boolean
  ): CleanupReason {
    if (controller.signal.aborted) {
      updateStatus(id, "cancelled", clock.now());
      return timeoutTriggered ? "timeout" : "cancelled";
    }
    updateStatus(id, "failed", clock.now());
    return "error";
  }

  /**
   * Spawns a legacy activity with the old API signature.
   */
  function spawnLegacy(
    id: string,
    legacyActivity: Activity<unknown, unknown>,
    input: unknown,
    eventSink: EventSink
  ): string {
    // Create AbortController for this activity
    const controller = new AbortController();
    const startTime = clock.now();

    // Initialize state
    const state: MutableActivityState = {
      id,
      status: "running",
      startTime,
      endTime: undefined,
      controller,
      promise: Promise.resolve(), // Will be replaced below
      result: undefined,
      cleanupCalled: false,
      cleanupReason: undefined,
      timeoutId: undefined,
    };

    // Create the execution promise using ResultAsync to avoid try/catch
    const promise = ResultAsync.fromPromise(
      legacyActivity.execute(input, eventSink, controller.signal),
      (error: unknown) => error
    ).match(
      result => {
        handleActivitySuccess(id, state, controller, result, false);
      },
      () => {
        handleActivityFailure(id, controller, false);
      }
    );

    // Update state with the actual promise (match returns Promise<void>)
    state.promise = promise;

    // Track the activity
    activities.set(id, state);

    return id;
  }

  /**
   * Spawns a new ConfiguredActivity with the new API signature.
   */
  function spawnConfigured<
    TPort extends ActivityPort<unknown, unknown, string>,
    TRequires extends readonly Port<string, unknown>[],
    TEvents,
  >(
    activityDef: SpawnableActivity<TPort, TRequires, TEvents>,
    input: ActivityInput<TPort>,
    eventSink: TypedEventSink<TEvents>,
    deps: PortDeps<TRequires>,
    options?: SpawnOptions
  ): string {
    // Generate unique ID (GxP F6: deterministic/cryptographic)
    const id = idGenerator();

    // Create AbortController for this activity
    const controller = new AbortController();
    const startTime = clock.now();

    // Create activity context
    const context: ActivityContext<TRequires, TEvents> = {
      deps,
      sink: eventSink,
      signal: controller.signal,
    };

    // Track timeout reason
    let timeoutTriggered = false;

    // Calculate effective timeout
    const effectiveTimeout = calculateTimeout(options?.timeout, activityDef.timeout);

    // Initialize state early so we can reference it
    const state: MutableActivityState = {
      id,
      status: "running",
      startTime,
      endTime: undefined,
      controller,
      promise: Promise.resolve(), // Will be replaced below
      result: undefined,
      cleanupCalled: false,
      cleanupReason: undefined,
      timeoutId: undefined,
    };

    // Set up timeout if configured
    if (effectiveTimeout !== undefined) {
      state.timeoutId = setTimeout(() => {
        timeoutTriggered = true;
        controller.abort();
      }, effectiveTimeout);
    }

    // Create the execution promise using ResultAsync to avoid try/catch
    const promise = ResultAsync.fromPromise(
      activityDef.execute(input, context),
      (error: unknown) => error
    )
      .match(
        result => {
          const cleanupReason = handleActivitySuccess(
            id,
            state,
            controller,
            result,
            timeoutTriggered
          );
          return callCleanup(state, cleanupReason, activityDef.cleanup, deps);
        },
        () => {
          const cleanupReason = handleActivityFailure(id, controller, timeoutTriggered);
          return callCleanup(state, cleanupReason, activityDef.cleanup, deps);
        }
      )
      .then(() => undefined);

    // Update state with the actual promise
    state.promise = promise;

    // Track the activity
    activities.set(id, state);

    return id;
  }

  return {
    // Implement both overloads with runtime detection
    spawn(
      firstArg: unknown,
      secondArg: unknown,
      thirdArg: unknown,
      fourthArg?: unknown,
      fifthArg?: unknown
    ): string {
      // Detect which API is being used
      if (isLegacySpawn(firstArg) && isLegacyActivity(secondArg) && isEventSink(fourthArg)) {
        // Legacy API: spawn(id, activity, input, sink)
        return spawnLegacy(firstArg, secondArg, thirdArg, fourthArg);
      }

      // New API: spawn(activity, input, sink, deps, options?)
      // This is the default path - isConfiguredActivity validates the shape
      // Uses callErased to bypass the never-typed deps parameter,
      // same pattern used for guard/action invocation in the interpreter
      if (isConfiguredActivity(firstArg) && isEventSink(thirdArg) && isSpawnOptions(fifthArg)) {
        const result = callErased(
          spawnConfigured,
          firstArg,
          secondArg,
          thirdArg,
          fourthArg,
          fifthArg
        );
        return typeof result === "string" ? result : "error-invalid-spawn-args";
      }

      // Unreachable for valid TypeScript callers - return error ID
      return "error-invalid-spawn-args";
    },

    stop(id: string): void {
      const state = activities.get(id);
      if (state && state.status === "running") {
        state.controller.abort();
      }
    },

    getStatus(id: string): ActivityStatus | undefined {
      const state = activities.get(id);
      return state?.status;
    },

    getResult<TOutput>(id: string): Result<TOutput, ActivityNotFound> {
      const state = activities.get(id);
      if (state && state.status === "completed") {
        // state.result is stored as unknown; recover TOutput via variance bridge.
        // @ts-expect-error - Intentional variance bridge: state.result holds TOutput at runtime
        // but TypeScript tracks it as unknown. Same pattern as create-runner.ts state/context recovery.
        const typed: TOutput = state.result;
        return ok(typed);
      }
      return err(ActivityNotFound({ activityId: id }));
    },

    getAll(): readonly ActivityInstance[] {
      const instances: ActivityInstance[] = [];
      for (const state of activities.values()) {
        instances.push(toActivityInstance(state));
      }
      return Object.freeze(instances);
    },

    dispose(): ResultAsync<void, DisposeError> {
      // Abort all running activities
      for (const state of activities.values()) {
        if (state.status === "running") {
          state.controller.abort();
        }
      }

      // Wait for all promises to settle
      const promises = Array.from(activities.values()).map(state => state.promise);
      return ResultAsync.fromPromise(
        Promise.all(promises).then(() => undefined),
        (cause: unknown) => DisposeError({ cause })
      );
    },
  };
}
