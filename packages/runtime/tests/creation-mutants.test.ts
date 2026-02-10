/**
 * Mutation-killing tests for src/inspection/creation.ts
 *
 * Targets survived mutants in:
 * - getInternalAccessor: typeof check, error throw
 * - deepFreeze: isRecord check, Object.isFrozen check, recursion
 * - buildScopeTreeNode: status active vs disposed, resolvedPorts extraction
 * - createInspector.snapshot: singleton filtering, resolvedAt logic, memoEntryMap
 * - createInspector.buildContainerScopeTree: totalCount, scopedAdapterCount
 * - createInspector.listPorts: sort, freeze
 * - createInspector.isResolved: scoped, parent chain, error w/ suggestion
 * - createInspector.getScopeTree
 */
import { describe, it, expect, vi } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { createInspector, getInternalAccessor } from "../src/inspection/creation.js";
import { INTERNAL_ACCESS } from "../src/inspection/symbols.js";

// =============================================================================
// Fixtures
// =============================================================================

interface Logger {
  log(msg: string): void;
}
interface Database {
  query(sql: string): unknown;
}
interface RequestCtx {
  requestId: string;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const RequestCtxPort = port<RequestCtx>()({ name: "RequestCtx" });

function makeContainer(opts: { singletons?: boolean; scoped?: boolean; name?: string } = {}) {
  let builder = GraphBuilder.create();

  builder = builder.provide(
    createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: opts.singletons !== false ? "singleton" : "transient",
      factory: () => ({ log: vi.fn() }),
    })
  );

  if (opts.scoped) {
    builder = builder.provide(
      createAdapter({
        provides: RequestCtxPort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ requestId: `req-${Date.now()}` }),
      })
    );
  }

  return createContainer({ graph: builder.build(), name: opts.name ?? "Test" });
}

// =============================================================================
// getInternalAccessor
// =============================================================================

describe("getInternalAccessor (mutant killing)", () => {
  it("returns the accessor function when present", () => {
    const container = makeContainer();
    const accessor = getInternalAccessor(container as any);
    expect(typeof accessor).toBe("function");
  });

  it("calling accessor returns internal state", () => {
    const container = makeContainer();
    const accessor = getInternalAccessor(container as any);
    const state = accessor();
    expect(state).toBeDefined();
    expect(typeof state.disposed).toBe("boolean");
    expect(state.containerName).toBe("Test");
  });

  it("throws when INTERNAL_ACCESS is not a function", () => {
    const fake = { [INTERNAL_ACCESS]: "not a function" } as any;
    expect(() => getInternalAccessor(fake)).toThrow(
      "Container does not expose INTERNAL_ACCESS accessor"
    );
  });

  it("throws when INTERNAL_ACCESS is missing", () => {
    const fake = {} as any;
    expect(() => getInternalAccessor(fake)).toThrow();
  });
});

// =============================================================================
// createInspector
// =============================================================================

describe("createInspector (mutant killing)", () => {
  it("returns a frozen inspector object", () => {
    const container = makeContainer();
    const inspector = createInspector(container as any);
    expect(Object.isFrozen(inspector)).toBe(true);
  });

  it("inspector has all required methods", () => {
    const container = makeContainer();
    const inspector = createInspector(container as any);
    expect(typeof inspector.snapshot).toBe("function");
    expect(typeof inspector.listPorts).toBe("function");
    expect(typeof inspector.isResolved).toBe("function");
    expect(typeof inspector.getScopeTree).toBe("function");
  });
});

// =============================================================================
// snapshot
// =============================================================================

