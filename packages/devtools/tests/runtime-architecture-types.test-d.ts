/**
 * Type tests for DevTools Runtime Architecture Refactor.
 *
 * These tests verify:
 * 1. ContainerGraphData type structure
 * 2. TaggedContainerEvent type
 * 3. Container lifecycle states discriminated union
 * 4. DevToolsRuntimeConfig extended type
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import type { Lifetime, FactoryKind } from "@hex-di/graph";
import type { InheritanceMode, ServiceOrigin } from "@hex-di/plugin";
import type { InspectorEvent, ContainerGraphData, VisualizableAdapter } from "@hex-di/runtime";

import type {
  ContainerDiscoveryState,
  ContainerDiscoveryContext,
  TaggedContainerEvent,
  EventFilter,
  InspectorEventType,
  DevToolsRuntimeConfig,
} from "../src/runtime/types.js";

// =============================================================================
// ContainerGraphData Type Tests
// =============================================================================

describe("ContainerGraphData type structure", () => {
  it("has required fields with correct types", () => {
    const data = {} as ContainerGraphData;

    // Required fields
    expectTypeOf(data.adapters).toEqualTypeOf<readonly VisualizableAdapter[]>();
    expectTypeOf(data.containerName).toEqualTypeOf<string>();
    expectTypeOf(data.kind).toEqualTypeOf<"root" | "child" | "lazy">();
    expectTypeOf(data.parentName).toEqualTypeOf<string | null>();
  });

  it("ContainerGraphData has correct keys", () => {
    // Verify all expected keys exist
    const data: ContainerGraphData = {
      adapters: [],
      containerName: "Test",
      kind: "root",
      parentName: null,
    };
    expectTypeOf(data).toMatchTypeOf<ContainerGraphData>();
  });
});

describe("VisualizableAdapter type structure", () => {
  it("has required fields with correct types", () => {
    const adapter = {} as VisualizableAdapter;

    // Required fields
    expectTypeOf(adapter.portName).toEqualTypeOf<string>();
    expectTypeOf(adapter.lifetime).toEqualTypeOf<Lifetime>();
    expectTypeOf(adapter.factoryKind).toEqualTypeOf<FactoryKind>();
    expectTypeOf(adapter.dependencyNames).toEqualTypeOf<readonly string[]>();
    expectTypeOf(adapter.origin).toEqualTypeOf<ServiceOrigin>();
  });

  it("has optional inheritanceMode field", () => {
    const adapter = {} as VisualizableAdapter;

    // Optional field
    expectTypeOf(adapter.inheritanceMode).toEqualTypeOf<InheritanceMode | undefined>();
  });

  it("VisualizableAdapter has all expected fields", () => {
    // Verify type structure
    const adapter: VisualizableAdapter = {
      portName: "Test",
      lifetime: "singleton",
      factoryKind: "sync",
      dependencyNames: [],
      origin: "own",
    };

    expectTypeOf(adapter).toMatchTypeOf<VisualizableAdapter>();
  });
});

// =============================================================================
// Container Lifecycle States Tests
// =============================================================================

describe("ContainerDiscoveryState discriminated union", () => {
  it("includes all lifecycle states", () => {
    type ExpectedStates =
      | "pending"
      | "subscribing"
      | "active"
      | "paused"
      | "error"
      | "disposing"
      | "disposed";

    expectTypeOf<ContainerDiscoveryState>().toEqualTypeOf<ExpectedStates>();
  });

  it("ContainerDiscoveryContext has required fields", () => {
    const context = {} as ContainerDiscoveryContext;

    // Has containerId
    expectTypeOf(context.containerId).toEqualTypeOf<string>();

    // Has error info for error state
    expectTypeOf(context.error).toEqualTypeOf<Error | undefined>();

    // Has retry count
    expectTypeOf(context.retryCount).toEqualTypeOf<number>();
  });

  it("ContainerDiscoveryContext is readonly", () => {
    const context: ContainerDiscoveryContext = {
      containerId: "test",
      retryCount: 0,
    };

    // @ts-expect-error - containerId is readonly
    context.containerId = "changed";
    // @ts-expect-error - retryCount is readonly
    context.retryCount = 1;
  });
});

// =============================================================================
// TaggedContainerEvent Type Tests
// =============================================================================

describe("TaggedContainerEvent type structure", () => {
  it("has required fields with correct types", () => {
    const event = {} as TaggedContainerEvent;

    // Required fields
    expectTypeOf(event.id).toEqualTypeOf<string>();
    expectTypeOf(event.containerId).toEqualTypeOf<string>();
    expectTypeOf(event.containerPath).toEqualTypeOf<readonly string[]>();
    expectTypeOf(event.containerName).toEqualTypeOf<string>();
    expectTypeOf(event.event).toEqualTypeOf<InspectorEvent>();
    expectTypeOf(event.timestamp).toEqualTypeOf<number>();
  });

  it("TaggedContainerEvent is readonly", () => {
    const event: TaggedContainerEvent = {
      id: "1",
      containerId: "c1",
      containerPath: ["root"],
      containerName: "Root",
      event: { type: "snapshot-changed" },
      timestamp: Date.now(),
    };

    // @ts-expect-error - id is readonly
    event.id = "changed";
    // @ts-expect-error - containerId is readonly
    event.containerId = "changed";
    // @ts-expect-error - containerPath is readonly
    event.containerPath = [];
    // @ts-expect-error - containerName is readonly
    event.containerName = "changed";
    // @ts-expect-error - timestamp is readonly
    event.timestamp = 0;
  });
});

describe("EventFilter type structure", () => {
  it("all fields are optional", () => {
    // Empty filter should be valid
    const emptyFilter: EventFilter = {};
    expectTypeOf(emptyFilter).toMatchTypeOf<EventFilter>();
  });

  it("has correct field types", () => {
    const filter = {} as Required<EventFilter>;

    expectTypeOf(filter.containerIds).toEqualTypeOf<readonly string[]>();
    expectTypeOf(filter.eventTypes).toEqualTypeOf<readonly InspectorEventType[]>();
    expectTypeOf(filter.timeRange).toEqualTypeOf<{
      readonly start?: number;
      readonly end?: number;
    }>();
    expectTypeOf(filter.portName).toEqualTypeOf<string>();
    expectTypeOf(filter.slowThresholdMs).toEqualTypeOf<number>();
  });
});

describe("InspectorEventType union", () => {
  it("includes all event types", () => {
    type ExpectedTypes =
      | "resolution"
      | "scope-created"
      | "scope-disposed"
      | "child-created"
      | "child-disposed"
      | "phase-changed"
      | "snapshot-changed";

    expectTypeOf<InspectorEventType>().toEqualTypeOf<ExpectedTypes>();
  });
});

// =============================================================================
// DevToolsRuntimeConfig Extended Type Tests
// =============================================================================

describe("DevToolsRuntimeConfig extended type", () => {
  it("has existing fields", () => {
    const config = {} as DevToolsRuntimeConfig;

    // Existing fields should still be present
    expectTypeOf(config.plugins).toMatchTypeOf<readonly unknown[] | undefined>();
    expectTypeOf(config.initialTabId).toEqualTypeOf<string | undefined>();
    expectTypeOf(config.tracingEnabled).toEqualTypeOf<boolean | undefined>();
  });

  it("has new event buffer fields", () => {
    const config = {} as DevToolsRuntimeConfig;

    // New fields
    expectTypeOf(config.maxEventsPerContainer).toEqualTypeOf<number | undefined>();
    expectTypeOf(config.maxTotalEvents).toEqualTypeOf<number | undefined>();
    expectTypeOf(config.protectedEventTypes).toEqualTypeOf<readonly string[] | undefined>();
  });

  it("new fields have correct defaults documented", () => {
    // This test verifies the documented defaults by type annotation
    // The actual defaults are enforced at runtime

    // maxEventsPerContainer: default 500
    const config1: DevToolsRuntimeConfig = { plugins: [] };
    expectTypeOf(config1.maxEventsPerContainer).toEqualTypeOf<number | undefined>();

    // maxTotalEvents: default 5000
    expectTypeOf(config1.maxTotalEvents).toEqualTypeOf<number | undefined>();

    // protectedEventTypes: default ["error", "phase-changed"]
    expectTypeOf(config1.protectedEventTypes).toEqualTypeOf<readonly string[] | undefined>();
  });

  it("DevToolsRuntimeConfig is readonly", () => {
    const config: DevToolsRuntimeConfig = {
      plugins: [],
      maxEventsPerContainer: 500,
      maxTotalEvents: 5000,
      protectedEventTypes: ["error", "phase-changed"],
    };

    // @ts-expect-error - plugins is readonly
    config.plugins = [];
    // @ts-expect-error - maxEventsPerContainer is readonly
    config.maxEventsPerContainer = 100;
    // @ts-expect-error - maxTotalEvents is readonly
    config.maxTotalEvents = 100;
    // @ts-expect-error - protectedEventTypes is readonly
    config.protectedEventTypes = [];
  });
});
