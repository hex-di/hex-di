/**
 * Activity System Runtime Tests
 *
 * These tests verify the activity lifecycle management including:
 * - Activity starts with correct input
 * - Activity receives AbortSignal for cancellation
 * - Activity can emit events via EventSink
 * - ActivityManager tracks running activities
 * - Stop effect cancels activity via AbortSignal
 * - Dispose cleans up all running activities
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  type Activity,
  type EventSink,
  createActivityManager,
  activityPort,
} from "../src/activities/index.js";
import { event } from "../src/machine/factories.js";

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Creates a test activity that resolves after a delay or when aborted.
 */
function createTestActivity<TInput, TOutput>(
  handler: (input: TInput, sink: EventSink, signal: AbortSignal) => Promise<TOutput>
): Activity<TInput, TOutput> {
  return { execute: handler };
}

/**
 * Creates a mock EventSink for testing.
 */
function createMockEventSink(): EventSink & {
  emittedEvents: ReadonlyArray<{ readonly type: string }>;
} {
  const emittedEvents: Array<{ readonly type: string }> = [];
  return {
    emit<E extends { readonly type: string }>(evt: E): void {
      emittedEvents.push(evt);
    },
    get emittedEvents(): ReadonlyArray<{ readonly type: string }> {
      return emittedEvents;
    },
  };
}

// =============================================================================
// Activity Lifecycle Tests
// =============================================================================

