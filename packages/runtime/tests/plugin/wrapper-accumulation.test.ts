/**
 * Wrapper accumulation tests for the plugin system.
 *
 * These tests verify the fix for the wrapper accumulation bug:
 * - When using `pipe()` to apply multiple wrappers, each enhanced object must
 *   accumulate ALL previous wrappers, not just track its own.
 * - `getAppliedWrappers()` must return the complete chain of wrappers.
 * - Child containers must inherit all parent wrappers, not just the last one.
 *
 * Root Cause (before fix):
 * - Each wrapper creates a NEW enhanced object
 * - Each wrapper calls `trackAppliedWrapper` on its OWN enhanced object
 * - The final enhanced object only has ONE entry in `wrapperTrackingMap`
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/ports";
import { createAdapter, GraphBuilder } from "@hex-di/graph";
import {
  createContainer,
  definePlugin,
  createPluginWrapper,
  getAppliedWrappers,
  pipe,
} from "../../src/index.js";

// =============================================================================
// Test Plugin Definitions
// =============================================================================

const PLUGIN_A = Symbol.for("test/plugin-a");
const PLUGIN_B = Symbol.for("test/plugin-b");

interface PluginAApi {
  readonly name: "PluginA";
  getValue(): string;
}

interface PluginBApi {
  readonly name: "PluginB";
  getValue(): string;
}

const PluginA = definePlugin({
  name: "plugin-a",
  symbol: PLUGIN_A,
  requires: [] as const,
  enhancedBy: [] as const,
  createApi(): PluginAApi {
    return {
      name: "PluginA",
      getValue: () => "A",
    };
  },
});

const PluginB = definePlugin({
  name: "plugin-b",
  symbol: PLUGIN_B,
  requires: [] as const,
  enhancedBy: [] as const,
  createApi(): PluginBApi {
    return {
      name: "PluginB",
      getValue: () => "B",
    };
  },
});

const withPluginA = createPluginWrapper(PluginA);
const withPluginB = createPluginWrapper(PluginB);

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");

function createTestGraph() {
  const LoggerAdapter = createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ log: () => {} }),
  });

  return GraphBuilder.create().provide(LoggerAdapter).build();
}

// =============================================================================
// Wrapper Accumulation Tests
// =============================================================================

describe("Wrapper Accumulation", () => {
  describe("pipe() with multiple wrappers", () => {
    it("pipe(withPluginA, withPluginB) results in both wrappers being tracked on final enhanced object", () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { name: "Test" });

      // Apply two wrappers via pipe
      const enhanced = pipe(container, withPluginA, withPluginB);

      // Both plugin APIs should be accessible
      expect(enhanced[PLUGIN_A]).toBeDefined();
      expect(enhanced[PLUGIN_A].name).toBe("PluginA");
      expect(enhanced[PLUGIN_B]).toBeDefined();
      expect(enhanced[PLUGIN_B].name).toBe("PluginB");

      // getAppliedWrappers should return BOTH wrappers, not just the last one
      const appliedWrappers = getAppliedWrappers(enhanced);
      expect(appliedWrappers.length).toBe(2);
      expect(appliedWrappers[0].plugin).toBe(PluginA);
      expect(appliedWrappers[1].plugin).toBe(PluginB);
    });

    it("getAppliedWrappers() returns ALL wrappers in chain, not just the last one", () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { name: "Test" });

      // Apply wrappers one by one to demonstrate the issue
      const withA = withPluginA(container);
      const withAB = withPluginB(withA);

      // After first wrapper, should have 1 wrapper
      const wrappersAfterA = getAppliedWrappers(withA);
      expect(wrappersAfterA.length).toBe(1);
      expect(wrappersAfterA[0].plugin).toBe(PluginA);

      // After second wrapper, should have 2 wrappers (not 1!)
      const wrappersAfterAB = getAppliedWrappers(withAB);
      expect(wrappersAfterAB.length).toBe(2);
      expect(wrappersAfterAB[0].plugin).toBe(PluginA);
      expect(wrappersAfterAB[1].plugin).toBe(PluginB);
    });

    it("wrapper order is preserved in getAppliedWrappers()", () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { name: "Test" });

      // Apply in order: A, then B
      const enhanced = pipe(container, withPluginA, withPluginB);
      const wrappers = getAppliedWrappers(enhanced);

      expect(wrappers.length).toBe(2);
      // Order should match application order
      expect(wrappers[0].plugin.name).toBe("plugin-a");
      expect(wrappers[1].plugin.name).toBe("plugin-b");
    });
  });

  describe("child container wrapper inheritance", () => {
    it("child containers created from multi-wrapper parents inherit all wrappers", () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { name: "Parent" });

      // Apply two wrappers to parent
      const enhancedParent = pipe(container, withPluginA, withPluginB);

      // Create a child container
      const childGraph = GraphBuilder.create().build();
      const child = enhancedParent.createChild(childGraph, { name: "Child" });

      // Child should have BOTH plugin APIs (not just PluginB)
      const childAsAny = child as unknown as Record<symbol, unknown>;
      expect(childAsAny[PLUGIN_A]).toBeDefined();
      expect(childAsAny[PLUGIN_B]).toBeDefined();

      // Verify the APIs work
      const pluginAApi = childAsAny[PLUGIN_A] as PluginAApi;
      const pluginBApi = childAsAny[PLUGIN_B] as PluginBApi;
      expect(pluginAApi.getValue()).toBe("A");
      expect(pluginBApi.getValue()).toBe("B");
    });

    it("applyParentWrappers() applies all wrappers to child in correct order", () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { name: "Parent" });

      // Apply wrappers to parent
      const enhancedParent = pipe(container, withPluginA, withPluginB);

      // Create child and verify wrappers were applied
      const childGraph = GraphBuilder.create().build();
      const child = enhancedParent.createChild(childGraph, { name: "Child" });

      // Get applied wrappers from child
      const childWrappers = getAppliedWrappers(child);

      // Child should have both wrappers applied in the same order as parent
      expect(childWrappers.length).toBe(2);
      expect(childWrappers[0].plugin.name).toBe("plugin-a");
      expect(childWrappers[1].plugin.name).toBe("plugin-b");
    });

    it("grandchild containers also inherit all wrappers from the chain", () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { name: "Root" });

      // Apply wrappers to root
      const enhancedRoot = pipe(container, withPluginA, withPluginB);

      // Create child
      const childGraph = GraphBuilder.create().build();
      const child = enhancedRoot.createChild(childGraph, { name: "Child" });

      // Create grandchild from child
      const grandchildGraph = GraphBuilder.create().build();
      const grandchild = child.createChild(grandchildGraph, { name: "Grandchild" });

      // Grandchild should have both plugin APIs
      const grandchildAsAny = grandchild as unknown as Record<symbol, unknown>;
      expect(grandchildAsAny[PLUGIN_A]).toBeDefined();
      expect(grandchildAsAny[PLUGIN_B]).toBeDefined();

      // Verify wrappers are tracked on grandchild
      const grandchildWrappers = getAppliedWrappers(grandchild);
      expect(grandchildWrappers.length).toBe(2);
    });
  });

  describe("symbol presence checks", () => {
    it("PLUGIN_A in child returns true when parent was created with pipe(withPluginA, withPluginB)", () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { name: "Parent" });

      // Apply both wrappers via pipe
      const enhancedParent = pipe(container, withPluginA, withPluginB);

      // Create child
      const childGraph = GraphBuilder.create().build();
      const child = enhancedParent.createChild(childGraph, { name: "Child" });

      // Both symbols should be present on child (this is the key bug fix verification)
      expect(PLUGIN_A in child).toBe(true);
      expect(PLUGIN_B in child).toBe(true);
    });
  });
});
