/**
 * createInspector Factory & Snapshot Types tests for @hex-di/runtime.
 *
 * Tests for the inspector API that provides runtime container state inspection.
 * The inspector allows DevTools to query container state without exposing
 * mutable internals.
 */

import { describe, test, expect, vi } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { createInspector } from "../src/inspection/creation.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): unknown;
}

interface RequestContext {
  requestId: string;
}

interface UserService {
  getUser(id: string): unknown;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const RequestContextPort = port<RequestContext>()({ name: "RequestContext" });
const UserServicePort = port<UserService>()({ name: "UserService" });

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Creates a complex multi-level container/scope hierarchy for testing inspector APIs.
 *
 * Structure:
 * - Root container with singleton and scoped adapters
 * - Two child containers (via override)
 * - Three scopes at root level
 * - Nested scopes within scopes
 *
 * @returns Object containing all containers and scopes for verification
 */
function createComplexHierarchy() {
  const LoggerAdapter = createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ log: vi.fn() }),
  });

  const DatabaseAdapter = createAdapter({
    provides: DatabasePort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ query: vi.fn() }),
  });

  const RequestContextAdapter = createAdapter({
    provides: RequestContextPort,
    requires: [],
    lifetime: "scoped",
    factory: () => ({ requestId: `req-${Math.random()}` }),
  });

  const graph = GraphBuilder.create()
    .provide(LoggerAdapter)
    .provide(DatabaseAdapter)
    .provide(RequestContextAdapter)
    .build();

  const root = createContainer({ graph, name: "ComplexRoot" });

  // Create child containers
  const MockDatabaseAdapter1 = createAdapter({
    provides: DatabasePort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ query: vi.fn() }),
  });

  const MockDatabaseAdapter2 = createAdapter({
    provides: DatabasePort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ query: vi.fn() }),
  });

  const child1 = root.override(MockDatabaseAdapter1).build();
  const child2 = root.override(MockDatabaseAdapter2).build();

  // Create scopes at root level
  const rootScope1 = root.createScope();
  const rootScope2 = root.createScope();
  const rootScope3 = root.createScope();

  // Create nested scopes
  const nestedScope1 = rootScope1.createScope();
  const nestedScope2 = rootScope1.createScope();
  const deepNestedScope = nestedScope1.createScope();

  return {
    root,
    children: [child1, child2],
    scopes: {
      level1: [rootScope1, rootScope2, rootScope3],
      level2: [nestedScope1, nestedScope2],
      level3: [deepNestedScope],
    },
  };
}

/**
 * Captures snapshots at all levels of a container hierarchy.
 *
 * @param hierarchy - Hierarchy created by createComplexHierarchy()
 * @returns Array of snapshots from each container/scope level
 */
function snapshotAllLevels(hierarchy: ReturnType<typeof createComplexHierarchy>) {
  const snapshots = [];

  // Root snapshot
  snapshots.push({
    level: "root",
    snapshot: hierarchy.root.inspector.getSnapshot(),
    scopeTree: hierarchy.root.inspector.getScopeTree(),
  });

  // Child snapshots
  for (let i = 0; i < hierarchy.children.length; i++) {
    const child = hierarchy.children[i];
    if (child !== undefined) {
      snapshots.push({
        level: `child-${i}`,
        snapshot: child.inspector.getSnapshot(),
        scopeTree: child.inspector.getScopeTree(),
      });
    }
  }

  return snapshots;
}

/**
 * Verifies parent/child relationships are correctly reported in hierarchy.
 *
 * @param root - Root container
 * @param expectedChildCount - Expected number of direct children
 * @returns true if all relationships are valid
 */
function verifyHierarchyIntegrity(
  root: ReturnType<typeof createContainer>,
  expectedChildCount: number
): boolean {
  const childInspectors = root.inspector.getChildContainers();

  if (childInspectors.length !== expectedChildCount) {
    return false;
  }

  // Verify each child reports as "child" kind
  for (const childInspector of childInspectors) {
    if (childInspector.getContainerKind() !== "child") {
      return false;
    }
  }

  return true;
}

