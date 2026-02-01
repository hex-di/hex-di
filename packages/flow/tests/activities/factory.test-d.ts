/**
 * Type-level tests for activity() factory
 *
 * These tests verify:
 * 1. activity(port, config) returns correctly typed ConfiguredActivity
 * 2. requires tuple types preserved via const modifier
 * 3. deps object type matches ResolvedActivityDeps<TRequires>
 * 4. sink type matches TypedEventSink<TEvents>
 * 5. execute input type matches ActivityInput<TPort>
 * 6. execute return type matches ActivityOutput<TPort>
 * 7. cleanup receives CleanupReason and deps-only context
 * 8. ConfiguredActivity is assignable to ConfiguredActivityAny
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import { port } from "@hex-di/core";
import { activityPort } from "../../src/activities/port.js";
import { defineEvents, type TypedEventSink } from "../../src/activities/events.js";
import { activity } from "../../src/activities/factory.js";
import type {
  CleanupReason,
  ResolvedActivityDeps,
  ActivityContext,
  ConfiguredActivity,
  ConfiguredActivityAny,
} from "../../src/activities/types.js";

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
const VoidActivityPort = activityPort<void, void>()("VoidActivity");
const SimpleActivityPort = activityPort<number, string>()("SimpleActivity");

const TaskEvents = defineEvents({
  PROGRESS: (percent: number) => ({ percent }),
  COMPLETED: (result: TaskResult) => ({ result }),
});

const EmptyEvents = defineEvents({
  DONE: () => ({}),
});

// =============================================================================
// Test 1: activity(port, config) returns correctly typed ConfiguredActivity
// =============================================================================

describe("activity(port, config) returns correctly typed ConfiguredActivity", () => {
  it("returns ConfiguredActivity with correct type parameters", () => {
    const TaskActivity = activity(TaskActivityPort, {
      requires: [ApiPort, LoggerPort],
      emits: TaskEvents,
      timeout: 30_000,
      execute: async (input, { deps, sink }) => {
        sink.emit(TaskEvents.PROGRESS(0));
        const result = await deps.Api.fetch(input.taskId);
        deps.Logger.info("Complete");
        sink.emit(TaskEvents.COMPLETED(result));
        return result;
      },
    });

    expectTypeOf(TaskActivity).toMatchTypeOf<
      ConfiguredActivity<
        typeof TaskActivityPort,
        readonly [typeof ApiPort, typeof LoggerPort],
        typeof TaskEvents
      >
    >();
  });

  it("preserves port reference in returned activity", () => {
    const TaskActivity = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: async (input, { deps }) => deps.Api.fetch(input.taskId),
    });

    expectTypeOf(TaskActivity.port).toEqualTypeOf(TaskActivityPort);
  });

  it("preserves timeout value in returned activity", () => {
    const WithTimeout = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      timeout: 5000,
      execute: async (input, { deps }) => deps.Api.fetch(input.taskId),
    });

    const WithoutTimeout = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: async (input, { deps }) => deps.Api.fetch(input.taskId),
    });

    expectTypeOf(WithTimeout.timeout).toEqualTypeOf<number | undefined>();
    expectTypeOf(WithoutTimeout.timeout).toEqualTypeOf<number | undefined>();
  });
});

// =============================================================================
// Test 2: requires tuple types preserved via const modifier
// =============================================================================

describe("requires tuple types preserved via const modifier", () => {
  it("preserves requires as readonly tuple", () => {
    const TaskActivity = activity(TaskActivityPort, {
      requires: [ApiPort, LoggerPort],
      emits: TaskEvents,
      execute: async (input, { deps }) => deps.Api.fetch(input.taskId),
    });

    expectTypeOf(TaskActivity.requires).toEqualTypeOf<
      readonly [typeof ApiPort, typeof LoggerPort]
    >();
  });

  it("preserves single-element requires tuple", () => {
    const SingleDep = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: async (input, { deps }) => deps.Api.fetch(input.taskId),
    });

    expectTypeOf(SingleDep.requires).toEqualTypeOf<readonly [typeof ApiPort]>();
  });

  it("preserves empty requires tuple", () => {
    const NoDeps = activity(SimpleActivityPort, {
      requires: [],
      emits: EmptyEvents,
      execute: async n => String(n * 2),
    });

    expectTypeOf(NoDeps.requires).toEqualTypeOf<readonly []>();
  });

  it("preserves order of ports in requires tuple", () => {
    const OrderA = activity(TaskActivityPort, {
      requires: [ApiPort, LoggerPort],
      emits: TaskEvents,
      execute: async (input, { deps }) => deps.Api.fetch(input.taskId),
    });

    const OrderB = activity(TaskActivityPort, {
      requires: [LoggerPort, ApiPort],
      emits: TaskEvents,
      execute: async (input, { deps }) => deps.Api.fetch(input.taskId),
    });

    // Different order = different types
    expectTypeOf(OrderA.requires).not.toEqualTypeOf(OrderB.requires);
  });
});

// =============================================================================
// Test 3: deps object type matches ResolvedActivityDeps<TRequires>
// =============================================================================

describe("deps object type matches ResolvedActivityDeps<TRequires>", () => {
  it("provides deps keyed by port name with correct service types", () => {
    activity(TaskActivityPort, {
      requires: [ApiPort, LoggerPort],
      emits: TaskEvents,
      execute: async (input, { deps }) => {
        // Verify deps has correct shape
        expectTypeOf(deps).toEqualTypeOf<{ Api: ApiService; Logger: Logger }>();

        // Verify each service type
        expectTypeOf(deps.Api).toEqualTypeOf<ApiService>();
        expectTypeOf(deps.Logger).toEqualTypeOf<Logger>();

        return deps.Api.fetch(input.taskId);
      },
    });
  });

  it("provides empty deps object for empty requires", () => {
    activity(SimpleActivityPort, {
      requires: [],
      emits: EmptyEvents,
      execute: async (n, { deps }) => {
        // Empty tuple produces empty object type (mapped type over never results in {})
        // Verify deps has no properties by checking it's an empty object
        expectTypeOf(deps).toMatchTypeOf<Record<string, unknown>>();
        // Can't access any properties
        type DepsKeys = keyof typeof deps;
        expectTypeOf<DepsKeys>().toEqualTypeOf<never>();
        return String(n);
      },
    });
  });

  it("ResolvedActivityDeps type utility produces correct type", () => {
    type TwoPortDeps = ResolvedActivityDeps<readonly [typeof ApiPort, typeof LoggerPort]>;
    expectTypeOf<TwoPortDeps>().toEqualTypeOf<{ Api: ApiService; Logger: Logger }>();

    type SinglePortDeps = ResolvedActivityDeps<readonly [typeof ApiPort]>;
    expectTypeOf<SinglePortDeps>().toEqualTypeOf<{ Api: ApiService }>();

    // Empty tuple mapped type produces {} (empty object), not Record<string, never>
    type EmptyDeps = ResolvedActivityDeps<readonly []>;
    type EmptyDepsKeys = keyof EmptyDeps;
    expectTypeOf<EmptyDepsKeys>().toEqualTypeOf<never>();
  });
});

// =============================================================================
// Test 4: sink type matches TypedEventSink<TEvents>
// =============================================================================

describe("sink type matches TypedEventSink<TEvents>", () => {
  it("provides correctly typed event sink", () => {
    activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: async (input, { deps, sink }) => {
        // Verify sink type
        expectTypeOf(sink).toEqualTypeOf<TypedEventSink<typeof TaskEvents>>();

        // Verify emit accepts correct event types
        sink.emit(TaskEvents.PROGRESS(50));
        sink.emit(TaskEvents.COMPLETED({ data: "test", status: "success" }));

        // Verify emit accepts type string + payload
        sink.emit("PROGRESS", { percent: 75 });
        sink.emit("COMPLETED", { result: { data: "test", status: "success" } });

        return deps.Api.fetch(input.taskId);
      },
    });
  });

  it("provides typed sink for empty events", () => {
    activity(SimpleActivityPort, {
      requires: [],
      emits: EmptyEvents,
      execute: async (n, { sink }) => {
        expectTypeOf(sink).toEqualTypeOf<TypedEventSink<typeof EmptyEvents>>();

        // Empty payload events work
        sink.emit(EmptyEvents.DONE());
        sink.emit("DONE");

        return String(n);
      },
    });
  });
});

// =============================================================================
// Test 5: execute input type matches ActivityInput<TPort>
// =============================================================================

describe("execute input type matches ActivityInput<TPort>", () => {
  it("infers correct input type from port", () => {
    activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: async input => {
        // Input should be { taskId: string }
        expectTypeOf(input).toEqualTypeOf<{ taskId: string }>();
        expectTypeOf(input.taskId).toBeString();

        return { data: "result", status: "success" as const };
      },
    });
  });

  it("handles void input type", () => {
    activity(VoidActivityPort, {
      requires: [],
      emits: EmptyEvents,
      execute: async input => {
        expectTypeOf(input).toEqualTypeOf<void>();
      },
    });
  });

  it("handles primitive input type", () => {
    activity(SimpleActivityPort, {
      requires: [],
      emits: EmptyEvents,
      execute: async input => {
        expectTypeOf(input).toBeNumber();
        return String(input);
      },
    });
  });
});

// =============================================================================
// Test 6: execute return type matches ActivityOutput<TPort>
// =============================================================================

describe("execute return type matches ActivityOutput<TPort>", () => {
  it("enforces correct return type from port", () => {
    const TaskActivity = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: async (input, { deps }) => {
        const result = await deps.Api.fetch(input.taskId);
        // Return type must be TaskResult
        return result;
      },
    });

    // The execute function should return Promise<TaskResult>
    expectTypeOf(TaskActivity.execute).returns.resolves.toEqualTypeOf<TaskResult>();
  });

  it("handles void output type", () => {
    const VoidActivity = activity(VoidActivityPort, {
      requires: [],
      emits: EmptyEvents,
      execute: async () => {
        // No return statement needed for void
      },
    });

    expectTypeOf(VoidActivity.execute).returns.resolves.toEqualTypeOf<void>();
  });

  it("handles primitive output type", () => {
    const SimpleActivity = activity(SimpleActivityPort, {
      requires: [],
      emits: EmptyEvents,
      execute: async n => String(n),
    });

    expectTypeOf(SimpleActivity.execute).returns.resolves.toBeString();
  });
});

// =============================================================================
// Test 7: cleanup receives CleanupReason and deps-only context
// =============================================================================

describe("cleanup receives CleanupReason and deps-only context", () => {
  it("cleanup receives correct CleanupReason type", () => {
    activity(TaskActivityPort, {
      requires: [ApiPort, LoggerPort],
      emits: TaskEvents,
      execute: async (input, { deps }) => deps.Api.fetch(input.taskId),
      cleanup: async reason => {
        expectTypeOf(reason).toEqualTypeOf<CleanupReason>();

        // CleanupReason should be the union type
        expectTypeOf<CleanupReason>().toEqualTypeOf<
          "completed" | "cancelled" | "timeout" | "error"
        >();
      },
    });
  });

  it("cleanup context has only deps (no sink or signal)", () => {
    activity(TaskActivityPort, {
      requires: [ApiPort, LoggerPort],
      emits: TaskEvents,
      execute: async (input, { deps }) => deps.Api.fetch(input.taskId),
      cleanup: async (reason, context) => {
        // Context should only have deps
        expectTypeOf(context).toEqualTypeOf<{
          readonly deps: { Api: ApiService; Logger: Logger };
        }>();

        // deps should be accessible
        expectTypeOf(context.deps).toEqualTypeOf<{ Api: ApiService; Logger: Logger }>();
        expectTypeOf(context.deps.Logger).toEqualTypeOf<Logger>();

        // TypeScript should error if we try to access sink or signal
        // @ts-expect-error - sink is not available in cleanup context
        void context.sink;
        // @ts-expect-error - signal is not available in cleanup context
        void context.signal;

        context.deps.Logger.warn("Cleanup", { reason });
      },
    });
  });

  it("cleanup is optional", () => {
    const WithCleanup = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: async (input, { deps }) => deps.Api.fetch(input.taskId),
      cleanup: async () => {},
    });

    const WithoutCleanup = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: async (input, { deps }) => deps.Api.fetch(input.taskId),
    });

    // Both should be valid ConfiguredActivity
    // WithCleanup has cleanup defined (it's a function)
    expectTypeOf(WithCleanup.cleanup).not.toBeUndefined();

    // WithoutCleanup has cleanup as optional - the type allows undefined
    // We verify it can be called conditionally
    if (WithoutCleanup.cleanup !== undefined) {
      // Type narrowing works - this would be the cleanup function type
      expectTypeOf(WithoutCleanup.cleanup).toBeFunction();
    }
  });

  it("cleanup can return void or Promise<void>", () => {
    // Sync cleanup
    activity(TaskActivityPort, {
      requires: [LoggerPort],
      emits: TaskEvents,
      execute: async () => ({ data: "test", status: "success" as const }),
      cleanup: (reason, { deps }) => {
        deps.Logger.info(`Cleanup: ${reason}`);
        // No return - void
      },
    });

    // Async cleanup
    activity(TaskActivityPort, {
      requires: [LoggerPort],
      emits: TaskEvents,
      execute: async () => ({ data: "test", status: "success" as const }),
      cleanup: async (reason, { deps }) => {
        deps.Logger.info(`Cleanup: ${reason}`);
        await Promise.resolve();
        // Returns Promise<void>
      },
    });
  });
});

// =============================================================================
// Test 8: ConfiguredActivity is assignable to ConfiguredActivityAny
// =============================================================================

describe("ConfiguredActivity is assignable to ConfiguredActivityAny", () => {
  it("any ConfiguredActivity is assignable to ConfiguredActivityAny", () => {
    const TaskActivity = activity(TaskActivityPort, {
      requires: [ApiPort, LoggerPort],
      emits: TaskEvents,
      timeout: 30_000,
      execute: async (input, { deps }) => deps.Api.fetch(input.taskId),
      cleanup: async (reason, { deps }) => {
        deps.Logger.warn("Cleanup", { reason });
      },
    });

    expectTypeOf(TaskActivity).toMatchTypeOf<ConfiguredActivityAny>();
  });

  it("ConfiguredActivity without cleanup is assignable to ConfiguredActivityAny", () => {
    const SimpleActivity = activity(SimpleActivityPort, {
      requires: [],
      emits: EmptyEvents,
      execute: async n => String(n),
    });

    expectTypeOf(SimpleActivity).toMatchTypeOf<ConfiguredActivityAny>();
  });

  it("ConfiguredActivity with empty deps is assignable to ConfiguredActivityAny", () => {
    const NoDepsActivity = activity(VoidActivityPort, {
      requires: [],
      emits: EmptyEvents,
      execute: async () => {},
    });

    expectTypeOf(NoDepsActivity).toMatchTypeOf<ConfiguredActivityAny>();
  });

  it("function accepting ConfiguredActivityAny works with any activity", () => {
    function processActivity<A extends ConfiguredActivityAny>(act: A): A["port"] {
      return act.port;
    }

    const TaskActivity = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: async (input, { deps }) => deps.Api.fetch(input.taskId),
    });

    const result = processActivity(TaskActivity);
    // Result should preserve the exact port type
    expectTypeOf(result).toEqualTypeOf<typeof TaskActivityPort>();
  });
});

// =============================================================================
// Test 9: ActivityContext type structure
// =============================================================================

describe("ActivityContext type structure", () => {
  it("has correct shape with deps, sink, and signal", () => {
    type TestContext = ActivityContext<
      readonly [typeof ApiPort, typeof LoggerPort],
      typeof TaskEvents
    >;

    expectTypeOf<TestContext>().toHaveProperty("deps");
    expectTypeOf<TestContext>().toHaveProperty("sink");
    expectTypeOf<TestContext>().toHaveProperty("signal");

    expectTypeOf<TestContext["deps"]>().toEqualTypeOf<{ Api: ApiService; Logger: Logger }>();
    expectTypeOf<TestContext["sink"]>().toEqualTypeOf<TypedEventSink<typeof TaskEvents>>();
    expectTypeOf<TestContext["signal"]>().toEqualTypeOf<AbortSignal>();
  });

  it("all properties are readonly", () => {
    activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: async (input, context) => {
        // These should be readonly - TypeScript would error on assignment
        // @ts-expect-error - deps is readonly
        context.deps = { Api: {} as ApiService };
        // @ts-expect-error - sink is readonly
        context.sink = {} as TypedEventSink<typeof TaskEvents>;
        // @ts-expect-error - signal is readonly
        context.signal = new AbortController().signal;

        return context.deps.Api.fetch(input.taskId);
      },
    });
  });
});

// =============================================================================
// Test 10: emits preserves exact events type
// =============================================================================

describe("emits preserves exact events type", () => {
  it("preserves the events definition type", () => {
    const TaskActivity = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: async (input, { deps }) => deps.Api.fetch(input.taskId),
    });

    expectTypeOf(TaskActivity.emits).toEqualTypeOf<typeof TaskEvents>();
  });

  it("different events definitions produce different types", () => {
    const CustomEvents = defineEvents({
      CUSTOM: (value: number) => ({ value }),
    });

    const Activity1 = activity(SimpleActivityPort, {
      requires: [],
      emits: TaskEvents,
      execute: async n => String(n),
    });

    const Activity2 = activity(SimpleActivityPort, {
      requires: [],
      emits: CustomEvents,
      execute: async n => String(n),
    });

    expectTypeOf(Activity1.emits).not.toEqualTypeOf(Activity2.emits);
  });
});
