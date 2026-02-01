/**
 * Activity Tests for DevTools Architecture Refactor
 *
 * Tests for Task Group 3: Activity Implementations
 * - ContainerDiscoveryActivity: Discovers containers via InspectorPlugin
 * - InspectorSubscriptionActivity: Subscribes to container events
 * - TraceCollectorActivity: Collects traces with filter support
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi } from "vitest";
import { testActivity, createTestEventSink, createTestSignal } from "@hex-di/flow";
import type {
  InspectorAPI,
  InspectorEvent,
  InspectorContainerSnapshot as ContainerSnapshot,
} from "@hex-di/runtime";
import type { TracingAPI, TraceEntry, TraceFilter, Lifetime, ScopeTree } from "@hex-di/core";

import {
  ContainerDiscoveryActivity,
  InspectorSubscriptionActivity,
  TraceCollectorActivity,
  TraceCollectorEvents,
} from "@hex-di/devtools-core";

// =============================================================================
// Mock Helpers
// =============================================================================

function createMockScopeTree(): ScopeTree {
  return {
    id: "root",
    status: "active",
    resolvedCount: 0,
    totalCount: 0,
    children: [],
    resolvedPorts: [],
  };
}

function createMockSnapshot(kind: "root" | "child" | "lazy", name: string): ContainerSnapshot {
  const base = {
    singletons: [],
    scopes: createMockScopeTree(),
    isDisposed: false,
    containerName: name,
  };

  switch (kind) {
    case "root":
      return {
        ...base,
        kind: "root" as const,
        phase: "initialized" as const,
        isInitialized: true,
        asyncAdaptersTotal: 0,
        asyncAdaptersInitialized: 0,
      };
    case "child":
      return {
        ...base,
        kind: "child" as const,
        phase: "initialized" as const,
        parentId: "parent-container",
        inheritanceModes: new Map(),
      };
    case "lazy":
      return {
        ...base,
        kind: "lazy" as const,
        phase: "loaded" as const,
        isLoaded: true,
      };
  }
}

function createMockInspector(
  options: {
    id?: string;
    name?: string;
    kind?: "root" | "child" | "lazy";
    children?: readonly InspectorAPI[];
    onSubscribe?: (listener: (event: InspectorEvent) => void) => () => void;
  } = {}
): InspectorAPI {
  const {
    name = "TestContainer",
    kind = "root",
    children = [],
    onSubscribe = () => () => {},
  } = options;

  const snapshot = createMockSnapshot(kind, name);

  return {
    getSnapshot: () => snapshot,
    getScopeTree: () => createMockScopeTree(),
    listPorts: () => [],
    isResolved: () => false,
    getContainerKind: () => kind,
    getPhase: () => "initialized" as const,
    isDisposed: false,
    subscribe: onSubscribe,
    getChildContainers: () => children,
    getAdapterInfo: () => [],
    getGraphData: () => ({
      adapters: [],
      containerName: name,
      kind,
      parentName: null,
    }),
  };
}

function createMockTraceEntry(overrides: Partial<TraceEntry> = {}): TraceEntry {
  return {
    id: `trace-${Math.random().toString(36).slice(2)}`,
    portName: "TestService",
    lifetime: "singleton" as Lifetime,
    startTime: Date.now(),
    duration: 10,
    isCacheHit: false,
    parentId: null,
    childIds: [],
    scopeId: null,
    order: 1,
    isPinned: false,
    ...overrides,
  };
}

// Wrapper type for storing callbacks to avoid TypeScript narrowing issues
interface CallbackHolder<T extends (...args: any[]) => any> {
  callback: T | null;
}

// =============================================================================
// ContainerDiscoveryActivity Tests
// =============================================================================

describe("ContainerDiscoveryActivity", () => {
  describe("discovers containers via InspectorPlugin", () => {
    it("should discover root container and emit CONTAINER_ADDED event", async () => {
      const mockInspector = createMockInspector({
        id: "root-container",
        name: "RootContainer",
        kind: "root",
      });

      const { events, status } = await testActivity(ContainerDiscoveryActivity, {
        input: { inspector: mockInspector },
        deps: {},
      });

      expect(status).toBe("completed");
      expect(events).toContainEqual(
        expect.objectContaining({
          type: "CONTAINER_ADDED",
          entry: expect.objectContaining({
            label: "RootContainer",
            kind: "root",
          }),
        })
      );
    });

    it("should discover child containers recursively and emit CONTAINER_ADDED events", async () => {
      const childInspector = createMockInspector({
        id: "child-container",
        name: "ChildContainer",
        kind: "child",
        children: [],
      });

      const rootInspector = createMockInspector({
        id: "root-container",
        name: "RootContainer",
        kind: "root",
        children: [childInspector],
      });

      const { events, status } = await testActivity(ContainerDiscoveryActivity, {
        input: { inspector: rootInspector },
        deps: {},
      });

      expect(status).toBe("completed");

      // Should have events for both root and child
      const containerAddedEvents = events.filter(e => e.type === "CONTAINER_ADDED");
      expect(containerAddedEvents.length).toBe(2);

      expect(containerAddedEvents).toContainEqual(
        expect.objectContaining({
          type: "CONTAINER_ADDED",
          entry: expect.objectContaining({
            label: "RootContainer",
            kind: "root",
          }),
        })
      );

      expect(containerAddedEvents).toContainEqual(
        expect.objectContaining({
          type: "CONTAINER_ADDED",
          entry: expect.objectContaining({
            label: "ChildContainer",
            kind: "child",
          }),
        })
      );
    });
  });
});

// =============================================================================
// InspectorSubscriptionActivity Tests
// =============================================================================

describe("InspectorSubscriptionActivity", () => {
  describe("subscribes to container events", () => {
    it("should subscribe to inspector and emit SUBSCRIPTION_READY", async () => {
      const mockInspector = createMockInspector({
        onSubscribe: () => () => {},
      });

      const { events } = await testActivity(InspectorSubscriptionActivity, {
        input: { inspector: mockInspector },
        deps: {},
        timeout: 100, // Short timeout since this is a long-running activity
      });

      // Activity should complete (or timeout) and have emitted SUBSCRIPTION_READY
      expect(events).toContainEqual(
        expect.objectContaining({
          type: "SUBSCRIPTION_READY",
        })
      );
    });

    it("should cleanup subscription on AbortSignal", async () => {
      let unsubscribeCalled = false;
      const mockInspector = createMockInspector({
        onSubscribe: () => {
          return () => {
            unsubscribeCalled = true;
          };
        },
      });

      const { status } = await testActivity(InspectorSubscriptionActivity, {
        input: { inspector: mockInspector },
        deps: {},
        abortAfter: 50,
      });

      expect(status).toBe("cancelled");
      expect(unsubscribeCalled).toBe(true);
    });
  });
});

// =============================================================================
// TraceCollectorActivity Tests
// =============================================================================

describe("TraceCollectorActivity", () => {
  describe("collects traces with filter support", () => {
    it("should collect traces and emit TRACE_RECEIVED events", async () => {
      const trace1 = createMockTraceEntry({ id: "trace-1", portName: "ServiceA" });

      // Use holder pattern to work around TypeScript narrowing
      const holder: CallbackHolder<(entry: TraceEntry) => void> = { callback: null };

      // Create mock that returns traces when getTraces is called
      const currentTraces: readonly TraceEntry[] = [trace1];
      const mockTracingAPI: TracingAPI = {
        getTraces: (_filter?: TraceFilter) => currentTraces,
        getStats: () => ({
          totalResolutions: currentTraces.length,
          averageDuration: 10,
          cacheHitRate: 0.5,
          slowCount: 0,
          sessionStart: Date.now(),
          totalDuration: currentTraces.length * 10,
        }),
        pause: vi.fn(),
        resume: vi.fn(),
        clear: vi.fn(),
        subscribe: callback => {
          holder.callback = callback;
          return () => {};
        },
        isPaused: () => false,
        pin: vi.fn(),
        unpin: vi.fn(),
      };

      // Start the activity
      const sink = createTestEventSink<typeof TraceCollectorEvents>();
      const signal = createTestSignal();

      // Create deps manually since we don't have a requires tuple
      const deps = {};

      // Run the activity in a promise
      const activityPromise = TraceCollectorActivity.execute(
        { tracingAPI: mockTracingAPI, filter: undefined },
        { deps, sink, signal }
      );

      // Give it time to subscribe
      await new Promise(resolve => setTimeout(resolve, 10));

      // Simulate trace being added by calling the callback
      const cb = holder.callback;
      if (cb !== null) {
        cb(trace1);
      }

      // Abort to finish the test
      signal.abort("Test complete");

      await activityPromise.catch(() => {});

      // Should have emitted TRACE_RECEIVED
      expect(sink.events.some(e => e.type === "TRACE_RECEIVED")).toBe(true);
    });

    it("should emit TRACE_RECEIVED events for new traces only", async () => {
      const trace1 = createMockTraceEntry({ id: "trace-1", portName: "ServiceA" });
      const trace2 = createMockTraceEntry({ id: "trace-2", portName: "ServiceB" });

      let traceList: readonly TraceEntry[] = [];

      // Use holder pattern to work around TypeScript narrowing
      const holder: CallbackHolder<(entry: TraceEntry) => void> = { callback: null };

      const mockTracingAPI: TracingAPI = {
        getTraces: () => traceList,
        getStats: () => ({
          totalResolutions: traceList.length,
          averageDuration: 10,
          cacheHitRate: 0.5,
          slowCount: 0,
          sessionStart: Date.now(),
          totalDuration: traceList.length * 10,
        }),
        pause: vi.fn(),
        resume: vi.fn(),
        clear: vi.fn(),
        subscribe: callback => {
          holder.callback = callback;
          return () => {};
        },
        isPaused: () => false,
        pin: vi.fn(),
        unpin: vi.fn(),
      };

      const sink = createTestEventSink<typeof TraceCollectorEvents>();
      const signal = createTestSignal();
      const deps = {};

      const activityPromise = TraceCollectorActivity.execute(
        { tracingAPI: mockTracingAPI, filter: undefined },
        { deps, sink, signal }
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      // Add first trace
      traceList = [trace1];
      const cb1 = holder.callback;
      if (cb1 !== null) {
        cb1(trace1);
      }

      await new Promise(resolve => setTimeout(resolve, 10));

      // Add second trace
      traceList = [trace1, trace2];
      const cb2 = holder.callback;
      if (cb2 !== null) {
        cb2(trace2);
      }

      await new Promise(resolve => setTimeout(resolve, 10));

      signal.abort("Test complete");
      await activityPromise.catch(() => {});

      // Should have emitted 2 TRACE_RECEIVED events (one per new trace)
      const traceReceivedEvents = sink.events.filter(e => e.type === "TRACE_RECEIVED");
      expect(traceReceivedEvents.length).toBe(2);
    });
  });
});