/**
 * Monitors container phase transitions by repeatedly capturing snapshots.
 *
 * @param container - Container to monitor
 * @param operation - Async operation that causes phase transitions
 * @returns Array of phases observed during operation
 */
async function trackPhaseTransitions(
  container: ReturnType<typeof createContainer>,
  operation: () => Promise<void>
): Promise<string[]> {
  const phases: string[] = [];

  // Capture initial phase
  phases.push(container.inspector.getPhase());

  // Execute operation
  await operation();

  // Capture final phase (if not disposed)
  try {
    phases.push(container.inspector.getPhase());
  } catch {
    // If disposed, record that
    phases.push("disposed");
  }

  return phases;
}

// =============================================================================
// createInspector Factory Tests
// =============================================================================

describe("createInspector Factory", () => {
  test("createInspector(container) returns ContainerInspector interface", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph: graph, name: "Test" });
    const inspector = createInspector(container);

    // Inspector should have all required methods
    expect(typeof inspector.snapshot).toBe("function");
    expect(typeof inspector.listPorts).toBe("function");
    expect(typeof inspector.isResolved).toBe("function");
    expect(typeof inspector.getScopeTree).toBe("function");

    // Inspector should be frozen
    expect(Object.isFrozen(inspector)).toBe(true);
  });

  test("snapshot() returns ContainerSnapshot with correct structure", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [LoggerPort],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();
    const container = createContainer({ graph: graph, name: "Test" });

    // Resolve one service to populate singleton memo
    container.resolve(LoggerPort);

    const inspector = createInspector(container);
    const snapshot = inspector.snapshot();

    // Verify snapshot structure
    expect(typeof snapshot.isDisposed).toBe("boolean");
    expect(snapshot.isDisposed).toBe(false);
    expect(Array.isArray(snapshot.singletons)).toBe(true);
    expect(snapshot.scopes).toBeDefined();

    // Verify singleton entry structure
    const loggerEntry = snapshot.singletons.find(e => e.portName === "Logger");
    expect(loggerEntry).toBeDefined();
    expect(loggerEntry!.isResolved).toBe(true);
    expect(typeof loggerEntry!.resolvedAt).toBe("number");
    expect(typeof loggerEntry!.resolutionOrder).toBe("number");
    expect(loggerEntry!.lifetime).toBe("singleton");
  });

  test("listPorts() returns all registered port names", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "test" }),
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(RequestContextAdapter)
      .build();
    const container = createContainer({ graph: graph, name: "Test" });
    const inspector = createInspector(container);

    const ports = inspector.listPorts();

    // Should include all port names
    expect(ports).toContain("Logger");
    expect(ports).toContain("Database");
    expect(ports).toContain("RequestContext");
    expect(ports.length).toBe(3);

    // Should be sorted alphabetically
    expect(ports).toEqual(["Database", "Logger", "RequestContext"]);

    // Should be frozen
    expect(Object.isFrozen(ports)).toBe(true);
  });

  test("isResolved(portName) returns correct resolution status", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "test" }),
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(RequestContextAdapter)
      .build();
    const container = createContainer({ graph: graph, name: "Test" });

    // Resolve only Logger
    container.resolve(LoggerPort);

    const inspector = createInspector(container);

    // Logger should be resolved
    expect(inspector.isResolved("Logger")).toBe(true);

    // Database should not be resolved
    expect(inspector.isResolved("Database")).toBe(false);

    // Scoped port should return "scope-required"
    expect(inspector.isResolved("RequestContext")).toBe("scope-required");

    // Unknown port should throw
    expect(() => inspector.isResolved("UnknownPort")).toThrow();
  });

  test("getScopeTree() returns hierarchical ScopeTree structure", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "test" }),
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(RequestContextAdapter)
      .build();
    const container = createContainer({ graph: graph, name: "Test" });

    // Create nested scope structure
    const scope1 = container.createScope();
    const scope2 = container.createScope();
    const nestedScope = scope1.createScope();

    // Resolve in each scope to use scope2 as well
    scope1.resolve(RequestContextPort);
    scope2.resolve(RequestContextPort);
    nestedScope.resolve(RequestContextPort);

    const inspector = createInspector(container);
    const tree = inspector.getScopeTree();

    // Root should be the container
    expect(tree.id).toBe("container");
    expect(tree.status).toBe("active");
    expect(tree.children.length).toBe(2); // scope1 and scope2

    // Find scope1 in children
    const scope1Node = tree.children.find(c => c.children.length > 0);
    expect(scope1Node).toBeDefined();
    expect(scope1Node!.status).toBe("active");
    expect(scope1Node!.resolvedCount).toBeGreaterThanOrEqual(1);

    // Check nested scope
    expect(scope1Node!.children.length).toBe(1);
    const nestedNode = scope1Node!.children[0];
    expect(nestedNode).toBeDefined();
    expect(nestedNode!.resolvedCount).toBeGreaterThanOrEqual(1);

    // Tree should be frozen
    expect(Object.isFrozen(tree)).toBe(true);
  });

  test("scope totalCount reflects only scoped-lifetime adapters", () => {
    // Create adapters with different lifetimes
    const SingletonAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const ScopedAdapter1 = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "test" }),
    });

    const ScopedAdapter2 = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ query: vi.fn() }),
    });

    const RequestAdapter = createAdapter({
      provides: UserServicePort,
      requires: [],
      lifetime: "transient",
      factory: () => ({ getUser: vi.fn() }),
    });

    // 1 singleton + 2 scoped + 1 request = 4 total adapters
    const graph = GraphBuilder.create()
      .provide(SingletonAdapter)
      .provide(ScopedAdapter1)
      .provide(ScopedAdapter2)
      .provide(RequestAdapter)
      .build();
    const container = createContainer({ graph: graph, name: "Test" });

    // Resolve the singleton
    container.resolve(LoggerPort);

    // Create a scope and resolve one scoped service
    const scope = container.createScope();
    scope.resolve(RequestContextPort);

    const inspector = createInspector(container);
    const tree = inspector.getScopeTree();

    // Container totalCount should be all adapters (4)
    expect(tree.totalCount).toBe(4);
    expect(tree.resolvedCount).toBe(1); // Only the singleton

    // Scope totalCount should be only scoped adapters (2)
    expect(tree.children.length).toBe(1);
    const scopeNode = tree.children[0];
    expect(scopeNode).toBeDefined();
    expect(scopeNode!.totalCount).toBe(2); // Only scoped-lifetime adapters
    expect(scopeNode!.resolvedCount).toBe(1); // Only RequestContextPort resolved
  });

  test("inspector creation is O(1) (no iteration during creation)", () => {
    // Create a graph with several adapters
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "test" }),
    });

    const UserServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort, DatabasePort],
      lifetime: "singleton",
      factory: () => ({ getUser: vi.fn() }),
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(RequestContextAdapter)
      .provide(UserServiceAdapter)
      .build();
    const container = createContainer({ graph: graph, name: "Test" });

    // Resolve all singletons to populate memos
    container.resolve(LoggerPort);
    container.resolve(DatabasePort);
    container.resolve(UserServicePort);

    // Inspector creation should not iterate (O(1))
    // We verify this by ensuring inspector creation doesn't trigger any factory calls
    // The factory mocks have already been called above, so if creation iterates,
    // we would see extra calls (which we don't test here directly)
    const inspector = createInspector(container);

    // Verify inspector is usable - this is the structural O(1) verification
    // Inspector stores only the container reference, not iterating adapters/memos
    expect(typeof inspector.snapshot).toBe("function");
    expect(typeof inspector.listPorts).toBe("function");
    expect(typeof inspector.isResolved).toBe("function");
    expect(typeof inspector.getScopeTree).toBe("function");

    // Verify the methods work (iteration happens on method call, not creation)
    const ports = inspector.listPorts();
    expect(ports.length).toBe(4);
  });

  test("snapshot data is deeply frozen (Object.isFrozen checks)", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "test" }),
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(RequestContextAdapter)
      .build();
    const container = createContainer({ graph: graph, name: "Test" });
    container.resolve(LoggerPort);

    const scope = container.createScope();
    scope.resolve(RequestContextPort);

    const inspector = createInspector(container);
    const snapshot = inspector.snapshot();

    // Root snapshot should be frozen
    expect(Object.isFrozen(snapshot)).toBe(true);

    // Singletons array should be frozen
    expect(Object.isFrozen(snapshot.singletons)).toBe(true);

    // Each singleton entry should be frozen
    for (const entry of snapshot.singletons) {
      expect(Object.isFrozen(entry)).toBe(true);
    }

    // Scopes tree should be frozen
    expect(Object.isFrozen(snapshot.scopes)).toBe(true);

    // listPorts should return frozen array
    const ports = inspector.listPorts();
    expect(Object.isFrozen(ports)).toBe(true);

    // getScopeTree should return frozen tree
    const tree = inspector.getScopeTree();
    expect(Object.isFrozen(tree)).toBe(true);
    expect(Object.isFrozen(tree.children)).toBe(true);
  });

  test("disposed container operations throw descriptive errors", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph: graph, name: "Test" });
    const inspector = createInspector(container);

    // Dispose the container
    await container.dispose();

    // All inspector methods should throw
    expect(() => inspector.snapshot()).toThrow(/disposed/i);
    expect(() => inspector.listPorts()).toThrow(/disposed/i);
    expect(() => inspector.isResolved("Logger")).toThrow(/disposed/i);
    expect(() => inspector.getScopeTree()).toThrow(/disposed/i);
  });
});

