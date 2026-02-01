/**
 * Runtime tests for activity() factory
 *
 * These tests verify:
 * 1. Activity creation with all config options
 * 2. Activity creation with minimal config (no cleanup, no timeout)
 * 3. Returned activity object is frozen
 * 4. Activity has correct port reference
 * 5. Execute function is callable
 * 6. Cleanup function is optional
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi } from "vitest";
import { port } from "@hex-di/core";
import { activityPort } from "../../src/activities/port.js";
import { defineEvents } from "../../src/activities/events.js";
import { activity } from "../../src/activities/factory.js";
import type { CleanupReason } from "../../src/activities/types.js";

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

const ApiPort = port<ApiService>()("Api");
const LoggerPort = port<Logger>()("Logger");

const TaskActivityPort = activityPort<{ taskId: string }, TaskResult>()("TaskActivity");
const SimpleActivityPort = activityPort<number, string>()("SimpleActivity");
const VoidActivityPort = activityPort<void, void>()("VoidActivity");

const TaskEvents = defineEvents({
  PROGRESS: (percent: number) => ({ percent }),
  COMPLETED: (result: TaskResult) => ({ result }),
});

const EmptyEvents = defineEvents({
  DONE: () => ({}),
});

/**
 * Helper to create a mock context for tests.
 *
 * Uses type assertion to bypass strict typing for test mocks.
 * This is intentional for testing flexibility - the mock's exact type
 * doesn't matter as long as it implements the required interface shape.
 *
 * @remarks Test files are allowed to use `any` for mocking per CLAUDE.md
 */
function createMockContext<TDeps extends Record<string, unknown>>(deps: TDeps): any {
  return {
    deps,
    sink: { emit: vi.fn() },
    signal: new AbortController().signal,
  };
}

// =============================================================================
// Test 1: Activity creation with all config options
// =============================================================================

describe("activity creation with all config options", () => {
  it("should create activity with all options", () => {
    const executeFn = vi.fn(
      async (input: { taskId: string }): Promise<TaskResult> => ({
        data: input.taskId,
        status: "success",
      })
    );

    const cleanupFn = vi.fn();

    const TaskActivity = activity(TaskActivityPort, {
      requires: [ApiPort, LoggerPort],
      emits: TaskEvents,
      timeout: 30_000,
      execute: executeFn,
      cleanup: cleanupFn,
    });

    expect(TaskActivity.port).toBe(TaskActivityPort);
    expect(TaskActivity.requires).toEqual([ApiPort, LoggerPort]);
    expect(TaskActivity.emits).toBe(TaskEvents);
    expect(TaskActivity.timeout).toBe(30_000);
    expect(TaskActivity.execute).toBe(executeFn);
    expect(TaskActivity.cleanup).toBe(cleanupFn);
  });

  it("should preserve requires array contents", () => {
    const TaskActivity = activity(TaskActivityPort, {
      requires: [ApiPort, LoggerPort],
      emits: TaskEvents,
      execute: async (): Promise<TaskResult> => ({ data: "test", status: "success" }),
    });

    expect(TaskActivity.requires).toHaveLength(2);
    expect(TaskActivity.requires[0]).toBe(ApiPort);
    expect(TaskActivity.requires[1]).toBe(LoggerPort);
  });

  it("should preserve events definition reference", () => {
    const TaskActivity = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: async (): Promise<TaskResult> => ({ data: "test", status: "success" }),
    });

    expect(TaskActivity.emits).toBe(TaskEvents);
    expect(TaskActivity.emits.PROGRESS.type).toBe("PROGRESS");
    expect(TaskActivity.emits.COMPLETED.type).toBe("COMPLETED");
  });
});

// =============================================================================
// Test 2: Activity creation with minimal config
// =============================================================================

