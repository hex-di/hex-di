/**
 * Tests for src/inspection/creation.ts
 * Covers createInspector factory, getInternalAccessor, deepFreeze.
 */
import { describe, it, expect, vi } from "vitest";
import { createInspector, getInternalAccessor } from "../src/inspection/creation.js";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { INTERNAL_ACCESS } from "../src/inspection/symbols.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(msg: string): void;
}
interface Database {
  query(sql: string): unknown;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const RequestContextPort = port<{ requestId: string }>()({ name: "RequestContext" });

function createTestContainer() {
  const loggerAdapter = createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ log: vi.fn() }),
  });
  const dbAdapter = createAdapter({
    provides: DatabasePort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ query: vi.fn() }),
  });
  const requestAdapter = createAdapter({
    provides: RequestContextPort,
    requires: [],
    lifetime: "scoped",
    factory: () => ({ requestId: "req-1" }),
  });
  const graph = GraphBuilder.create()
    .provide(loggerAdapter)
    .provide(dbAdapter)
    .provide(requestAdapter)
    .build();
  return createContainer({ graph, name: "TestApp" });
}

// =============================================================================
// Tests
// =============================================================================

describe("getInternalAccessor", () => {
  it("returns accessor function from container", () => {
    const container = createTestContainer();
    const accessor = getInternalAccessor(container);
    expect(typeof accessor).toBe("function");
  });

  it("accessor returns ContainerInternalState", () => {
    const container = createTestContainer();
    const accessor = getInternalAccessor(container);
    const state = accessor();
    expect(state.disposed).toBe(false);
    expect(state.containerName).toBe("TestApp");
    expect(state.adapterMap).toBeDefined();
  });

  it("throws if container does not expose INTERNAL_ACCESS", () => {
    const fakeContainer = {
      [INTERNAL_ACCESS]: "not-a-function",
    } as any;
    expect(() => getInternalAccessor(fakeContainer)).toThrow(
      "Container does not expose INTERNAL_ACCESS accessor"
    );
  });
});

