/**
 * Integration Tests for Library Inspector Auto-Discovery
 *
 * Covers DoD 6 (#1-#9): Auto-discovery via afterResolve hook with port metadata.
 *
 * @packageDocumentation
 */
// @ts-nocheck

import { describe, test, expect, vi } from "vitest";
import { port, createAdapter, getPortMetadata } from "@hex-di/core";
import type { LibraryInspector } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../../src/container/factory.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(msg: string): void;
}

const LoggerPort = port<Logger>()({ name: "Logger" });

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

// Library inspector port with category: "library-inspector"
const FlowLibraryInspectorPort = port<LibraryInspector>()({
  name: "FlowLibraryInspector",
  category: "library-inspector",
});

// Port that resolves to a LibraryInspector but WITHOUT library-inspector category
const UncategorizedInspectorPort = port<LibraryInspector>()({
  name: "UncategorizedInspector",
  category: "infrastructure",
});

function createFlowInspector(name = "flow"): LibraryInspector {
  return Object.freeze({
    name,
    getSnapshot: () => Object.freeze({ machines: 1 }),
    dispose: vi.fn(),
  });
}

// =============================================================================
// Tests
// =============================================================================

describe("Library inspector auto-discovery via afterResolve hook", () => {
  // #1
  test("auto-discovers library inspector when port has category: 'library-inspector'", () => {
    const flowInspector = createFlowInspector();
    const FlowInspectorAdapter = createAdapter({
      provides: FlowLibraryInspectorPort,
      requires: [],
      lifetime: "singleton",
      factory: () => flowInspector,
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(FlowInspectorAdapter)
      .build();
    const container = createContainer({ graph, name: "Test" });

    // Resolve the port - auto-discovery should register it
    container.resolve(FlowLibraryInspectorPort);

    expect(container.inspector.getLibraryInspector("flow")).toBeDefined();
  });

  // #2
  test("does NOT auto-discover when port category is not 'library-inspector'", () => {
    const inspector = createFlowInspector("infra");
    const InfraAdapter = createAdapter({
      provides: UncategorizedInspectorPort,
      requires: [],
      lifetime: "singleton",
      factory: () => inspector,
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(InfraAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    container.resolve(UncategorizedInspectorPort);

    expect(container.inspector.getLibraryInspector("infra")).toBeUndefined();
  });

  // #3
  test("auto-discovered inspector appears in unified snapshot", () => {
    const flowInspector = createFlowInspector();
    const FlowInspectorAdapter = createAdapter({
      provides: FlowLibraryInspectorPort,
      requires: [],
      lifetime: "singleton",
      factory: () => flowInspector,
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(FlowInspectorAdapter)
      .build();
    const container = createContainer({ graph, name: "Test" });

    container.resolve(FlowLibraryInspectorPort);

    const unified = container.inspector.getUnifiedSnapshot();
    expect(unified.libraries["flow"]).toEqual({ machines: 1 });
    expect(unified.registeredLibraries).toContain("flow");
  });

  // #4
  test("auto-discovery does not re-register on subsequent resolves (singleton cached)", () => {
    let callCount = 0;
    const flowInspector: LibraryInspector = {
      name: "flow",
      getSnapshot: () => {
        callCount++;
        return Object.freeze({ called: callCount });
      },
    };

    const FlowInspectorAdapter = createAdapter({
      provides: FlowLibraryInspectorPort,
      requires: [],
      lifetime: "singleton",
      factory: () => flowInspector,
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(FlowInspectorAdapter)
      .build();
    const container = createContainer({ graph, name: "Test" });

    // Resolve twice - second should be cache hit, no new afterResolve
    container.resolve(FlowLibraryInspectorPort);
    container.resolve(FlowLibraryInspectorPort);

    expect(container.inspector.getLibraryInspectors().size).toBe(1);
  });

  // #5
  test("port metadata confirms category is 'library-inspector'", () => {
    const meta = getPortMetadata(FlowLibraryInspectorPort);
    expect(meta?.category).toBe("library-inspector");
  });

  // #6
  test("auto-discovery works alongside manual registration", () => {
    const flowInspector = createFlowInspector();
    const FlowInspectorAdapter = createAdapter({
      provides: FlowLibraryInspectorPort,
      requires: [],
      lifetime: "singleton",
      factory: () => flowInspector,
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(FlowInspectorAdapter)
      .build();
    const container = createContainer({ graph, name: "Test" });

    // Manual registration
    const manualInspector: LibraryInspector = {
      name: "store",
      getSnapshot: () => Object.freeze({ slices: 3 }),
    };
    container.inspector.registerLibrary(manualInspector);

    // Auto-discovery
    container.resolve(FlowLibraryInspectorPort);

    expect(container.inspector.getLibraryInspectors().size).toBe(2);
    expect(container.inspector.getLibraryInspector("flow")).toBeDefined();
    expect(container.inspector.getLibraryInspector("store")).toBeDefined();
  });

  // #7
  test("auto-discovery emits library-registered event", () => {
    const flowInspector = createFlowInspector();
    const FlowInspectorAdapter = createAdapter({
      provides: FlowLibraryInspectorPort,
      requires: [],
      lifetime: "singleton",
      factory: () => flowInspector,
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(FlowInspectorAdapter)
      .build();
    const container = createContainer({ graph, name: "Test" });

    const events: unknown[] = [];
    container.inspector.subscribe(event => events.push(event));

    container.resolve(FlowLibraryInspectorPort);

    const regEvents = events.filter(
      (e: unknown) => (e as { type: string }).type === "library-registered"
    );
    expect(regEvents).toHaveLength(1);
  });

  // #8
  test("auto-discovery works for child containers", () => {
    const flowInspector = createFlowInspector();
    const FlowInspectorAdapter = createAdapter({
      provides: FlowLibraryInspectorPort,
      requires: [],
      lifetime: "singleton",
      factory: () => flowInspector,
    });

    const parentGraph = GraphBuilder.create().provide(LoggerAdapter).build();
    const parentContainer = createContainer({ graph: parentGraph, name: "Parent" });

    const childGraph = GraphBuilder.create().provide(FlowInspectorAdapter).build();
    const childContainer = parentContainer.createChild(childGraph, { name: "Child" });

    childContainer.resolve(FlowLibraryInspectorPort);

    expect(childContainer.inspector.getLibraryInspector("flow")).toBeDefined();
  });

  // #9
  test("auto-discovery does not register non-LibraryInspector resolved values", () => {
    // A port with category "library-inspector" but resolves to a non-compliant object
    const BadPort = port<{ notAnInspector: true }>()({
      name: "BadInspector",
      category: "library-inspector",
    });

    const BadAdapter = createAdapter({
      provides: BadPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ notAnInspector: true as const }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(BadAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    container.resolve(BadPort);

    expect(container.inspector.getLibraryInspectors().size).toBe(0);
  });
});