describe("activity creation with minimal config", () => {
  it("should create activity without cleanup", () => {
    const SimpleActivity = activity(SimpleActivityPort, {
      requires: [],
      emits: EmptyEvents,
      execute: async n => String(n * 2),
    });

    expect(SimpleActivity.port).toBe(SimpleActivityPort);
    expect(SimpleActivity.requires).toEqual([]);
    expect(SimpleActivity.emits).toBe(EmptyEvents);
    expect(SimpleActivity.timeout).toBeUndefined();
    expect(SimpleActivity.cleanup).toBeUndefined();
  });

  it("should create activity without timeout", () => {
    const NoTimeoutActivity = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: async (): Promise<TaskResult> => ({ data: "test", status: "success" }),
    });

    expect(NoTimeoutActivity.timeout).toBeUndefined();
  });

  it("should create activity with empty requires", () => {
    const NoDepsActivity = activity(VoidActivityPort, {
      requires: [],
      emits: EmptyEvents,
      execute: async () => {},
    });

    expect(NoDepsActivity.requires).toEqual([]);
  });
});

// =============================================================================
// Test 3: Returned activity object is frozen
// =============================================================================

describe("returned activity object is frozen", () => {
  it("should freeze the activity object", () => {
    const TaskActivity = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: async (): Promise<TaskResult> => ({ data: "test", status: "success" }),
    });

    expect(Object.isFrozen(TaskActivity)).toBe(true);
  });

  it("should freeze activity with cleanup", () => {
    const TaskActivity = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: async (): Promise<TaskResult> => ({ data: "test", status: "success" }),
      cleanup: async () => {},
    });

    expect(Object.isFrozen(TaskActivity)).toBe(true);
  });

  it("should not allow modification of activity properties", () => {
    const TaskActivity = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      timeout: 5000,
      execute: async (): Promise<TaskResult> => ({ data: "test", status: "success" }),
    });

    expect(() => {
      // @ts-expect-error - attempting to modify frozen object
      TaskActivity.timeout = 10000;
    }).toThrow();

    expect(TaskActivity.timeout).toBe(5000);
  });

  it("should not allow adding properties to activity", () => {
    const TaskActivity = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: async (): Promise<TaskResult> => ({ data: "test", status: "success" }),
    });

    expect(() => {
      // @ts-expect-error - attempting to add property to frozen object
      TaskActivity.extra = "value";
    }).toThrow();
  });

  it("should not allow deleting properties from activity", () => {
    const TaskActivity = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      timeout: 5000,
      execute: async (): Promise<TaskResult> => ({ data: "test", status: "success" }),
    });

    expect(() => {
      // @ts-expect-error - attempting to delete property from frozen object
      delete TaskActivity.timeout;
    }).toThrow();
  });
});

// =============================================================================
// Test 4: Activity has correct port reference
// =============================================================================

describe("activity has correct port reference", () => {
  it("should reference the same port object", () => {
    const TaskActivity = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: async (): Promise<TaskResult> => ({ data: "test", status: "success" }),
    });

    expect(TaskActivity.port).toBe(TaskActivityPort);
    expect(TaskActivity.port.__portName).toBe("TaskActivity");
  });

  it("should work with different port types", () => {
    const SimpleActivity = activity(SimpleActivityPort, {
      requires: [],
      emits: EmptyEvents,
      execute: async n => String(n),
    });

    expect(SimpleActivity.port).toBe(SimpleActivityPort);
    expect(SimpleActivity.port.__portName).toBe("SimpleActivity");
  });

  it("should work with void port", () => {
    const VoidActivity = activity(VoidActivityPort, {
      requires: [],
      emits: EmptyEvents,
      execute: async () => {},
    });

    expect(VoidActivity.port).toBe(VoidActivityPort);
    expect(VoidActivity.port.__portName).toBe("VoidActivity");
  });
});

// =============================================================================
// Test 5: Execute function is callable
// =============================================================================

