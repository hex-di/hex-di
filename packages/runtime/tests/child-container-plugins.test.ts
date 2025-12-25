/**
 * Plugin inheritance tests for child containers.
 *
 * These tests verify:
 * 1. Child container inherits parent's PluginManager
 * 2. onChildCreated hook fires with correct ChildContainerInfo
 * 3. onContainerDisposed hook fires when child is disposed
 * 4. Resolution hooks include container metadata (containerId, containerKind)
 * 5. Inheritance mode (shared/forked/isolated) passed to hooks
 * 6. Multiple child containers each get unique IDs
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createPort } from "@hex-di/ports";
import { createAdapter, GraphBuilder } from "@hex-di/graph";
import {
  createContainer,
  definePlugin,
  type ChildContainerInfo,
  type ContainerInfo,
  type ResolutionHookContext,
} from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Config {
  getValue(key: string): string;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const ConfigPort = createPort<"Config", Config>("Config");

// Plugin symbols for testing
const LIFECYCLE_TRACKER = Symbol.for("test/lifecycle-tracker");

// Interface for the lifecycle tracker API
interface LifecycleTrackerAPI {
  getChildCreatedEvents(): readonly ChildContainerInfo[];
  getContainerDisposedEvents(): readonly ContainerInfo[];
  getResolutionContexts(): readonly ResolutionHookContext[];
  clearEvents(): void;
}

function createTestGraph() {
  const LoggerAdapter = createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ log: vi.fn() }),
  });

  return GraphBuilder.create().provide(LoggerAdapter).build();
}

function createGraphWithConfig() {
  const LoggerAdapter = createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "singleton",
    clonable: true,
    factory: () => ({ log: vi.fn() }),
  });

  const ConfigAdapter = createAdapter({
    provides: ConfigPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ getValue: (key: string) => `value-${key}` }),
  });

  return GraphBuilder.create().provide(LoggerAdapter).provide(ConfigAdapter).build();
}

// =============================================================================
// Plugin Inheritance Tests
// =============================================================================

describe("Plugin Inheritance in Child Containers", () => {
  describe("child container inherits parent's PluginManager", () => {
    it("resolution hooks from parent plugin fire for child container resolutions", () => {
      const resolutionEvents: string[] = [];

      const TrackerPlugin = definePlugin({
        name: "tracker",
        symbol: LIFECYCLE_TRACKER,
        requires: [] as const,
        enhancedBy: [] as const,
        createApi(): LifecycleTrackerAPI {
          return {
            getChildCreatedEvents: () => [],
            getContainerDisposedEvents: () => [],
            getResolutionContexts: () => [],
            clearEvents: () => {},
          };
        },
        hooks: {
          beforeResolve(ctx) {
            resolutionEvents.push(`before:${ctx.portName}:${ctx.containerId}`);
          },
          afterResolve(ctx) {
            resolutionEvents.push(`after:${ctx.portName}:${ctx.containerId}`);
          },
        },
      });

      const graph = createTestGraph();
      const container = createContainer(graph, {
        plugins: [TrackerPlugin],
      });

      // Create child container
      const childGraph = GraphBuilder.create().build();
      const childContainer = container.createChild(childGraph);

      // Resolve from child - should trigger parent's plugin hooks
      childContainer.resolve(LoggerPort);

      // Check that both before and after hooks were called with child container info
      expect(resolutionEvents.some(e => e.startsWith("before:Logger:child-"))).toBe(true);
      expect(resolutionEvents.some(e => e.startsWith("after:Logger:child-"))).toBe(true);
    });

    it("plugin APIs are accessible on child container via symbols", () => {
      const TrackerPlugin = definePlugin({
        name: "tracker",
        symbol: LIFECYCLE_TRACKER,
        requires: [] as const,
        enhancedBy: [] as const,
        createApi(): LifecycleTrackerAPI {
          return {
            getChildCreatedEvents: () => [],
            getContainerDisposedEvents: () => [],
            getResolutionContexts: () => [],
            clearEvents: () => {},
          };
        },
      });

      const graph = createTestGraph();
      const container = createContainer(graph, {
        plugins: [TrackerPlugin],
      });

      // Verify plugin API is accessible on parent
      expect(container[LIFECYCLE_TRACKER]).toBeDefined();

      // Create child container
      const childGraph = GraphBuilder.create().build();
      const childContainer = container.createChild(childGraph);

      // Plugin API should also be accessible on child container (via inheritance)
      // TypeScript doesn't track plugin augmentation through createChild,
      // but the runtime correctly inherits plugin APIs
      const childAsAny = childContainer as unknown as Record<symbol, unknown>;
      expect(childAsAny[LIFECYCLE_TRACKER]).toBeDefined();
      expect(childAsAny[LIFECYCLE_TRACKER]).toBe(container[LIFECYCLE_TRACKER]);
    });
  });

  describe("onChildCreated hook fires with correct ChildContainerInfo", () => {
    it("onChildCreated hook receives correct ChildContainerInfo for child container", () => {
      const childCreatedEvents: ChildContainerInfo[] = [];

      const TrackerPlugin = definePlugin({
        name: "tracker",
        symbol: LIFECYCLE_TRACKER,
        requires: [] as const,
        enhancedBy: [] as const,
        createApi(): LifecycleTrackerAPI {
          return {
            getChildCreatedEvents: () => childCreatedEvents,
            getContainerDisposedEvents: () => [],
            getResolutionContexts: () => [],
            clearEvents: () => {
              childCreatedEvents.length = 0;
            },
          };
        },
        hooks: {
          onChildCreated(info) {
            childCreatedEvents.push(info);
          },
        },
      });

      const graph = createTestGraph();
      const container = createContainer(graph, {
        plugins: [TrackerPlugin],
      });

      // Create child container
      const childGraph = GraphBuilder.create().build();
      container.createChild(childGraph);

      // Verify onChildCreated was called
      expect(childCreatedEvents.length).toBe(1);
      const event = childCreatedEvents[0];
      expect(event).toBeDefined();
      expect(event?.kind).toBe("child");
      expect(event?.parentId).toBe("root");
      expect(event?.id).toMatch(/^child-/);
      expect(typeof event?.createdAt).toBe("number");
    });

    it("multiple child containers each trigger separate onChildCreated events", () => {
      const childCreatedEvents: ChildContainerInfo[] = [];

      const TrackerPlugin = definePlugin({
        name: "tracker",
        symbol: LIFECYCLE_TRACKER,
        requires: [] as const,
        enhancedBy: [] as const,
        createApi(): LifecycleTrackerAPI {
          return {
            getChildCreatedEvents: () => childCreatedEvents,
            getContainerDisposedEvents: () => [],
            getResolutionContexts: () => [],
            clearEvents: () => {
              childCreatedEvents.length = 0;
            },
          };
        },
        hooks: {
          onChildCreated(info) {
            childCreatedEvents.push(info);
          },
        },
      });

      const graph = createTestGraph();
      const container = createContainer(graph, {
        plugins: [TrackerPlugin],
      });

      // Create multiple child containers
      const childGraph = GraphBuilder.create().build();
      container.createChild(childGraph);
      container.createChild(childGraph);
      container.createChild(childGraph);

      // Verify all onChildCreated events were fired
      expect(childCreatedEvents.length).toBe(3);

      // Each child should have a unique ID
      const ids = new Set(childCreatedEvents.map(e => e.id));
      expect(ids.size).toBe(3);
    });
  });

  describe("onContainerDisposed hook fires when child is disposed", () => {
    it("onContainerDisposed fires when child container is disposed", async () => {
      const disposedEvents: ContainerInfo[] = [];

      const TrackerPlugin = definePlugin({
        name: "tracker",
        symbol: LIFECYCLE_TRACKER,
        requires: [] as const,
        enhancedBy: [] as const,
        createApi(): LifecycleTrackerAPI {
          return {
            getChildCreatedEvents: () => [],
            getContainerDisposedEvents: () => disposedEvents,
            getResolutionContexts: () => [],
            clearEvents: () => {
              disposedEvents.length = 0;
            },
          };
        },
        hooks: {
          onContainerDisposed(info) {
            disposedEvents.push(info);
          },
        },
      });

      const graph = createTestGraph();
      const container = createContainer(graph, {
        plugins: [TrackerPlugin],
      });

      // Create child container
      const childGraph = GraphBuilder.create().build();
      const childContainer = container.createChild(childGraph);

      // Dispose child container
      await childContainer.dispose();

      // Verify onContainerDisposed was called for child
      expect(disposedEvents.length).toBe(1);
      const event = disposedEvents[0];
      expect(event).toBeDefined();
      expect(event?.kind).toBe("child");
      expect(event?.parentId).toBe("root");
      expect(event?.id).toMatch(/^child-/);
    });

    it("disposing parent also triggers onContainerDisposed for children", async () => {
      const disposedEvents: ContainerInfo[] = [];

      const TrackerPlugin = definePlugin({
        name: "tracker",
        symbol: LIFECYCLE_TRACKER,
        requires: [] as const,
        enhancedBy: [] as const,
        createApi(): LifecycleTrackerAPI {
          return {
            getChildCreatedEvents: () => [],
            getContainerDisposedEvents: () => disposedEvents,
            getResolutionContexts: () => [],
            clearEvents: () => {
              disposedEvents.length = 0;
            },
          };
        },
        hooks: {
          onContainerDisposed(info) {
            disposedEvents.push(info);
          },
        },
      });

      const graph = createTestGraph();
      const container = createContainer(graph, {
        plugins: [TrackerPlugin],
      });

      // Create child container
      const childGraph = GraphBuilder.create().build();
      container.createChild(childGraph);

      // Dispose parent container (should cascade to child)
      await container.dispose();

      // Verify both child and parent disposed events fired
      expect(disposedEvents.length).toBe(2);

      // Child should be disposed first (LIFO)
      const childEvent = disposedEvents.find(e => e.kind === "child");
      const parentEvent = disposedEvents.find(e => e.kind === "root");

      expect(childEvent).toBeDefined();
      expect(parentEvent).toBeDefined();

      // Child should come before parent in the array (disposed first)
      const childIndex = disposedEvents.indexOf(childEvent!);
      const parentIndex = disposedEvents.indexOf(parentEvent!);
      expect(childIndex).toBeLessThan(parentIndex);
    });
  });

  describe("resolution hooks include container metadata", () => {
    it("hooks receive containerId and containerKind for child container", () => {
      const capturedContexts: ResolutionHookContext[] = [];

      const TrackerPlugin = definePlugin({
        name: "tracker",
        symbol: LIFECYCLE_TRACKER,
        requires: [] as const,
        enhancedBy: [] as const,
        createApi(): LifecycleTrackerAPI {
          return {
            getChildCreatedEvents: () => [],
            getContainerDisposedEvents: () => [],
            getResolutionContexts: () => capturedContexts,
            clearEvents: () => {
              capturedContexts.length = 0;
            },
          };
        },
        hooks: {
          beforeResolve(ctx) {
            capturedContexts.push(ctx);
          },
        },
      });

      const graph = createTestGraph();
      const container = createContainer(graph, {
        plugins: [TrackerPlugin],
      });

      // Resolve from parent
      container.resolve(LoggerPort);

      // Create child and resolve from child
      const childGraph = GraphBuilder.create().build();
      const childContainer = container.createChild(childGraph);
      childContainer.resolve(LoggerPort);

      // Verify parent resolution context
      const parentContext = capturedContexts.find(c => c.containerKind === "root");
      expect(parentContext).toBeDefined();
      expect(parentContext?.containerId).toBe("root");
      expect(parentContext?.containerKind).toBe("root");
      expect(parentContext?.parentContainerId).toBeNull();

      // Verify child resolution context
      const childContext = capturedContexts.find(c => c.containerKind === "child");
      expect(childContext).toBeDefined();
      expect(childContext?.containerId).toMatch(/^child-/);
      expect(childContext?.containerKind).toBe("child");
      expect(childContext?.parentContainerId).toBe("root");
    });

    it("hooks receive parentContainerId for nested child containers", () => {
      const capturedContexts: ResolutionHookContext[] = [];
      const childCreatedEvents: ChildContainerInfo[] = [];

      const TrackerPlugin = definePlugin({
        name: "tracker",
        symbol: LIFECYCLE_TRACKER,
        requires: [] as const,
        enhancedBy: [] as const,
        createApi(): LifecycleTrackerAPI {
          return {
            getChildCreatedEvents: () => childCreatedEvents,
            getContainerDisposedEvents: () => [],
            getResolutionContexts: () => capturedContexts,
            clearEvents: () => {
              capturedContexts.length = 0;
              childCreatedEvents.length = 0;
            },
          };
        },
        hooks: {
          beforeResolve(ctx) {
            capturedContexts.push(ctx);
          },
          onChildCreated(info) {
            childCreatedEvents.push(info);
          },
        },
      });

      const graph = createTestGraph();
      const container = createContainer(graph, {
        plugins: [TrackerPlugin],
      });

      // Create child -> grandchild hierarchy
      const childGraph = GraphBuilder.create().build();
      const childContainer = container.createChild(childGraph);
      const grandchildGraph = GraphBuilder.create().build();
      childContainer.createChild(grandchildGraph);

      // Verify the child creation events show correct parentId
      // First child's parentId should be "root"
      const firstChildEvent = childCreatedEvents[0];
      expect(firstChildEvent?.parentId).toBe("root");

      // Grandchild's parentId should be the first child's id
      const grandchildEvent = childCreatedEvents[1];
      expect(grandchildEvent?.parentId).toMatch(/^child-/);
      expect(grandchildEvent?.parentId).toBe(firstChildEvent?.id);
    });
  });

  describe("inheritance mode passed to hooks", () => {
    it("hooks receive inheritanceMode=shared for default behavior", () => {
      const capturedContexts: ResolutionHookContext[] = [];

      const TrackerPlugin = definePlugin({
        name: "tracker",
        symbol: LIFECYCLE_TRACKER,
        requires: [] as const,
        enhancedBy: [] as const,
        createApi(): LifecycleTrackerAPI {
          return {
            getChildCreatedEvents: () => [],
            getContainerDisposedEvents: () => [],
            getResolutionContexts: () => capturedContexts,
            clearEvents: () => {
              capturedContexts.length = 0;
            },
          };
        },
        hooks: {
          beforeResolve(ctx) {
            capturedContexts.push(ctx);
          },
        },
      });

      const graph = createGraphWithConfig();
      const container = createContainer(graph, {
        plugins: [TrackerPlugin],
      });

      // Resolve from parent first to create singleton
      container.resolve(LoggerPort);
      capturedContexts.length = 0; // Clear parent resolution

      // Create child with default (shared) mode
      const childGraph = GraphBuilder.create().build();
      const childContainer = container.createChild(childGraph);

      // Resolve from child
      childContainer.resolve(LoggerPort);

      const childContext = capturedContexts[0];
      expect(childContext).toBeDefined();
      expect(childContext?.inheritanceMode).toBe("shared");
    });

    it("hooks receive inheritanceMode=forked when configured", () => {
      const capturedContexts: ResolutionHookContext[] = [];

      const TrackerPlugin = definePlugin({
        name: "tracker",
        symbol: LIFECYCLE_TRACKER,
        requires: [] as const,
        enhancedBy: [] as const,
        createApi(): LifecycleTrackerAPI {
          return {
            getChildCreatedEvents: () => [],
            getContainerDisposedEvents: () => [],
            getResolutionContexts: () => capturedContexts,
            clearEvents: () => {
              capturedContexts.length = 0;
            },
          };
        },
        hooks: {
          beforeResolve(ctx) {
            capturedContexts.push(ctx);
          },
        },
      });

      const graph = createGraphWithConfig();
      const container = createContainer(graph, {
        plugins: [TrackerPlugin],
      });

      // Resolve from parent first to create singleton
      container.resolve(LoggerPort);
      capturedContexts.length = 0; // Clear parent resolution

      // Create child with forked mode for Logger
      const childGraph = GraphBuilder.create().build();
      const childContainer = container.createChild(childGraph, { Logger: "forked" });

      // Resolve from child
      childContainer.resolve(LoggerPort);

      const childContext = capturedContexts[0];
      expect(childContext).toBeDefined();
      expect(childContext?.inheritanceMode).toBe("forked");
    });

    it("hooks receive inheritanceMode=isolated when configured", () => {
      const capturedContexts: ResolutionHookContext[] = [];

      const TrackerPlugin = definePlugin({
        name: "tracker",
        symbol: LIFECYCLE_TRACKER,
        requires: [] as const,
        enhancedBy: [] as const,
        createApi(): LifecycleTrackerAPI {
          return {
            getChildCreatedEvents: () => [],
            getContainerDisposedEvents: () => [],
            getResolutionContexts: () => capturedContexts,
            clearEvents: () => {
              capturedContexts.length = 0;
            },
          };
        },
        hooks: {
          beforeResolve(ctx) {
            capturedContexts.push(ctx);
          },
        },
      });

      const graph = createGraphWithConfig();
      const container = createContainer(graph, {
        plugins: [TrackerPlugin],
      });

      // Resolve from parent first to create singleton
      container.resolve(LoggerPort);
      capturedContexts.length = 0; // Clear parent resolution

      // Create child with isolated mode for Logger
      const childGraph = GraphBuilder.create().build();
      const childContainer = container.createChild(childGraph, { Logger: "isolated" });

      // Resolve from child
      childContainer.resolve(LoggerPort);

      const childContext = capturedContexts[0];
      expect(childContext).toBeDefined();
      expect(childContext?.inheritanceMode).toBe("isolated");
    });

    it("hooks receive null inheritanceMode for root container", () => {
      const capturedContexts: ResolutionHookContext[] = [];

      const TrackerPlugin = definePlugin({
        name: "tracker",
        symbol: LIFECYCLE_TRACKER,
        requires: [] as const,
        enhancedBy: [] as const,
        createApi(): LifecycleTrackerAPI {
          return {
            getChildCreatedEvents: () => [],
            getContainerDisposedEvents: () => [],
            getResolutionContexts: () => capturedContexts,
            clearEvents: () => {
              capturedContexts.length = 0;
            },
          };
        },
        hooks: {
          beforeResolve(ctx) {
            capturedContexts.push(ctx);
          },
        },
      });

      const graph = createTestGraph();
      const container = createContainer(graph, {
        plugins: [TrackerPlugin],
      });

      // Resolve from root container
      container.resolve(LoggerPort);

      const rootContext = capturedContexts[0];
      expect(rootContext).toBeDefined();
      expect(rootContext?.inheritanceMode).toBeNull();
    });
  });

  describe("multiple child containers get unique IDs", () => {
    it("each child container has a unique containerId", () => {
      const capturedContainerIds: string[] = [];

      const TrackerPlugin = definePlugin({
        name: "tracker",
        symbol: LIFECYCLE_TRACKER,
        requires: [] as const,
        enhancedBy: [] as const,
        createApi(): LifecycleTrackerAPI {
          return {
            getChildCreatedEvents: () => [],
            getContainerDisposedEvents: () => [],
            getResolutionContexts: () => [],
            clearEvents: () => {},
          };
        },
        hooks: {
          beforeResolve(ctx) {
            if (!capturedContainerIds.includes(ctx.containerId)) {
              capturedContainerIds.push(ctx.containerId);
            }
          },
        },
      });

      const graph = createTestGraph();
      const container = createContainer(graph, {
        plugins: [TrackerPlugin],
      });

      // Create multiple child containers and resolve from each
      const childGraph = GraphBuilder.create().build();
      const child1 = container.createChild(childGraph);
      const child2 = container.createChild(childGraph);
      const child3 = container.createChild(childGraph);

      child1.resolve(LoggerPort);
      child2.resolve(LoggerPort);
      child3.resolve(LoggerPort);

      // Verify each child has a unique ID (plus root)
      expect(capturedContainerIds.length).toBe(4); // root + 3 children
      expect(new Set(capturedContainerIds).size).toBe(4);
    });

    it("container IDs follow expected pattern", () => {
      const childCreatedEvents: ChildContainerInfo[] = [];

      const TrackerPlugin = definePlugin({
        name: "tracker",
        symbol: LIFECYCLE_TRACKER,
        requires: [] as const,
        enhancedBy: [] as const,
        createApi(): LifecycleTrackerAPI {
          return {
            getChildCreatedEvents: () => childCreatedEvents,
            getContainerDisposedEvents: () => [],
            getResolutionContexts: () => [],
            clearEvents: () => {
              childCreatedEvents.length = 0;
            },
          };
        },
        hooks: {
          onChildCreated(info) {
            childCreatedEvents.push(info);
          },
        },
      });

      const graph = createTestGraph();
      const container = createContainer(graph, {
        plugins: [TrackerPlugin],
      });

      // Create child containers
      const childGraph = GraphBuilder.create().build();
      container.createChild(childGraph);
      container.createChild(childGraph);

      // Verify ID pattern
      for (const event of childCreatedEvents) {
        expect(event.id).toMatch(/^child-\d+$/);
      }
    });
  });
});