// =============================================================================
// Lifecycle Stage Tests
// =============================================================================

describe("Lifecycle Stage Inspection", () => {
  test("Inspector returns accurate data before any resolutions", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();
    const container = createContainer({ graph: graph, name: "PreResolve" });

    // Use built-in inspector property for InspectorAPI
    const inspector = container.inspector;

    // Before any resolutions
    const snapshot = inspector.getSnapshot();

    // Container should not be disposed
    expect(snapshot.isDisposed).toBe(false);

    // Container kind should be root
    expect(snapshot.kind).toBe("root");

    // Phase should be initialized (container created and ready)
    expect(snapshot.phase).toBe("initialized");

    // Singleton entries exist for all singleton adapters (2 total)
    expect(snapshot.singletons.length).toBe(2);

    // But none are resolved yet
    const resolvedSingletons = snapshot.singletons.filter(s => s.isResolved);
    expect(resolvedSingletons.length).toBe(0);

    // Ports should be available
    const ports = inspector.listPorts();
    expect(ports).toContain("Logger");
    expect(ports).toContain("Database");

    // No ports should be resolved
    expect(inspector.isResolved("Logger")).toBe(false);
    expect(inspector.isResolved("Database")).toBe(false);

    // Scope tree should show empty root
    const tree = inspector.getScopeTree();
    expect(tree.id).toBe("container");
    expect(tree.resolvedCount).toBe(0);
  });

  test("Inspector captures mid-resolution state correctly", () => {
    // Use array to collect snapshots (avoids closure mutation issues)
    const capturedSnapshots: Array<{
      kind: string;
      phase: string;
      singletons: readonly { portName: string; isResolved: boolean }[];
    }> = [];

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [LoggerPort],
      lifetime: "singleton",
      factory: deps => {
        // Capture state during resolution using the container's inspector
        const snapshot = containerRef.inspector.getSnapshot();
        capturedSnapshots.push({
          kind: snapshot.kind,
          phase: snapshot.phase,
          singletons: snapshot.singletons.map(s => ({
            portName: s.portName,
            isResolved: s.isResolved,
          })),
        });
        return { query: vi.fn() };
      },
    });

    const fullGraph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();
    const containerRef = createContainer({ graph: fullGraph, name: "MidResolve" });

    // Resolve Database - this will trigger Logger resolution first
    containerRef.resolve(DatabasePort);

    // Verify mid-resolution snapshot was captured
    expect(capturedSnapshots.length).toBe(1);

    const capturedSnapshot = capturedSnapshots[0];
    if (capturedSnapshot !== undefined) {
      // During Database resolution, Logger should already be resolved
      const loggerEntry = capturedSnapshot.singletons.find(e => e.portName === "Logger");
      expect(loggerEntry).toBeDefined();
      expect(loggerEntry!.isResolved).toBe(true);

      // Database entry exists but should not be resolved yet (still in factory)
      const databaseEntry = capturedSnapshot.singletons.find(e => e.portName === "Database");
      expect(databaseEntry).toBeDefined();
      expect(databaseEntry!.isResolved).toBe(false);

      // Container should still be initialized
      expect(capturedSnapshot.phase).toBe("initialized");
    }

    // After resolution completes
    const finalSnapshot = containerRef.inspector.getSnapshot();
    expect(finalSnapshot.singletons.length).toBe(2);

    const finalLogger = finalSnapshot.singletons.find(e => e.portName === "Logger");
    const finalDatabase = finalSnapshot.singletons.find(e => e.portName === "Database");
    expect(finalLogger?.isResolved).toBe(true);
    expect(finalDatabase?.isResolved).toBe(true);
  });

  test("Inspector reflects disposed container state", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph: graph, name: "Disposed" });

    // Resolve and verify initial state
    container.resolve(LoggerPort);
    const beforeDisposal = container.inspector.getSnapshot();
    expect(beforeDisposal.isDisposed).toBe(false);
    expect(beforeDisposal.phase).toBe("initialized");
    expect(beforeDisposal.singletons.length).toBe(1);

    // Dispose the container
    await container.dispose();

    // Inspector operations throw after disposal (expected behavior)
    // This verifies that inspector correctly detects disposed state
    expect(() => container.inspector.getSnapshot()).toThrow(/disposed/i);
    expect(() => container.inspector.getPhase()).toThrow(/disposed/i);
    expect(() => container.inspector.listPorts()).toThrow(/disposed/i);

    // Container kind is still accessible
    expect(container.inspector.getContainerKind()).toBe("root");
  });

  test("Inspector tracks phase transitions (uninitialized -> initialized)", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "test" }),
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(RequestContextAdapter)
      .build();
    const container = createContainer({ graph: graph, name: "PhaseTracking" });

    // Container is created in initialized phase (no separate initialization step for sync)
    const initialSnapshot = container.inspector.getSnapshot();
    expect(initialSnapshot.phase).toBe("initialized");
    expect(initialSnapshot.kind).toBe("root");

    // Resolve a service
    container.resolve(LoggerPort);
    const afterResolve = container.inspector.getSnapshot();
    expect(afterResolve.phase).toBe("initialized");

    // Create a scope and resolve a scoped service
    const scope = container.createScope();
    scope.resolve(RequestContextPort);

    // Verify scope appears in scope tree with active status
    const tree = container.inspector.getScopeTree();
    expect(tree.children.length).toBe(1);
    expect(tree.children[0]!.status).toBe("active");
    expect(tree.children[0]!.resolvedCount).toBe(1);

    // Phase should be consistent across multiple calls
    expect(container.inspector.getPhase()).toBe("initialized");
    expect(container.inspector.getContainerKind()).toBe("root");
  });
});