describe("execute function is callable", () => {
  it("should call execute with correct arguments", async () => {
    const executeFn = vi.fn(
      async (input: { taskId: string }): Promise<TaskResult> => ({
        data: input.taskId,
        status: "success",
      })
    );

    const TaskActivity = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: executeFn,
    });

    const mockApi: ApiService = {
      fetch: vi.fn(async (id: string): Promise<TaskResult> => ({ data: id, status: "success" })),
    };

    const mockContext = createMockContext({ Api: mockApi });

    await TaskActivity.execute({ taskId: "test-123" }, mockContext);

    expect(executeFn).toHaveBeenCalledTimes(1);
    expect(executeFn).toHaveBeenCalledWith({ taskId: "test-123" }, mockContext);
  });

  it("should return execute result", async () => {
    const TaskActivity = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: async (input): Promise<TaskResult> => ({
        data: input.taskId,
        status: "success",
      }),
    });

    const mockApi: ApiService = {
      fetch: vi.fn(async (id: string): Promise<TaskResult> => ({ data: id, status: "success" })),
    };

    const mockContext = createMockContext({ Api: mockApi });

    const result = await TaskActivity.execute({ taskId: "test-456" }, mockContext);

    expect(result).toEqual({
      data: "test-456",
      status: "success",
    });
  });

  it("should allow execute to access context.deps", async () => {
    const mockFetch = vi.fn(
      async (id: string): Promise<TaskResult> => ({
        data: id,
        status: "success",
      })
    );

    const TaskActivity = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: async (input, { deps }) => deps.Api.fetch(input.taskId),
    });

    const mockApi: ApiService = {
      fetch: mockFetch,
    };

    const mockContext = createMockContext({ Api: mockApi });

    await TaskActivity.execute({ taskId: "test-789" }, mockContext);

    expect(mockFetch).toHaveBeenCalledWith("test-789");
  });

  it("should allow execute to emit events via sink", async () => {
    const emitFn = vi.fn();

    const TaskActivity = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: async (input, { deps, sink }) => {
        sink.emit(TaskEvents.PROGRESS(25));
        const result = await deps.Api.fetch(input.taskId);
        sink.emit(TaskEvents.PROGRESS(100));
        sink.emit(TaskEvents.COMPLETED(result));
        return result;
      },
    });

    const mockApi: ApiService = {
      fetch: vi.fn(async (id: string): Promise<TaskResult> => ({ data: id, status: "success" })),
    };

    const mockContext = {
      deps: { Api: mockApi },
      sink: { emit: emitFn },
      signal: new AbortController().signal,
    };

    await TaskActivity.execute({ taskId: "test" }, mockContext);

    expect(emitFn).toHaveBeenCalledTimes(3);
    expect(emitFn).toHaveBeenNthCalledWith(1, { type: "PROGRESS", percent: 25 });
    expect(emitFn).toHaveBeenNthCalledWith(2, { type: "PROGRESS", percent: 100 });
    expect(emitFn).toHaveBeenNthCalledWith(3, {
      type: "COMPLETED",
      result: { data: "test", status: "success" },
    });
  });
});

// =============================================================================
// Test 6: Cleanup function is optional
// =============================================================================

