/**
 * Activity API Showcase
 *
 * This comprehensive example demonstrates ALL features of the @hex-di/flow Activity API:
 *
 * 1. ActivityPort - Typed port declaration with input/output types
 * 2. defineEvents - Type-safe event factory creation
 * 3. activity() - Activity factory with requires, emits, execute, cleanup, timeout
 * 4. FlowAdapter - Integration with state machines and dependency injection
 * 5. Testing utilities - testActivity harness for unit testing
 *
 * This file serves as both:
 * - A runnable test suite verifying all functionality
 * - Documentation showing how to use the Activity API
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi } from "vitest";
import { port, createPort } from "@hex-di/core";
import {
  // Activity Ports
  activityPort,
  type ActivityInput,
  type ActivityOutput,
  // Events
  defineEvents,
  type EventOf,
  // Factory
  activity,
  // Testing
  testActivity,
  createTestEventSink,
  createTestSignal,
  createTestDeps,
  MissingMockError,
  // Integration
  createFlowAdapter,
  createFlowPort,
  createDIEffectExecutor,
  createActivityManager,
  createMachineRunner,
  createMachine,
  Effect,
  // Types
  type Machine,
} from "../../src/index.js";
import type { ConfiguredActivityAny } from "../../src/activities/types.js";

// =============================================================================
// STEP 1: Define Dependency Ports
// =============================================================================

/**
 * Define the Logger service interface and port.
 * This service will be injected into activities.
 */
interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string, error?: Error): void;
}

const LoggerPort = port<Logger>()({ name: "Logger" });

/**
 * Define the API service interface and port.
 * This service fetches data from external APIs.
 */
interface ApiService {
  fetchUser(userId: string, options?: { signal?: AbortSignal }): Promise<User>;
  fetchTasks(userId: string): Promise<Task[]>;
}

const ApiPort = port<ApiService>()({ name: "Api" });

/**
 * Define the Analytics service for tracking events.
 */
interface Analytics {
  track(event: string, data: Record<string, unknown>): void;
}

const AnalyticsPort = port<Analytics>()({ name: "Analytics" });

// =============================================================================
// STEP 2: Define Domain Types
// =============================================================================

interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}

interface Task {
  readonly id: string;
  readonly title: string;
  readonly completed: boolean;
}

// =============================================================================
// STEP 3: Define Activity Ports
// =============================================================================

/**
 * ActivityPort for fetching user data.
 *
 * The port declaration uses curried API:
 * activityPort<Input, Output>()(name)
 *
 * This creates a port that types the activity's execute function:
 * - Input: { userId: string } - what the caller passes
 * - Output: User - what the activity returns
 */
const FetchUserPort = activityPort<{ userId: string }, User>()("FetchUser");

/**
 * ActivityPort for loading tasks.
 * Demonstrates void input pattern.
 */
const LoadTasksPort = activityPort<{ userId: string }, Task[]>()("LoadTasks");

/**
 * ActivityPort for a long-running polling operation.
 * Uses void output to indicate no return value.
 */
const PollUpdatesPort = activityPort<{ interval: number }, void>()("PollUpdates");

// =============================================================================
// STEP 4: Define Events using defineEvents()
// =============================================================================

/**
 * Events for the FetchUser activity.
 *
 * defineEvents() creates type-safe event factories.
 * Each key becomes an event type, and the factory function
 * defines the payload shape.
 */
const fetchUserEvents = defineEvents({
  /** Progress update (0-100) */
  PROGRESS: (percent: number) => ({ percent }),

  /** User data has been fetched */
  USER_LOADED: (user: User) => ({ user }),

  /** Fetch failed with error */
  ERROR: (message: string) => ({ message }),
});

/**
 * Events for the LoadTasks activity.
 */
const loadTasksEvents = defineEvents({
  TASKS_LOADED: (tasks: Task[], count: number) => ({ tasks, count }),
  TASK_ERROR: (error: string) => ({ error }),
});

/**
 * Events for the polling activity.
 */
