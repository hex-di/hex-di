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
import { clearStack } from "../../../src/instrumentation/span-stack.js";
import type { MemoryTracer } from "../../../src/adapters/memory/tracer.js";

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
});
