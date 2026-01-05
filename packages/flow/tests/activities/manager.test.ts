/**
 * ActivityManager Tests for New Activity Type
 *
 * These tests verify:
 * 1. Spawn with new Activity type (ConfiguredActivity) with deps and eventSink
 * 2. Cleanup called on successful completion with 'completed' reason
 * 3. Cleanup called on abort with 'cancelled' reason
 * 4. Timeout triggers signal abort and cleanup with 'timeout' reason
 * 5. Cleanup called on error with 'error' reason
 * 6. Layered timeout precedence (spawn > activity > manager default)
 * 7. getResult returns activity output after completion
 * 8. Dispose calls cleanup for all running activities
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { port } from "@hex-di/ports";
import { activityPort } from "../../src/activities/port.js";
import { defineEvents } from "../../src/activities/events.js";
import { activity } from "../../src/activities/factory.js";
import { createActivityManager } from "../../src/activities/manager.js";
import type { ActivityManager, SpawnOptions } from "../../src/activities/manager.js";
import type { CleanupReason } from "../../src/activities/types.js";
import type { TypedEventSink } from "../../src/activities/events.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface TaskResult {
  data: string;
  status: "success" | "partial";
}

interface ApiService {
  fetch(id: string): Promise<TaskResult>;
  cancelPendingRequests(): Promise<void>;
}

interface Logger {
  info(message: string): void;
  warn(message: string, meta?: Record<string, unknown>): void;
}

const ApiPort = port<ApiService>()("Api");
const LoggerPort = port<Logger>()("Logger");

const TaskActivityPort = activityPort<{ taskId: string }, TaskResult>()("TaskActivity");
const DelayedActivityPort = activityPort<{ delayMs: number }, string>()("DelayedActivity");
const SimpleActivityPort = activityPort<number, string>()("SimpleActivity");

const TaskEvents = defineEvents({
  PROGRESS: (percent: number) => ({ percent }),
  COMPLETED: (result: TaskResult) => ({ result }),
});

const EmptyEvents = defineEvents({
  DONE: () => ({}),
});

/**
 * Interface for test event sink that captures emitted events.
 */
interface MockEventSink<TEvents> extends TypedEventSink<TEvents> {
  readonly emittedEvents: ReadonlyArray<unknown>;
}

/**
 * Creates a mock event sink that captures emitted events.
 *
 * The emit function accepts either:
 * 1. An event object with a type property
 * 2. A type string followed by a payload object
 *
 * @remarks Test files are allowed to use `any` for mocking flexibility per CLAUDE.md
 */
function createMockEventSink<TEvents>(): MockEventSink<TEvents> {
  const emittedEvents: unknown[] = [];

  // The emit function needs to handle both patterns:
  // - emit(eventObject)
  // - emit('TYPE', payload)
  // Using any for test flexibility as per CLAUDE.md
  const emit: any = (...args: [unknown] | [string, unknown?]) => {
    if (typeof args[0] === "string") {
      // Pattern: emit('TYPE', payload)
      const type = args[0];
      const payload = args[1] ?? {};
      emittedEvents.push({ type, ...payload });
    } else {
      // Pattern: emit(eventObject)
      emittedEvents.push(args[0]);
    }
  };

  return {
    emit,
    get emittedEvents(): ReadonlyArray<unknown> {
      return emittedEvents;
    },
  };
}

/**
 * Creates mock deps for activities.
 */
