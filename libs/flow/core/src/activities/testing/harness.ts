/**
 * Activity Test Harness
 *
 * Provides a high-level harness for testing activities with automatic
 * setup of test utilities and comprehensive result tracking.
 *
 * @packageDocumentation
 */

import type { Port } from "@hex-di/core";
import type { EventOf } from "../events.js";
import type { ActivityPort, ActivityOutput, ActivityInput } from "../port.js";
import type { PortDeps } from "@hex-di/core";
import type { CleanupReason, ConfiguredActivity } from "../types.js";
import { createTestEventSink } from "./event-sink.js";
import { createTestSignal } from "./signal.js";
import { createTestDeps } from "./deps.js";

// =============================================================================
// Result Types
// =============================================================================

/**
 * The result of running an activity through the test harness.
 *
 * Contains comprehensive information about the activity execution
 * including result/error, captured events, status, and cleanup tracking.
 *
 * @typeParam TOutput - The activity's output type
 * @typeParam TEvents - The activity's events definition
 */
export interface TestActivityResult<TOutput, TEvents> {
  /**
   * The activity's return value if execution succeeded.
   * Undefined if the activity threw an error or was aborted.
   */
  readonly result: TOutput | undefined;

  /**
   * The error thrown by the activity if execution failed.
   * Undefined if the activity succeeded.
   */
  readonly error: Error | undefined;

  /**
   * All events emitted during activity execution.
   * Captured in order of emission.
   */
  readonly events: readonly EventOf<TEvents>[];

  /**
   * The final status of the activity.
   *
   * - `completed`: Activity returned successfully
   * - `failed`: Activity threw an error
   * - `cancelled`: Activity was aborted (via signal or abortAfter)
   * - `timeout`: Activity exceeded the configured timeout
   */
  readonly status: "completed" | "failed" | "cancelled" | "timeout";

  /**
   * Whether the cleanup function was called.
   * Always false if the activity has no cleanup function.
   */
  readonly cleanupCalled: boolean;

  /**
   * The reason passed to cleanup, if cleanup was called.
   * Undefined if cleanup was not called or activity has no cleanup.
   */
  readonly cleanupReason: CleanupReason | undefined;
}

// =============================================================================
// Options Types
// =============================================================================

/**
 * Options for the testActivity harness.
 *
 * @typeParam TInput - The activity's input type
 * @typeParam TRequires - The activity's requires tuple type
 */
export interface TestActivityOptions<TInput, TRequires extends readonly Port<unknown, string>[]> {
  /**
   * The input to pass to the activity's execute function.
   */
  readonly input: TInput;

  /**
   * Mock dependencies keyed by port name.
   * All ports in the activity's requires must have mocks provided.
   */
  readonly deps: Partial<PortDeps<TRequires>>;

  /**
   * Optional timeout in milliseconds.
   * If the activity doesn't complete within this time, it will be aborted
   * with a 'timeout' status.
   */
  readonly timeout?: number;