describe("Activity System", () => {
  describe("Activity.execute", () => {
    it("should receive correct input", async () => {
      const receivedInputs: Array<{ userId: string }> = [];

      const activity = createTestActivity<{ userId: string }, string>(
        async (input, _sink, _signal) => {
          receivedInputs.push(input);
          return `processed-${input.userId}`;
        }
      );

      const sink = createMockEventSink();
      const controller = new AbortController();

      const result = await activity.execute({ userId: "user-123" }, sink, controller.signal);

      expect(receivedInputs).toHaveLength(1);
      expect(receivedInputs[0]).toEqual({ userId: "user-123" });
      expect(result).toBe("processed-user-123");
    });

    it("should receive AbortSignal for cancellation", async () => {
      // Use an object container to capture the signal without type narrowing issues
      const signalContainer: { signal: AbortSignal | null } = { signal: null };

      const activity = createTestActivity<void, void>(async (_input, _sink, signal) => {
        signalContainer.signal = signal;
        // Wait for abort or timeout
        await new Promise<void>(resolve => {
          if (signal.aborted) {
            resolve();
            return;
          }
          const timeoutId = setTimeout(resolve, 100);
          signal.addEventListener("abort", () => {
            clearTimeout(timeoutId);
            resolve();
          });
        });
      });

      const sink = createMockEventSink();
      const controller = new AbortController();

      const promise = activity.execute(undefined, sink, controller.signal);

      expect(signalContainer.signal).not.toBeNull();
      expect(signalContainer.signal?.aborted).toBe(false);

      controller.abort();

      await promise;

      expect(signalContainer.signal?.aborted).toBe(true);
    });

    it("should emit events via EventSink", async () => {
      const progressEvent = event<"PROGRESS", { percent: number }>("PROGRESS");
      const completeEvent = event<"COMPLETE">("COMPLETE");

      const activity = createTestActivity<void, void>(async (_input, sink, _signal) => {
        sink.emit(progressEvent({ percent: 50 }));
        sink.emit(progressEvent({ percent: 100 }));
        sink.emit(completeEvent());
      });

      const sink = createMockEventSink();
      const controller = new AbortController();

      await activity.execute(undefined, sink, controller.signal);

      expect(sink.emittedEvents).toHaveLength(3);
      expect(sink.emittedEvents[0]).toEqual({ type: "PROGRESS", payload: { percent: 50 } });
      expect(sink.emittedEvents[1]).toEqual({ type: "PROGRESS", payload: { percent: 100 } });
      expect(sink.emittedEvents[2]).toEqual({ type: "COMPLETE" });
    });
  });

  describe("ActivityManager", () => {
    let manager: ReturnType<typeof createActivityManager>;

    beforeEach(() => {
      manager = createActivityManager();
    });

    afterEach(async () => {
      await manager.dispose();
    });

    it("should track running activities by ID", async () => {
      const activity = createTestActivity<void, void>(async (_input, _sink, signal) => {
        await new Promise<void>(resolve => {
          const timeoutId = setTimeout(resolve, 1000);
          signal.addEventListener("abort", () => {
            clearTimeout(timeoutId);
            resolve();
          });
        });
      });

      const sink = createMockEventSink();

      // Spawn activity
      manager.spawn("test-activity", activity, undefined, sink);

      // Check status
      const status = manager.getStatus("test-activity");
      expect(status).toBe("running");

      // Get all activities
      const all = manager.getAll();
      expect(all).toHaveLength(1);
      expect(all[0]?.id).toBe("test-activity");
      expect(all[0]?.status).toBe("running");
      expect(all[0]?.startTime).toBeTypeOf("number");
    });

    it("should stop activity via AbortSignal when stop is called", async () => {
      let wasAborted = false;

      const activity = createTestActivity<void, string>(async (_input, _sink, signal) => {
        await new Promise<void>(resolve => {
          const timeoutId = setTimeout(resolve, 1000);
          signal.addEventListener("abort", () => {
            wasAborted = true;
            clearTimeout(timeoutId);
            resolve();
          });
        });
        return wasAborted ? "cancelled" : "completed";
      });

      const sink = createMockEventSink();

      manager.spawn("stoppable", activity, undefined, sink);

      expect(manager.getStatus("stoppable")).toBe("running");
      expect(wasAborted).toBe(false);

      // Stop the activity
      manager.stop("stoppable");

      // Wait a tick for the abort to propagate
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(wasAborted).toBe(true);

      // Status should eventually become cancelled
      // Allow time for the promise to settle
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(manager.getStatus("stoppable")).toBe("cancelled");
    });

    it("should dispose all running activities", async () => {
      const abortedActivities: string[] = [];

      const createLongActivity = (id: string) =>
        createTestActivity<void, void>(async (_input, _sink, signal) => {
          await new Promise<void>(resolve => {
            const timeoutId = setTimeout(resolve, 5000);
            signal.addEventListener("abort", () => {
              abortedActivities.push(id);
              clearTimeout(timeoutId);
              resolve();
            });
          });
        });

      const sink = createMockEventSink();

      manager.spawn("activity-1", createLongActivity("activity-1"), undefined, sink);
      manager.spawn("activity-2", createLongActivity("activity-2"), undefined, sink);
      manager.spawn("activity-3", createLongActivity("activity-3"), undefined, sink);

      expect(manager.getAll()).toHaveLength(3);
      expect(manager.getStatus("activity-1")).toBe("running");
      expect(manager.getStatus("activity-2")).toBe("running");
      expect(manager.getStatus("activity-3")).toBe("running");

      // Dispose all
      await manager.dispose();

      expect(abortedActivities).toContain("activity-1");
      expect(abortedActivities).toContain("activity-2");
      expect(abortedActivities).toContain("activity-3");

      // All should be cancelled
      expect(manager.getStatus("activity-1")).toBe("cancelled");
      expect(manager.getStatus("activity-2")).toBe("cancelled");
      expect(manager.getStatus("activity-3")).toBe("cancelled");
    });

    it("should track activity completion status", async () => {
      const activity = createTestActivity<string, string>(async (input, _sink, _signal) => {
        return `result-${input}`;
      });

      const sink = createMockEventSink();

      manager.spawn("quick-task", activity, "test", sink);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(manager.getStatus("quick-task")).toBe("completed");

      const instance = manager.getAll().find(a => a.id === "quick-task");
      expect(instance?.status).toBe("completed");
      expect(instance?.endTime).toBeTypeOf("number");
    });

    it("should track activity failure status", async () => {
      const activity = createTestActivity<void, void>(async () => {
        throw new Error("Activity failed");
      });

      const sink = createMockEventSink();

      manager.spawn("failing-task", activity, undefined, sink);

      // Wait for failure
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(manager.getStatus("failing-task")).toBe("failed");
    });
  });

  describe("activityPort", () => {
    it("should create a port with the correct name", () => {
      // activityPort is a curried function: activityPort<TInput, TOutput>()(name)
      const p = activityPort<{ data: string }, string>()("FetchActivity");

      expect(p.__portName).toBe("FetchActivity");
    });

    it("should preserve port name literal type", () => {
      // activityPort is a curried function: activityPort<TInput, TOutput>()(name)
      const p = activityPort<void, void>()("TestActivity");

      // Type-level test: the port name should be the literal type
      const name: "TestActivity" = p.__portName;
      expect(name).toBe("TestActivity");
    });
  });
});