describe("createInspector (creation.ts)", () => {
  it("creates a frozen inspector object", () => {
    const container = createTestContainer();
    const inspector = createInspector(container);
    expect(Object.isFrozen(inspector)).toBe(true);
  });

  it("inspector has snapshot method", () => {
    const container = createTestContainer();
    const inspector = createInspector(container);
    expect(typeof inspector.snapshot).toBe("function");
  });

  it("inspector has listPorts method", () => {
    const container = createTestContainer();
    const inspector = createInspector(container);
    expect(typeof inspector.listPorts).toBe("function");
  });

  it("inspector has isResolved method", () => {
    const container = createTestContainer();
    const inspector = createInspector(container);
    expect(typeof inspector.isResolved).toBe("function");
  });

  it("inspector has getScopeTree method", () => {
    const container = createTestContainer();
    const inspector = createInspector(container);
    expect(typeof inspector.getScopeTree).toBe("function");
  });

  describe("snapshot()", () => {
    it("returns complete container snapshot", () => {
      const container = createTestContainer();
      const inspector = createInspector(container);
      const snapshot = inspector.snapshot();

      expect(snapshot.isDisposed).toBe(false);
      expect(snapshot.containerName).toBe("TestApp");
      expect(snapshot.singletons).toBeDefined();
      expect(snapshot.scopes).toBeDefined();
    });

    it("snapshot is deeply frozen", () => {
      const container = createTestContainer();
      const inspector = createInspector(container);
      const snapshot = inspector.snapshot();

      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.singletons)).toBe(true);
      expect(Object.isFrozen(snapshot.scopes)).toBe(true);
    });

    it("reflects resolved singletons", () => {
      const container = createTestContainer();
      container.resolve(LoggerPort);

      const inspector = createInspector(container);
      const snapshot = inspector.snapshot();

      const loggerEntry = snapshot.singletons.find(s => s.portName === "Logger");
      expect(loggerEntry).toBeDefined();
      expect(loggerEntry?.isResolved).toBe(true);
    });

    it("reflects unresolved singletons", () => {
      const container = createTestContainer();
      container.resolve(LoggerPort);

      const inspector = createInspector(container);
      const snapshot = inspector.snapshot();

      const dbEntry = snapshot.singletons.find(s => s.portName === "Database");
      expect(dbEntry).toBeDefined();
      expect(dbEntry?.isResolved).toBe(false);
    });

    it("scope tree shows root container", () => {
      const container = createTestContainer();
      const inspector = createInspector(container);
      const snapshot = inspector.snapshot();

      expect(snapshot.scopes.id).toBe("container");
      expect(snapshot.scopes.status).toBe("active");
    });

    it("scope tree includes child scopes", () => {
      const container = createTestContainer();
      const scope = container.createScope();
      scope.resolve(RequestContextPort);

      const inspector = createInspector(container);
      const snapshot = inspector.snapshot();

      expect(snapshot.scopes.children.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("listPorts()", () => {
    it("returns all registered port names", () => {
      const container = createTestContainer();
      const inspector = createInspector(container);
      const ports = inspector.listPorts();

      expect(ports).toContain("Logger");
      expect(ports).toContain("Database");
      expect(ports).toContain("RequestContext");
    });

    it("returns frozen array", () => {
      const container = createTestContainer();
      const inspector = createInspector(container);
      const ports = inspector.listPorts();
      expect(Object.isFrozen(ports)).toBe(true);
    });

    it("returns sorted alphabetically", () => {
      const container = createTestContainer();
      const inspector = createInspector(container);
      const ports = inspector.listPorts();

      const sorted = [...ports].sort();
      expect(Array.from(ports)).toEqual(sorted);
    });
  });

  describe("isResolved()", () => {
    it("returns false for unresolved singleton", () => {
      const container = createTestContainer();
      const inspector = createInspector(container);
      expect(inspector.isResolved("Logger")).toBe(false);
    });

    it("returns true for resolved singleton", () => {
      const container = createTestContainer();
      container.resolve(LoggerPort);
      const inspector = createInspector(container);
      expect(inspector.isResolved("Logger")).toBe(true);
    });

    it("returns 'scope-required' for scoped ports", () => {
      const container = createTestContainer();
      const inspector = createInspector(container);
      expect(inspector.isResolved("RequestContext")).toBe("scope-required");
    });

    it("throws for unregistered port", () => {
      const container = createTestContainer();
      const inspector = createInspector(container);
      expect(() => inspector.isResolved("NonExistent")).toThrow();
    });

    it("suggests similar port name in error", () => {
      const container = createTestContainer();
      const inspector = createInspector(container);
      try {
        inspector.isResolved("Logge");
      } catch (e: any) {
        expect(e.message).toContain("Did you mean 'Logger'");
      }
    });
  });

  describe("getScopeTree()", () => {
    it("returns root scope tree", () => {
      const container = createTestContainer();
      const inspector = createInspector(container);
      const tree = inspector.getScopeTree();

      expect(tree.id).toBe("container");
      expect(tree.status).toBe("active");
    });

    it("returns frozen tree", () => {
      const container = createTestContainer();
      const inspector = createInspector(container);
      const tree = inspector.getScopeTree();
      expect(Object.isFrozen(tree)).toBe(true);
    });

    it("totalCount matches adapter count", () => {
      const container = createTestContainer();
      const inspector = createInspector(container);
      const tree = inspector.getScopeTree();
      expect(tree.totalCount).toBe(3); // Logger, Database, RequestContext
    });

    it("resolvedCount matches resolved singletons", () => {
      const container = createTestContainer();
      container.resolve(LoggerPort);
      container.resolve(DatabasePort);

      const inspector = createInspector(container);
      const tree = inspector.getScopeTree();
      expect(tree.resolvedCount).toBe(2);
    });

    it("resolvedPorts lists resolved port names", () => {
      const container = createTestContainer();
      container.resolve(LoggerPort);

      const inspector = createInspector(container);
      const tree = inspector.getScopeTree();
      expect(tree.resolvedPorts).toContain("Logger");
    });
  });
});