const pollEvents = defineEvents({
  UPDATE_RECEIVED: (data: Record<string, unknown>) => ({ data }),
  POLL_STOPPED: () => ({}),
});

// =============================================================================
// STEP 5: Create Activities using activity()
// =============================================================================

/**
 * FetchUser Activity - Demonstrates all activity features:
 *
 * - requires: Dependencies from the container
 * - emits: Events that can be sent to the machine
 * - timeout: Maximum execution time
 * - execute: Main activity logic
 * - cleanup: Called on completion, error, or cancellation
 */
const FetchUserActivity = activity(FetchUserPort, {
  // Dependencies - resolved from FlowAdapter's requires
  requires: [LoggerPort, ApiPort] as const,

  // Events - type-safe emission
  emits: fetchUserEvents,

  // Optional timeout (uses activity manager's default if not set)
  timeout: 5000,

  // Main execution logic
  execute: async (input, { deps, sink, signal }) => {
    // Access typed dependencies
    deps.Logger.info(`Fetching user ${input.userId}...`);

    // Emit progress event
    sink.emit(fetchUserEvents.PROGRESS(10));

    // Check for cancellation
    if (signal.aborted) {
      throw new Error("Fetch cancelled");
    }

    // Call API with abort signal
    try {
      const user = await deps.Api.fetchUser(input.userId, { signal });

      // Emit completion event
      sink.emit(fetchUserEvents.PROGRESS(100));
      sink.emit(fetchUserEvents.USER_LOADED(user));

      return user;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      deps.Logger.error(`Failed to fetch user: ${message}`);
      sink.emit(fetchUserEvents.ERROR(message));
      throw error;
    }
  },

  // Cleanup - called with reason: 'completed' | 'error' | 'cancelled' | 'timeout'
  cleanup: (reason, { deps }) => {
    deps.Logger.info(`FetchUser cleanup: ${reason}`);
  },
});

/**
 * LoadTasks Activity - Demonstrates activity with multiple deps.
 */
const LoadTasksActivity = activity(LoadTasksPort, {
  requires: [ApiPort, AnalyticsPort] as const,
  emits: loadTasksEvents,

  execute: async (input, { deps, sink }) => {
    deps.Analytics.track("tasks_load_start", { userId: input.userId });

    const tasks = await deps.Api.fetchTasks(input.userId);

    sink.emit(loadTasksEvents.TASKS_LOADED(tasks, tasks.length));
    deps.Analytics.track("tasks_load_complete", { count: tasks.length });

    return tasks;
  },
});

/**
 * PollUpdates Activity - Demonstrates long-running activity with signal.
 */
const PollUpdatesActivity = activity(PollUpdatesPort, {
  requires: [LoggerPort] as const,
  emits: pollEvents,
  timeout: 60000, // 1 minute max

  execute: async (input, { deps, sink, signal }) => {
    deps.Logger.info(`Starting poll with ${input.interval}ms interval`);

    let iteration = 0;
    while (!signal.aborted) {
      // Simulate receiving an update
      iteration++;
      sink.emit(pollEvents.UPDATE_RECEIVED({ iteration }));

      // Wait for next interval (using signal for cancellation)
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, input.interval);

        // Handle abort
        signal.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(new Error("Polling stopped"));
          },
          { once: true }
        );
      });
    }
  },

  cleanup: (reason, { deps }) => {
    deps.Logger.info(`Polling stopped: ${reason}`);
  },
});

// =============================================================================
// STEP 6: Create State Machine and FlowAdapter
// =============================================================================

/**
 * Machine context - stores state data.
 */
interface DashboardContext {
  readonly user: User | null;
  readonly tasks: Task[];
  readonly progress: number;
  readonly error: string | null;
}

/**
 * Create the state machine.
 */