  /**
   * Optional abort delay in milliseconds.
   * If provided, the activity will be aborted after this delay,
   * simulating a cancellation scenario.
   */
  readonly abortAfter?: number;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Determines the abort reason type from the signal's reason.
 */
function getAbortStatus(reason: unknown): "cancelled" | "timeout" {
  if (typeof reason === "string" && reason.startsWith("Timeout after")) {
    return "timeout";
  }
  return "cancelled";
}

/**
 * Tests an activity with comprehensive tracking of results, events, and cleanup.
 *
 * This high-level harness sets up all necessary test utilities (event sink,
 * signal, deps) and executes the activity while tracking:
 * - The return value or error
 * - All emitted events
 * - Final status (completed/failed/cancelled/timeout)
 * - Whether cleanup was called and with what reason
 *
 * @typeParam TPort - The activity port type
 * @typeParam TRequires - The tuple of required port dependencies
 * @typeParam TEvents - The events definition type
 *
 * @param activity - The activity to test
 * @param options - Test options including input, deps, timeout, and abortAfter
 *
 * @returns A promise resolving to TestActivityResult with all tracking data
 *
 * @throws MissingMockError - If required dependencies are not provided
 *
 * @remarks
 * - The harness automatically calls cleanup after execution
 * - Cleanup is called even if the activity throws an error
 * - The timeout option uses the test signal's timeout method
 * - The abortAfter option schedules an abort for cancellation testing
 * - Both timeout and abortAfter can be combined (first to trigger wins)
 *
 * @example Basic success test
 * ```typescript
 * const { result, status, events } = await testActivity(TaskActivity, {
 *   input: { taskId: '123' },
 *   deps: {
 *     Api: mockApi,
 *     Logger: mockLogger,
 *   },
 * });
 *
 * expect(status).toBe('completed');
 * expect(result).toMatchObject({ data: expect.any(String) });
 * expect(events).toContainEqual({ type: 'PROGRESS', percent: 100 });
 * ```
 *
 * @example Testing error handling
 * ```typescript
 * const mockApi = {
 *   fetch: vi.fn().mockRejectedValue(new Error('Network error')),
 * };
 *
 * const { error, status, cleanupCalled, cleanupReason } = await testActivity(TaskActivity, {
 *   input: { taskId: '123' },
 *   deps: { Api: mockApi, Logger: mockLogger },
 * });
 *
 * expect(status).toBe('failed');
 * expect(error?.message).toBe('Network error');
 * expect(cleanupCalled).toBe(true);
 * expect(cleanupReason).toBe('error');
 * ```
 *
 * @example Testing cancellation
 * ```typescript
 * const { status, cleanupCalled, cleanupReason } = await testActivity(TaskActivity, {
 *   input: { taskId: '123' },
 *   deps: { Api: mockApi, Logger: mockLogger },
 *   abortAfter: 100, // Cancel after 100ms
 * });
 *
 * expect(status).toBe('cancelled');
 * expect(cleanupCalled).toBe(true);
 * expect(cleanupReason).toBe('cancelled');
 * ```
 *
 * @example Testing timeout
 * ```typescript
 * const mockApi = {
 *   fetch: vi.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
 * };
 *
 * const { status, cleanupReason } = await testActivity(TaskActivity, {
 *   input: { taskId: '123' },
 *   deps: { Api: mockApi, Logger: mockLogger },
 *   timeout: 50, // Timeout after 50ms
 * });
 *
 * expect(status).toBe('timeout');
 * expect(cleanupReason).toBe('timeout');
 * ```
 */
export async function testActivity<
  TPort extends ActivityPort<unknown, unknown, string>,
  TRequires extends readonly Port<unknown, string>[],
  TEvents,
>(
  activity: ConfiguredActivity<TPort, TRequires, TEvents>,
  options: TestActivityOptions<ActivityInput<TPort>, TRequires>
): Promise<TestActivityResult<ActivityOutput<TPort>, TEvents>> {
  // Set up test utilities
  const sink = createTestEventSink<TEvents>();
  const signal = createTestSignal();
  const deps = createTestDeps(activity.requires, options.deps);

  // Track cleanup
  let cleanupCalled = false;
  let cleanupReason: CleanupReason | undefined;

  // Set up timeout if specified
  if (options.timeout !== undefined) {
    signal.timeout(options.timeout);
  }

  // Set up abort delay if specified
  if (options.abortAfter !== undefined) {
    setTimeout(() => {
      if (!signal.aborted) {
        signal.abort("Test abort after delay");
      }
    }, options.abortAfter);
  }

  // Execute the activity
  let result: ActivityOutput<TPort> | undefined;
  let error: Error | undefined;
  let status: "completed" | "failed" | "cancelled" | "timeout";

  try {
    // Create the context with proper typing
    const context = { deps, sink, signal };

    // Execute the activity
    result = await activity.execute(options.input, context);

    // Check if aborted during execution
    if (signal.aborted) {
      status = getAbortStatus(signal.reason);
      cleanupReason = status;
    } else {
      status = "completed";
      cleanupReason = "completed";
    }
  } catch (err) {
    // Determine if this was an abort or an error
    if (signal.aborted) {
      status = getAbortStatus(signal.reason);
      cleanupReason = status;
      // Wrap abort errors
      error =
        err instanceof Error ? err : new Error(typeof err === "string" ? err : "Activity aborted");
    } else {
      status = "failed";
      cleanupReason = "error";
      error = err instanceof Error ? err : new Error(typeof err === "string" ? err : String(err));
    }
  }

  // Call cleanup if the activity has one
  if (activity.cleanup !== undefined && cleanupReason !== undefined) {
    try {
      await activity.cleanup(cleanupReason, { deps });
      cleanupCalled = true;
    } catch {
      // Cleanup errors are logged but don't affect the result
      // In a real implementation, you might want to track this
      cleanupCalled = true;
    }
  }

  return {
    result,
    error,
    events: sink.events,
    status,
    cleanupCalled,
    cleanupReason,
  };
}

// =============================================================================
// Re-exports for convenience
// =============================================================================

export { createTestEventSink, type TestEventSink } from "./event-sink.js";
export { createTestSignal, type TestSignal } from "./signal.js";
export { createTestDeps, MissingMockError, type MocksFor } from "./deps.js";