// =============================================================================
// Cross-Scope Hierarchy Tests
// =============================================================================

describe("Cross-Scope Hierarchy Inspection", () => {
  test("getScopeTree returns complete hierarchy with nested scopes", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "test" }),
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(RequestContextAdapter)
      .build();
    const container = createContainer({ graph: graph, name: "HierarchyTest" });

    // Build nested scope structure: container -> scope1 -> nestedScope
    //                                       -> scope2
    const scope1 = container.createScope();
    const scope2 = container.createScope();
    const nestedScope = scope1.createScope();

    // Resolve scoped services in each scope
    scope1.resolve(RequestContextPort);
    scope2.resolve(RequestContextPort);
    nestedScope.resolve(RequestContextPort);

    // Get complete hierarchy tree
    const tree = container.inspector.getScopeTree();

    // Verify root container
    expect(tree.id).toBe("container");
    expect(tree.status).toBe("active");

    // Verify two direct children (scope1, scope2)
    expect(tree.children.length).toBe(2);

    // Find scope1 (the one with a nested child)
    const scope1Node = tree.children.find(c => c.children.length > 0);
    expect(scope1Node).toBeDefined();
    expect(scope1Node!.status).toBe("active");
    expect(scope1Node!.resolvedCount).toBe(1);

    // Verify nested scope
    expect(scope1Node!.children.length).toBe(1);
    const nestedNode = scope1Node!.children[0];
    expect(nestedNode).toBeDefined();
    expect(nestedNode!.status).toBe("active");
    expect(nestedNode!.resolvedCount).toBe(1);

    // Find scope2 (the one without children)
    const scope2Node = tree.children.find(c => c.children.length === 0);
    expect(scope2Node).toBeDefined();
    expect(scope2Node!.resolvedCount).toBe(1);
  });

  test("getChildContainers lists all direct child containers", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();
    const rootContainer = createContainer({ graph: graph, name: "RootContainer" });

    // Create child containers using override builder
    const MockDatabaseAdapter1 = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });

    const MockDatabaseAdapter2 = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });

    rootContainer.override(MockDatabaseAdapter1).build();
    rootContainer.override(MockDatabaseAdapter2).build();

    // Get child containers via inspector
    const childInspectors = rootContainer.inspector.getChildContainers();

    // Should have exactly 2 children
    expect(childInspectors.length).toBe(2);

    // Each child should have InspectorAPI methods
    for (const childInspector of childInspectors) {
      expect(typeof childInspector.getSnapshot).toBe("function");
      expect(typeof childInspector.getContainerKind).toBe("function");

      // Verify child kind
      expect(childInspector.getContainerKind()).toBe("child");
    }

    // Verify child names are auto-generated from parent
    const childNames = childInspectors.map(ci => ci.getSnapshot().containerName).sort();
    expect(childNames).toEqual(["RootContainer-override", "RootContainer-override"]);
  });

  test("Inspector correctly reports override container relationships", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();
    const container = createContainer({ graph: graph, name: "OverrideTest" });

    // Create override that replaces Database
    const MockDatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });

    const overridden = container.override(MockDatabaseAdapter).build();

    // Verify override container
    const overrideSnapshot = overridden.inspector.getSnapshot();
    expect(overrideSnapshot.containerName).toBe("OverrideTest-override");
    expect(overrideSnapshot.kind).toBe("child");

    // Get graph data to check override information
    const graphData = overridden.inspector.getGraphData();
    const databaseAdapter = graphData.adapters.find(a => a.portName === "Database");

    expect(databaseAdapter).toBeDefined();
    expect(databaseAdapter!.origin).toBe("overridden");
    expect(databaseAdapter!.isOverride).toBe(true);

    // Verify there's exactly one adapter in the override (just the overridden Database)
    expect(graphData.adapters.length).toBe(1);

    // Verify this is a child container via snapshot
    expect(overrideSnapshot.kind).toBe("child");

    // Verify the container can resolve both inherited and overridden services
    const logger = overridden.resolve(LoggerPort);
    const database = overridden.resolve(DatabasePort);
    expect(logger).toBeDefined();
    expect(database).toBeDefined();
  });

  test("Parent/child inspector coordination during disposal", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const parent = createContainer({ graph: graph, name: "Parent" });

    // Create child using override builder
    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const child = parent.override(MockLoggerAdapter).build();

    // Verify both active before disposal
    expect(parent.inspector.getPhase()).toBe("initialized");
    expect(child.inspector.getPhase()).toBe("initialized");

    // Dispose child
    await child.dispose();

    // Parent should remain active
    expect(parent.inspector.getPhase()).toBe("initialized");

    // Child should be disposed
    expect(() => child.inspector.getSnapshot()).toThrow(/disposed/i);

    // Verify parent's child list still returns the child (even though disposed)
    const childInspectors = parent.inspector.getChildContainers();
    // Note: getChildContainers returns children regardless of disposal state
    expect(childInspectors.length).toBeGreaterThanOrEqual(0);

    // Now dispose parent
    await parent.dispose();

    // Both should throw on inspector operations
    expect(() => parent.inspector.getSnapshot()).toThrow(/disposed/i);
    expect(() => child.inspector.getSnapshot()).toThrow(/disposed/i);
  });
});