const dashboardMachine = createMachine({
  id: "dashboard",
  initial: "idle",
  context: {
    user: null,
    tasks: [],
    progress: 0,
    error: null,
  } satisfies DashboardContext,
  states: {
    idle: {
      on: {
        LOAD_USER: {
          target: "loadingUser",
          effects: [Effect.spawn("FetchUser", { userId: "user-123" })],
        },
      },
    },
    loadingUser: {
      on: {
        PROGRESS: {
          target: "loadingUser",
          actions: [
            (ctx: DashboardContext, e: { type: "PROGRESS"; percent: number }) => ({
              ...ctx,
              progress: e.percent,
            }),
          ],
        },
        USER_LOADED: {
          target: "loadingTasks",
          actions: [
            (ctx: DashboardContext, e: { type: "USER_LOADED"; user: User }) => ({
              ...ctx,
              user: e.user,
            }),
          ],
          effects: [Effect.spawn("LoadTasks", { userId: "user-123" })],
        },
        ERROR: {
          target: "error",
          actions: [
            (ctx: DashboardContext, e: { type: "ERROR"; message: string }) => ({
              ...ctx,
              error: e.message,
            }),
          ],
        },
      },
    },
    loadingTasks: {
      on: {
        TASKS_LOADED: {
          target: "ready",
          actions: [
            (ctx: DashboardContext, e: { type: "TASKS_LOADED"; tasks: Task[] }) => ({
              ...ctx,
              tasks: e.tasks,
            }),
          ],
        },
        TASK_ERROR: {
          target: "error",
          actions: [
            (ctx: DashboardContext, e: { type: "TASK_ERROR"; error: string }) => ({
              ...ctx,
              error: e.error,
            }),
          ],
        },
      },
    },
    ready: {
      on: {
        START_POLLING: {
          target: "polling",
          effects: [Effect.spawn("PollUpdates", { interval: 1000 })],
        },
        REFRESH: {
          target: "loadingUser",
          effects: [Effect.spawn("FetchUser", { userId: "user-123" })],
        },
      },
    },
    polling: {
      on: {
        UPDATE_RECEIVED: {
          target: "polling",
          // Just log, don't update context
        },
        STOP_POLLING: {
          target: "ready",
          effects: [Effect.stop("PollUpdates")],
        },
      },
    },
    error: {
      on: {
        RETRY: {
          target: "loadingUser",
          actions: [(ctx: DashboardContext) => ({ ...ctx, error: null })],
          effects: [Effect.spawn("FetchUser", { userId: "user-123" })],
        },
      },
    },
  },
});

/**
 * Define the FlowPort for the dashboard flow.
 */
const DashboardFlowPort = createFlowPort<
  "idle" | "loadingUser" | "loadingTasks" | "ready" | "polling" | "error",
  | "LOAD_USER"
  | "PROGRESS"
  | "USER_LOADED"
  | "ERROR"
  | "TASKS_LOADED"
  | "TASK_ERROR"
  | "START_POLLING"
  | "UPDATE_RECEIVED"
  | "STOP_POLLING"
  | "REFRESH"
  | "RETRY",
  DashboardContext
>("DashboardFlow");

/**
 * Create the FlowAdapter with all activities.
 */
const DashboardFlowAdapter = createFlowAdapter({
  provides: DashboardFlowPort,

  // All dependencies needed by activities
  requires: [LoggerPort, ApiPort, AnalyticsPort] as const,

  // All activities this flow can spawn
  activities: [FetchUserActivity, LoadTasksActivity, PollUpdatesActivity] as const,

  machine: dashboardMachine,

  // Default timeout for activities without explicit timeout
  defaultActivityTimeout: 30000,
});

// =============================================================================
// TESTS: Verify all Activity API features
// =============================================================================

