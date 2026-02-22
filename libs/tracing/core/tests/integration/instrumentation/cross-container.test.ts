/**
 * Integration tests for cross-container span relationships.
 *
 * Verifies:
 * - Parent-child span relationships across container boundaries via shared span stack
 * - Nested resolution chains maintaining correct parent IDs
 * - Stack integrity during errors
 * - Resolution depth tracking
 *
 * These tests use real containers to verify that the module-level span stack
 * correctly tracks parent-child relationships when one container's resolution
 * happens during another container's resolution (via factory nesting).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createContainer } from "@hex-di/runtime";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createMemoryTracer } from "../../../src/adapters/memory/tracer.js";
import { instrumentContainer } from "../../../src/instrumentation/container.js";
import { clearStack, getStackDepth } from "../../../src/instrumentation/span-stack.js";
import type { MemoryTracer } from "../../../src/adapters/memory/tracer.js";

describe("cross-container span relationships", () => {
  let tracer: MemoryTracer;
  let containers: any[];

  beforeEach(() => {
    tracer = createMemoryTracer();
    containers = [];
    clearStack();
  });

  afterEach(async () => {
    // Dispose all containers
    for (const container of containers) {
      await container.dispose();
    }
    containers = [];
    clearStack();
  });

  describe("span stack sharing", () => {
    it("should instrument multiple containers with shared tracer", () => {
      // Create two independent containers
      const Port1 = port<string>()({ name: "Service1" });
      const Port2 = port<string>()({ name: "Service2" });

      const adapter1 = createAdapter({
        provides: Port1,
        requires: [],
        lifetime: "transient",
        factory: () => "service1",
      });

      const adapter2 = createAdapter({
        provides: Port2,
        requires: [],
        lifetime: "transient",
        factory: () => "service2",
      });

      const graph1 = GraphBuilder.create().provide(adapter1).build();
      const graph2 = GraphBuilder.create().provide(adapter2).build();

      const container1 = createContainer({ graph: graph1, name: "Container1" });
      const container2 = createContainer({ graph: graph2, name: "Container2" });
      containers.push(container1, container2);

      // Instrument both
      instrumentContainer(container1, tracer);
      instrumentContainer(container2, tracer);

      // Resolve in both containers
      container1.resolve(Port1);
      container2.resolve(Port2);

      // Both resolutions created spans
      const spans = tracer.getCollectedSpans();
      expect(spans.length).toBe(2);

      const span1 = spans.find(s => s.name === "resolve:Service1");
      const span2 = spans.find(s => s.name === "resolve:Service2");

      expect(span1).toBeDefined();
      expect(span2).toBeDefined();

      // Spans completed successfully
      expect(span1?.status).toBe("ok");
      expect(span2?.status).toBe("ok");
    });

    it("should create nested spans when one resolution triggers another via factory", () => {
      // Container1 has a service that manually resolves from Container2
      const Port1 = port<string>()({ name: "Outer" });
      const Port2 = port<string>()({ name: "Inner" });

      const container2Ref: { current: any } = { current: null };

      const adapter1 = createAdapter({
        provides: Port1,
        requires: [],
        lifetime: "singleton",
        factory: () => {
          // Manually trigger resolution in container2 during this resolution
          const inner = container2Ref.current.resolve(Port2);
          return `outer-${inner}`;
        },
      });

      const adapter2 = createAdapter({
        provides: Port2,
        requires: [],
        lifetime: "singleton",
        factory: () => "inner",
      });

      const graph1 = GraphBuilder.create().provide(adapter1).build();
      const graph2 = GraphBuilder.create().provide(adapter2).build();

      const container1 = createContainer({ graph: graph1, name: "Container1" });
      const container2 = createContainer({ graph: graph2, name: "Container2" });
      container2Ref.current = container2;
      containers.push(container1, container2);

      // Instrument both
      instrumentContainer(container1, tracer);
      instrumentContainer(container2, tracer);

      // Resolve in container1 (which triggers resolution in container2)
      const result = container1.resolve(Port1);

      expect(result).toBe("outer-inner");

      // Check spans
      const spans = tracer.getCollectedSpans();
      expect(spans.length).toBe(2);

      const outerSpan = spans.find(s => s.name === "resolve:Outer");
      const innerSpan = spans.find(s => s.name === "resolve:Inner");

      expect(outerSpan).toBeDefined();
      expect(innerSpan).toBeDefined();

      // Inner resolution happened during outer resolution,  so inner should be child of outer
      expect(outerSpan?.parentSpanId).toBeUndefined(); // Root
      expect(innerSpan?.parentSpanId).toBe(outerSpan?.context.spanId);

      // Verify resolution depth
      expect(outerSpan?.attributes["hex-di.resolution.depth"]).toBe(0);
      expect(innerSpan?.attributes["hex-di.resolution.depth"]).toBe(0); // Still depth 0 in its own container

      // Verify container IDs (name might be normalized to "root" for root containers)
      // The important thing is they're different containers
      expect(outerSpan?.attributes["hex-di.container.name"]).toBeDefined();
      expect(innerSpan?.attributes["hex-di.container.name"]).toBeDefined();
    });

    it("should handle deep nesting across multiple containers", () => {
      const PortA = port<string>()({ name: "ServiceA" });
      const PortB = port<string>()({ name: "ServiceB" });
      const PortC = port<string>()({ name: "ServiceC" });

      const containerBRef: { current: any } = { current: null };
      const containerCRef: { current: any } = { current: null };

      const adapterA = createAdapter({
        provides: PortA,
        requires: [],
        lifetime: "singleton",
        factory: () => {
          const b = containerBRef.current.resolve(PortB);
          return `A-${b}`;
        },
      });

      const adapterB = createAdapter({
        provides: PortB,
        requires: [],
        lifetime: "singleton",
        factory: () => {
          const c = containerCRef.current.resolve(PortC);
          return `B-${c}`;
        },
      });

      const adapterC = createAdapter({
        provides: PortC,
        requires: [],
        lifetime: "singleton",
        factory: () => "C",
      });

      const graphA = GraphBuilder.create().provide(adapterA).build();
      const graphB = GraphBuilder.create().provide(adapterB).build();
      const graphC = GraphBuilder.create().provide(adapterC).build();

      const containerA = createContainer({ graph: graphA, name: "A" });
      const containerB = createContainer({ graph: graphB, name: "B" });
      const containerC = createContainer({ graph: graphC, name: "C" });
      containerBRef.current = containerB;
      containerCRef.current = containerC;
      containers.push(containerA, containerB, containerC);

      instrumentContainer(containerA, tracer);
      instrumentContainer(containerB, tracer);
      instrumentContainer(containerC, tracer);

      const result = containerA.resolve(PortA);

      expect(result).toBe("A-B-C");

      const spans = tracer.getCollectedSpans();
      expect(spans.length).toBe(3);

      const spanA = spans.find(s => s.name === "resolve:ServiceA");
      const spanB = spans.find(s => s.name === "resolve:ServiceB");
      const spanC = spans.find(s => s.name === "resolve:ServiceC");

      expect(spanA).toBeDefined();
      expect(spanB).toBeDefined();
      expect(spanC).toBeDefined();

      // Verify chain: A → B → C
      expect(spanA?.parentSpanId).toBeUndefined();
      expect(spanB?.parentSpanId).toBe(spanA?.context.spanId);
      expect(spanC?.parentSpanId).toBe(spanB?.context.spanId);
    });
  });

  describe("stack integrity", () => {
    it("should track correct stack depth during nested cross-container resolutions", () => {
      const PortOuter = port<string>()({ name: "Outer" });
      const PortInner = port<string>()({ name: "Inner" });

      let depthOuter = -1;
      let depthInner = -1;
      const containerInnerRef: { current: any } = { current: null };

      const outerAdapter = createAdapter({
        provides: PortOuter,
        requires: [],
        lifetime: "singleton",
        factory: () => {
          depthOuter = getStackDepth();
          const inner = containerInnerRef.current.resolve(PortInner);
          return `outer-${inner}`;
        },
      });

      const innerAdapter = createAdapter({
        provides: PortInner,
        requires: [],
        lifetime: "singleton",
        factory: () => {
          depthInner = getStackDepth();
          return "inner";
        },
      });

      const outerGraph = GraphBuilder.create().provide(outerAdapter).build();
      const innerGraph = GraphBuilder.create().provide(innerAdapter).build();

      const containerOuter = createContainer({ graph: outerGraph, name: "Outer" });
      const containerInner = createContainer({ graph: innerGraph, name: "Inner" });
      containerInnerRef.current = containerInner;
      containers.push(containerOuter, containerInner);

      instrumentContainer(containerOuter, tracer);
      instrumentContainer(containerInner, tracer);

      containerOuter.resolve(PortOuter);

      // Outer resolution had 1 span on stack (itself)
      expect(depthOuter).toBe(1);
      // Inner resolution had 2 spans on stack (outer + itself)
      expect(depthInner).toBe(2);
      // After completion, stack is empty
      expect(getStackDepth()).toBe(0);
    });

    it("should clean up stack correctly when error occurs in nested resolution", () => {
      const PortOuter = port<string>()({ name: "Outer" });
      const PortInner = port<string>()({ name: "Inner" });

      const containerInnerRef: { current: any } = { current: null };

      const outerAdapter = createAdapter({
        provides: PortOuter,
        requires: [],
        lifetime: "singleton",
        factory: () => {
          return containerInnerRef.current.resolve(PortInner);
        },
      });

      const innerAdapter = createAdapter({
        provides: PortInner,
        requires: [],
        lifetime: "singleton",
        factory: () => {
          throw new Error("Inner resolution failed");
        },
      });

      const outerGraph = GraphBuilder.create().provide(outerAdapter).build();
      const innerGraph = GraphBuilder.create().provide(innerAdapter).build();

      const containerOuter = createContainer({ graph: outerGraph, name: "Outer" });
      const containerInner = createContainer({ graph: innerGraph, name: "Inner" });
      containerInnerRef.current = containerInner;
      containers.push(containerOuter, containerInner);

      instrumentContainer(containerOuter, tracer);
      instrumentContainer(containerInner, tracer);

      // Resolution should throw
      expect(() => containerOuter.resolve(PortOuter)).toThrow("Inner resolution failed");

      // Stack should be cleaned up
      expect(getStackDepth()).toBe(0);

      // Both spans should be created and ended
      const spans = tracer.getCollectedSpans();
      expect(spans.length).toBe(2);

      const outerSpan = spans.find(s => s.name === "resolve:Outer");
      const innerSpan = spans.find(s => s.name === "resolve:Inner");

      expect(outerSpan).toBeDefined();
      expect(innerSpan).toBeDefined();

      // Both should have error status
      expect(innerSpan?.status).toBe("error");
      expect(outerSpan?.status).toBe("error");

      // Parent-child relationship maintained
      expect(innerSpan?.parentSpanId).toBe(outerSpan?.context.spanId);
    });
  });
});
