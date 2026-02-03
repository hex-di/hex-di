/**
 * Type-level tests for FlowAdapter activities integration
 *
 * These tests verify:
 * 1. activities property accepts array of ConfiguredActivity types
 * 2. Type error when activity requires port not in FlowAdapter's requires
 * 3. Type error for duplicate activity ports
 * 4. Activity requirements must be subset of available ports
 * 5. ValidateActivityRequirements produces error type for missing ports
 * 6. FlowAdapter without activities property still works
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import { port, createPort } from "@hex-di/core";
import { activityPort } from "../../src/activities/port.js";
import { defineEvents } from "../../src/activities/events.js";
import { activity } from "../../src/activities/factory.js";
import type { ConfiguredActivityAny } from "../../src/activities/types.js";
import {
  type ValidateActivityRequirements,
  type AssertActivityRequirements,
  type AssertUniqueActivityPorts,
  type ActivityRequiresUnavailablePortError,
  type DuplicateActivityPortError,
  type PortNamesUnion,
} from "../../src/integration/activity-validation.js";

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

interface MetricsService {
  recordDuration(name: string, ms: number): void;
}

interface CacheService {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
}

const ApiPort = port<ApiService>()({ name: "Api" });
const LoggerPort = port<Logger>()({ name: "Logger" });
const MetricsPort = port<MetricsService>()({ name: "Metrics" });
const CachePort = port<CacheService>()({ name: "Cache" });

const TaskActivityPort = activityPort<{ taskId: string }, { result: string }>()("TaskActivity");
const FetchActivityPort = activityPort<{ url: string }, Response>()("FetchActivity");
const PollingActivityPort = activityPort<{ interval: number }, void>()("PollingActivity");

const TaskEvents = defineEvents({
  PROGRESS: (percent: number) => ({ percent }),
  COMPLETED: (result: string) => ({ result }),
});

const FetchEvents = defineEvents({
  STARTED: () => ({}),
  DONE: (data: unknown) => ({ data }),
});

const PollingEvents = defineEvents({
  POLL_RESULT: (data: unknown) => ({ data }),
});

// Create activities with different dependency requirements
const TaskActivity = activity(TaskActivityPort, {
  requires: [ApiPort, LoggerPort],
  emits: TaskEvents,
  execute: async (input, { deps }) => {
    const data = await deps.Api.fetch(input.taskId);
    deps.Logger.info("Done");
    return { result: data.data };
  },
});

const FetchActivity = activity(FetchActivityPort, {
  requires: [ApiPort],
  emits: FetchEvents,
  execute: async () => new Response(),
});

const PollingActivity = activity(PollingActivityPort, {
  requires: [ApiPort, MetricsPort],
  emits: PollingEvents,
  execute: async () => {},
});

const NoDepsActivity = activity(activityPort<void, void>()("NoDepsActivity"), {
  requires: [],
  emits: defineEvents({ DONE: () => ({}) }),
  execute: async () => {},
});

// =============================================================================
// Test 1: PortNamesUnion extracts port names correctly
// =============================================================================

describe("PortNamesUnion type utility", () => {
  it("extracts single port name", () => {
    type Names = PortNamesUnion<readonly [typeof ApiPort]>;
    expectTypeOf<Names>().toEqualTypeOf<"Api">();
  });

  it("extracts multiple port names as union", () => {
    type Names = PortNamesUnion<readonly [typeof ApiPort, typeof LoggerPort]>;
    expectTypeOf<Names>().toEqualTypeOf<"Api" | "Logger">();
  });

  it("handles empty tuple", () => {
    type Names = PortNamesUnion<readonly []>;
    expectTypeOf<Names>().toEqualTypeOf<never>();
  });

  it("extracts all names from larger tuple", () => {
    type Names = PortNamesUnion<readonly [typeof ApiPort, typeof LoggerPort, typeof MetricsPort]>;
    expectTypeOf<Names>().toEqualTypeOf<"Api" | "Logger" | "Metrics">();
  });
});

// =============================================================================
// Test 2: ValidateActivityRequirements produces correct types
// =============================================================================

describe("ValidateActivityRequirements type utility", () => {
  it("returns activity when all requirements are satisfied", () => {
    type Available = "Api" | "Logger";
    type Validated = ValidateActivityRequirements<typeof TaskActivity, Available>;

    // Should return the activity type unchanged
    expectTypeOf<Validated>().toEqualTypeOf<typeof TaskActivity>();
  });

  it("returns activity for subset of available ports", () => {
    type Available = "Api" | "Logger" | "Metrics" | "Cache";
    type Validated = ValidateActivityRequirements<typeof TaskActivity, Available>;

    expectTypeOf<Validated>().toEqualTypeOf<typeof TaskActivity>();
  });

  it("returns error type when requirement is missing", () => {
    type Available = "Logger"; // Missing Api
    type Validated = ValidateActivityRequirements<typeof TaskActivity, Available>;

    expectTypeOf<Validated>().toMatchTypeOf<{
      readonly __error: "ActivityRequiresUnavailablePort";
      readonly __activityName: "TaskActivity";
    }>();
  });

  it("error type includes missing ports", () => {
    type Available = "Cache"; // Missing both Api and Logger
    type Validated = ValidateActivityRequirements<typeof TaskActivity, Available>;

    // The missing ports should be Api | Logger
    expectTypeOf<Validated>().toMatchTypeOf<
      ActivityRequiresUnavailablePortError<"TaskActivity", "Api" | "Logger">
    >();
  });

  it("handles activity with no requirements", () => {
    type Available = "Api" | "Logger";
    type Validated = ValidateActivityRequirements<typeof NoDepsActivity, Available>;

    expectTypeOf<Validated>().toEqualTypeOf<typeof NoDepsActivity>();
  });

  it("handles empty available ports with activity requiring deps", () => {
    type Available = never;
    type Validated = ValidateActivityRequirements<typeof TaskActivity, Available>;

    expectTypeOf<Validated>().toMatchTypeOf<{
      readonly __error: "ActivityRequiresUnavailablePort";
    }>();
  });
});

// =============================================================================
// Test 3: AssertActivityRequirements returns true or error
// =============================================================================

describe("AssertActivityRequirements type utility", () => {
  it("returns true when requirements are satisfied", () => {
    type Available = "Api" | "Logger";
    type Result = AssertActivityRequirements<typeof TaskActivity, Available>;

    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("returns error type when requirements are not satisfied", () => {
    type Available = "Logger";
    type Result = AssertActivityRequirements<typeof TaskActivity, Available>;

    expectTypeOf<Result>().toMatchTypeOf<{
      readonly __error: "ActivityRequiresUnavailablePort";
    }>();
  });

  it("returns true for no-deps activity", () => {
    type Available = never;
    type Result = AssertActivityRequirements<typeof NoDepsActivity, Available>;

    expectTypeOf<Result>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Test 4: AssertUniqueActivityPorts detects duplicates
// =============================================================================

describe("AssertUniqueActivityPorts type utility", () => {
  it("returns true for unique activity ports", () => {
    type Activities = readonly [typeof TaskActivity, typeof FetchActivity];
    type Result = AssertUniqueActivityPorts<Activities>;

    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("returns true for single activity", () => {
    type Activities = readonly [typeof TaskActivity];
    type Result = AssertUniqueActivityPorts<Activities>;

    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("returns true for empty array", () => {
    type Activities = readonly [];
    type Result = AssertUniqueActivityPorts<Activities>;

    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("returns error type for duplicate ports", () => {
    // Create two activities with the same port name
    const DuplicateActivity1 = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: async () => ({ result: "a" }),
    });

    const DuplicateActivity2 = activity(TaskActivityPort, {
      requires: [LoggerPort],
      emits: TaskEvents,
      execute: async () => ({ result: "b" }),
    });

    type Activities = readonly [typeof DuplicateActivity1, typeof DuplicateActivity2];
    type Result = AssertUniqueActivityPorts<Activities>;

    expectTypeOf<Result>().toMatchTypeOf<DuplicateActivityPortError<"TaskActivity">>();
  });

  it("detects duplicate in middle of array", () => {
    const DuplicateFetch = activity(FetchActivityPort, {
      requires: [],
      emits: FetchEvents,
      execute: async () => new Response(),
    });

    type Activities = readonly [
      typeof TaskActivity,
      typeof FetchActivity,
      typeof DuplicateFetch, // Duplicate of FetchActivity
    ];
    type Result = AssertUniqueActivityPorts<Activities>;

    expectTypeOf<Result>().toMatchTypeOf<DuplicateActivityPortError<"FetchActivity">>();
  });
});

// =============================================================================
// Test 5: Activities array type validation
// =============================================================================

describe("Activities array type constraints", () => {
  it("activities must be ConfiguredActivityAny compatible", () => {
    expectTypeOf(TaskActivity).toMatchTypeOf<ConfiguredActivityAny>();
    expectTypeOf(FetchActivity).toMatchTypeOf<ConfiguredActivityAny>();
    expectTypeOf(PollingActivity).toMatchTypeOf<ConfiguredActivityAny>();
    expectTypeOf(NoDepsActivity).toMatchTypeOf<ConfiguredActivityAny>();
  });

  it("array of activities is assignable to readonly ConfiguredActivityAny[]", () => {
    const activities = [TaskActivity, FetchActivity] as const;

    expectTypeOf(activities).toMatchTypeOf<readonly ConfiguredActivityAny[]>();
  });

  it("preserves tuple types for activities array", () => {
    const activities = [TaskActivity, FetchActivity] as const;

    type ActivitiesType = typeof activities;
    expectTypeOf<ActivitiesType>().toEqualTypeOf<
      readonly [typeof TaskActivity, typeof FetchActivity]
    >();
  });
});

// =============================================================================
// Test 6: FlowAdapter activities validation scenarios
// =============================================================================

describe("FlowAdapter activities validation scenarios", () => {
  it("all activities satisfied when FlowAdapter has all required ports", () => {
    // Simulate FlowAdapter with Api, Logger, Metrics
    type AvailablePorts = "Api" | "Logger" | "Metrics";

    type TaskValidation = AssertActivityRequirements<typeof TaskActivity, AvailablePorts>;
    type FetchValidation = AssertActivityRequirements<typeof FetchActivity, AvailablePorts>;
    type PollingValidation = AssertActivityRequirements<typeof PollingActivity, AvailablePorts>;

    expectTypeOf<TaskValidation>().toEqualTypeOf<true>();
    expectTypeOf<FetchValidation>().toEqualTypeOf<true>();
    expectTypeOf<PollingValidation>().toEqualTypeOf<true>();
  });

  it("detects when FlowAdapter is missing required port", () => {
    // FlowAdapter only has Api and Logger - missing Metrics
    type AvailablePorts = "Api" | "Logger";

    type TaskValidation = AssertActivityRequirements<typeof TaskActivity, AvailablePorts>;
    type PollingValidation = AssertActivityRequirements<typeof PollingActivity, AvailablePorts>;

    // TaskActivity only needs Api, Logger - should pass
    expectTypeOf<TaskValidation>().toEqualTypeOf<true>();

    // PollingActivity needs Metrics which is missing - should fail
    expectTypeOf<PollingValidation>().toMatchTypeOf<{
      readonly __error: "ActivityRequiresUnavailablePort";
      readonly __missingPorts: "Metrics";
    }>();
  });

  it("validates complete activities array at type level", () => {
    type AvailablePorts = "Api" | "Logger" | "Metrics";
    type Activities = readonly [typeof TaskActivity, typeof FetchActivity, typeof PollingActivity];

    // Check uniqueness first
    type UniquenessCheck = AssertUniqueActivityPorts<Activities>;
    expectTypeOf<UniquenessCheck>().toEqualTypeOf<true>();

    // Then check each activity's requirements
    type Task = ValidateActivityRequirements<typeof TaskActivity, AvailablePorts>;
    type Fetch = ValidateActivityRequirements<typeof FetchActivity, AvailablePorts>;
    type Polling = ValidateActivityRequirements<typeof PollingActivity, AvailablePorts>;

    // All should be the activity types (no errors)
    expectTypeOf<Task>().toEqualTypeOf<typeof TaskActivity>();
    expectTypeOf<Fetch>().toEqualTypeOf<typeof FetchActivity>();
    expectTypeOf<Polling>().toEqualTypeOf<typeof PollingActivity>();
  });
});

// =============================================================================
// Test 7: Error messages are descriptive
// =============================================================================

describe("Error types have descriptive information", () => {
  it("ActivityRequiresUnavailablePortError includes activity name", () => {
    type Error = ActivityRequiresUnavailablePortError<"TestActivity", "MissingPort">;

    expectTypeOf<Error["__activityName"]>().toEqualTypeOf<"TestActivity">();
    expectTypeOf<Error["__missingPorts"]>().toEqualTypeOf<"MissingPort">();
    expectTypeOf<Error["__error"]>().toEqualTypeOf<"ActivityRequiresUnavailablePort">();
  });

  it("DuplicateActivityPortError includes duplicate name", () => {
    type Error = DuplicateActivityPortError<"DuplicatedPort">;

    expectTypeOf<Error["__duplicateName"]>().toEqualTypeOf<"DuplicatedPort">();
    expectTypeOf<Error["__error"]>().toEqualTypeOf<"DuplicateActivityPort">();
  });

  it("error message is a literal type", () => {
    type Error = ActivityRequiresUnavailablePortError<"MyActivity", "SomePort">;

    // Message should be a template literal type
    type Message = Error["__message"];
    expectTypeOf<Message>().toEqualTypeOf<`Activity "MyActivity" requires port(s) not available in FlowAdapter`>();
  });
});

// =============================================================================
// Test 8: Edge cases
// =============================================================================

describe("Edge cases for activity validation", () => {
  it("handles activity with single requirement", () => {
    type Available = "Api";
    type Result = ValidateActivityRequirements<typeof FetchActivity, Available>;

    expectTypeOf<Result>().toEqualTypeOf<typeof FetchActivity>();
  });

  it("handles activity with many requirements", () => {
    // Create activity with many requirements
    const ManyDepsActivity = activity(activityPort<void, void>()("ManyDeps"), {
      requires: [ApiPort, LoggerPort, MetricsPort, CachePort],
      emits: defineEvents({ DONE: () => ({}) }),
      execute: async () => {},
    });

    type Available = "Api" | "Logger" | "Metrics" | "Cache";
    type Result = ValidateActivityRequirements<typeof ManyDepsActivity, Available>;

    expectTypeOf<Result>().toEqualTypeOf<typeof ManyDepsActivity>();
  });

  it("strict subset relationship - extra available ports are fine", () => {
    // Activity only needs Api
    // FlowAdapter has Api, Logger, Metrics, Cache - more than needed
    type Available = "Api" | "Logger" | "Metrics" | "Cache";
    type Result = ValidateActivityRequirements<typeof FetchActivity, Available>;

    expectTypeOf<Result>().toEqualTypeOf<typeof FetchActivity>();
  });
});
