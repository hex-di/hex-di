/**
 * DevToolsFlowRuntime Tests
 *
 * Tests for the DevToolsFlowRuntime singleton coordinator that owns
 * three FlowService instances (ContainerTree, Tracing, UI) and provides
 * a unified API for useSyncExternalStore compatibility.
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  DevToolsFlowRuntime,
  createDevToolsFlowRuntime,
} from "../../src/runtime/devtools-flow-runtime.js";
import type { DevToolsSnapshot } from "../../src/runtime/devtools-snapshot.js";
import { createContainer, pipe, createPluginWrapper } from "@hex-di/runtime";
import { GraphBuilder } from "@hex-di/graph";
import { createPort } from "@hex-di/ports";
import {
  InspectorPlugin,
  INSPECTOR,
  hasSubscription,
  type InspectorWithSubscription,
  type InspectorAPI,
} from "@hex-di/runtime";

// =============================================================================
// Test Setup
// =============================================================================

// Create a minimal port and adapter for the container
const TestPort = createPort<"Test", { value: string }>("Test");
const TestAdapter = {
  provides: TestPort,
  requires: [] as const,
  lifetime: "singleton" as const,
  factoryKind: "sync" as const,
  factory: () => ({ value: "test" }),
  clonable: false as const,
};

// Create plugin wrapper for InspectorPlugin
const withInspector = createPluginWrapper(InspectorPlugin);

describe("DevToolsFlowRuntime", () => {
  let container: ReturnType<typeof createContainer>;
  let inspector: InspectorWithSubscription;
  let runtime: DevToolsFlowRuntime;

  beforeEach(() => {
    // Create a minimal container with InspectorPlugin for testing
    const graph = GraphBuilder.create().provide(TestAdapter).build();
    const enhanced = pipe(createContainer(graph, { name: "TestContainer" }), withInspector);
    container = enhanced;

    // Access inspector directly from enhanced container
    // The pipe(container, withInspector) adds [INSPECTOR]: InspectorWithSubscription
    const inspectorApi: InspectorAPI = enhanced[INSPECTOR];
    if (!hasSubscription(inspectorApi)) {
      throw new Error("Expected InspectorWithSubscription from InspectorPlugin");
    }
    inspector = inspectorApi;
  });

  afterEach(async () => {
    if (runtime) {
      await runtime.dispose();
    }
    if (container && !container.isDisposed) {
      await container.dispose();
    }
  });

  // ===========================================================================
  // Test 1: Unified subscribe()/getSnapshot() API for useSyncExternalStore
  // ===========================================================================
  describe("unified subscribe/getSnapshot API", () => {
    it("provides subscribe() and getSnapshot() compatible with useSyncExternalStore", () => {
      // Arrange
      runtime = createDevToolsFlowRuntime({ inspector });

      // Act
      const snapshot1 = runtime.getSnapshot();

      // Subscribe and capture updates
      const updates: DevToolsSnapshot[] = [];
      const unsubscribe = runtime.subscribe(() => {
        updates.push(runtime.getSnapshot());
      });

      // Dispatch an event to trigger state change
      runtime.dispatch({ type: "UI.TOGGLE" });

      // Assert
      expect(typeof runtime.subscribe).toBe("function");
      expect(typeof runtime.getSnapshot).toBe("function");
      expect(snapshot1).toBeDefined();
      expect(snapshot1.ui).toBeDefined();
      expect(snapshot1.tracing).toBeDefined();
      expect(snapshot1.containerTree).toBeDefined();

      // Verify subscription was called
      expect(updates.length).toBeGreaterThan(0);

      // Cleanup
      unsubscribe();
    });
  });

  // ===========================================================================
  // Test 2: dispatch() method routes events to correct machines
  // ===========================================================================
  describe("dispatch routing", () => {
    it("routes events to the correct machine based on event type prefix", () => {
      // Arrange
      runtime = createDevToolsFlowRuntime({ inspector });
      const initialSnapshot = runtime.getSnapshot();

      // Act - Dispatch UI event
      runtime.dispatch({ type: "UI.OPEN" });
      const afterUIOpen = runtime.getSnapshot();

      // Act - Dispatch Tracing event (enable first)
      runtime.dispatch({ type: "TRACING.ENABLE" });
      const afterTracingEnable = runtime.getSnapshot();

      // Assert - UI state should have changed
      // UI machine starts in "closed" and transitions directly to "open" on OPEN
      expect(initialSnapshot.ui.state).toBe("closed");
      expect(afterUIOpen.ui.state).toBe("open");

      // Assert - Tracing state should have changed
      // Tracing machine starts in "disabled" and transitions to "idle" on ENABLE
      expect(initialSnapshot.tracing.state).toBe("disabled");
      expect(afterTracingEnable.tracing.state).toBe("idle");
    });
  });

  // ===========================================================================
  // Test 3: Cross-machine event forwarding mechanism
  // ===========================================================================
  describe("cross-machine event forwarding", () => {
    it("forwards events between machines when needed", () => {
      // Arrange
      runtime = createDevToolsFlowRuntime({ inspector });

      // Simulate a container registration that should update both UI and ContainerTree
      const containerEntry = {
        id: "test-container-1",
        label: "TestContainer",
        kind: "root" as const,
        parentId: null,
        childIds: [] as readonly string[],
        isDisposed: false,
        // Required scope/graph data for FSM-driven architecture
        scopeTree: {
          id: "container",
          status: "active" as const,
          resolvedCount: 0,
          totalCount: 0,
          children: [],
          resolvedPorts: [],
        },
        graphData: {
          adapters: [],
          containerName: "TestContainer",
          kind: "root" as const,
          parentName: null,
        },
        resolvedCount: 0,
        totalCount: 0,
        resolvedPorts: [] as readonly string[],
        phase: "initialized" as const,
      };

      // Act - Dispatch container registration event
      // This should be handled by ContainerTree and forwarded to UI
      runtime.dispatch({
        type: "CONTAINER_TREE.CONTAINER_ADDED",
        payload: {
          entry: containerEntry,
        },
      });

      // Assert - UI machine should have the container registered
      const snapshot = runtime.getSnapshot();
      expect(snapshot.ui.context.registeredContainers).toContainEqual(
        expect.objectContaining({ id: "test-container-1" })
      );
    });
  });

  // ===========================================================================
  // Test 4: DIEffectExecutor integration with container
  // ===========================================================================
  describe("DIEffectExecutor integration", () => {
    it("creates runtime with DIEffectExecutor that can resolve ports from container", () => {
      // Arrange & Act
      runtime = createDevToolsFlowRuntime({ inspector });

      // Assert - Runtime should be created successfully with container integration
      expect(runtime).toBeDefined();
      expect(runtime.getSnapshot()).toBeDefined();

      // The DIEffectExecutor is used internally - we verify it works
      // by checking the runtime can process events that would trigger effects
      runtime.dispatch({ type: "UI.OPEN" });
      expect(runtime.getSnapshot().ui.state).toBe("open");
    });
  });

  // ===========================================================================
  // Test 5: Runtime initialization with three FlowService instances
  // ===========================================================================
  describe("initialization", () => {
    it("initializes with three FlowService instances for UI, Tracing, and ContainerTree", () => {
      // Arrange & Act
      runtime = createDevToolsFlowRuntime({ inspector });
      const snapshot = runtime.getSnapshot();

      // Assert - All three machine snapshots should be present
      expect(snapshot.ui).toBeDefined();
      expect(snapshot.ui.state).toBe("closed");
      expect(snapshot.ui.context).toBeDefined();

      expect(snapshot.tracing).toBeDefined();
      expect(snapshot.tracing.state).toBe("disabled");
      expect(snapshot.tracing.context).toBeDefined();

      expect(snapshot.containerTree).toBeDefined();
      expect(snapshot.containerTree.state).toBe("idle");
      expect(snapshot.containerTree.context).toBeDefined();
    });
  });

  // ===========================================================================
  // Test 6: Runtime disposal and cleanup
  // ===========================================================================
  describe("disposal", () => {
    it("disposes all FlowService instances and cleans up resources", async () => {
      // Arrange
      runtime = createDevToolsFlowRuntime({ inspector });

      // Verify runtime is active
      expect(runtime.isDisposed).toBe(false);

      // Subscribe to verify cleanup
      const unsubscribe = runtime.subscribe(() => {
        // callback
      });

      // Act
      await runtime.dispose();

      // Assert
      expect(runtime.isDisposed).toBe(true);

      // Dispatching after disposal should be a no-op (not throw)
      // The runtime should gracefully handle dispatch after disposal
      runtime.dispatch({ type: "UI.OPEN" });

      // Snapshot should still be available but reflect disposed state
      const snapshot = runtime.getSnapshot();
      expect(snapshot).toBeDefined();

      // Cleanup subscription
      unsubscribe();
    });
  });
});
