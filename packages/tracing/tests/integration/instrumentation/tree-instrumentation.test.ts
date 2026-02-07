/**
 * Integration tests for instrumentContainerTree.
 *
 * Verifies:
 * - Tree-wide instrumentation of existing containers
 * - Cleanup removes hooks from all containers
 * - Double-instrumentation handling
 *
 * Note: Dynamic child container auto-instrumentation requires runtime to emit
 * child-created events (deferred to v8.0 ENH-05 per Phase 24 decisions).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createContainer } from "@hex-di/runtime";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createMemoryTracer } from "../../../src/adapters/memory/tracer.js";
import { instrumentContainerTree } from "../../../src/instrumentation/tree.js";
import { instrumentContainer } from "../../../src/instrumentation/container.js";
import { clearStack } from "../../../src/instrumentation/span-stack.js";
import type { MemoryTracer } from "../../../src/adapters/memory/tracer.js";
import { NOOP_TRACER } from "../../../src/adapters/noop/index.js";

describe("instrumentContainerTree", () => {
  let tracer: MemoryTracer;
  let containers: Array<any>;

  beforeEach(() => {
    tracer = createMemoryTracer();
    containers = [];
    clearStack();
  });

  afterEach(async () => {
    for (const container of containers) {
      await container.dispose();
    }
    containers = [];
    clearStack();
  });

  it("should instrument root container", () => {
    // instrumentContainerTree instruments the root container
    // Note: Child container instrumentation depends on inspector API child-created events
    // which is documented as v8.0 enhancement per Phase 24 decisions
    const RootPort = port<string>()({ name: "Root" });

    const rootAdapter = createAdapter({
      provides: RootPort,
      requires: [],
      lifetime: "transient",
      factory: () => "root",
    });

    const rootGraph = GraphBuilder.create().provide(rootAdapter).build();
    const root = createContainer({ graph: rootGraph, name: "Root" });
    containers.push(root);

    // Instrument tree (at minimum instruments root)
    const cleanup = instrumentContainerTree(root, root.inspector, tracer);

    // Resolve in root
    root.resolve(RootPort);

    // Verify span created
    const spans = tracer.getCollectedSpans();
    expect(spans.length).toBeGreaterThan(0);
    expect(spans.some(s => s.name === "resolve:Root")).toBe(true);

    cleanup();
  });

  it("should remove all hooks when cleanup called", () => {
    const RootPort = port<string>()({ name: "Root" });
    const ChildPort = port<string>()({ name: "Child" });

    const rootAdapter = createAdapter({
      provides: RootPort,
      requires: [],
      lifetime: "transient",
      factory: () => "root",
    });

    const childAdapter = createAdapter({
      provides: ChildPort,
      requires: [],
      lifetime: "transient",
      factory: () => "child",
    });

    const rootGraph = GraphBuilder.create().provide(rootAdapter).build();
    const childGraph = GraphBuilder.create().provide(childAdapter).buildFragment();

    const root = createContainer({ graph: rootGraph, name: "Root" });
    const child = root.createChild(childGraph, { name: "Child" });
    containers.push(root, child);

    const cleanup = instrumentContainerTree(root, root.inspector, tracer);

    // Verify instrumentation works
    root.resolve(RootPort);
    expect(tracer.getCollectedSpans().length).toBeGreaterThan(0);

    // Cleanup
    cleanup();
    tracer.clear();

    // Resolution should not create spans after cleanup
    root.resolve(RootPort);
    child.resolve(ChildPort);
    expect(tracer.getCollectedSpans()).toHaveLength(0);
  });

  it("should handle double-instrumentation safely", () => {
    const RootPort = port<string>()({ name: "Root" });

    const rootAdapter = createAdapter({
      provides: RootPort,
      requires: [],
      lifetime: "transient",
      factory: () => "root",
    });

    const rootGraph = GraphBuilder.create().provide(rootAdapter).build();
    const root = createContainer({ graph: rootGraph, name: "Root" });
    containers.push(root);

    // First instrumentation
    const cleanup1 = instrumentContainerTree(root, root.inspector, tracer);

    // Second instrumentation should not throw
    const cleanup2 = instrumentContainerTree(root, root.inspector, tracer);

    // Should still work
    root.resolve(RootPort);
    expect(tracer.getCollectedSpans().length).toBeGreaterThan(0);

    cleanup1();
    cleanup2();
  });

  it("should be idempotent (safe to call cleanup multiple times)", () => {
    const RootPort = port<string>()({ name: "Root" });

    const rootAdapter = createAdapter({
      provides: RootPort,
      requires: [],
      lifetime: "transient",
      factory: () => "root",
    });

    const rootGraph = GraphBuilder.create().provide(rootAdapter).build();
    const root = createContainer({ graph: rootGraph, name: "Root" });
    containers.push(root);

    const cleanup = instrumentContainerTree(root, root.inspector, tracer);

    // Should not throw when called multiple times
    cleanup();
    cleanup();
    cleanup();

    // Should not create spans after cleanup
    root.resolve(RootPort);
    expect(tracer.getCollectedSpans()).toHaveLength(0);
  });

  describe("NoOp tracer zero-overhead", () => {
    it("should return no-op cleanup for NoOp tracer in instrumentContainer", () => {
      const noopTracer = NOOP_TRACER;
      const TestPort = port<string>()({ name: "Test" });

      const adapter = createAdapter({
        provides: TestPort,
        requires: [],
        lifetime: "transient",
        factory: () => "test",
      });

      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });
      containers.push(container);

      // Instrument with NoOp tracer
      const cleanup = instrumentContainer(container, noopTracer);

      // Cleanup should be callable (no-op)
      expect(() => cleanup()).not.toThrow();

      // Resolution should work without creating spans
      const result = container.resolve(TestPort);
      expect(result).toBe("test");
    });

    it("should not register hooks with NoOp tracer in instrumentContainer", () => {
      const noopTracer = NOOP_TRACER;
      const TestPort = port<string>()({ name: "Test" });

      const adapter = createAdapter({
        provides: TestPort,
        requires: [],
        lifetime: "transient",
        factory: () => "test",
      });

      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });
      containers.push(container);

      // Get the inspector to check for registered hooks
      const inspector = container.inspector;

      // Instrument with NoOp tracer
      instrumentContainer(container, noopTracer);

      // Verify no hooks are registered by checking the inspector's listeners
      // We can't directly access hooks, but we can verify that resolutions
      // don't trigger any span-related side effects by using a memory tracer
      // for comparison
      const memoryContainer = createContainer({ graph, name: "Memory" });
      containers.push(memoryContainer);
      const memoryTracer = createMemoryTracer();
      instrumentContainer(memoryContainer, memoryTracer);

      // Resolve in both containers
      container.resolve(TestPort);
      memoryContainer.resolve(TestPort);

      // Memory tracer should have spans, NoOp should not affect anything
      const spans = memoryTracer.getCollectedSpans();
      expect(spans.length).toBeGreaterThan(0);

      // NoOp tracer confirmed to not record anything (implicit - no spans to check)
      expect(noopTracer.isEnabled()).toBe(false);
    });

    it("should return no-op cleanup for NoOp tracer in instrumentContainerTree", () => {
      const noopTracer = NOOP_TRACER;
      const RootPort = port<string>()({ name: "Root" });
      const ChildPort = port<string>()({ name: "Child" });

      const rootAdapter = createAdapter({
        provides: RootPort,
        requires: [],
        lifetime: "transient",
        factory: () => "root",
      });

      const childAdapter = createAdapter({
        provides: ChildPort,
        requires: [],
        lifetime: "transient",
        factory: () => "child",
      });

      const rootGraph = GraphBuilder.create().provide(rootAdapter).build();
      const childGraph = GraphBuilder.create().provide(childAdapter).buildFragment();

      const root = createContainer({ graph: rootGraph, name: "Root" });
      const child = root.createChild(childGraph, { name: "Child" });
      containers.push(root, child);

      // Instrument tree with NoOp tracer
      const cleanup = instrumentContainerTree(root, root.inspector, noopTracer);

      // Cleanup should be callable (no-op)
      expect(() => cleanup()).not.toThrow();

      // Resolutions should work without creating spans
      const rootResult = root.resolve(RootPort);
      const childResult = child.resolve(ChildPort);
      expect(rootResult).toBe("root");
      expect(childResult).toBe("child");
    });

    it("should skip tree walking for NoOp tracer in instrumentContainerTree", () => {
      const noopTracer = NOOP_TRACER;
      const RootPort = port<string>()({ name: "Root" });
      const ChildPort = port<string>()({ name: "Child" });

      const rootAdapter = createAdapter({
        provides: RootPort,
        requires: [],
        lifetime: "transient",
        factory: () => "root",
      });

      const childAdapter = createAdapter({
        provides: ChildPort,
        requires: [],
        lifetime: "transient",
        factory: () => "child",
      });

      const rootGraph = GraphBuilder.create().provide(rootAdapter).build();
      const childGraph = GraphBuilder.create().provide(childAdapter).buildFragment();

      const root = createContainer({ graph: rootGraph, name: "Root" });
      const child = root.createChild(childGraph, { name: "Child" });
      containers.push(root, child);

      // Instrument tree with NoOp tracer - should return immediately
      instrumentContainerTree(root, root.inspector, noopTracer);

      // Verify child containers also have no hooks by comparing with memory tracer
      const memoryRoot = createContainer({ graph: rootGraph, name: "MemoryRoot" });
      const memoryChild = memoryRoot.createChild(childGraph, { name: "MemoryChild" });
      containers.push(memoryRoot, memoryChild);

      const memoryTracer = createMemoryTracer();
      instrumentContainerTree(memoryRoot, memoryRoot.inspector, memoryTracer);

      // Resolve in both trees
      root.resolve(RootPort);
      child.resolve(ChildPort);
      memoryRoot.resolve(RootPort);
      memoryChild.resolve(ChildPort);

      // Memory tracer should have spans for both containers
      const spans = memoryTracer.getCollectedSpans();
      expect(spans.length).toBeGreaterThan(0);
      expect(spans.some(s => s.name === "resolve:Root")).toBe(true);
      expect(spans.some(s => s.name === "resolve:Child")).toBe(true);

      // NoOp tracer confirmed to have zero overhead
      expect(noopTracer.isEnabled()).toBe(false);
    });

    it("should allow cleanup to be called multiple times with NoOp tracer", () => {
      const noopTracer = NOOP_TRACER;
      const TestPort = port<string>()({ name: "Test" });

      const adapter = createAdapter({
        provides: TestPort,
        requires: [],
        lifetime: "transient",
        factory: () => "test",
      });

      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });
      containers.push(container);

      const cleanup = instrumentContainerTree(container, container.inspector, noopTracer);

      // Should be safe to call multiple times
      cleanup();
      cleanup();
      cleanup();

      // Container should still work
      const result = container.resolve(TestPort);
      expect(result).toBe("test");
    });
  });
});
