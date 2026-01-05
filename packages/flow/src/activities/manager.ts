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

import type {
  Activity,
  ActivityInstance,
  ActivityStatus,
  EventSink,
  ConfiguredActivity,
  CleanupReason,
  ResolvedActivityDeps,
  ActivityContext,
} from "./types.js";
import type { Port } from "@hex-di/ports";
import type { TypedEventSink } from "./events.js";
import type { ActivityPort, ActivityInput } from "./port.js";

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
  TRequires extends readonly Port<unknown, string>[],
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
    TRequires extends readonly Port<unknown, string>[],
    TEvents,
  >(
    activity: SpawnableActivity<TPort, TRequires, TEvents>,
    input: ActivityInput<TPort>,
    eventSink: TypedEventSink<TEvents>,
    deps: ResolvedActivityDeps<TRequires>,
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
   * @returns The activity output if completed successfully, undefined otherwise
   */
  getResult<TOutput>(id: string): TOutput | undefined;

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
   * @returns A promise that resolves when all activities are stopped
   */
  dispose(): Promise<void>;
}

// =============================================================================
// ID Generation
// =============================================================================

/**
 * Generates a unique activity instance ID.
 *
 * Uses a combination of timestamp and random string for uniqueness.
 */
function generateActivityId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `activity-${timestamp}-${random}`;
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
  async function callCleanup<TDeps>(
    state: MutableActivityState,
    reason: CleanupReason,
    cleanup:
      | ((reason: CleanupReason, context: { deps: TDeps }) => void | Promise<void>)
      | undefined,
    deps: TDeps
  ): Promise<void> {
    // Ensure cleanup is only called once
    if (state.cleanupCalled) {
      return;
    }
    state.cleanupCalled = true;
    state.cleanupReason = reason;

    // Clear timeout if set
    if (state.timeoutId !== undefined) {
      clearTimeout(state.timeoutId);
      state.timeoutId = undefined;
    }

    if (cleanup) {
      try {
        await cleanup(reason, { deps });
      } catch {
        // Log but don't propagate cleanup errors
        // In a real implementation, this would use a logger
      }
    }
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
   * Spawns a legacy activity with the old API signature.
   */
  function spawnLegacy<TInput, TOutput>(
    id: string,
    legacyActivity: Activity<TInput, TOutput>,
    input: TInput,
    eventSink: EventSink
  ): string {
    // Create AbortController for this activity
    const controller = new AbortController();
    const startTime = Date.now();

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

    // Create the execution promise
    const promise = (async () => {
      try {
        // Execute using legacy signature (input, sink, signal)
        const result = await legacyActivity.execute(input, eventSink, controller.signal);

        // Check if we were aborted
        if (controller.signal.aborted) {
          updateStatus(id, "cancelled", Date.now());
        } else {
          // Success - capture result
          state.result = result;
          updateStatus(id, "completed", Date.now());
        }
      } catch {
        // Check if the error is due to abort
        if (controller.signal.aborted) {
          updateStatus(id, "cancelled", Date.now());
        } else {
          updateStatus(id, "failed", Date.now());
        }
      }
    })();

    // Update state with the actual promise
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
    TRequires extends readonly Port<unknown, string>[],
    TEvents,
  >(
    activityDef: SpawnableActivity<TPort, TRequires, TEvents>,
    input: ActivityInput<TPort>,
    eventSink: TypedEventSink<TEvents>,
    deps: ResolvedActivityDeps<TRequires>,
    options?: SpawnOptions
  ): string {
    // Generate unique ID
    const id = generateActivityId();

    // Create AbortController for this activity
    const controller = new AbortController();
    const startTime = Date.now();

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

    // Create the execution promise
    const promise = (async () => {
      let cleanupReason: CleanupReason = "completed";

      try {
        // Execute the activity
        const result = await activityDef.execute(input, context);

        // Check if we were aborted (including timeout)
        if (controller.signal.aborted) {
          cleanupReason = timeoutTriggered ? "timeout" : "cancelled";
          updateStatus(id, "cancelled", Date.now());
        } else {
          // Success - capture result
          state.result = result;
          updateStatus(id, "completed", Date.now());
        }
      } catch {
        // Check if the error is due to abort
        if (controller.signal.aborted) {
          cleanupReason = timeoutTriggered ? "timeout" : "cancelled";
          updateStatus(id, "cancelled", Date.now());
        } else {
          cleanupReason = "error";
          updateStatus(id, "failed", Date.now());
        }
      }

      // Call cleanup (exactly once)
      await callCleanup(state, cleanupReason, activityDef.cleanup, deps);
    })();

    // Update state with the actual promise
    state.promise = promise;

    // Track the activity
    activities.set(id, state);

    return id;
  }

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
    readonly Port<unknown, string>[],
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
      if (isLegacySpawn(firstArg)) {
        // Legacy API: spawn(id, activity, input, sink)
        return spawnLegacy(
          firstArg,
          secondArg as Activity<unknown, unknown>,
          thirdArg,
          fourthArg as EventSink
        );
      }

      // New API: spawn(activity, input, sink, deps, options?)
      if (isConfiguredActivity(firstArg)) {
        return spawnConfigured(
          firstArg,
          secondArg,
          thirdArg as TypedEventSink<unknown>,
          fourthArg as ResolvedActivityDeps<readonly Port<unknown, string>[]>,
          fifthArg as SpawnOptions | undefined
        );
      }

      throw new Error(
        "Invalid spawn arguments: expected either (id, activity, input, sink) or (activity, input, sink, deps, options?)"
      );
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

    getResult<TOutput>(id: string): TOutput | undefined {
      const state = activities.get(id);
      if (state && state.status === "completed") {
        return state.result as TOutput;
      }
      return undefined;
    },

    getAll(): readonly ActivityInstance[] {
      const instances: ActivityInstance[] = [];
      for (const state of activities.values()) {
        instances.push(toActivityInstance(state));
      }
      return Object.freeze(instances);
    },

    async dispose(): Promise<void> {
      // Abort all running activities
      for (const state of activities.values()) {
        if (state.status === "running") {
          state.controller.abort();
        }
      }

      // Wait for all promises to settle
      const promises = Array.from(activities.values()).map(state => state.promise);
      await Promise.all(promises);
    },
  };
}