function createMockDeps(): { Api: ApiService; Logger: Logger } {
  return {
    Api: {
      fetch: vi.fn(
        async (id: string): Promise<TaskResult> => ({
          data: id,
          status: "success",
        })
      ),
      cancelPendingRequests: vi.fn(async () => {}),
    },
    Logger: {
      info: vi.fn(),
      warn: vi.fn(),
    },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("ActivityManager with new Activity type", () => {
  let manager: ActivityManager;

  beforeEach(() => {
    manager = createActivityManager();
  });

  afterEach(async () => {
    await manager.dispose();
  });

  // ===========================================================================
  // Test 1: Spawn with new Activity type
  // ===========================================================================

  describe("spawn with ConfiguredActivity", () => {
    it("should spawn activity with deps and eventSink", async () => {
      const executeFn = vi.fn(
        async (input: { taskId: string }): Promise<TaskResult> => ({
          data: input.taskId,
          status: "success",
        })
      );

      const TaskActivity = activity(TaskActivityPort, {
        requires: [ApiPort, LoggerPort],
        emits: TaskEvents,
        execute: executeFn,
      });

      const sink = createMockEventSink<typeof TaskEvents>();
      const deps = createMockDeps();

      const id = manager.spawn(TaskActivity, { taskId: "test-123" }, sink, deps);

      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(executeFn).toHaveBeenCalledTimes(1);
      expect(manager.getStatus(id)).toBe("completed");
    });

    it("should pass correct context to execute", async () => {
      const receivedContext: { deps: unknown; signal: unknown; sink: unknown } = {
        deps: null,
        signal: null,
        sink: null,
      };

      const TaskActivity = activity(TaskActivityPort, {
        requires: [ApiPort],
        emits: TaskEvents,
        execute: async (input, context): Promise<TaskResult> => {
          receivedContext.deps = context.deps;
          receivedContext.signal = context.signal;
          receivedContext.sink = context.sink;
          return { data: input.taskId, status: "success" };
        },
      });

      const sink = createMockEventSink<typeof TaskEvents>();
      const deps = createMockDeps();

      manager.spawn(TaskActivity, { taskId: "ctx-test" }, sink, deps);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(receivedContext.deps).not.toBeNull();
      expect(receivedContext.signal).toBeInstanceOf(AbortSignal);
      expect(receivedContext.sink).not.toBeNull();
    });

    it("should emit events via sink", async () => {
      const TaskActivity = activity(TaskActivityPort, {
        requires: [ApiPort],
        emits: TaskEvents,
        execute: async (input, { sink }): Promise<TaskResult> => {
          sink.emit(TaskEvents.PROGRESS(50));
          sink.emit(TaskEvents.PROGRESS(100));
          return { data: input.taskId, status: "success" };
        },
      });

      const sink = createMockEventSink<typeof TaskEvents>();
      const deps = createMockDeps();

      manager.spawn(TaskActivity, { taskId: "emit-test" }, sink, deps);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(sink.emittedEvents).toHaveLength(2);
      expect(sink.emittedEvents[0]).toEqual({ type: "PROGRESS", percent: 50 });
      expect(sink.emittedEvents[1]).toEqual({ type: "PROGRESS", percent: 100 });
    });
  });

  // ===========================================================================
  // Test 2: Cleanup on successful completion
  // ===========================================================================

  describe("cleanup on successful completion", () => {
    it("should call cleanup with 'completed' reason", async () => {
      const cleanupFn = vi.fn();

      const TaskActivity = activity(TaskActivityPort, {
        requires: [ApiPort],
        emits: TaskEvents,
        execute: async (input): Promise<TaskResult> => ({
          data: input.taskId,
          status: "success",
        }),
        cleanup: cleanupFn,
      });

      const sink = createMockEventSink<typeof TaskEvents>();
      const deps = createMockDeps();

      manager.spawn(TaskActivity, { taskId: "cleanup-test" }, sink, deps);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(cleanupFn).toHaveBeenCalledTimes(1);
      expect(cleanupFn).toHaveBeenCalledWith("completed", expect.objectContaining({ deps }));
    });

    it("should pass deps to cleanup", async () => {
      const receivedDeps: { Api?: ApiService } = {};

      const TaskActivity = activity(TaskActivityPort, {
        requires: [ApiPort],
        emits: TaskEvents,
        execute: async (input): Promise<TaskResult> => ({
          data: input.taskId,
          status: "success",
        }),
        cleanup: (_reason, context) => {
          receivedDeps.Api = context.deps.Api;
        },
      });

      const sink = createMockEventSink<typeof TaskEvents>();
      const deps = createMockDeps();

      manager.spawn(TaskActivity, { taskId: "deps-test" }, sink, deps);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(receivedDeps.Api).toBe(deps.Api);
    });
  });

  // ===========================================================================
  // Test 3: Cleanup on cancellation
  // ===========================================================================

  describe("cleanup on cancellation", () => {
    it("should call cleanup with 'cancelled' reason when stopped", async () => {
      const cleanupFn = vi.fn();

      const DelayedActivity = activity(DelayedActivityPort, {
        requires: [],
        emits: EmptyEvents,
        execute: async (input, { signal }) => {
          await new Promise<void>(resolve => {
            const timeoutId = setTimeout(resolve, input.delayMs);
            signal.addEventListener("abort", () => {
              clearTimeout(timeoutId);
              resolve();
            });
          });
          return "done";
        },
        cleanup: cleanupFn,
      });

      const sink = createMockEventSink<typeof EmptyEvents>();

      const id = manager.spawn(DelayedActivity, { delayMs: 5000 }, sink, {});

      // Stop the activity
      manager.stop(id);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(cleanupFn).toHaveBeenCalledTimes(1);
      expect(cleanupFn).toHaveBeenCalledWith("cancelled", expect.anything());
    });
  });

  // ===========================================================================
  // Test 4: Timeout triggers abort and cleanup
  // ===========================================================================

  describe("timeout handling", () => {
    it("should abort activity when timeout triggers", async () => {
      let wasAborted = false;

      const DelayedActivity = activity(DelayedActivityPort, {
        requires: [],
        emits: EmptyEvents,
        timeout: 50, // 50ms timeout
        execute: async (_input, { signal }) => {
          await new Promise<void>(resolve => {
            const timeoutId = setTimeout(resolve, 5000);
            signal.addEventListener("abort", () => {
              wasAborted = true;
              clearTimeout(timeoutId);
              resolve();
            });
          });
          return "done";
        },
      });

      const sink = createMockEventSink<typeof EmptyEvents>();

      const id = manager.spawn(DelayedActivity, { delayMs: 5000 }, sink, {});

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(wasAborted).toBe(true);
      expect(manager.getStatus(id)).toBe("cancelled");
    });

    it("should call cleanup with 'timeout' reason", async () => {
      const cleanupFn = vi.fn();

      const DelayedActivity = activity(DelayedActivityPort, {
        requires: [],
        emits: EmptyEvents,
        timeout: 50,
        execute: async (_input, { signal }) => {
          await new Promise<void>(resolve => {
            const timeoutId = setTimeout(resolve, 5000);
            signal.addEventListener("abort", () => {
              clearTimeout(timeoutId);
              resolve();
            });
          });
          return "done";
        },
        cleanup: cleanupFn,
      });

      const sink = createMockEventSink<typeof EmptyEvents>();

      manager.spawn(DelayedActivity, { delayMs: 5000 }, sink, {});

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(cleanupFn).toHaveBeenCalledTimes(1);
      expect(cleanupFn).toHaveBeenCalledWith("timeout", expect.anything());
    });
  });

  // ===========================================================================
  // Test 5: Cleanup on error
  // ===========================================================================

  describe("cleanup on error", () => {
    it("should call cleanup with 'error' reason when execute throws", async () => {
      const cleanupFn = vi.fn();

      const FailingActivity = activity(SimpleActivityPort, {
        requires: [],
        emits: EmptyEvents,
        execute: async () => {
          throw new Error("Test error");
        },
        cleanup: cleanupFn,
      });

      const sink = createMockEventSink<typeof EmptyEvents>();

      const id = manager.spawn(FailingActivity, 42, sink, {});

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(cleanupFn).toHaveBeenCalledTimes(1);
      expect(cleanupFn).toHaveBeenCalledWith("error", expect.anything());
      expect(manager.getStatus(id)).toBe("failed");
    });
  });

  // ===========================================================================
  // Test 6: Layered timeout precedence
  // ===========================================================================

  describe("timeout precedence", () => {
    it("should use spawn timeout over activity timeout", async () => {
      let wasAborted = false;
      let abortTime = 0;
      const startTime = Date.now();

      const DelayedActivity = activity(DelayedActivityPort, {
        requires: [],
        emits: EmptyEvents,
        timeout: 500, // Activity timeout: 500ms
        execute: async (_input, { signal }) => {
          await new Promise<void>(resolve => {
            const timeoutId = setTimeout(resolve, 5000);
            signal.addEventListener("abort", () => {
              wasAborted = true;
              abortTime = Date.now() - startTime;
              clearTimeout(timeoutId);
              resolve();
            });
          });
          return "done";
        },
      });

      const sink = createMockEventSink<typeof EmptyEvents>();

      const options: SpawnOptions = { timeout: 50 }; // Spawn timeout: 50ms
      manager.spawn(DelayedActivity, { delayMs: 5000 }, sink, {}, options);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(wasAborted).toBe(true);
      // Should abort around 50ms, not 500ms
      expect(abortTime).toBeLessThan(200);
    });

    it("should use activity timeout over manager default", async () => {
      let wasAborted = false;
      let abortTime = 0;
      const startTime = Date.now();

      // Create manager with default timeout
      const managerWithDefault = createActivityManager({ defaultTimeout: 500 });

      const DelayedActivity = activity(DelayedActivityPort, {
        requires: [],
        emits: EmptyEvents,
        timeout: 50, // Activity timeout: 50ms (should win)
        execute: async (_input, { signal }) => {
          await new Promise<void>(resolve => {
            const timeoutId = setTimeout(resolve, 5000);
            signal.addEventListener("abort", () => {
              wasAborted = true;
              abortTime = Date.now() - startTime;
              clearTimeout(timeoutId);
              resolve();
            });
          });
          return "done";
        },
      });

      const sink = createMockEventSink<typeof EmptyEvents>();

      managerWithDefault.spawn(DelayedActivity, { delayMs: 5000 }, sink, {});

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(wasAborted).toBe(true);
      expect(abortTime).toBeLessThan(200);

      await managerWithDefault.dispose();
    });

    it("should use manager default when no other timeout specified", async () => {
      let wasAborted = false;
      let abortTime = 0;
      const startTime = Date.now();

      const managerWithDefault = createActivityManager({ defaultTimeout: 50 });

      const NoTimeoutActivity = activity(DelayedActivityPort, {
        requires: [],
        emits: EmptyEvents,
        // No timeout specified
        execute: async (_input, { signal }) => {
          await new Promise<void>(resolve => {
            const timeoutId = setTimeout(resolve, 5000);
            signal.addEventListener("abort", () => {
              wasAborted = true;
              abortTime = Date.now() - startTime;
              clearTimeout(timeoutId);
              resolve();
            });
          });
          return "done";
        },
      });

      const sink = createMockEventSink<typeof EmptyEvents>();

      managerWithDefault.spawn(NoTimeoutActivity, { delayMs: 5000 }, sink, {});

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(wasAborted).toBe(true);
      expect(abortTime).toBeLessThan(200);

      await managerWithDefault.dispose();
    });
  });

  // ===========================================================================
  // Test 7: getResult returns activity output
  // ===========================================================================

  describe("getResult", () => {
    it("should return activity result after completion", async () => {
      const expectedResult: TaskResult = {
        data: "result-123",
        status: "success",
      };

      const TaskActivity = activity(TaskActivityPort, {
        requires: [],
        emits: TaskEvents,
        execute: async (input): Promise<TaskResult> => ({
          data: `result-${input.taskId}`,
          status: "success",
        }),
      });

      const sink = createMockEventSink<typeof TaskEvents>();

      const id = manager.spawn(TaskActivity, { taskId: "123" }, sink, {});

      await new Promise(resolve => setTimeout(resolve, 50));

      const result = manager.getResult<TaskResult>(id);
      expect(result).toEqual(expectedResult);
    });

    it("should return undefined for running activity", async () => {
      const DelayedActivity = activity(DelayedActivityPort, {
        requires: [],
        emits: EmptyEvents,
        execute: async (input, { signal }) => {
          await new Promise<void>(resolve => {
            const timeoutId = setTimeout(resolve, input.delayMs);
            signal.addEventListener("abort", () => {
              clearTimeout(timeoutId);
              resolve();
            });
          });
          return "done";
        },
      });

      const sink = createMockEventSink<typeof EmptyEvents>();

      const id = manager.spawn(DelayedActivity, { delayMs: 5000 }, sink, {});

      // Check immediately while still running
      const result = manager.getResult<string>(id);
      expect(result).toBeUndefined();
    });

    it("should return undefined for failed activity", async () => {
      const FailingActivity = activity(SimpleActivityPort, {
        requires: [],
        emits: EmptyEvents,
        execute: async () => {
          throw new Error("Test error");
        },
      });

      const sink = createMockEventSink<typeof EmptyEvents>();

      const id = manager.spawn(FailingActivity, 42, sink, {});

      await new Promise(resolve => setTimeout(resolve, 50));

      const result = manager.getResult<string>(id);
      expect(result).toBeUndefined();
    });

    it("should return undefined for cancelled activity", async () => {
      const DelayedActivity = activity(DelayedActivityPort, {
        requires: [],
        emits: EmptyEvents,
        execute: async (input, { signal }) => {
          await new Promise<void>(resolve => {
            const timeoutId = setTimeout(resolve, input.delayMs);
            signal.addEventListener("abort", () => {
              clearTimeout(timeoutId);
              resolve();
            });
          });
          return "done";
        },
      });

      const sink = createMockEventSink<typeof EmptyEvents>();

      const id = manager.spawn(DelayedActivity, { delayMs: 5000 }, sink, {});

      manager.stop(id);

      await new Promise(resolve => setTimeout(resolve, 50));

      const result = manager.getResult<string>(id);
      expect(result).toBeUndefined();
    });

    it("should return undefined for unknown ID", () => {
      const result = manager.getResult<unknown>("non-existent-id");
      expect(result).toBeUndefined();
    });
  });

  // ===========================================================================
  // Test 8: Dispose calls cleanup for all activities
  // ===========================================================================

  describe("dispose cleanup", () => {
    it("should call cleanup for all running activities on dispose", async () => {
      const cleanupCalls: Array<{ id: string; reason: CleanupReason }> = [];

      const createLongActivity = (activityId: string) =>
        activity(DelayedActivityPort, {
          requires: [],
          emits: EmptyEvents,
          execute: async (input, { signal }) => {
            await new Promise<void>(resolve => {
              const timeoutId = setTimeout(resolve, input.delayMs);
              signal.addEventListener("abort", () => {
                clearTimeout(timeoutId);
                resolve();
              });
            });
            return "done";
          },
          cleanup: reason => {
            cleanupCalls.push({ id: activityId, reason });
          },
        });

      const sink = createMockEventSink<typeof EmptyEvents>();

      manager.spawn(createLongActivity("activity-1"), { delayMs: 5000 }, sink, {});
      manager.spawn(createLongActivity("activity-2"), { delayMs: 5000 }, sink, {});
      manager.spawn(createLongActivity("activity-3"), { delayMs: 5000 }, sink, {});

      await manager.dispose();

      expect(cleanupCalls).toHaveLength(3);
      expect(cleanupCalls.map(c => c.id)).toContain("activity-1");
      expect(cleanupCalls.map(c => c.id)).toContain("activity-2");
      expect(cleanupCalls.map(c => c.id)).toContain("activity-3");
      // All should be cancelled
      cleanupCalls.forEach(call => {
        expect(call.reason).toBe("cancelled");
      });
    });

    it("should not call cleanup twice for already completed activities", async () => {
      const cleanupCalls: string[] = [];

      const QuickActivity = activity(SimpleActivityPort, {
        requires: [],
        emits: EmptyEvents,
        execute: async n => String(n),
        cleanup: () => {
          cleanupCalls.push("cleanup");
        },
      });

      const sink = createMockEventSink<typeof EmptyEvents>();

      manager.spawn(QuickActivity, 42, sink, {});

      // Wait for activity to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      // Dispose should not call cleanup again
      await manager.dispose();

      // Cleanup should only have been called once (on completion)
      expect(cleanupCalls).toHaveLength(1);
    });
  });

  // ===========================================================================
  // Test 9: Cleanup called exactly once
  // ===========================================================================

  describe("cleanup called exactly once", () => {
    it("should call cleanup exactly once even with multiple stop calls", async () => {
      const cleanupCalls: CleanupReason[] = [];

      const DelayedActivity = activity(DelayedActivityPort, {
        requires: [],
        emits: EmptyEvents,
        execute: async (input, { signal }) => {
          await new Promise<void>(resolve => {
            const timeoutId = setTimeout(resolve, input.delayMs);
            signal.addEventListener("abort", () => {
              clearTimeout(timeoutId);
              resolve();
            });
          });
          return "done";
        },
        cleanup: reason => {
          cleanupCalls.push(reason);
        },
      });

      const sink = createMockEventSink<typeof EmptyEvents>();

      const id = manager.spawn(DelayedActivity, { delayMs: 5000 }, sink, {});

      // Multiple stop calls
      manager.stop(id);
      manager.stop(id);
      manager.stop(id);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(cleanupCalls).toHaveLength(1);
    });

    it("should call cleanup exactly once for timeout then stop", async () => {
      const cleanupCalls: CleanupReason[] = [];

      const DelayedActivity = activity(DelayedActivityPort, {
        requires: [],
        emits: EmptyEvents,
        timeout: 30,
        execute: async (input, { signal }) => {
          await new Promise<void>(resolve => {
            const timeoutId = setTimeout(resolve, input.delayMs);
            signal.addEventListener("abort", () => {
              clearTimeout(timeoutId);
              resolve();
            });
          });
          return "done";
        },
        cleanup: reason => {
          cleanupCalls.push(reason);
        },
      });

      const sink = createMockEventSink<typeof EmptyEvents>();

      const id = manager.spawn(DelayedActivity, { delayMs: 5000 }, sink, {});

      // Wait for timeout to trigger
      await new Promise(resolve => setTimeout(resolve, 50));

      // Try to stop after timeout
      manager.stop(id);

      await new Promise(resolve => setTimeout(resolve, 50));

      // Should still only be called once with 'timeout' reason
      expect(cleanupCalls).toHaveLength(1);
      expect(cleanupCalls[0]).toBe("timeout");
    });
  });
});