describe("Activity API Showcase", () => {
  // ==========================================================================
  // Test: Activity Port Type Extraction
  // ==========================================================================

  describe("ActivityPort type utilities", () => {
    it("should correctly infer input type from port", () => {
      type Input = ActivityInput<typeof FetchUserPort>;

      // TypeScript compile-time check - if this compiles, the type is correct
      const _input: Input = { userId: "123" };
      expect(_input.userId).toBe("123");
    });

    it("should correctly infer output type from port", () => {
      type Output = ActivityOutput<typeof FetchUserPort>;

      // TypeScript compile-time check
      const _output: Output = { id: "1", name: "Test", email: "test@example.com" };
      expect(_output.id).toBe("1");
    });
  });

  // ==========================================================================
  // Test: Event Definition and Type Safety
  // ==========================================================================

  describe("defineEvents type safety", () => {
    it("should create type-safe event factories", () => {
      const event = fetchUserEvents.PROGRESS(50);

      expect(event.type).toBe("PROGRESS");
      expect(event.percent).toBe(50);
    });

    it("should type EventOf to extract event union", () => {
      type Events = EventOf<typeof fetchUserEvents>;

      // This should compile - shows type union works
      const _progressEvent: Events = { type: "PROGRESS", percent: 50 };
      const _loadedEvent: Events = {
        type: "USER_LOADED",
        user: { id: "1", name: "Test", email: "test@test.com" },
      };
      const _errorEvent: Events = { type: "ERROR", message: "Failed" };

      expect(_progressEvent.type).toBe("PROGRESS");
      expect(_loadedEvent.type).toBe("USER_LOADED");
      expect(_errorEvent.type).toBe("ERROR");
    });
  });

  // ==========================================================================
  // Test: Activity Factory
  // ==========================================================================

  describe("activity() factory", () => {
    it("should create frozen activity object", () => {
      expect(Object.isFrozen(FetchUserActivity)).toBe(true);
    });

    it("should preserve port reference", () => {
      expect(FetchUserActivity.port).toBe(FetchUserPort);
    });

    it("should preserve requires array", () => {
      expect(FetchUserActivity.requires).toEqual([LoggerPort, ApiPort]);
    });

    it("should preserve emits definition", () => {
      expect(FetchUserActivity.emits).toBe(fetchUserEvents);
    });

    it("should preserve timeout", () => {
      expect(FetchUserActivity.timeout).toBe(5000);
    });
  });

  // ==========================================================================
  // Test: Testing Utilities
  // ==========================================================================

  describe("Testing utilities", () => {
    describe("createTestEventSink", () => {
      it("should capture emitted events", () => {
        const sink = createTestEventSink<typeof fetchUserEvents>();

        sink.emit(fetchUserEvents.PROGRESS(25));
        sink.emit(fetchUserEvents.PROGRESS(50));
        sink.emit(
          fetchUserEvents.USER_LOADED({
            id: "1",
            name: "Test User",
            email: "test@example.com",
          })
        );

        expect(sink.events).toHaveLength(3);
        expect(sink.events[0]).toEqual({ type: "PROGRESS", percent: 25 });
        expect(sink.events[1]).toEqual({ type: "PROGRESS", percent: 50 });
        expect(sink.events[2]).toMatchObject({ type: "USER_LOADED" });
      });
    });

    describe("createTestSignal", () => {
      it("should not be aborted initially", () => {
        const signal = createTestSignal();
        expect(signal.aborted).toBe(false);
      });

      it("should abort with reason", () => {
        const signal = createTestSignal();
        signal.abort("test reason");

        expect(signal.aborted).toBe(true);
        expect(signal.reason).toBe("test reason");
      });

      it("should handle timeout", async () => {
        const signal = createTestSignal();
        signal.timeout(50);

        // Not aborted yet
        expect(signal.aborted).toBe(false);

        // Wait for timeout
        await new Promise(r => setTimeout(r, 100));

        expect(signal.aborted).toBe(true);
        expect(signal.reason).toMatch(/Timeout/);
      });
    });

    describe("createTestDeps", () => {
      it("should create deps from mocks", () => {
        const mockLogger: Logger = {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        };

        const mockApi: ApiService = {
          fetchUser: vi.fn(),
          fetchTasks: vi.fn(),
        };

        const deps = createTestDeps(FetchUserActivity.requires, {
          Logger: mockLogger,
          Api: mockApi,
        });

        expect(deps.Logger).toBe(mockLogger);
        expect(deps.Api).toBe(mockApi);
      });

      it("should throw MissingMockError for missing deps", () => {
        const mockLogger: Logger = {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        };

        expect(() => {
          createTestDeps(FetchUserActivity.requires, {
            Logger: mockLogger,
            // Api is missing!
          });
        }).toThrow(MissingMockError);
      });
    });

    describe("testActivity harness", () => {
      it("should run activity and capture results", async () => {
        const mockLogger: Logger = {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        };

        const mockUser: User = {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
        };

        const mockApi: ApiService = {
          fetchUser: vi.fn().mockResolvedValue(mockUser),
          fetchTasks: vi.fn(),
        };

        const { result, status, events, cleanupCalled, cleanupReason } = await testActivity(
          FetchUserActivity,
          {
            input: { userId: "user-123" },
            deps: { Logger: mockLogger, Api: mockApi },
          }
        );

        // Check result
        expect(status).toBe("completed");
        expect(result).toEqual(mockUser);

        // Check events
        expect(events).toContainEqual({ type: "PROGRESS", percent: 10 });
        expect(events).toContainEqual({ type: "PROGRESS", percent: 100 });
        expect(events).toContainEqual(expect.objectContaining({ type: "USER_LOADED" }));

        // Check cleanup
        expect(cleanupCalled).toBe(true);
        expect(cleanupReason).toBe("completed");
      });

      it("should handle errors", async () => {
        const mockLogger: Logger = {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        };

        const mockApi: ApiService = {
          fetchUser: vi.fn().mockRejectedValue(new Error("Network error")),
          fetchTasks: vi.fn(),
        };

        const { result, error, status, cleanupCalled, cleanupReason } = await testActivity(
          FetchUserActivity,
          {
            input: { userId: "user-123" },
            deps: { Logger: mockLogger, Api: mockApi },
          }
        );

        expect(status).toBe("failed");
        expect(result).toBeUndefined();
        expect(error?.message).toBe("Network error");
        expect(cleanupCalled).toBe(true);
        expect(cleanupReason).toBe("error");
      });

      it("should handle cancellation via abortAfter", async () => {
        const mockLogger: Logger = {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        };

        // Activity that responds to abort signal
        const CancellableActivity = activity(
          activityPort<{ delay: number }, void>()("Cancellable"),
          {
            requires: [LoggerPort] as const,
            emits: defineEvents({}),
            execute: async (_input, { signal }) => {
              // Wait indefinitely (until cancelled)
              await new Promise((_, reject) => {
                signal.addEventListener("abort", () => reject(new Error("Aborted")));
              });
            },
            cleanup: (reason, { deps }) => {
              deps.Logger.info(`Cleanup: ${reason}`);
            },
          }
        );

        const { status, cleanupCalled, cleanupReason } = await testActivity(CancellableActivity, {
          input: { delay: 1000 },
          deps: { Logger: mockLogger },
          abortAfter: 50, // Cancel after 50ms
        });

        expect(status).toBe("cancelled");
        expect(cleanupCalled).toBe(true);
        expect(cleanupReason).toBe("cancelled");
      });

      it("should handle timeout", async () => {
        const mockLogger: Logger = {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        };

        // Activity that responds to signal (required for timeout to work)
        const TimeoutActivity = activity(activityPort<Record<string, never>, void>()("Timeout"), {
          requires: [LoggerPort] as const,
          emits: defineEvents({}),
          execute: async (_input, { signal }) => {
            // Wait until signal is aborted (by timeout)
            await new Promise<void>((_, reject) => {
              const checkAbort = (): void => {
                if (signal.aborted) {
                  reject(new Error("Timed out"));
                  return;
                }
                setTimeout(checkAbort, 10);
              };
              checkAbort();
            });
          },
          cleanup: () => {},
        });

        const { status, cleanupReason } = await testActivity(TimeoutActivity, {
          input: {},
          deps: { Logger: mockLogger },
          timeout: 50, // Timeout after 50ms
        });

        expect(status).toBe("timeout");
        expect(cleanupReason).toBe("timeout");
      });
    });
  });

  // ==========================================================================
  // Test: FlowAdapter Creation
  // ==========================================================================

  describe("FlowAdapter with activities", () => {
    it("should create adapter with activities", () => {
      expect(DashboardFlowAdapter.provides).toBe(DashboardFlowPort);
      expect(DashboardFlowAdapter.requires).toEqual([LoggerPort, ApiPort, AnalyticsPort]);
      expect(DashboardFlowAdapter.lifetime).toBe("scoped");
    });
  });

  // ==========================================================================
  // Test: Full Integration Flow
  // ==========================================================================

  describe("Full integration flow", () => {
    /**
     * Helper to create a test flow service with mock dependencies.
     * Uses the branded Machine type to accept properly created machines.
     */
    function createTestFlowService(
      deps: { Logger: Logger; Api: ApiService; Analytics: Analytics },
      activities: readonly ConfiguredActivityAny[],
      machine: Machine<string, string, unknown>
    ) {
      const activityManager = createActivityManager({
        defaultTimeout: 30000,
      });

      const activityRegistry = new Map<string, ConfiguredActivityAny>();
      for (const act of activities) {
        activityRegistry.set(act.port.__portName, act);
      }

      const scopeResolver = {
        resolve: <P extends import("@hex-di/core").Port<unknown, string>>(p: P) => {
          if (p.__portName === "Logger") return deps.Logger;
          if (p.__portName === "Api") return deps.Api;
          if (p.__portName === "Analytics") return deps.Analytics;
          throw new Error(`Unknown port: ${p.__portName}`);
        },
      };

      const activityDepsResolver = (
        reqs: readonly import("@hex-di/core").Port<unknown, string>[]
      ) => {
        const result: Record<string, unknown> = {};
        for (const req of reqs) {
          if (req.__portName === "Logger") result.Logger = deps.Logger;
          if (req.__portName === "Api") result.Api = deps.Api;
          if (req.__portName === "Analytics") result.Analytics = deps.Analytics;
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

      const runner = createMachineRunner(machine, {
        executor,
        activityManager,
      });

      executor.setEventSink({
        emit: event => {
          runner.send(event as Parameters<typeof runner.send>[0]);
        },
      });

      return runner;
    }

    it("should run single activity flow: load user", async () => {
      // Simple machine with single activity
      const simpleMachine = createMachine({
        id: "simple-load",
        initial: "idle",
        context: { user: null as User | null },
        states: {
          idle: {
            on: {
              LOAD_USER: {
                target: "loading",
                effects: [Effect.spawn("FetchUser", { userId: "user-123" })],
              },
            },
          },
          loading: {
            on: {
              PROGRESS: {
                target: "loading",
              },
              USER_LOADED: {
                target: "done",
                actions: [
                  (ctx: { user: User | null }, e: { type: "USER_LOADED"; user: User }) => ({
                    ...ctx,
                    user: e.user,
                  }),
                ],
              },
            },
          },
          done: {
            on: {},
          },
        },
      });

      const mockUser: User = {
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
      };

      const mockLogger: Logger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const mockApi: ApiService = {
        fetchUser: vi.fn().mockResolvedValue(mockUser),
        fetchTasks: vi.fn(),
      };

      const mockAnalytics: Analytics = {
        track: vi.fn(),
      };

      const runner = createTestFlowService(
        { Logger: mockLogger, Api: mockApi, Analytics: mockAnalytics },
        [FetchUserActivity],
        simpleMachine
      );

      // Initial state
      expect(runner.state()).toBe("idle");

      // Trigger user load
      await runner.sendAndExecute({ type: "LOAD_USER" });

      // Wait for activity to complete
      await new Promise(r => setTimeout(r, 100));

      // Should be in done state with user
      expect(runner.state()).toBe("done");
      // Access context property via type-safe accessor
      const ctx = runner.context() as { user: User | null };
      expect(ctx.user).toEqual(mockUser);

      // Verify API was called
      expect(mockApi.fetchUser).toHaveBeenCalledWith("user-123", expect.anything());

      await runner.dispose();
    });

    it("should handle shared dependencies across activities", async () => {
      // Verify that both activities receive the same logger instance
      let capturedLogger1: Logger | undefined;

      const Activity1 = activity(FetchUserPort, {
        requires: [LoggerPort, ApiPort] as const,
        emits: fetchUserEvents,
        execute: async (_input, { deps }) => {
          capturedLogger1 = deps.Logger;
          return { id: "1", name: "Test", email: "test@test.com" };
        },
      });

      const simpleMachine = createMachine({
        id: "simple",
        initial: "idle",
        context: {},
        states: {
          idle: {
            on: {
              START: {
                target: "running",
                effects: [Effect.spawn("FetchUser", { userId: "123" })],
              },
            },
          },
          running: {
            on: {
              USER_LOADED: {
                target: "done",
              },
              PROGRESS: {
                target: "running",
              },
            },
          },
          done: {
            on: {},
          },
        },
      });

      const mockLogger: Logger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const mockApi: ApiService = {
        fetchUser: vi.fn().mockResolvedValue({ id: "1", name: "Test", email: "test@test.com" }),
        fetchTasks: vi.fn().mockResolvedValue([]),
      };

      const mockAnalytics: Analytics = {
        track: vi.fn(),
      };

      const runner = createTestFlowService(
        { Logger: mockLogger, Api: mockApi, Analytics: mockAnalytics },
        [Activity1],
        simpleMachine
      );

      await runner.sendAndExecute({ type: "START" });
      await new Promise(r => setTimeout(r, 100));

      // Activity should have received the correct logger instance
      expect(capturedLogger1).toBe(mockLogger);

      await runner.dispose();
    });

    it("should cleanup activities on dispose", async () => {
      const cleanupCalled = vi.fn();

      const LongRunningActivity = activity(PollUpdatesPort, {
        requires: [LoggerPort] as const,
        emits: pollEvents,
        execute: async (_input, { signal }) => {
          while (!signal.aborted) {
            await new Promise(r => setTimeout(r, 10));
          }
        },
        cleanup: reason => {
          cleanupCalled(reason);
        },
      });

      const mockLogger: Logger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const mockApi: ApiService = {
        fetchUser: vi.fn().mockResolvedValue({ id: "1", name: "Test", email: "test@test.com" }),
        fetchTasks: vi.fn().mockResolvedValue([]),
      };

      const mockAnalytics: Analytics = {
        track: vi.fn(),
      };

      // Create a simpler machine that directly spawns the polling activity
      const simpleMachine = createMachine({
        id: "simple",
        initial: "idle",
        context: {},
        states: {
          idle: {
            on: {
              START: {
                target: "polling",
                effects: [Effect.spawn("PollUpdates", { interval: 10 })],
              },
            },
          },
          polling: {
            on: {},
          },
        },
      });

      const activityManager = createActivityManager();
      const activityRegistry = new Map<string, ConfiguredActivityAny>();
      activityRegistry.set(LongRunningActivity.port.__portName, LongRunningActivity);

      const scopeResolver = {
        resolve: <P extends import("@hex-di/core").Port<unknown, string>>(p: P) => {
          if (p.__portName === "Logger") return mockLogger;
          if (p.__portName === "Api") return mockApi;
          if (p.__portName === "Analytics") return mockAnalytics;
          throw new Error(`Unknown port: ${p.__portName}`);
        },
      };

      const activityDepsResolver = (
        reqs: readonly import("@hex-di/core").Port<unknown, string>[]
      ) => {
        const result: Record<string, unknown> = {};
        for (const req of reqs) {
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

      const runner = createMachineRunner(simpleMachine, {
        executor,
        activityManager,
      });

      executor.setEventSink({
        emit: event => {
          runner.send(event as Parameters<typeof runner.send>[0]);
        },
      });

      // Start polling
      await runner.sendAndExecute({ type: "START" });

      // Wait for activity to start
      await new Promise(r => setTimeout(r, 50));

      // Dispose should stop the activity and call cleanup
      await runner.dispose();

      // Wait for cleanup
      await new Promise(r => setTimeout(r, 50));

      expect(cleanupCalled).toHaveBeenCalledWith("cancelled");
    });
  });
});
