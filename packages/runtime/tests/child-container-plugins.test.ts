/**
 * Plugin inheritance tests for child containers.
 *
 * These tests verify:
 * 1. Plugin APIs can be applied to child containers via wrapper pattern
 * 2. Resolution hooks work on containers with wrapper-installed hooks
 * 3. Plugins are automatically inherited by child containers (auto-inherit)
 * 4. Container IDs are correctly passed in hook contexts
 *
 * Note: With the wrapper pattern, plugins are applied per-container.
 * Child containers automatically inherit parent's wrappers via createChild().
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi } from "vitest";
import { createPort } from "@hex-di/ports";
import { createAdapter, GraphBuilder } from "@hex-di/graph";
import {
  createContainer,
  definePlugin,
  createPluginWrapper,
  pipe,
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
// Plugin Wrapper Pattern Tests
// =============================================================================

describe("Plugin Inheritance in Child Containers", () => {
  describe("plugin APIs via wrapper pattern", () => {
    it("plugin APIs are automatically inherited by child containers", () => {
      const TrackerPlugin = definePlugin({
        name: "tracker",
        symbol: LIFECYCLE_TRACKER,
        requires: [] as const,
        enhancedBy: [] as const,
        createApi(): LifecycleTrackerAPI {
          return {
            getResolutionContexts: () => [],
            clearEvents: () => {},
          };
        },
      });

      // Use wrapper pattern for type-safe plugin API access
      const withTracker = createPluginWrapper(TrackerPlugin);

      const graph = createTestGraph();
      const container = pipe(createContainer(graph, { name: "Test" }), withTracker);

      // Verify plugin API is accessible on parent
      expect(container[LIFECYCLE_TRACKER]).toBeDefined();

      // Child containers automatically inherit parent's wrappers via createChild()
      const childGraph = GraphBuilder.create().build();
      const childContainer = container.createChild(childGraph, { name: "Child" });

      // Plugin API should be accessible on child automatically (no applyParentWrappers needed)
      const childAsAny = childContainer as unknown as Record<symbol, unknown>;
      expect(childAsAny[LIFECYCLE_TRACKER]).toBeDefined();
    });

    it("container IDs follow expected pattern", () => {
      // Access internal state to verify IDs
      // Using hooks to capture container IDs
      const capturedIds: string[] = [];

      const TrackerPlugin = definePlugin({
        name: "tracker",
        symbol: LIFECYCLE_TRACKER,
        requires: [] as const,
        enhancedBy: [] as const,
        createApi(): LifecycleTrackerAPI {
          return {
            getResolutionContexts: () => [],
            clearEvents: () => {},
          };
        },
        hooks: {
          beforeResolve(ctx) {
            if (!capturedIds.includes(ctx.containerId)) {
              capturedIds.push(ctx.containerId);
            }
          },
        },
      });

      const withTracker = createPluginWrapper(TrackerPlugin);
      const graph = createTestGraph();

      // Create parent with tracker plugin
      const container = pipe(createContainer(graph, { name: "Test" }), withTracker);

      // Create child containers - they auto-inherit the tracker plugin
      const childGraph = GraphBuilder.create().build();
      const child1 = container.createChild(childGraph, { name: "Child" });
      const child2 = container.createChild(childGraph, { name: "Child" });

      // Resolve to trigger hooks
      child1.resolve(LoggerPort);
      child2.resolve(LoggerPort);

      // Both children should have unique child-* IDs
      // Filter to only child IDs (parent may also have hooks that fire)
      const childIds = capturedIds.filter(id => id.startsWith("child-"));
      expect(childIds.length).toBe(2);
      expect(childIds[0]).toMatch(/^child-\d+$/);
      expect(childIds[1]).toMatch(/^child-\d+$/);
      expect(childIds[0]).not.toBe(childIds[1]);
    });
  });

  describe("resolution hooks with wrapper pattern", () => {
    it("hooks fire for container with applied wrapper", () => {
      const resolutionEvents: string[] = [];

      const TrackerPlugin = definePlugin({
        name: "tracker",
        symbol: LIFECYCLE_TRACKER,
        requires: [] as const,
        enhancedBy: [] as const,
        createApi(): LifecycleTrackerAPI {
          return {
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

      const withTracker = createPluginWrapper(TrackerPlugin);
      const graph = createTestGraph();
      const container = pipe(createContainer(graph, { name: "Test" }), withTracker);

      // Resolve from parent
      container.resolve(LoggerPort);

      // Check hooks were called for parent
      expect(resolutionEvents.some(e => e.startsWith("before:Logger:root"))).toBe(true);
      expect(resolutionEvents.some(e => e.startsWith("after:Logger:root"))).toBe(true);
    });

    it("hooks receive correct metadata for root container", () => {
      const capturedContexts: ResolutionHookContext[] = [];

      const TrackerPlugin = definePlugin({
        name: "tracker",
        symbol: LIFECYCLE_TRACKER,
        requires: [] as const,
        enhancedBy: [] as const,
        createApi(): LifecycleTrackerAPI {
          return {
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

      const withTracker = createPluginWrapper(TrackerPlugin);
      const graph = createTestGraph();
      const container = pipe(createContainer(graph, { name: "Test" }), withTracker);

      // Resolve from root container
      container.resolve(LoggerPort);

      // Verify context metadata
      expect(capturedContexts.length).toBe(1);
      const ctx = capturedContexts[0];
      expect(ctx.containerId).toBe("root");
      expect(ctx.containerKind).toBe("root");
      expect(ctx.parentContainerId).toBeNull();
      expect(ctx.inheritanceMode).toBeNull();
    });

    it("hooks receive child container metadata when wrapper applied to child", () => {
      const capturedContexts: ResolutionHookContext[] = [];

      const TrackerPlugin = definePlugin({
        name: "tracker",
        symbol: LIFECYCLE_TRACKER,
        requires: [] as const,
        enhancedBy: [] as const,
        createApi(): LifecycleTrackerAPI {
          return {
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

      const withTracker = createPluginWrapper(TrackerPlugin);
      const graph = createTestGraph();
      const container = createContainer(graph, { name: "Test" });

      // Create child container and apply wrapper directly to it
      const childGraph = GraphBuilder.create().build();
      const childContainer = container.createChild(childGraph, { name: "Child" });
      const enhancedChild = pipe(childContainer, withTracker);

      // Resolve from child
      enhancedChild.resolve(LoggerPort);

      // Verify child context metadata
      expect(capturedContexts.length).toBe(1);
      const ctx = capturedContexts[0];
      expect(ctx.containerId).toMatch(/^child-/);
      expect(ctx.containerKind).toBe("child");
      expect(ctx.parentContainerId).toBe("Test"); // Parent's name is "Test"
    });
  });

  describe("inheritance mode in hook context", () => {
    it("hooks receive inheritanceMode=shared for default inherited resolution", () => {
      const capturedContexts: ResolutionHookContext[] = [];

      const TrackerPlugin = definePlugin({
        name: "tracker",
        symbol: LIFECYCLE_TRACKER,
        requires: [] as const,
        enhancedBy: [] as const,
        createApi(): LifecycleTrackerAPI {
          return {
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

      const withTracker = createPluginWrapper(TrackerPlugin);
      const graph = createGraphWithConfig();
      const container = createContainer(graph, { name: "Test" });

      // Resolve from parent first to create singleton
      container.resolve(LoggerPort);

      // Create child with default (shared) mode and apply wrapper
      const childGraph = GraphBuilder.create().build();
      const childContainer = container.createChild(childGraph, { name: "Child" });
      const enhancedChild = pipe(childContainer, withTracker);

      // Resolve from child
      enhancedChild.resolve(LoggerPort);

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

      const withTracker = createPluginWrapper(TrackerPlugin);
      const graph = createGraphWithConfig();
      const container = createContainer(graph, { name: "Test" });

      // Resolve from parent first to create singleton
      container.resolve(LoggerPort);

      // Create child with forked mode and apply wrapper
      const childGraph = GraphBuilder.create().build();
      const childContainer = container.createChild(childGraph, {
        name: "Child",
        inheritanceModes: { Logger: "forked" },
      });
      const enhancedChild = pipe(childContainer, withTracker);

      // Resolve from child
      enhancedChild.resolve(LoggerPort);

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

      const withTracker = createPluginWrapper(TrackerPlugin);
      const graph = createGraphWithConfig();
      const container = createContainer(graph, { name: "Test" });

      // Resolve from parent first to create singleton
      container.resolve(LoggerPort);

      // Create child with isolated mode and apply wrapper
      const childGraph = GraphBuilder.create().build();
      const childContainer = container.createChild(childGraph, {
        name: "Child",
        inheritanceModes: { Logger: "isolated" },
      });
      const enhancedChild = pipe(childContainer, withTracker);

      // Resolve from child
      enhancedChild.resolve(LoggerPort);

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

      const withTracker = createPluginWrapper(TrackerPlugin);
      const graph = createTestGraph();
      const container = pipe(createContainer(graph, { name: "Test" }), withTracker);

      // Resolve from root container
      container.resolve(LoggerPort);

      const rootContext = capturedContexts[0];
      expect(rootContext).toBeDefined();
      expect(rootContext?.inheritanceMode).toBeNull();
    });
  });
});