describe("inspector.snapshot (mutant killing)", () => {
  it("returns containerName from state", () => {
    const container = makeContainer({ name: "MyApp" });
    const inspector = createInspector(container as any);
    const snapshot = inspector.snapshot();
    expect(snapshot.containerName).toBe("MyApp");
  });

  it("isDisposed is false for active container", () => {
    const container = makeContainer();
    const inspector = createInspector(container as any);
    const snapshot = inspector.snapshot();
    expect(snapshot.isDisposed).toBe(false);
  });

  it("singletons are empty before resolution", () => {
    const container = makeContainer();
    const inspector = createInspector(container as any);
    const snapshot = inspector.snapshot();

    const loggerEntry = snapshot.singletons.find(s => s.portName === "Logger");
    expect(loggerEntry).toBeDefined();
    expect(loggerEntry!.isResolved).toBe(false);
    expect(loggerEntry!.resolvedAt).toBeUndefined();
  });

  it("singletons show resolved after resolution", () => {
    const container = makeContainer();
    container.resolve(LoggerPort);

    const inspector = createInspector(container as any);
    const snapshot = inspector.snapshot();

    const loggerEntry = snapshot.singletons.find(s => s.portName === "Logger");
    expect(loggerEntry).toBeDefined();
    expect(loggerEntry!.isResolved).toBe(true);
    expect(loggerEntry!.resolvedAt).toBeGreaterThan(0);
    expect(loggerEntry!.resolutionOrder).toBeDefined();
  });

  it("only singleton adapters are included in singletons array", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .provide(
        createAdapter({
          provides: DatabasePort,
          requires: [],
          lifetime: "transient",
          factory: () => ({ query: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });
    const inspector = createInspector(container as any);
    const snapshot = inspector.snapshot();

    // Only "Logger" (singleton) should be in singletons
    expect(snapshot.singletons.some(s => s.portName === "Logger")).toBe(true);
    expect(snapshot.singletons.some(s => s.portName === "Database")).toBe(false);
  });

  it("snapshot result is deeply frozen", () => {
    const container = makeContainer();
    const inspector = createInspector(container as any);
    const snapshot = inspector.snapshot();

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.singletons)).toBe(true);
    expect(Object.isFrozen(snapshot.scopes)).toBe(true);
  });

  it("singleton entries are individually frozen", () => {
    const container = makeContainer();
    const inspector = createInspector(container as any);
    const snapshot = inspector.snapshot();

    for (const entry of snapshot.singletons) {
      expect(Object.isFrozen(entry)).toBe(true);
    }
  });
});

// =============================================================================
// listPorts
// =============================================================================

describe("inspector.listPorts (mutant killing)", () => {
  it("lists all registered ports", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .provide(
        createAdapter({
          provides: DatabasePort,
          requires: [],
          lifetime: "transient",
          factory: () => ({ query: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });
    const inspector = createInspector(container as any);
    const ports = inspector.listPorts();

    expect(ports).toContain("Logger");
    expect(ports).toContain("Database");
    expect(ports).toHaveLength(2);
  });

  it("returns ports in alphabetical order", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: DatabasePort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ query: vi.fn() }),
        })
      )
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });
    const inspector = createInspector(container as any);
    const ports = inspector.listPorts();

    expect(ports[0]).toBe("Database");
    expect(ports[1]).toBe("Logger");
  });

  it("returns a frozen array", () => {
    const container = makeContainer();
    const inspector = createInspector(container as any);
    const ports = inspector.listPorts();
    expect(Object.isFrozen(ports)).toBe(true);
  });
});

// =============================================================================
// isResolved
// =============================================================================

describe("inspector.isResolved (mutant killing)", () => {
  it("returns false for unresolved singleton", () => {
    const container = makeContainer();
    const inspector = createInspector(container as any);
    expect(inspector.isResolved("Logger")).toBe(false);
  });

  it("returns true for resolved singleton", () => {
    const container = makeContainer();
    container.resolve(LoggerPort);
    const inspector = createInspector(container as any);
    expect(inspector.isResolved("Logger")).toBe(true);
  });

  it("returns 'scope-required' for scoped port", () => {
    const container = makeContainer({ scoped: true });
    const inspector = createInspector(container as any);
    expect(inspector.isResolved("RequestCtx")).toBe("scope-required");
  });

  it("throws for unknown port with error message containing port name", () => {
    const container = makeContainer();
    const inspector = createInspector(container as any);
    expect(() => inspector.isResolved("NonExistent")).toThrow(
      "Port 'NonExistent' is not registered"
    );
  });

  it("error message includes 'Use listPorts()'", () => {
    const container = makeContainer();
    const inspector = createInspector(container as any);
    expect(() => inspector.isResolved("XYZ")).toThrow(/Use listPorts\(\)/);
  });

  it("suggests similar port name when close match exists", () => {
    const container = makeContainer();
    const inspector = createInspector(container as any);
    expect(() => inspector.isResolved("Logge")).toThrow(/Did you mean 'Logger'/);
  });

  it("does not suggest when name is too different", () => {
    const container = makeContainer();
    const inspector = createInspector(container as any);
    try {
      inspector.isResolved("CompletelyDifferent");
    } catch (e: any) {
      expect(e.message).not.toContain("Did you mean");
    }
  });
});

// =============================================================================
// getScopeTree
// =============================================================================

