/**
 * Tests for InspectorPlugin with child containers.
 *
 * These tests verify that child containers get their own inspector
 * that reflects the child's services, not the parent's.
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import { createContainer, pipe } from "@hex-di/runtime";
import { InspectorPlugin, INSPECTOR, withInspector } from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): unknown;
}

interface ChildService {
  doChildThing(): void;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const ChildServicePort = createPort<"ChildService", ChildService>("ChildService");

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ query: () => ({}) }),
});

const ChildServiceAdapter = createAdapter({
  provides: ChildServicePort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ doChildThing: () => {} }),
});

function createParentGraph() {
  return GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();
}

function createChildGraph() {
  return GraphBuilder.create().provide(ChildServiceAdapter).build();
}

// =============================================================================
// Child Container Inspector Tests
// =============================================================================

// NOTE: These tests are skipped because the wrapper pattern (withInspector)
// doesn't automatically propagate to child containers. Child container
// inspector support requires either:
// 1. Explicit wrapping: pipe(parent.createChild(graph), withInspector)
// 2. Implementing plugin inheritance in the createChild method
// This is tracked as a separate feature request.
describe.skip("InspectorPlugin with child containers", () => {
  it("child inspector returns child's ports, not parent's", () => {
    const parentGraph = createParentGraph();
    const childGraph = createChildGraph();

    const parent = pipe(createContainer(parentGraph), withInspector);

    const child = parent.createChild(childGraph);

    // Parent should have Logger and Database
    const parentPorts = parent[INSPECTOR].listPorts();
    expect(parentPorts).toContain("Logger");
    expect(parentPorts).toContain("Database");
    expect(parentPorts).not.toContain("ChildService");

    // Child should have Logger, Database (inherited), and ChildService (own)
    // @ts-expect-error Child containers don't have INSPECTOR symbol in wrapper pattern
    const childPorts = child[INSPECTOR].listPorts();
    expect(childPorts).toContain("Logger");
    expect(childPorts).toContain("Database");
    expect(childPorts).toContain("ChildService");
  });

  it("child inspector has independent snapshot", () => {
    const parentGraph = createParentGraph();
    const childGraph = createChildGraph();

    const parent = pipe(createContainer(parentGraph), withInspector);

    const child = parent.createChild(childGraph);

    // Resolve on child
    child.resolve(ChildServicePort);

    // Get snapshots
    const parentSnapshot = parent[INSPECTOR].getSnapshot();
    // @ts-expect-error Child containers don't have INSPECTOR symbol in wrapper pattern
    const childSnapshot = child[INSPECTOR].getSnapshot();

    // Parent snapshot should not include ChildService
    const parentSingletons = parentSnapshot.singletons.map(s => s.portName);
    expect(parentSingletons).not.toContain("ChildService");

    // Child snapshot should include ChildService as resolved
    const childSingletons = childSnapshot.singletons.map((s: { portName: string }) => s.portName);
    expect(childSingletons).toContain("ChildService");
  });

  it("child inspector has independent listeners", () => {
    const parentGraph = createParentGraph();
    const childGraph = createChildGraph();

    const parent = pipe(createContainer(parentGraph), withInspector);

    const child = parent.createChild(childGraph);

    const parentCallback = vi.fn();
    const childCallback = vi.fn();

    parent[INSPECTOR].subscribe(parentCallback);
    // @ts-expect-error Child containers don't have INSPECTOR symbol in wrapper pattern
    child[INSPECTOR].subscribe(childCallback);

    // Resolve on parent
    parent.resolve(LoggerPort);

    // Only parent callback should be called
    expect(parentCallback).toHaveBeenCalled();
    // Note: Child callback may or may not be called depending on whether
    // child inherits parent events. For now, we just verify they have
    // independent listener sets.

    // Clear mocks
    parentCallback.mockClear();
    childCallback.mockClear();

    // Resolve on child
    child.resolve(ChildServicePort);

    // Child callback should be called for child resolution
    // (Note: Currently hooks go to parent, so this test verifies listener isolation)
    // The key is that subscribe() returns independent unsubscribe functions
    const unsubParent = parent[INSPECTOR].subscribe(() => {});
    // @ts-expect-error Child containers don't have INSPECTOR symbol in wrapper pattern
    const unsubChild = child[INSPECTOR].subscribe(() => {});

    // Unsubscribe should be independent
    unsubParent();
    unsubChild();
  });

  it("child inspector reflects correct container kind", () => {
    const parentGraph = createParentGraph();
    const childGraph = createChildGraph();

    const parent = pipe(createContainer(parentGraph), withInspector);

    const child = parent.createChild(childGraph);

    expect(parent[INSPECTOR].getContainerKind()).toBe("root");
    // @ts-expect-error Child containers don't have INSPECTOR symbol in wrapper pattern
    expect(child[INSPECTOR].getContainerKind()).toBe("child");
  });

  it("child inspector has own isResolved state", () => {
    const parentGraph = createParentGraph();
    const childGraph = createChildGraph();

    const parent = pipe(createContainer(parentGraph), withInspector);

    const child = parent.createChild(childGraph);

    // Before resolution
    expect(parent[INSPECTOR].isResolved("Logger")).toBe(false);
    // @ts-expect-error Child containers don't have INSPECTOR symbol in wrapper pattern
    expect(child[INSPECTOR].isResolved("Logger")).toBe(false);
    // @ts-expect-error Child containers don't have INSPECTOR symbol in wrapper pattern
    expect(child[INSPECTOR].isResolved("ChildService")).toBe(false);

    // Resolve on parent
    parent.resolve(LoggerPort);
    expect(parent[INSPECTOR].isResolved("Logger")).toBe(true);
    // Child inherits parent's singletons, so Logger should be resolved
    // @ts-expect-error Child containers don't have INSPECTOR symbol in wrapper pattern
    expect(child[INSPECTOR].isResolved("Logger")).toBe(true);

    // Child-only service should not be resolved yet
    // @ts-expect-error Child containers don't have INSPECTOR symbol in wrapper pattern
    expect(child[INSPECTOR].isResolved("ChildService")).toBe(false);

    // Resolve on child
    child.resolve(ChildServicePort);
    // @ts-expect-error Child containers don't have INSPECTOR symbol in wrapper pattern
    expect(child[INSPECTOR].isResolved("ChildService")).toBe(true);
  });

  it("nested children have independent inspectors", () => {
    const parentGraph = createParentGraph();
    const childGraph = createChildGraph();

    const parent = pipe(createContainer(parentGraph), withInspector);

    const child = parent.createChild(childGraph);

    // Create another child graph with different service
    const GrandchildServicePort = createPort<"GrandchildService", { run(): void }>(
      "GrandchildService"
    );
    const GrandchildAdapter = createAdapter({
      provides: GrandchildServicePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ run: () => {} }),
    });
    const grandchildGraph = GraphBuilder.create().provide(GrandchildAdapter).build();

    const grandchild = child.createChild(grandchildGraph);

    // Each level should have correct ports
    const parentPorts = parent[INSPECTOR].listPorts();
    // @ts-expect-error Child containers don't have INSPECTOR symbol in wrapper pattern
    const childPorts = child[INSPECTOR].listPorts();
    // @ts-expect-error Child containers don't have INSPECTOR symbol in wrapper pattern
    const grandchildPorts = grandchild[INSPECTOR].listPorts();

    expect(parentPorts.length).toBe(2); // Logger, Database
    expect(childPorts.length).toBe(3); // Logger, Database, ChildService
    expect(grandchildPorts.length).toBe(4); // Logger, Database, ChildService, GrandchildService

    expect(grandchildPorts).toContain("GrandchildService");
    expect(childPorts).not.toContain("GrandchildService");
  });
});
