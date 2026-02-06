/**
 * Tests for Activity Metadata Extraction
 *
 * These tests verify:
 * 1. `getActivityMetadata` extracts correct port name
 * 2. Metadata includes requires port names
 * 3. Metadata includes emits event types
 * 4. Metadata includes hasCleanup and defaultTimeout
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { port, createPort } from "@hex-di/core";
import { activityPort } from "../../src/activities/port.js";
import { defineEvents } from "../../src/activities/events.js";
import { activity } from "../../src/activities/factory.js";
import { getActivityMetadata } from "../../src/devtools/activity-metadata.js";

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

interface MetricsService {
  recordDuration(name: string, ms: number): void;
}

const ApiPort = port<ApiService>()({ name: "Api" });
const LoggerPort = port<Logger>()({ name: "Logger" });
const MetricsPort = port<MetricsService>()({ name: "Metrics" });

const TaskActivityPort = activityPort<{ taskId: string }, TaskResult>()("TaskActivity");
const SimpleActivityPort = activityPort<number, string>()("SimpleActivity");
const VoidActivityPort = activityPort<void, void>()("VoidActivity");

const TaskEvents = defineEvents({
  PROGRESS: (percent: number) => ({ percent }),
  COMPLETED: (result: TaskResult) => ({ result }),
  FAILED: (error: string, retryable: boolean) => ({ error, retryable }),
});

const EmptyEvents = defineEvents({
  DONE: () => ({}),
});

const SingleEvents = defineEvents({
  STATUS: (status: string) => ({ status }),
});

// =============================================================================
// Test 1: getActivityMetadata extracts correct port name
// =============================================================================

describe("getActivityMetadata extracts correct port name", () => {
  it("should extract port name from simple activity", () => {
    const SimpleActivity = activity(SimpleActivityPort, {
      requires: [],
      emits: EmptyEvents,
      execute: async n => String(n),
    });

    const metadata = getActivityMetadata(SimpleActivity);

    expect(metadata.portName).toBe("SimpleActivity");
  });

  it("should extract port name from task activity", () => {
    const TaskActivity = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: async (): Promise<TaskResult> => ({ data: "test", status: "success" }),
    });

    const metadata = getActivityMetadata(TaskActivity);

    expect(metadata.portName).toBe("TaskActivity");
  });

  it("should extract port name from void activity", () => {
    const VoidActivity = activity(VoidActivityPort, {
      requires: [],
      emits: EmptyEvents,
      execute: async () => {},
    });

    const metadata = getActivityMetadata(VoidActivity);

    expect(metadata.portName).toBe("VoidActivity");
  });
});

// =============================================================================
// Test 2: Metadata includes requires port names
// =============================================================================

describe("metadata includes requires port names", () => {
  it("should include empty array for no dependencies", () => {
    const NoDepsActivity = activity(SimpleActivityPort, {
      requires: [],
      emits: EmptyEvents,
      execute: async n => String(n),
    });

    const metadata = getActivityMetadata(NoDepsActivity);

    expect(metadata.requires).toEqual([]);
    expect(metadata.requires).toHaveLength(0);
  });

  it("should include single dependency port name", () => {
    const SingleDepActivity = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: async (): Promise<TaskResult> => ({ data: "test", status: "success" }),
    });

    const metadata = getActivityMetadata(SingleDepActivity);

    expect(metadata.requires).toEqual(["Api"]);
    expect(metadata.requires).toHaveLength(1);
  });

  it("should include multiple dependency port names", () => {
    const MultiDepActivity = activity(TaskActivityPort, {
      requires: [ApiPort, LoggerPort, MetricsPort],
      emits: TaskEvents,
      execute: async (): Promise<TaskResult> => ({ data: "test", status: "success" }),
    });

    const metadata = getActivityMetadata(MultiDepActivity);

    expect(metadata.requires).toEqual(["Api", "Logger", "Metrics"]);
    expect(metadata.requires).toHaveLength(3);
  });

  it("should preserve order of dependencies", () => {
    const Activity1 = activity(TaskActivityPort, {
      requires: [LoggerPort, ApiPort],
      emits: TaskEvents,
      execute: async (): Promise<TaskResult> => ({ data: "test", status: "success" }),
    });

    const Activity2 = activity(TaskActivityPort, {
      requires: [ApiPort, LoggerPort],
      emits: TaskEvents,
      execute: async (): Promise<TaskResult> => ({ data: "test", status: "success" }),
    });

    const metadata1 = getActivityMetadata(Activity1);
    const metadata2 = getActivityMetadata(Activity2);

    expect(metadata1.requires).toEqual(["Logger", "Api"]);
    expect(metadata2.requires).toEqual(["Api", "Logger"]);
  });

  it("should freeze the requires array", () => {
    const TaskActivity = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: async (): Promise<TaskResult> => ({ data: "test", status: "success" }),
    });

    const metadata = getActivityMetadata(TaskActivity);

    expect(Object.isFrozen(metadata.requires)).toBe(true);
  });
});

// =============================================================================
// Test 3: Metadata includes emits event types
// =============================================================================

describe("metadata includes emits event types", () => {
  it("should include single event type", () => {
    const SingleEventActivity = activity(SimpleActivityPort, {
      requires: [],
      emits: SingleEvents,
      execute: async n => String(n),
    });

    const metadata = getActivityMetadata(SingleEventActivity);

    expect(metadata.emits).toContain("STATUS");
    expect(metadata.emits).toHaveLength(1);
  });

  it("should include multiple event types", () => {
    const TaskActivity = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: async (): Promise<TaskResult> => ({ data: "test", status: "success" }),
    });

    const metadata = getActivityMetadata(TaskActivity);

    expect(metadata.emits).toContain("PROGRESS");
    expect(metadata.emits).toContain("COMPLETED");
    expect(metadata.emits).toContain("FAILED");
    expect(metadata.emits).toHaveLength(3);
  });

  it("should include empty event type from EmptyEvents", () => {
    const SimpleActivity = activity(SimpleActivityPort, {
      requires: [],
      emits: EmptyEvents,
      execute: async n => String(n),
    });

    const metadata = getActivityMetadata(SimpleActivity);

    expect(metadata.emits).toContain("DONE");
    expect(metadata.emits).toHaveLength(1);
  });

  it("should freeze the emits array", () => {
    const TaskActivity = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: async (): Promise<TaskResult> => ({ data: "test", status: "success" }),
    });

    const metadata = getActivityMetadata(TaskActivity);

    expect(Object.isFrozen(metadata.emits)).toBe(true);
  });
});

// =============================================================================
// Test 4: Metadata includes hasCleanup and defaultTimeout
// =============================================================================

describe("metadata includes hasCleanup and defaultTimeout", () => {
  it("should indicate hasCleanup as false when no cleanup defined", () => {
    const NoCleanupActivity = activity(SimpleActivityPort, {
      requires: [],
      emits: EmptyEvents,
      execute: async n => String(n),
    });

    const metadata = getActivityMetadata(NoCleanupActivity);

    expect(metadata.hasCleanup).toBe(false);
  });

  it("should indicate hasCleanup as true when cleanup is defined", () => {
    const WithCleanupActivity = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: async (): Promise<TaskResult> => ({ data: "test", status: "success" }),
      cleanup: async () => {},
    });

    const metadata = getActivityMetadata(WithCleanupActivity);

    expect(metadata.hasCleanup).toBe(true);
  });

  it("should indicate hasCleanup as true for sync cleanup", () => {
    const SyncCleanupActivity = activity(TaskActivityPort, {
      requires: [],
      emits: TaskEvents,
      execute: async (): Promise<TaskResult> => ({ data: "test", status: "success" }),
      cleanup: () => {},
    });

    const metadata = getActivityMetadata(SyncCleanupActivity);

    expect(metadata.hasCleanup).toBe(true);
  });

  it("should return undefined for defaultTimeout when not specified", () => {
    const NoTimeoutActivity = activity(SimpleActivityPort, {
      requires: [],
      emits: EmptyEvents,
      execute: async n => String(n),
    });

    const metadata = getActivityMetadata(NoTimeoutActivity);

    expect(metadata.defaultTimeout).toBeUndefined();
  });

  it("should return correct defaultTimeout when specified", () => {
    const TimeoutActivity = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      timeout: 30_000,
      execute: async (): Promise<TaskResult> => ({ data: "test", status: "success" }),
    });

    const metadata = getActivityMetadata(TimeoutActivity);

    expect(metadata.defaultTimeout).toBe(30_000);
  });

  it("should return correct defaultTimeout for different values", () => {
    const Activity1 = activity(SimpleActivityPort, {
      requires: [],
      emits: EmptyEvents,
      timeout: 5_000,
      execute: async n => String(n),
    });

    const Activity2 = activity(SimpleActivityPort, {
      requires: [],
      emits: EmptyEvents,
      timeout: 60_000,
      execute: async n => String(n),
    });

    const metadata1 = getActivityMetadata(Activity1);
    const metadata2 = getActivityMetadata(Activity2);

    expect(metadata1.defaultTimeout).toBe(5_000);
    expect(metadata2.defaultTimeout).toBe(60_000);
  });
});

// =============================================================================
// Test 5: Metadata object is frozen
// =============================================================================

describe("metadata object is frozen", () => {
  it("should freeze the returned metadata object", () => {
    const TaskActivity = activity(TaskActivityPort, {
      requires: [ApiPort, LoggerPort],
      emits: TaskEvents,
      timeout: 30_000,
      execute: async (): Promise<TaskResult> => ({ data: "test", status: "success" }),
      cleanup: async () => {},
    });

    const metadata = getActivityMetadata(TaskActivity);

    expect(Object.isFrozen(metadata)).toBe(true);
  });

  it("should not allow modification of metadata properties", () => {
    const TaskActivity = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: async (): Promise<TaskResult> => ({ data: "test", status: "success" }),
    });

    const metadata = getActivityMetadata(TaskActivity);

    expect(() => {
      // @ts-expect-error - attempting to modify frozen object
      metadata.portName = "Modified";
    }).toThrow();
  });

  it("should not allow adding properties to metadata", () => {
    const TaskActivity = activity(TaskActivityPort, {
      requires: [ApiPort],
      emits: TaskEvents,
      execute: async (): Promise<TaskResult> => ({ data: "test", status: "success" }),
    });

    const metadata = getActivityMetadata(TaskActivity);

    expect(() => {
      // @ts-expect-error - attempting to add property to frozen object
      metadata.extra = "value";
    }).toThrow();
  });
});

// =============================================================================
// Test 6: Complete metadata extraction
// =============================================================================

describe("complete metadata extraction", () => {
  it("should extract complete metadata for complex activity", () => {
    const ComplexActivity = activity(TaskActivityPort, {
      requires: [ApiPort, LoggerPort, MetricsPort],
      emits: TaskEvents,
      timeout: 45_000,
      execute: async (): Promise<TaskResult> => ({ data: "test", status: "success" }),
      cleanup: async () => {},
    });

    const metadata = getActivityMetadata(ComplexActivity);

    expect(metadata).toEqual({
      portName: "TaskActivity",
      requires: ["Api", "Logger", "Metrics"],
      emits: expect.arrayContaining(["PROGRESS", "COMPLETED", "FAILED"]),
      hasCleanup: true,
      defaultTimeout: 45_000,
    });
  });

  it("should extract metadata for minimal activity", () => {
    const MinimalActivity = activity(VoidActivityPort, {
      requires: [],
      emits: EmptyEvents,
      execute: async () => {},
    });

    const metadata = getActivityMetadata(MinimalActivity);

    expect(metadata).toEqual({
      portName: "VoidActivity",
      requires: [],
      emits: ["DONE"],
      hasCleanup: false,
      defaultTimeout: undefined,
    });
  });

  it("should create independent metadata objects for different activities", () => {
    const Activity1 = activity(SimpleActivityPort, {
      requires: [ApiPort],
      emits: SingleEvents,
      timeout: 10_000,
      execute: async n => String(n),
    });

    const Activity2 = activity(TaskActivityPort, {
      requires: [LoggerPort],
      emits: TaskEvents,
      timeout: 20_000,
      execute: async (): Promise<TaskResult> => ({ data: "test", status: "success" }),
      cleanup: async () => {},
    });

    const metadata1 = getActivityMetadata(Activity1);
    const metadata2 = getActivityMetadata(Activity2);

    expect(metadata1).not.toBe(metadata2);
    expect(metadata1.portName).toBe("SimpleActivity");
    expect(metadata2.portName).toBe("TaskActivity");
    expect(metadata1.requires).toEqual(["Api"]);
    expect(metadata2.requires).toEqual(["Logger"]);
    expect(metadata1.hasCleanup).toBe(false);
    expect(metadata2.hasCleanup).toBe(true);
    expect(metadata1.defaultTimeout).toBe(10_000);
    expect(metadata2.defaultTimeout).toBe(20_000);
  });
});