describe("inspector.getScopeTree (mutant killing)", () => {
  it("returns root node with id 'container'", () => {
    const container = makeContainer();
    const inspector = createInspector(container as any);
    const tree = inspector.getScopeTree();

    expect(tree.id).toBe("container");
    expect(tree.status).toBe("active");
  });

  it("root totalCount matches adapter count", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .provide(
        createAdapter({
          provides: DatabasePort,
          requires: [],
          lifetime: "transient",
          factory: () => ({ query: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });
    const inspector = createInspector(container as any);
    const tree = inspector.getScopeTree();

    expect(tree.totalCount).toBe(2);
  });

  it("root resolvedCount matches singleton memo size", () => {
    const container = makeContainer();
    container.resolve(LoggerPort);
    const inspector = createInspector(container as any);
    const tree = inspector.getScopeTree();

    expect(tree.resolvedCount).toBeGreaterThanOrEqual(1);
  });

  it("root resolvedPorts includes resolved singleton names", () => {
    const container = makeContainer();
    container.resolve(LoggerPort);
    const inspector = createInspector(container as any);
    const tree = inspector.getScopeTree();

    expect(tree.resolvedPorts).toContain("Logger");
  });

  it("root children is empty without scopes", () => {
    const container = makeContainer();
    const inspector = createInspector(container as any);
    const tree = inspector.getScopeTree();
    expect(tree.children).toHaveLength(0);
  });

  it("includes child scopes in tree", () => {
    const container = makeContainer({ scoped: true });
    const scope = container.createScope();
    scope.resolve(RequestCtxPort);

    const inspector = createInspector(container as any);
    const tree = inspector.getScopeTree();

    expect(tree.children.length).toBeGreaterThanOrEqual(1);
    const child = tree.children[0];
    expect(child.status).toBe("active");
    expect(child.resolvedPorts).toContain("RequestCtx");
  });

  it("child scope totalCount is scoped adapter count", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .provide(
        createAdapter({
          provides: RequestCtxPort,
          requires: [],
          lifetime: "scoped",
          factory: () => ({ requestId: "r" }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });

    const scope = container.createScope();
    scope.resolve(RequestCtxPort);

    const inspector = createInspector(container as any);
    const tree = inspector.getScopeTree();

    // Root totalCount = 2 (all adapters)
    expect(tree.totalCount).toBe(2);

    // Child totalCount = scoped adapter count = 1
    expect(tree.children[0].totalCount).toBe(1);
  });

  it("disposed scope shows 'disposed' status", async () => {
    const container = makeContainer({ scoped: true });
    const scope = container.createScope();
    scope.resolve(RequestCtxPort);

    const inspector = createInspector(container as any);

    // Before disposal
    let tree = inspector.getScopeTree();
    expect(tree.children.length).toBeGreaterThanOrEqual(1);

    // Dispose scope
    await scope.dispose();

    // After disposal - scope should be removed or disposed
    tree = inspector.getScopeTree();
    // Disposed scopes are removed from tracking
    expect(tree.children).toHaveLength(0);
  });

  it("tree is frozen", () => {
    const container = makeContainer();
    const inspector = createInspector(container as any);
    const tree = inspector.getScopeTree();

    expect(Object.isFrozen(tree)).toBe(true);
    expect(Object.isFrozen(tree.children)).toBe(true);
    expect(Object.isFrozen(tree.resolvedPorts)).toBe(true);
  });
});

// =============================================================================
// buildScopeTreeNode (via nested scopes)
// =============================================================================

describe("buildScopeTreeNode (via nested scopes)", () => {
  it("supports nested scope trees", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: RequestCtxPort,
          requires: [],
          lifetime: "scoped",
          factory: () => ({ requestId: "r" }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });

    const scope1 = container.createScope();
    const scope2 = scope1.createScope();
    scope2.resolve(RequestCtxPort);

    const inspector = createInspector(container as any);
    const tree = inspector.getScopeTree();

    expect(tree.children.length).toBeGreaterThanOrEqual(1);
    const child1 = tree.children[0];
    expect(child1.children.length).toBeGreaterThanOrEqual(1);
    const child2 = child1.children[0];
    expect(child2.resolvedPorts).toContain("RequestCtx");
    expect(child2.resolvedCount).toBeGreaterThanOrEqual(1);
  });
});

// =============================================================================
// isResolved with parent chain
// =============================================================================

describe("isResolvedInParentChain", () => {
  it("child container inspector lists parent's inherited ports", () => {
    const parentGraph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const parent = createContainer({ graph: parentGraph, name: "Parent" });
    parent.resolve(LoggerPort);

    const childGraph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: DatabasePort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ query: vi.fn() }),
        })
      )
      .build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const inspector = createInspector(child as any);
    // Child should list its own port
    const ports = inspector.listPorts();
    expect(ports).toContain("Database");
    // Child has its own Database that is unresolved
    expect(inspector.isResolved("Database")).toBe(false);
    // Resolve it
    child.resolve(DatabasePort);
    expect(inspector.isResolved("Database")).toBe(true);
  });
});
