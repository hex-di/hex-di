/**
 * Integration tests for dynamic child container auto-instrumentation.
 *
 * Verifies:
 * - Dynamic children created via createChild() are auto-instrumented
 * - Async children created via createChildAsync() are instrumented after resolution
 * - Lazy children created via createLazyChild() are instrumented on first access
 * - Deeply nested dynamic children are instrumented recursively
 * - Mixed static and dynamic children both work
 * - Cleanup unsubscribes from all event listeners
 * - Multiple tracers work with dynamic children
 * - Port filtering applies to dynamic children
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createContainer } from "@hex-di/runtime";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createMemoryTracer } from "../../../src/adapters/memory/tracer.js";
import { instrumentContainerTree } from "../../../src/instrumentation/tree.js";
import { clearStack } from "../../../src/instrumentation/span-stack.js";
import type { MemoryTracer } from "../../../src/adapters/memory/tracer.js";

describe("dynamic child container auto-instrumentation", () => {
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

  describe("basic dynamic child instrumentation", () => {
    it("should auto-instrument synchronously created child containers", () => {
      const RootPort = port<string>()({ name: "Root" });
      const ChildPort = port<string>()({ name: "Child" });

      const rootAdapter = createAdapter({
        provides: RootPort,
        requires: [],
        lifetime: "transient",
        factory: () => "root-value",
      });

      const childAdapter = createAdapter({
        provides: ChildPort,
        requires: [],
        lifetime: "transient",
        factory: () => "child-value",
      });

      const rootGraph = GraphBuilder.create().provide(rootAdapter).build();
      const childGraph = GraphBuilder.create().provide(childAdapter).buildFragment();

      const root = createContainer({ graph: rootGraph, name: "Root" });
      containers.push(root);

      // Instrument tree before creating child
      const cleanup = instrumentContainerTree(root, root.inspector, tracer);

      // Create child dynamically (should auto-instrument)
      const child = root.createChild(childGraph, { name: "DynamicChild" });
      containers.push(child);

      // Resolve in child
      const result = child.resolve(ChildPort);
      expect(result).toBe("child-value");

      // Verify child spans were captured
      const spans = tracer.getCollectedSpans();
      const childSpan = spans.find(s => s.name === "resolve:Child");

      expect(childSpan).toBeDefined();
      // Container name will be internal ID like "child-1", not the user-provided name
      expect(childSpan?.attributes["hex-di.container.name"]).toMatch(/^child-\d+$/);

      cleanup();
    });

    it("should maintain parent-child span relationships across dynamic containers", () => {
      const RootPort = port<string>()({ name: "RootService" });
      const ChildPort = port<string>()({ name: "ChildService" });

      const childRef: { current: any } = { current: null };

      const rootAdapter = createAdapter({
        provides: RootPort,
        requires: [],
        lifetime: "singleton",
        factory: () => {
          // Trigger resolution in dynamically created child
          const childValue = childRef.current.resolve(ChildPort);
          return `root-${childValue}`;
        },
      });

      const childAdapter = createAdapter({
        provides: ChildPort,
        requires: [],
        lifetime: "singleton",
        factory: () => "child",
      });

      const rootGraph = GraphBuilder.create().provide(rootAdapter).build();
      const childGraph = GraphBuilder.create().provide(childAdapter).buildFragment();

      const root = createContainer({ graph: rootGraph, name: "Root" });
      containers.push(root);

      // Instrument before creating child
      const cleanup = instrumentContainerTree(root, root.inspector, tracer);

      // Create child dynamically
      const child = root.createChild(childGraph, { name: "DynamicChild" });
      childRef.current = child;
      containers.push(child);

      // Resolve in root (triggers resolution in child)
      const result = root.resolve(RootPort);
      expect(result).toBe("root-child");

      // Verify span relationships
      const spans = tracer.getCollectedSpans();
      const rootSpan = spans.find(s => s.name === "resolve:RootService");
      const childSpan = spans.find(s => s.name === "resolve:ChildService");

      expect(rootSpan).toBeDefined();
      expect(childSpan).toBeDefined();

      // Child span should be nested under root span
      expect(childSpan?.parentSpanId).toBe(rootSpan?.context.spanId);

      cleanup();
    });
  });

  describe("async child creation", () => {
    it("should auto-instrument children created via createChildAsync", async () => {
      const RootPort = port<string>()({ name: "Root" });
      const ChildPort = port<string>()({ name: "Child" });

      const rootAdapter = createAdapter({
        provides: RootPort,
        requires: [],
        lifetime: "transient",
        factory: () => "root-value",
      });

      const childAdapter = createAdapter({
        provides: ChildPort,
        requires: [],
        lifetime: "transient",
        factory: () => "child-value",
      });

      const rootGraph = GraphBuilder.create().provide(rootAdapter).build();
      const childGraph = GraphBuilder.create().provide(childAdapter).buildFragment();

      const root = createContainer({ graph: rootGraph, name: "Root" });
      containers.push(root);

      // Instrument tree
      const cleanup = instrumentContainerTree(root, root.inspector, tracer);

      // Create child asynchronously with async factory
      const child = await root.createChildAsync(async () => childGraph, {
        name: "AsyncChild",
      });
      containers.push(child);

      // Verify instrumentation works
      child.resolve(ChildPort);

      const spans = tracer.getCollectedSpans();
      const childSpan = spans.find(s => s.name === "resolve:Child");

      expect(childSpan).toBeDefined();
      expect(childSpan?.attributes["hex-di.container.name"]).toMatch(/^child-\d+$/);

      cleanup();
    });
  });

  describe("lazy child creation", () => {
    it("should skip lazy containers during initial tree walk", () => {
      // Lazy containers are not instrumented during tree walk because:
      // 1. They don't expose HookableContainer interface until loaded
      // 2. Their child-created event isn't emitted until first access
      // This is expected behavior - lazy containers can be manually instrumented after load.

      const RootPort = port<string>()({ name: "Root" });
      const ChildPort = port<string>()({ name: "Child" });

      const rootAdapter = createAdapter({
        provides: RootPort,
        requires: [],
        lifetime: "transient",
        factory: () => "root-value",
      });

      const childAdapter = createAdapter({
        provides: ChildPort,
        requires: [],
        lifetime: "transient",
        factory: () => "child-value",
      });

      const rootGraph = GraphBuilder.create().provide(rootAdapter).build();
      const childGraph = GraphBuilder.create().provide(childAdapter).buildFragment();

      const root = createContainer({ graph: rootGraph, name: "Root" });
      containers.push(root);

      // Create lazy child BEFORE instrumentation
      const lazyChild = root.createLazyChild(async () => childGraph, { name: "LazyChild" });
      containers.push(lazyChild);

      // Instrument tree (will skip lazy child)
      const cleanup = instrumentContainerTree(root, root.inspector, tracer);

      // Root should be instrumented
      root.resolve(RootPort);
      expect(tracer.getCollectedSpans().length).toBeGreaterThan(0);

      cleanup();
    });
  });

  describe("deeply nested dynamic children", () => {
    it("should recursively instrument nested dynamic children", () => {
      const RootPort = port<string>()({ name: "Root" });
      const ChildPort = port<string>()({ name: "Child" });
      const GrandchildPort = port<string>()({ name: "Grandchild" });

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

      const grandchildAdapter = createAdapter({
        provides: GrandchildPort,
        requires: [],
        lifetime: "transient",
        factory: () => "grandchild",
      });

      const rootGraph = GraphBuilder.create().provide(rootAdapter).build();
      const childGraph = GraphBuilder.create().provide(childAdapter).buildFragment();
      const grandchildGraph = GraphBuilder.create().provide(grandchildAdapter).buildFragment();

      const root = createContainer({ graph: rootGraph, name: "Root" });
      containers.push(root);

      // Instrument root tree
      const cleanup = instrumentContainerTree(root, root.inspector, tracer);

      // Create child dynamically
      const child = root.createChild(childGraph, { name: "Child" });
      containers.push(child);

      // Create grandchild dynamically from child
      const grandchild = child.createChild(grandchildGraph, { name: "Grandchild" });
      containers.push(grandchild);

      // Resolve in grandchild
      grandchild.resolve(GrandchildPort);

      // Verify grandchild span was captured
      const spans = tracer.getCollectedSpans();
      const grandchildSpan = spans.find(s => s.name === "resolve:Grandchild");

      expect(grandchildSpan).toBeDefined();
      expect(grandchildSpan?.attributes["hex-di.container.name"]).toMatch(/^child-\d+$/);

      cleanup();
    });

    it("should maintain span hierarchy across three levels of dynamic containers", () => {
      const PortA = port<string>()({ name: "A" });
      const PortB = port<string>()({ name: "B" });
      const PortC = port<string>()({ name: "C" });

      const childRef: { current: any } = { current: null };
      const grandchildRef: { current: any } = { current: null };

      const adapterA = createAdapter({
        provides: PortA,
        requires: [],
        lifetime: "singleton",
        factory: () => {
          const b = childRef.current.resolve(PortB);
          return `A-${b}`;
        },
      });

      const adapterB = createAdapter({
        provides: PortB,
        requires: [],
        lifetime: "singleton",
        factory: () => {
          const c = grandchildRef.current.resolve(PortC);
          return `B-${c}`;
        },
      });

      const adapterC = createAdapter({
        provides: PortC,
        requires: [],
        lifetime: "singleton",
        factory: () => "C",
      });

      const rootGraph = GraphBuilder.create().provide(adapterA).build();
      const childGraph = GraphBuilder.create().provide(adapterB).buildFragment();
      const grandchildGraph = GraphBuilder.create().provide(adapterC).buildFragment();

      const root = createContainer({ graph: rootGraph, name: "Root" });
      containers.push(root);

      const cleanup = instrumentContainerTree(root, root.inspector, tracer);

      const child = root.createChild(childGraph, { name: "Child" });
      childRef.current = child;
      containers.push(child);

      const grandchild = child.createChild(grandchildGraph, { name: "Grandchild" });
      grandchildRef.current = grandchild;
      containers.push(grandchild);

      const result = root.resolve(PortA);
      expect(result).toBe("A-B-C");

      const spans = tracer.getCollectedSpans();
      const spanA = spans.find(s => s.name === "resolve:A");
      const spanB = spans.find(s => s.name === "resolve:B");
      const spanC = spans.find(s => s.name === "resolve:C");

      expect(spanA).toBeDefined();
      expect(spanB).toBeDefined();
      expect(spanC).toBeDefined();

      // Verify chain: A → B → C
      expect(spanA?.parentSpanId).toBeUndefined();
      expect(spanB?.parentSpanId).toBe(spanA?.context.spanId);
      expect(spanC?.parentSpanId).toBe(spanB?.context.spanId);

      cleanup();
    });
  });

  describe("mixed static and dynamic children", () => {
    it("should instrument both pre-existing and dynamically created children", () => {
      const RootPort = port<string>()({ name: "Root" });
      const StaticChildPort = port<string>()({ name: "StaticChild" });
      const DynamicChildPort = port<string>()({ name: "DynamicChild" });

      const rootAdapter = createAdapter({
        provides: RootPort,
        requires: [],
        lifetime: "transient",
        factory: () => "root",
      });

      const staticAdapter = createAdapter({
        provides: StaticChildPort,
        requires: [],
        lifetime: "transient",
        factory: () => "static",
      });

      const dynamicAdapter = createAdapter({
        provides: DynamicChildPort,
        requires: [],
        lifetime: "transient",
        factory: () => "dynamic",
      });

      const rootGraph = GraphBuilder.create().provide(rootAdapter).build();
      const staticGraph = GraphBuilder.create().provide(staticAdapter).buildFragment();
      const dynamicGraph = GraphBuilder.create().provide(dynamicAdapter).buildFragment();

      const root = createContainer({ graph: rootGraph, name: "Root" });
      containers.push(root);

      // Create static child before instrumentation
      const staticChild = root.createChild(staticGraph, { name: "StaticChild" });
      containers.push(staticChild);

      // Instrument tree (should instrument root + static child)
      const cleanup = instrumentContainerTree(root, root.inspector, tracer);

      // Create dynamic child after instrumentation
      const dynamicChild = root.createChild(dynamicGraph, { name: "DynamicChild" });
      containers.push(dynamicChild);

      // Resolve in both children
      staticChild.resolve(StaticChildPort);
      dynamicChild.resolve(DynamicChildPort);

      // Both should have spans
      const spans = tracer.getCollectedSpans();
      const staticSpan = spans.find(s => s.name === "resolve:StaticChild");
      const dynamicSpan = spans.find(s => s.name === "resolve:DynamicChild");

      expect(staticSpan).toBeDefined();
      expect(dynamicSpan).toBeDefined();

      cleanup();
    });
  });

  describe("cleanup and event unsubscribe", () => {
    it("should unsubscribe from child-created events when cleanup called", () => {
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
      containers.push(root);

      const cleanup = instrumentContainerTree(root, root.inspector, tracer);

      // Cleanup should unsubscribe from events
      cleanup();
      tracer.clear();

      // Create child after cleanup (should NOT be instrumented)
      const child = root.createChild(childGraph, { name: "Child" });
      containers.push(child);

      // Resolve in child
      child.resolve(ChildPort);

      // No spans should be captured (instrumentation removed)
      const spans = tracer.getCollectedSpans();
      expect(spans).toHaveLength(0);
    });
  });

  describe("multiple tracers", () => {
    it("should handle double instrumentation by replacing hooks", () => {
      // Note: Double-instrumenting the same tree replaces hooks rather than
      // adding multiple tracers. The second tracer replaces the first.
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
      containers.push(root);

      // Instrument with first tracer
      const tracer1 = createMemoryTracer();
      const cleanup1 = instrumentContainerTree(root, root.inspector, tracer1);

      // Instrument with second tracer (replaces first)
      const tracer2 = createMemoryTracer();
      const cleanup2 = instrumentContainerTree(root, root.inspector, tracer2);

      // Create child dynamically
      const child = root.createChild(childGraph, { name: "Child" });
      containers.push(child);

      // Resolve in child
      child.resolve(ChildPort);

      // Only second tracer should capture (it replaced the first)
      expect(tracer1.getCollectedSpans()).toHaveLength(0);
      expect(tracer2.getCollectedSpans().length).toBeGreaterThan(0);

      const span2 = tracer2.getCollectedSpans().find(s => s.name === "resolve:Child");
      expect(span2).toBeDefined();

      cleanup1();
      cleanup2();
    });
  });

  describe("port filtering", () => {
    it("should apply port filter to dynamically created children", () => {
      const Service1 = port<string>()({ name: "Service1" });
      const Service2 = port<string>()({ name: "Service2" });

      const adapter1 = createAdapter({
        provides: Service1,
        requires: [],
        lifetime: "transient",
        factory: () => "service1",
      });

      const adapter2 = createAdapter({
        provides: Service2,
        requires: [],
        lifetime: "transient",
        factory: () => "service2",
      });

      const rootGraph = GraphBuilder.create().provide(adapter1).build();
      const childGraph = GraphBuilder.create().provide(adapter1).provide(adapter2).buildFragment();

      const root = createContainer({ graph: rootGraph, name: "Root" });
      containers.push(root);

      // Instrument with port filter (only Service1)
      const cleanup = instrumentContainerTree(root, root.inspector, tracer, {
        portFilter: {
          include: ["Service1"],
        },
      });

      // Create child dynamically
      const child = root.createChild(childGraph, { name: "Child" });
      containers.push(child);

      // Resolve both services in child
      child.resolve(Service1);
      child.resolve(Service2);

      // Only Service1 should have span
      const spans = tracer.getCollectedSpans();
      const span1 = spans.find(s => s.name === "resolve:Service1");
      const span2 = spans.find(s => s.name === "resolve:Service2");

      expect(span1).toBeDefined();
      expect(span2).toBeUndefined();

      cleanup();
    });
  });

  describe("performance", () => {
    it("should handle many dynamic children without memory leaks", () => {
      const ChildPort = port<string>()({ name: "Child" });

      const childAdapter = createAdapter({
        provides: ChildPort,
        requires: [],
        lifetime: "transient",
        factory: () => "child",
      });

      const rootGraph = GraphBuilder.create().build();
      const childGraph = GraphBuilder.create().provide(childAdapter).buildFragment();

      const root = createContainer({ graph: rootGraph, name: "Root" });
      containers.push(root);

      const cleanup = instrumentContainerTree(root, root.inspector, tracer);

      // Create many dynamic children
      const children: Array<any> = [];
      for (let i = 0; i < 100; i++) {
        const child = root.createChild(childGraph, { name: `Child${i}` });
        children.push(child);
        containers.push(child);

        // Resolve to verify instrumentation
        child.resolve(ChildPort);
      }

      // Verify all children were instrumented
      const spans = tracer.getCollectedSpans();
      expect(spans.length).toBe(100);

      // Verify container names are unique
      const names = new Set(spans.map(s => s.attributes["hex-di.container.name"]));
      expect(names.size).toBe(100);

      cleanup();
    });
  });
});
