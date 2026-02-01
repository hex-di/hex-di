/**
 * Tests for Activity Testing Utilities
 *
 * These tests verify:
 * 1. createTestEventSink captures emitted events
 * 2. createTestEventSink.clear() resets events array
 * 3. createTestSignal.abort() triggers abort
 * 4. createTestSignal.timeout(ms) aborts after delay
 * 5. createTestDeps creates mock deps object from ports
 * 6. testActivity returns complete result object
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createPort } from "@hex-di/core";
import { activityPort } from "../../../src/activities/port.js";
import { defineEvents } from "../../../src/activities/events.js";
import { activity } from "../../../src/activities/factory.js";
import {
  createTestEventSink,
  createTestSignal,
  createTestDeps,
  testActivity,
  MissingMockError,
} from "../../../src/activities/testing/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface TaskResult {
  data: string;
  status: "success" | "partial";
}

interface ApiService {
  fetch(id: string): Promise<TaskResult>;
}

interface Logger {
  info(message: string): void;
  warn(message: string, meta?: Record<string, unknown>): void;
}

const ApiPort = createPort<ApiService>({ name: "Api" });
const LoggerPort = createPort<Logger>({ name: "Logger" });

const TaskActivityPort = activityPort<{ taskId: string }, TaskResult>()("TaskActivity");
const SimpleActivityPort = activityPort<number, string>()("SimpleActivity");

const TaskEvents = defineEvents({
  PROGRESS: (percent: number) => ({ percent }),
  COMPLETED: (result: TaskResult) => ({ result }),
  FAILED: (error: Error) => ({ error }),
});

const EmptyEvents = defineEvents({
  DONE: () => ({}),
});

// =============================================================================
// Test 1: createTestEventSink captures emitted events
// =============================================================================

describe("createTestEventSink", () => {
  describe("captures emitted events", () => {
    it("should capture events emitted via factory result", () => {
      const sink = createTestEventSink<typeof TaskEvents>();

      sink.emit(TaskEvents.PROGRESS(25));
      sink.emit(TaskEvents.PROGRESS(50));
      sink.emit(TaskEvents.COMPLETED({ data: "test", status: "success" }));

      expect(sink.events).toHaveLength(3);
      expect(sink.events[0]).toEqual({ type: "PROGRESS", percent: 25 });
      expect(sink.events[1]).toEqual({ type: "PROGRESS", percent: 50 });
      expect(sink.events[2]).toEqual({
        type: "COMPLETED",
        result: { data: "test", status: "success" },
      });
    });

    it("should capture events emitted via type + payload", () => {
      const sink = createTestEventSink<typeof TaskEvents>();

      sink.emit("PROGRESS", { percent: 75 });
      sink.emit("COMPLETED", { result: { data: "result", status: "partial" } });

      expect(sink.events).toHaveLength(2);
      expect(sink.events[0]).toEqual({ type: "PROGRESS", percent: 75 });
      expect(sink.events[1]).toEqual({
        type: "COMPLETED",
        result: { data: "result", status: "partial" },
      });
    });

    it("should capture events with empty payload", () => {
      const sink = createTestEventSink<typeof EmptyEvents>();

      sink.emit("DONE");
      sink.emit(EmptyEvents.DONE());

      expect(sink.events).toHaveLength(2);
      expect(sink.events[0]).toEqual({ type: "DONE" });
      expect(sink.events[1]).toEqual({ type: "DONE" });
    });

    it("should preserve event order", () => {
      const sink = createTestEventSink<typeof TaskEvents>();

      sink.emit(TaskEvents.PROGRESS(0));
      sink.emit(TaskEvents.PROGRESS(50));
      sink.emit(TaskEvents.PROGRESS(100));

      expect(sink.events.map(e => (e as { percent: number }).percent)).toEqual([0, 50, 100]);
    });

    it("should provide readonly events array", () => {
      const sink = createTestEventSink<typeof TaskEvents>();
      sink.emit(TaskEvents.PROGRESS(50));

      // The events array should be readonly
      expect(Array.isArray(sink.events)).toBe(true);
    });
  });

  // =============================================================================
  // Test 2: createTestEventSink.clear() resets events array
  // =============================================================================

  describe("clear() resets events array", () => {
    it("should clear all captured events", () => {
      const sink = createTestEventSink<typeof TaskEvents>();

      sink.emit(TaskEvents.PROGRESS(25));
      sink.emit(TaskEvents.PROGRESS(50));
      expect(sink.events).toHaveLength(2);

      sink.clear();

      expect(sink.events).toHaveLength(0);
    });

    it("should allow new events after clear", () => {
      const sink = createTestEventSink<typeof TaskEvents>();

      sink.emit(TaskEvents.PROGRESS(25));
      sink.clear();
      sink.emit(TaskEvents.PROGRESS(75));

      expect(sink.events).toHaveLength(1);
      expect(sink.events[0]).toEqual({ type: "PROGRESS", percent: 75 });
    });

    it("should be idempotent when called multiple times", () => {
      const sink = createTestEventSink<typeof TaskEvents>();

      sink.emit(TaskEvents.PROGRESS(50));
      sink.clear();
      sink.clear();
      sink.clear();

      expect(sink.events).toHaveLength(0);
    });
  });
});

// =============================================================================
// Test 3: createTestSignal.abort() triggers abort
// =============================================================================

describe("createTestSignal", () => {
  describe("abort() triggers abort", () => {
    it("should set aborted to true", () => {
      const signal = createTestSignal();

      expect(signal.aborted).toBe(false);
      signal.abort();
      expect(signal.aborted).toBe(true);
    });

    it("should set default reason", () => {
      const signal = createTestSignal();

      signal.abort();

      expect(signal.reason).toBe("Test abort");
    });

    it("should use custom reason", () => {
      const signal = createTestSignal();

      signal.abort("User cancelled");

      expect(signal.reason).toBe("User cancelled");
    });

    it("should trigger abort event listeners", () => {
      const signal = createTestSignal();
      const listener = vi.fn();

      signal.addEventListener("abort", listener);
      signal.abort();

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should be idempotent", () => {
      const signal = createTestSignal();
      const listener = vi.fn();

      signal.addEventListener("abort", listener);
      signal.abort("first");
      signal.abort("second");

      // AbortController only fires once
      expect(listener).toHaveBeenCalledTimes(1);
      expect(signal.reason).toBe("first");
    });
  });

  // =============================================================================
  // Test 4: createTestSignal.timeout(ms) aborts after delay
  // =============================================================================

  describe("timeout(ms) aborts after delay", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it("should abort after specified delay", () => {
      const signal = createTestSignal();

      signal.timeout(100);

      expect(signal.aborted).toBe(false);
      vi.advanceTimersByTime(99);
      expect(signal.aborted).toBe(false);
      vi.advanceTimersByTime(1);
      expect(signal.aborted).toBe(true);
    });

    it("should set timeout reason", () => {
      const signal = createTestSignal();

      signal.timeout(100);
      vi.advanceTimersByTime(100);

      expect(signal.reason).toBe("Timeout after 100ms");
    });

    it("should clear timeout on manual abort", () => {
      const signal = createTestSignal();

      signal.timeout(100);
      signal.abort("Manual");

      expect(signal.aborted).toBe(true);
      expect(signal.reason).toBe("Manual");

      // Advancing time should not change anything
      vi.advanceTimersByTime(100);
      expect(signal.reason).toBe("Manual");
    });

    it("should replace pending timeout with new one", () => {
      const signal = createTestSignal();

      signal.timeout(100);
      signal.timeout(200); // Replace

      vi.advanceTimersByTime(100);
      expect(signal.aborted).toBe(false);

      vi.advanceTimersByTime(100);
      expect(signal.aborted).toBe(true);
      expect(signal.reason).toBe("Timeout after 200ms");
    });

    it("should start as non-aborted", () => {
      const signal = createTestSignal();

      expect(signal.aborted).toBe(false);
      expect(signal.reason).toBeUndefined();
    });

    afterEach(() => {
      vi.useRealTimers();
    });
  });
});

// =============================================================================
// Test 5: createTestDeps creates mock deps object from ports
// =============================================================================

describe("createTestDeps", () => {
  describe("creates mock deps object", () => {
    it("should create deps object from requires and mocks", () => {
      const mockApi: ApiService = {
        fetch: vi.fn().mockResolvedValue({ data: "test", status: "success" }),
      };
      const mockLogger: Logger = {
        info: vi.fn(),
        warn: vi.fn(),
      };

      const deps = createTestDeps([ApiPort, LoggerPort], {
        Api: mockApi,
        Logger: mockLogger,
      });

      expect(deps.Api).toBe(mockApi);
      expect(deps.Logger).toBe(mockLogger);
    });

    it("should work with single port", () => {
      const mockApi: ApiService = {
        fetch: vi.fn().mockResolvedValue({ data: "test", status: "success" }),
      };

      const deps = createTestDeps([ApiPort], { Api: mockApi });

      expect(deps.Api).toBe(mockApi);
    });

    it("should work with empty requires", () => {
      const deps = createTestDeps([], {});

      expect(Object.keys(deps)).toHaveLength(0);
    });

    it("should freeze the deps object", () => {
      const mockApi: ApiService = {
        fetch: vi.fn().mockResolvedValue({ data: "test", status: "success" }),
      };

      const deps = createTestDeps([ApiPort], { Api: mockApi });

      expect(Object.isFrozen(deps)).toBe(true);
    });
  });

  describe("throws MissingMockError for missing mocks", () => {
    it("should throw when mock is missing", () => {
      const mockApi: ApiService = {
        fetch: vi.fn().mockResolvedValue({ data: "test", status: "success" }),
      };

      expect(() => {
        createTestDeps([ApiPort, LoggerPort], { Api: mockApi });
      }).toThrow(MissingMockError);
    });

    it("should include port name in error", () => {
      const mockApi: ApiService = {
        fetch: vi.fn().mockResolvedValue({ data: "test", status: "success" }),
      };

      try {
        createTestDeps([ApiPort, LoggerPort], { Api: mockApi });
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(MissingMockError);
        const error = err as MissingMockError;
        expect(error.portName).toBe("Logger");
        expect(error.requiredPorts).toContain("Api");
        expect(error.requiredPorts).toContain("Logger");
      }
    });

    it("should provide helpful error message", () => {
      try {
        createTestDeps([ApiPort, LoggerPort], {});
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(MissingMockError);
        const error = err as MissingMockError;
        expect(error.message).toContain("Missing mock");
        expect(error.message).toContain("Required ports:");
      }
    });
  });
});

// =============================================================================
// Test 6: testActivity returns complete result object
// =============================================================================

describe("testActivity", () => {
  describe("returns complete result object", () => {
    it("should return result on success", async () => {
      const mockApi: ApiService = {
        fetch: vi.fn().mockResolvedValue({ data: "test", status: "success" }),
      };
      const mockLogger: Logger = {
        info: vi.fn(),
        warn: vi.fn(),
      };

      const TaskActivity = activity(TaskActivityPort, {
        requires: [ApiPort, LoggerPort],
        emits: TaskEvents,
        execute: async (input, { deps, sink }) => {
          sink.emit(TaskEvents.PROGRESS(0));
          const result = await deps.Api.fetch(input.taskId);
          deps.Logger.info("Done");
          sink.emit(TaskEvents.COMPLETED(result));
          return result;
        },
      });

      const { result, status, error, events } = await testActivity(TaskActivity, {
        input: { taskId: "123" },
        deps: { Api: mockApi, Logger: mockLogger },
      });

      expect(status).toBe("completed");
      expect(result).toEqual({ data: "test", status: "success" });
      expect(error).toBeUndefined();
      expect(events).toHaveLength(2);
      expect(events[0]).toEqual({ type: "PROGRESS", percent: 0 });
    });

    it("should return error on failure", async () => {
      const testError = new Error("API failed");
      const mockApi: ApiService = {
        fetch: vi.fn().mockRejectedValue(testError),
      };
      const mockLogger: Logger = {
        info: vi.fn(),
        warn: vi.fn(),
      };

      const TaskActivity = activity(TaskActivityPort, {
        requires: [ApiPort, LoggerPort],
        emits: TaskEvents,
        execute: async (input, { deps }) => {
          return deps.Api.fetch(input.taskId);
        },
      });

      const { result, status, error } = await testActivity(TaskActivity, {
        input: { taskId: "123" },
        deps: { Api: mockApi, Logger: mockLogger },
      });

      expect(status).toBe("failed");
      expect(result).toBeUndefined();
      expect(error).toBe(testError);
    });

    it("should track cleanup on success", async () => {
      const mockApi: ApiService = {
        fetch: vi.fn().mockResolvedValue({ data: "test", status: "success" }),
      };
      const cleanupFn = vi.fn();

      const TaskActivity = activity(TaskActivityPort, {
        requires: [ApiPort],
        emits: TaskEvents,
        execute: async (input, { deps }) => deps.Api.fetch(input.taskId),
        cleanup: cleanupFn,
      });

      const { cleanupCalled, cleanupReason } = await testActivity(TaskActivity, {
        input: { taskId: "123" },
        deps: { Api: mockApi },
      });

      expect(cleanupCalled).toBe(true);
      expect(cleanupReason).toBe("completed");
      expect(cleanupFn).toHaveBeenCalledWith(
        "completed",
        expect.objectContaining({ deps: expect.any(Object) })
      );
    });

    it("should track cleanup on error", async () => {
      const mockApi: ApiService = {
        fetch: vi.fn().mockRejectedValue(new Error("Failed")),
      };
      const cleanupFn = vi.fn();

      const TaskActivity = activity(TaskActivityPort, {
        requires: [ApiPort],
        emits: TaskEvents,
        execute: async (input, { deps }) => deps.Api.fetch(input.taskId),
        cleanup: cleanupFn,
      });

      const { cleanupCalled, cleanupReason, status } = await testActivity(TaskActivity, {
        input: { taskId: "123" },
        deps: { Api: mockApi },
      });

      expect(status).toBe("failed");
      expect(cleanupCalled).toBe(true);
      expect(cleanupReason).toBe("error");
    });

    it("should handle activity without cleanup", async () => {
      const mockApi: ApiService = {
        fetch: vi.fn().mockResolvedValue({ data: "test", status: "success" }),
      };

      const TaskActivity = activity(TaskActivityPort, {
        requires: [ApiPort],
        emits: TaskEvents,
        execute: async (input, { deps }) => deps.Api.fetch(input.taskId),
        // No cleanup
      });

      const { cleanupCalled, cleanupReason } = await testActivity(TaskActivity, {
        input: { taskId: "123" },
        deps: { Api: mockApi },
      });

      expect(cleanupCalled).toBe(false);
      expect(cleanupReason).toBe("completed"); // Still tracked
    });
  });

  describe("handles timeout", () => {
    it("should abort on timeout", async () => {
      // Use a mock that signals it was aborted and returns early
      let signalReceived: AbortSignal | undefined;
      const mockApi: ApiService = {
        fetch: vi.fn().mockImplementation(async () => {
          // Long-running operation that checks signal
          await new Promise((resolve, reject) => {
            // Check if already aborted
            if (signalReceived?.aborted) {
              reject(new Error("Aborted"));
              return;
            }
            // Wait for abort
            const handler = () => reject(new Error("Aborted"));
            signalReceived?.addEventListener("abort", handler);
          });
          return { data: "test", status: "success" as const };
        }),
      };
      const cleanupFn = vi.fn();

      const TaskActivity = activity(TaskActivityPort, {
        requires: [ApiPort],
        emits: TaskEvents,
        execute: async (input, { deps, signal }) => {
          signalReceived = signal;
          return deps.Api.fetch(input.taskId);
        },
        cleanup: cleanupFn,
      });

      // Very short timeout to ensure fast test
      const { status, cleanupReason } = await testActivity(TaskActivity, {
        input: { taskId: "123" },
        deps: { Api: mockApi },
        timeout: 10,
      });

      expect(status).toBe("timeout");
      expect(cleanupReason).toBe("timeout");
    });
  });

  describe("handles abortAfter", () => {
    it("should abort after specified delay", async () => {
      // Use a mock that signals it was aborted
      let signalReceived: AbortSignal | undefined;
      const mockApi: ApiService = {
        fetch: vi.fn().mockImplementation(async () => {
          // Long-running operation that checks signal
          await new Promise((resolve, reject) => {
            if (signalReceived?.aborted) {
              reject(new Error("Aborted"));
              return;
            }
            const handler = () => reject(new Error("Aborted"));
            signalReceived?.addEventListener("abort", handler);
          });
          return { data: "test", status: "success" as const };
        }),
      };
      const cleanupFn = vi.fn();

      const TaskActivity = activity(TaskActivityPort, {
        requires: [ApiPort],
        emits: TaskEvents,
        execute: async (input, { deps, signal }) => {
          signalReceived = signal;
          return deps.Api.fetch(input.taskId);
        },
        cleanup: cleanupFn,
      });

      // Very short delay to ensure fast test
      const { status, cleanupReason } = await testActivity(TaskActivity, {
        input: { taskId: "123" },
        deps: { Api: mockApi },
        abortAfter: 10,
      });

      expect(status).toBe("cancelled");
      expect(cleanupReason).toBe("cancelled");
    });
  });

  describe("captures events", () => {
    it("should capture all emitted events", async () => {
      const mockApi: ApiService = {
        fetch: vi.fn().mockResolvedValue({ data: "test", status: "success" }),
      };

      const TaskActivity = activity(TaskActivityPort, {
        requires: [ApiPort],
        emits: TaskEvents,
        execute: async (input, { deps, sink }) => {
          sink.emit(TaskEvents.PROGRESS(0));
          sink.emit(TaskEvents.PROGRESS(50));
          const result = await deps.Api.fetch(input.taskId);
          sink.emit(TaskEvents.PROGRESS(100));
          sink.emit(TaskEvents.COMPLETED(result));
          return result;
        },
      });

      const { events } = await testActivity(TaskActivity, {
        input: { taskId: "123" },
        deps: { Api: mockApi },
      });

      expect(events).toHaveLength(4);
      expect(events[0]).toEqual({ type: "PROGRESS", percent: 0 });
      expect(events[1]).toEqual({ type: "PROGRESS", percent: 50 });
      expect(events[2]).toEqual({ type: "PROGRESS", percent: 100 });
      expect(events[3]).toMatchObject({ type: "COMPLETED" });
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("integration tests", () => {
  it("should work with activity using all features", async () => {
    const mockApi: ApiService = {
      fetch: vi.fn().mockResolvedValue({ data: "result", status: "success" }),
    };
    const mockLogger: Logger = {
      info: vi.fn(),
      warn: vi.fn(),
    };

    const CompleteActivity = activity(TaskActivityPort, {
      requires: [ApiPort, LoggerPort],
      emits: TaskEvents,
      timeout: 5000,
      execute: async (input, { deps, sink, signal }) => {
        deps.Logger.info(`Starting task ${input.taskId}`);
        sink.emit(TaskEvents.PROGRESS(0));

        if (signal.aborted) {
          throw new Error("Aborted");
        }

        sink.emit(TaskEvents.PROGRESS(50));
        const result = await deps.Api.fetch(input.taskId);

        sink.emit(TaskEvents.PROGRESS(100));
        sink.emit(TaskEvents.COMPLETED(result));
        deps.Logger.info(`Completed task ${input.taskId}`);

        return result;
      },
      cleanup: async (reason, { deps }) => {
        deps.Logger.warn(`Cleanup: ${reason}`);
      },
    });

    const { result, status, events, cleanupCalled, cleanupReason, error } = await testActivity(
      CompleteActivity,
      {
        input: { taskId: "complete-123" },
        deps: { Api: mockApi, Logger: mockLogger },
      }
    );

    expect(status).toBe("completed");
    expect(result).toEqual({ data: "result", status: "success" });
    expect(error).toBeUndefined();
    expect(events).toHaveLength(4);
    expect(cleanupCalled).toBe(true);
    expect(cleanupReason).toBe("completed");
    expect(mockLogger.info).toHaveBeenCalledWith("Starting task complete-123");
    expect(mockLogger.info).toHaveBeenCalledWith("Completed task complete-123");
    expect(mockLogger.warn).toHaveBeenCalledWith("Cleanup: completed");
  });

  it("should work with composable utilities", async () => {
    // Use individual utilities for more control
    const sink = createTestEventSink<typeof TaskEvents>();
    const signal = createTestSignal();
    const deps = createTestDeps([ApiPort], {
      Api: {
        fetch: vi.fn().mockResolvedValue({ data: "manual", status: "success" }),
      },
    });

    const TaskActivity = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: async (input, ctx) => {
        ctx.sink.emit(TaskEvents.PROGRESS(100));
        return ctx.deps.Api.fetch(input.taskId);
      },
    });

    const result = await TaskActivity.execute({ taskId: "manual-123" }, { deps, sink, signal });

    expect(result).toEqual({ data: "manual", status: "success" });
    expect(sink.events).toHaveLength(1);
    expect(sink.events[0]).toEqual({ type: "PROGRESS", percent: 100 });
  });
});