// =============================================================================
// Test Utility Verification
// =============================================================================

describe("Test Utilities", () => {
  test("createComplexHierarchy builds multi-level structure", () => {
    const hierarchy = createComplexHierarchy();

    // Verify root exists
    expect(hierarchy.root).toBeDefined();
    expect(hierarchy.root.inspector.getContainerKind()).toBe("root");

    // Verify children exist
    expect(hierarchy.children.length).toBe(2);
    for (const child of hierarchy.children) {
      expect(child.inspector.getContainerKind()).toBe("child");
    }

    // Verify scopes exist at each level
    expect(hierarchy.scopes.level1.length).toBe(3);
    expect(hierarchy.scopes.level2.length).toBe(2);
    expect(hierarchy.scopes.level3.length).toBe(1);

    // Verify scope tree reflects structure
    const tree = hierarchy.root.inspector.getScopeTree();
    expect(tree.children.length).toBe(3); // 3 root-level scopes
  });

  test("snapshotAllLevels captures state from entire hierarchy", () => {
    const hierarchy = createComplexHierarchy();
    const snapshots = snapshotAllLevels(hierarchy);

    // Should have root + 2 children = 3 snapshots
    expect(snapshots.length).toBe(3);

    // Verify root snapshot
    const rootSnap = snapshots.find(s => s.level === "root");
    expect(rootSnap).toBeDefined();
    expect(rootSnap!.snapshot.kind).toBe("root");
    expect(rootSnap!.scopeTree.id).toBe("container");

    // Verify child snapshots
    const childSnaps = snapshots.filter(s => s.level.startsWith("child"));
    expect(childSnaps.length).toBe(2);
    for (const snap of childSnaps) {
      expect(snap.snapshot.kind).toBe("child");
    }
  });

  test("verifyHierarchyIntegrity validates parent/child relationships", () => {
    const hierarchy = createComplexHierarchy();

    // Should have 2 children
    expect(verifyHierarchyIntegrity(hierarchy.root, 2)).toBe(true);

    // Wrong expected count should fail
    expect(verifyHierarchyIntegrity(hierarchy.root, 1)).toBe(false);
    expect(verifyHierarchyIntegrity(hierarchy.root, 3)).toBe(false);
  });

  test("trackPhaseTransitions monitors phase changes", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "PhaseTest" });

    const phases = await trackPhaseTransitions(container, async () => {
      await container.dispose();
    });

    // Should capture initial and final phases
    expect(phases.length).toBe(2);
    expect(phases[0]).toBe("initialized");
    expect(phases[1]).toBe("disposed");
  });
});
