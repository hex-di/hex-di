/**
 * Runtime tests for FlowAdapter activities integration
 *
 * These tests verify:
 * 1. FlowAdapter creation with activities array
 * 2. Activity spawning receives correct deps
 * 3. Activity events route to machine
 * 4. Activity cleanup called on FlowAdapter dispose
 * 5. Runtime validation of activities (duplicates, frozen)
 *
 * Note: Due to TypeScript type inference complexity with GraphBuilder,
 * these tests use the low-level APIs directly rather than the full DI integration.
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi } from "vitest";
import { createPort } from "@hex-di/core";
import { activityPort } from "../../src/activities/port.js";
import { defineEvents } from "../../src/activities/events.js";
import { activity } from "../../src/activities/factory.js";
import type { ConfiguredActivityAny } from "../../src/activities/types.js";
import { createActivityManager } from "../../src/activities/manager.js";
import { createMachineRunner } from "../../src/runner/create-runner.js";
import {
  createFlowAdapter,
  createFlowPort,
  createDIEffectExecutor,
} from "../../src/integration/index.js";
import type { FlowService } from "../../src/integration/types.js";
import { createMachine } from "../../src/machine/create-machine.js";
import { Effect } from "../../src/effects/constructors.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface ApiService {
  fetch(id: string): Promise<{ data: string }>;
}

interface Logger {
  info(message: string): void;
  warn(message: string, meta?: Record<string, unknown>): void;
}

const ApiPort = createPort<ApiService>({ name: "Api" });
const LoggerPort = createPort<Logger>({ name: "Logger" });

// Activity definitions
const TaskActivityPort = activityPort<{ taskId: string }, { result: string }>()("TaskActivity");

const TaskEvents = defineEvents({
  PROGRESS: (percent: number) => ({ percent }),
  COMPLETED: (result: string) => ({ result }),
});

// Machine definition
interface TestContext {
  lastEvent: string;
  progress: number;
}

const testMachine = createMachine({
  id: "test-machine",
  initial: "idle",
  context: { lastEvent: "none", progress: 0 } satisfies TestContext,
  states: {
    idle: {
      on: {
        START: {
          target: "running",
          effects: [Effect.spawn("TaskActivity", { taskId: "123" })],
        },
      },
    },
    running: {
      on: {
        PROGRESS: {
          target: "running",
          actions: [
            (ctx: TestContext, event: { type: "PROGRESS"; percent: number }) => ({
              ...ctx,
              lastEvent: "PROGRESS",
              progress: event.percent,
            }),
          ],
        },
        COMPLETED: {
          target: "completed",
          actions: [
            (ctx: TestContext) => ({
              ...ctx,
              lastEvent: "COMPLETED",
            }),
          ],
        },
        STOP: {
          target: "idle",
          effects: [Effect.stop("TaskActivity")],
        },
      },
    },
    completed: {
      on: {},
    },
  },
});

// Flow port
const TestFlowPort = createFlowPort<
  "idle" | "running" | "completed",
  "START" | "PROGRESS" | "COMPLETED" | "STOP",
  TestContext
>("TestFlow");

// =============================================================================
// Helper to create FlowService with activity support
// =============================================================================

function createTestFlowService(
  deps: { Api: ApiService; Logger: Logger },
  activities: readonly ConfiguredActivityAny[]
): FlowService<string, string, unknown> {
  const activityManager = createActivityManager();
  const activityRegistry = new Map<string, ConfiguredActivityAny>();
  for (const act of activities) {
    activityRegistry.set(act.port.__portName, act);
  }

  // Create a type-unsafe scope resolver (test code only)
  const scopeResolver = {
    resolve: <P extends import("@hex-di/core").Port<unknown, string>>(p: P) => {
      if (p.__portName === "Api") return deps.Api;
      if (p.__portName === "Logger") return deps.Logger;
      throw new Error(`Unknown port: ${p.__portName}`);
    },
  };

  // Create activity deps resolver (test code only)
  const activityDepsResolver = (reqs: readonly import("@hex-di/core").Port<unknown, string>[]) => {
    const result: Record<string, unknown> = {};
    for (const req of reqs) {
      if (req.__portName === "Api") result.Api = deps.Api;
      if (req.__portName === "Logger") result.Logger = deps.Logger;
    }
    return result;
  };

  const executor = createDIEffectExecutor({
    // Use type assertion since we're in test code
    scope: scopeResolver as import("../../src/integration/di-executor.js").ScopeResolver,
    activityManager,
    activityRegistry,
    activityDepsResolver:
      activityDepsResolver as import("../../src/integration/adapter.js").ActivityDepsResolver,
  });

  const runner = createMachineRunner(testMachine, {
    executor,
    activityManager,
  });

  // Create wrapper that accepts string event types
  const flowService: FlowService<string, string, unknown> = {
    snapshot: () => runner.snapshot(),
    state: () => runner.state(),
    context: () => runner.context(),
    send: e => runner.send(e as Parameters<typeof runner.send>[0]),
    sendAndExecute: e => runner.sendAndExecute(e as Parameters<typeof runner.sendAndExecute>[0]),
    subscribe: cb => runner.subscribe(cb),
    getActivityStatus: id => runner.getActivityStatus(id),
    dispose: () => runner.dispose(),
    get isDisposed() {
      return runner.isDisposed;
    },
  };

  executor.setEventSink({
    emit: event => {
      runner.send(event as Parameters<typeof runner.send>[0]);
    },
  });

  return flowService;
}

// =============================================================================
// Tests
// =============================================================================

describe("FlowAdapter with activities", () => {
  describe("FlowAdapter creation", () => {
    it("should create FlowAdapter with activities array", () => {
      const TaskActivity = activity(TaskActivityPort, {
        requires: [ApiPort, LoggerPort],
        emits: TaskEvents,
        execute: async (input, { deps }) => {
          const data = await deps.Api.fetch(input.taskId);
          deps.Logger.info("Task started");
          return { result: data.data };
        },
      });

      const adapter = createFlowAdapter({
        provides: TestFlowPort,
        requires: [ApiPort, LoggerPort] as const,
        activities: [TaskActivity] as const,
        machine: testMachine,
      });

      expect(adapter.provides).toBe(TestFlowPort);
      expect(adapter.requires).toEqual([ApiPort, LoggerPort]);
      expect(adapter.lifetime).toBe("scoped");
    });

    it("should create FlowAdapter without activities", () => {
      const adapter = createFlowAdapter({
        provides: TestFlowPort,
        requires: [ApiPort] as const,
        machine: testMachine,
      });

      expect(adapter.provides).toBe(TestFlowPort);
      expect(adapter.requires).toEqual([ApiPort]);
    });

    it("should accept defaultActivityTimeout", () => {
      const TaskActivity = activity(TaskActivityPort, {
        requires: [ApiPort],
        emits: TaskEvents,
        execute: async () => ({ result: "done" }),
      });

      // This should not throw
      const adapter = createFlowAdapter({
        provides: TestFlowPort,
        requires: [ApiPort] as const,
        activities: [TaskActivity] as const,
        machine: testMachine,
        defaultActivityTimeout: 30000,
      });

      expect(adapter).toBeDefined();
    });
  });

  describe("Runtime validation", () => {
    it("should throw on duplicate activity port names", () => {
      const Activity1 = activity(TaskActivityPort, {
        requires: [ApiPort],
        emits: TaskEvents,
        execute: async () => ({ result: "a" }),
      });

      const Activity2 = activity(TaskActivityPort, {
        requires: [LoggerPort],
        emits: TaskEvents,
        execute: async () => ({ result: "b" }),
      });

      expect(() => {
        createFlowAdapter({
          provides: TestFlowPort,
          requires: [ApiPort, LoggerPort] as const,
          // Using type assertion to bypass compile-time check and test runtime validation
          activities: [Activity1, Activity2] as unknown as readonly [typeof Activity1],
          machine: testMachine,
        });
      }).toThrow(/Duplicate activity port name/);
    });

    it("should throw on unfrozen activity", () => {
      // Create an unfrozen activity manually (bypassing the factory)
      const unfrozenActivity = {
        port: TaskActivityPort,
        requires: [ApiPort] as const,
        emits: TaskEvents,
        timeout: undefined,
        execute: async () => ({ result: "test" }),
      };

      expect(() => {
        createFlowAdapter({
          provides: TestFlowPort,
          requires: [ApiPort] as const,
          // Using type assertion to bypass type check and test runtime validation
          activities: [unfrozenActivity] as unknown as readonly [typeof unfrozenActivity],
          machine: testMachine,
        });
      }).toThrow(/not frozen/);
    });
  });

  describe("Activity spawning with deps", () => {
    it("should spawn activities with correct deps", async () => {
      let capturedDeps: { Api: ApiService; Logger: Logger } | undefined;

      const TaskActivity = activity(TaskActivityPort, {
        requires: [ApiPort, LoggerPort],
        emits: TaskEvents,
        execute: async (input, { deps, sink }) => {
          capturedDeps = deps;
          sink.emit(TaskEvents.PROGRESS(50));
          const data = await deps.Api.fetch(input.taskId);
          deps.Logger.info("Task completed");
          sink.emit(TaskEvents.COMPLETED(data.data));
          return { result: data.data };
        },
      });

      const mockApi: ApiService = {
        fetch: vi.fn().mockResolvedValue({ data: "test-data" }),
      };
      const mockLogger: Logger = {
        info: vi.fn(),
        warn: vi.fn(),
      };

      const flowService = createTestFlowService({ Api: mockApi, Logger: mockLogger }, [
        TaskActivity,
      ]);

      expect(flowService.state()).toBe("idle");

      // Trigger spawn via machine event
      await flowService.sendAndExecute({ type: "START" });

      // Wait a bit for the activity to execute
      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify deps were passed correctly
      expect(capturedDeps).toBeDefined();
      expect(capturedDeps?.Api).toBe(mockApi);
      expect(capturedDeps?.Logger).toBe(mockLogger);

      await flowService.dispose();
    });
  });

  describe("Activity events routing", () => {
    it("should route activity events to machine", async () => {
      const TaskActivity = activity(TaskActivityPort, {
        requires: [ApiPort],
        emits: TaskEvents,
        execute: async (input, { deps, sink }) => {
          sink.emit(TaskEvents.PROGRESS(25));
          await new Promise(r => setTimeout(r, 10));
          sink.emit(TaskEvents.PROGRESS(75));
          const data = await deps.Api.fetch(input.taskId);
          sink.emit(TaskEvents.COMPLETED(data.data));
          return { result: data.data };
        },
      });

      const mockApi: ApiService = {
        fetch: vi.fn().mockResolvedValue({ data: "test-data" }),
      };
      const mockLogger: Logger = {
        info: vi.fn(),
        warn: vi.fn(),
      };

      const flowService = createTestFlowService({ Api: mockApi, Logger: mockLogger }, [
        TaskActivity,
      ]);

      // Start the activity
      await flowService.sendAndExecute({ type: "START" });

      // Wait for activity to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that events were routed to machine
      const context = flowService.context() as TestContext;
      expect(context.lastEvent).toBe("COMPLETED");
      expect(flowService.state()).toBe("completed");

      await flowService.dispose();
    });

    it("should handle emit with type and payload separately", async () => {
      const TaskActivity = activity(TaskActivityPort, {
        requires: [ApiPort],
        emits: TaskEvents,
        execute: async (input, { deps, sink }) => {
          // Use the type+payload emit pattern
          sink.emit("PROGRESS", { percent: 50 });
          const data = await deps.Api.fetch(input.taskId);
          sink.emit("COMPLETED", { result: data.data });
          return { result: data.data };
        },
      });

      const mockApi: ApiService = {
        fetch: vi.fn().mockResolvedValue({ data: "test-data" }),
      };
      const mockLogger: Logger = {
        info: vi.fn(),
        warn: vi.fn(),
      };

      const flowService = createTestFlowService({ Api: mockApi, Logger: mockLogger }, [
        TaskActivity,
      ]);

      await flowService.sendAndExecute({ type: "START" });
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(flowService.state()).toBe("completed");

      await flowService.dispose();
    });
  });

  describe("Activity cleanup on dispose", () => {
    it("should call cleanup on activity when disposed", async () => {
      const cleanupCalled = vi.fn();

      const TaskActivity = activity(TaskActivityPort, {
        requires: [ApiPort],
        emits: TaskEvents,
        execute: async (_input, { sink, signal }) => {
          // Long-running activity
          while (!signal.aborted) {
            sink.emit(TaskEvents.PROGRESS(50));
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          return { result: "cancelled" };
        },
        cleanup: (reason, { deps }) => {
          cleanupCalled(reason);
          // deps should be accessible in cleanup
          expect(deps.Api).toBeDefined();
        },
      });

      const mockApi: ApiService = {
        fetch: vi.fn().mockResolvedValue({ data: "test-data" }),
      };
      const mockLogger: Logger = {
        info: vi.fn(),
        warn: vi.fn(),
      };

      const flowService = createTestFlowService({ Api: mockApi, Logger: mockLogger }, [
        TaskActivity,
      ]);

      // Start activity
      await flowService.sendAndExecute({ type: "START" });

      // Wait a bit for activity to start
      await new Promise(resolve => setTimeout(resolve, 30));

      // Dispose should stop the activity
      await flowService.dispose();

      // Wait for cleanup to be called
      await new Promise(resolve => setTimeout(resolve, 50));

      // Cleanup should have been called with 'cancelled' reason
      expect(cleanupCalled).toHaveBeenCalledWith("cancelled");
    });
  });

  describe("Activity not found error", () => {
    it("should throw when spawning unknown activity", async () => {
      // Create a machine that tries to spawn an activity not in the registry
      const machineWithUnknownActivity = createMachine({
        id: "test-unknown",
        initial: "idle",
        context: {},
        states: {
          idle: {
            on: {
              START: {
                target: "running",
                effects: [Effect.spawn("UnknownActivity", {})],
              },
            },
          },
          running: {
            on: {},
          },
        },
      });

      const TaskActivity = activity(TaskActivityPort, {
        requires: [ApiPort],
        emits: TaskEvents,
        execute: async () => ({ result: "done" }),
      });

      const mockApi: ApiService = {
        fetch: vi.fn().mockResolvedValue({ data: "test-data" }),
      };
      const mockLogger: Logger = {
        info: vi.fn(),
        warn: vi.fn(),
      };

      // Create a flow service manually with the wrong machine
      const activityManager = createActivityManager();
      const activityRegistry = new Map<string, ConfiguredActivityAny>();
      activityRegistry.set(TaskActivity.port.__portName, TaskActivity);

      // Create a type-unsafe scope resolver (test code only)
      const scopeResolver = {
        resolve: <P extends import("@hex-di/core").Port<unknown, string>>(p: P) => {
          if (p.__portName === "Api") return mockApi;
          if (p.__portName === "Logger") return mockLogger;
          throw new Error(`Unknown port: ${p.__portName}`);
        },
      };

      // Create activity deps resolver (test code only)
      const activityDepsResolver = (
        reqs: readonly import("@hex-di/core").Port<unknown, string>[]
      ) => {
        const result: Record<string, unknown> = {};
        for (const req of reqs) {
          if (req.__portName === "Api") result.Api = mockApi;
          if (req.__portName === "Logger") result.Logger = mockLogger;
        }
        return result;
      };

      const executor = createDIEffectExecutor({
        scope: scopeResolver as import("../../src/integration/di-executor.js").ScopeResolver,
        activityManager,
        activityRegistry,
        activityDepsResolver:
          activityDepsResolver as import("../../src/integration/adapter.js").ActivityDepsResolver,
      });

      const runner = createMachineRunner(machineWithUnknownActivity, {
        executor,
        activityManager,
      });

      // This should throw when trying to spawn unknown activity
      await expect(runner.sendAndExecute({ type: "START" })).rejects.toThrow(
        /Activity "UnknownActivity" not found/
      );

      await runner.dispose();
    });
  });
});