describe("cleanup function is optional", () => {
  it("should work without cleanup function", () => {
    const TaskActivity = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: async (): Promise<TaskResult> => ({ data: "test", status: "success" }),
    });

    expect(TaskActivity.cleanup).toBeUndefined();
  });

  it("should include cleanup function when provided", () => {
    const cleanupFn = vi.fn();

    const TaskActivity = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: async (): Promise<TaskResult> => ({ data: "test", status: "success" }),
      cleanup: cleanupFn,
    });

    expect(TaskActivity.cleanup).toBe(cleanupFn);
  });

  it("should call cleanup with correct arguments", async () => {
    const cleanupFn = vi.fn();

    const TaskActivity = activity(TaskActivityPort, {
      requires: [ApiPort, LoggerPort],
      emits: TaskEvents,
      execute: async (): Promise<TaskResult> => ({ data: "test", status: "success" }),
      cleanup: cleanupFn,
    });

    const mockApi: ApiService = {
      fetch: vi.fn(async (id: string): Promise<TaskResult> => ({ data: id, status: "success" })),
    };

    const mockLogger: Logger = {
      info: vi.fn(),
      warn: vi.fn(),
    };

    const cleanupContext = {
      deps: { Api: mockApi, Logger: mockLogger },
    };

    await TaskActivity.cleanup?.("completed", cleanupContext);

    expect(cleanupFn).toHaveBeenCalledTimes(1);
    expect(cleanupFn).toHaveBeenCalledWith("completed", cleanupContext);
  });

  it("should call cleanup with different reasons", async () => {
    const cleanupFn = vi.fn();

    const TaskActivity = activity(TaskActivityPort, {
      requires: [LoggerPort],
      emits: TaskEvents,
      execute: async (): Promise<TaskResult> => ({ data: "test", status: "success" }),
      cleanup: cleanupFn,
    });

    const mockLogger: Logger = {
      info: vi.fn(),
      warn: vi.fn(),
    };

    const cleanupContext = {
      deps: { Logger: mockLogger },
    };

    const reasons: CleanupReason[] = ["completed", "cancelled", "timeout", "error"];

    for (const reason of reasons) {
      await TaskActivity.cleanup?.(reason, cleanupContext);
    }

    expect(cleanupFn).toHaveBeenCalledTimes(4);
    expect(cleanupFn).toHaveBeenNthCalledWith(1, "completed", cleanupContext);
    expect(cleanupFn).toHaveBeenNthCalledWith(2, "cancelled", cleanupContext);
    expect(cleanupFn).toHaveBeenNthCalledWith(3, "timeout", cleanupContext);
    expect(cleanupFn).toHaveBeenNthCalledWith(4, "error", cleanupContext);
  });

  it("should handle async cleanup", async () => {
    const asyncCleanup = vi.fn(async (_reason: CleanupReason) => {
      await Promise.resolve();
      return;
    });

    const TaskActivity = activity(TaskActivityPort, {
      requires: [],
      emits: TaskEvents,
      execute: async (): Promise<TaskResult> => ({ data: "test", status: "success" }),
      cleanup: asyncCleanup,
    });

    await TaskActivity.cleanup?.("completed", { deps: {} as Record<string, never> });

    expect(asyncCleanup).toHaveBeenCalledTimes(1);
  });

  it("should handle sync cleanup", () => {
    const syncCleanup = vi.fn((_reason: CleanupReason) => {
      // Sync cleanup - no return value
    });

    const TaskActivity = activity(TaskActivityPort, {
      requires: [],
      emits: TaskEvents,
      execute: async (): Promise<TaskResult> => ({ data: "test", status: "success" }),
      cleanup: syncCleanup,
    });

    void TaskActivity.cleanup?.("error", { deps: {} as Record<string, never> });

    expect(syncCleanup).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// Test 7: Activity independence
// =============================================================================

describe("activity independence", () => {
  it("should create independent activity instances", () => {
    const Activity1 = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      timeout: 5000,
      execute: async (): Promise<TaskResult> => ({ data: "1", status: "success" }),
    });

    const Activity2 = activity(TaskActivityPort, {
      requires: [ApiPort, LoggerPort],
      emits: TaskEvents,
      timeout: 10000,
      execute: async (): Promise<TaskResult> => ({ data: "2", status: "success" }),
    });

    expect(Activity1).not.toBe(Activity2);
    expect(Activity1.requires).not.toEqual(Activity2.requires);
    expect(Activity1.timeout).not.toBe(Activity2.timeout);
  });

  it("should not share state between activities", () => {
    const Activity1 = activity(SimpleActivityPort, {
      requires: [],
      emits: EmptyEvents,
      execute: async n => String(n),
    });

    const Activity2 = activity(SimpleActivityPort, {
      requires: [],
      emits: EmptyEvents,
      timeout: 1000,
      execute: async n => String(n * 2),
    });

    expect(Activity1.timeout).toBeUndefined();
    expect(Activity2.timeout).toBe(1000);
  });
});
