/**
 * Plugin inheritance tests for child containers.
 *
 * These tests verify:
 * 1. Plugin APIs can be applied to child containers via wrapper pattern
 * 2. Resolution hooks work on containers with wrapper-installed hooks
 * 3. applyParentWrappers() correctly applies parent wrappers to child
 * 4. Container IDs are correctly passed in hook contexts
 *
 * Note: With the wrapper pattern, plugins are applied per-container.
 * Use applyParentWrappers() to apply parent's wrappers to child containers.
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
  applyParentWrappers,
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
    it("plugin APIs are accessible on child container via applyParentWrappers", () => {
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
      const container = pipe(createContainer(graph), withTracker);

      // Verify plugin API is accessible on parent
      expect(container[LIFECYCLE_TRACKER]).toBeDefined();

      // Create child container and apply parent's wrappers
      const childGraph = GraphBuilder.create().build();
      const childContainer = container.createChild(childGraph);
      const enhancedChild = applyParentWrappers(container, childContainer);

      // Plugin API should also be accessible on enhanced child
      const childAsAny = enhancedChild as unknown as Record<symbol, unknown>;
      expect(childAsAny[LIFECYCLE_TRACKER]).toBeDefined();
    });

    it("container IDs follow expected pattern", () => {
      const graph = createTestGraph();
      const container = createContainer(graph);

      // Create child containers
      const childGraph = GraphBuilder.create().build();
      const child1 = container.createChild(childGraph);
      const child2 = container.createChild(childGraph);

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

      // Apply tracker to child containers
      const enhancedChild1 = pipe(applyParentWrappers(container, child1), withTracker);
      const enhancedChild2 = pipe(applyParentWrappers(container, child2), withTracker);

      // Resolve to trigger hooks
      enhancedChild1.resolve(LoggerPort);
      enhancedChild2.resolve(LoggerPort);

      // Both children should have unique IDs
      expect(capturedIds.length).toBe(2);
      expect(capturedIds[0]).toMatch(/^child-\d+$/);
      expect(capturedIds[1]).toMatch(/^child-\d+$/);
      expect(capturedIds[0]).not.toBe(capturedIds[1]);
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
      const container = pipe(createContainer(graph), withTracker);

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
      const container = pipe(createContainer(graph), withTracker);

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
      const container = createContainer(graph);

      // Create child container and apply wrapper directly to it
      const childGraph = GraphBuilder.create().build();
      const childContainer = container.createChild(childGraph);
      const enhancedChild = pipe(childContainer, withTracker);

      // Resolve from child
      enhancedChild.resolve(LoggerPort);

      // Verify child context metadata
      expect(capturedContexts.length).toBe(1);
      const ctx = capturedContexts[0];
      expect(ctx.containerId).toMatch(/^child-/);
      expect(ctx.containerKind).toBe("child");
      expect(ctx.parentContainerId).toBe("root");
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
      const container = createContainer(graph);

      // Resolve from parent first to create singleton
      container.resolve(LoggerPort);

      // Create child with default (shared) mode and apply wrapper
      const childGraph = GraphBuilder.create().build();
      const childContainer = container.createChild(childGraph);
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
      const container = createContainer(graph);

      // Resolve from parent first to create singleton
      container.resolve(LoggerPort);

      // Create child with forked mode and apply wrapper
      const childGraph = GraphBuilder.create().build();
      const childContainer = container.createChild(childGraph, { Logger: "forked" });
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
      const container = createContainer(graph);

      // Resolve from parent first to create singleton
      container.resolve(LoggerPort);

      // Create child with isolated mode and apply wrapper
      const childGraph = GraphBuilder.create().build();
      const childContainer = container.createChild(childGraph, { Logger: "isolated" });
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
      const container = pipe(createContainer(graph), withTracker);

      // Resolve from root container
      container.resolve(LoggerPort);

      const rootContext = capturedContexts[0];
      expect(rootContext).toBeDefined();
      expect(rootContext?.inheritanceMode).toBeNull();
    });
  });
});
