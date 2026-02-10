/**
 * Targeted mutation-killing tests for src/container/base-impl.ts
 * Tests specific code paths: hasInspector guard, has() method,
 * registerChildContainer events, disposal cascade, getInternalState,
 * adapter map snapshot.
 */
import { describe, it, expect, vi } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { INTERNAL_ACCESS, ADAPTER_ACCESS } from "../src/inspection/symbols.js";
import {
  DisposedScopeError,
  ScopeRequiredError,
  AsyncInitializationRequiredError,
} from "../src/errors/index.js";

interface Logger {
  log(msg: string): void;
}
interface Database {
  query(sql: string): unknown;
}
interface Cache {
  get(key: string): unknown;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const CachePort = port<Cache>()({ name: "Cache" });

describe("BaseContainerImpl mutation targets", () => {
  describe("has() method", () => {
    it("returns true for singleton port", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      expect(container.has(LoggerPort)).toBe(true);
    });

    it("returns true for transient port", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "transient",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      expect(container.has(LoggerPort)).toBe(true);
    });

    it("returns false for scoped port (scope required)", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      expect(container.has(LoggerPort)).toBe(false);
    });

    it("returns false for unregistered port", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      expect(container.has(DatabasePort)).toBe(false);
    });
  });

  describe("hasAdapter()", () => {
    it("returns true for registered port", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      expect(container.hasAdapter(LoggerPort)).toBe(true);
    });

    it("returns false for unregistered port", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      expect(container.hasAdapter(DatabasePort)).toBe(false);
    });
  });

  describe("resolve error paths", () => {
    it("throws DisposedScopeError when container is disposed", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      await container.dispose();

      expect(() => container.resolve(LoggerPort)).toThrow(DisposedScopeError);
    });

    it("throws ScopeRequiredError for scoped port on container-level resolve", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      expect(() => container.resolve(LoggerPort)).toThrow(ScopeRequiredError);
    });

    it("throws Error for unregistered port on root container", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      expect(() => container.resolve(DatabasePort as any)).toThrow(/No adapter registered/);
    });
  });

  describe("resolveAsync error paths", () => {
    it("rejects with DisposedScopeError when container is disposed", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      await container.dispose();

      await expect(container.resolveAsync(LoggerPort)).rejects.toThrow(DisposedScopeError);
    });

    it("rejects with ScopeRequiredError for scoped port", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      await expect(container.resolveAsync(LoggerPort)).rejects.toThrow(ScopeRequiredError);
    });

    it("rejects for unregistered port on root container", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      await expect(container.resolveAsync(DatabasePort as any)).rejects.toThrow(
        /No adapter registered/
      );
    });
  });

  describe("getInternalState", () => {
    it("throws DisposedScopeError after disposal", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      await container.dispose();

      expect(() => (container as any)[INTERNAL_ACCESS]()).toThrow(DisposedScopeError);
    });

    it("returns frozen internal state object", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const state = (container as any)[INTERNAL_ACCESS]();
      expect(Object.isFrozen(state)).toBe(true);
    });

    it("state has correct disposed flag", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const state = (container as any)[INTERNAL_ACCESS]();
      expect(state.disposed).toBe(false);
    });

    it("state contains containerName", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "MyContainer" });

      const state = (container as any)[INTERNAL_ACCESS]();
      expect(state.containerName).toBe("MyContainer");
    });

    it("state contains adapterMap with correct entries", () => {
      const loggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const dbAdapter = createAdapter({
        provides: DatabasePort,
        requires: [LoggerPort] as const,
        lifetime: "transient",
        factory: deps => ({ query: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(loggerAdapter).provide(dbAdapter).build();
      const container = createContainer({ graph, name: "Test" });

      const state = (container as any)[INTERNAL_ACCESS]();
      expect(state.adapterMap.size).toBe(2);

      for (const [portObj, info] of state.adapterMap) {
        if (info.portName === "Logger") {
          expect(info.lifetime).toBe("singleton");
          expect(info.dependencyCount).toBe(0);
          expect(info.dependencyNames).toEqual([]);
        }
        if (info.portName === "Database") {
          expect(info.lifetime).toBe("transient");
          expect(info.dependencyCount).toBe(1);
          expect(info.dependencyNames).toContain("Logger");
        }
      }
    });

    it("state contains overridePorts set", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const state = (container as any)[INTERNAL_ACCESS]();
      expect(state.overridePorts).toBeDefined();
      expect(state.overridePorts.size).toBe(0);
    });

    it("state isOverride returns false for all ports on root", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const state = (container as any)[INTERNAL_ACCESS]();
      expect(state.isOverride("Logger")).toBe(false);
      expect(state.isOverride("NonExistent")).toBe(false);
    });
  });

  describe("isDisposed getter", () => {
    it("returns false before disposal", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });
      expect(container.isDisposed).toBe(false);
    });

    it("returns true after disposal", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });
      await container.dispose();
      expect(container.isDisposed).toBe(true);
    });
  });

  describe("disposal cascade", () => {
    it("disposes child containers on parent disposal", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const parent = createContainer({ graph, name: "Parent" });

      const childGraph = GraphBuilder.create().build();
      const child = parent.createChild(childGraph, { name: "Child" });

      expect(child.isDisposed).toBe(false);

      await parent.dispose();

      expect(parent.isDisposed).toBe(true);
      expect(child.isDisposed).toBe(true);
    });

    it("disposes child scopes on parent disposal", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const scope = container.createScope("test-scope");
      expect(scope.isDisposed).toBe(false);

      await container.dispose();

      expect(container.isDisposed).toBe(true);
      expect(scope.isDisposed).toBe(true);
    });

    it("disposal is idempotent", async () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      await container.dispose();
      // Second disposal should not throw
      await container.dispose();
      expect(container.isDisposed).toBe(true);
    });
  });

  describe("child container getInternalState", () => {
    it("child state includes containerId and containerName", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const parent = createContainer({ graph, name: "Parent" });

      const childGraph = GraphBuilder.create().build();
      const child = parent.createChild(childGraph, { name: "MyChild" });

      const state = (child as any)[INTERNAL_ACCESS]();
      expect(state.containerName).toBe("MyChild");
      expect(typeof state.containerId).toBe("string");
    });

    it("child state includes inheritanceModes", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const parent = createContainer({ graph, name: "Parent" });

      const childGraph = GraphBuilder.create().build();
      const child = parent.createChild(childGraph, {
        name: "Child",
        inheritanceModes: { Logger: "shared" } as any,
      });

      const state = (child as any)[INTERNAL_ACCESS]();
      expect(state.inheritanceModes).toBeDefined();
      expect(state.inheritanceModes.get("Logger")).toBe("shared");
    });
  });

  describe("ADAPTER_ACCESS symbol", () => {
    it("returns adapter for registered port", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const result = (container as any)[ADAPTER_ACCESS](LoggerPort);
      expect(result).toBeDefined();
      expect(result.lifetime).toBe("singleton");
    });

    it("returns undefined for unregistered port", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      const result = (container as any)[ADAPTER_ACCESS](DatabasePort);
      expect(result).toBeUndefined();
    });
  });

  describe("container kind and name", () => {
    it("root container has kind 'root'", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      expect(container.kind).toBe("root");
    });

    it("child container has kind 'child'", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const parent = createContainer({ graph, name: "Parent" });

      const childGraph = GraphBuilder.create().build();
      const child = parent.createChild(childGraph, { name: "Child" });

      expect(child.kind).toBe("child");
    });

    it("root container has parentName null", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      expect(container.parentName).toBeNull();
    });

    it("child container has parentName from parent", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const parent = createContainer({ graph, name: "ParentApp" });

      const childGraph = GraphBuilder.create().build();
      const child = parent.createChild(childGraph, { name: "Child" });

      expect(child.parentName).toBe("ParentApp");
    });
  });

  describe("root container parent access", () => {
    it("accessing parent on root container throws", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const container = createContainer({ graph, name: "Test" });

      expect(() => container.parent).toThrow();
    });
  });

  describe("child container parent access", () => {
    it("child container .parent returns parent container", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const parent = createContainer({ graph, name: "Parent" });

      const childGraph = GraphBuilder.create().build();
      const child = parent.createChild(childGraph, { name: "Child" });

      // parent property should be the parent container wrapper
      const childParent = child.parent;
      expect(childParent).toBeDefined();
      expect(typeof childParent.resolve).toBe("function");
    });
  });

  describe("registerChildContainer with inspector events", () => {
    it("emits child-created event on parent inspector when child is created", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
      const graph = GraphBuilder.create().provide(adapter).build();
      const parent = createContainer({ graph, name: "Parent" });

      const events: any[] = [];
      const inspector = (parent as any).inspector;
      inspector.subscribe((e: any) => events.push(e));

      const childGraph = GraphBuilder.create().build();
      parent.createChild(childGraph, { name: "Child" });

      const childCreatedEvent = events.find(e => e.type === "child-created");
      expect(childCreatedEvent).toBeDefined();
      expect(childCreatedEvent.childKind).toBe("child");
    });
  });
});
