/**
 * Tests for src/inspect.ts (standalone inspect function)
 * Covers snapshot generation for root, child, and various states.
 */
import { describe, it, expect, vi } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { inspect } from "../src/inspect.js";

interface Logger {
  log(msg: string): void;
}
interface Database {
  query(sql: string): unknown;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const _DatabasePort = port<Database>()({ name: "Database" });

describe("inspect()", () => {
  it("returns a snapshot for a fresh container", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const snapshot = inspect(container);
    expect(snapshot).toBeDefined();
    expect(snapshot.containerName).toBe("Test");
    expect(snapshot.kind).toBe("root");
    expect(snapshot.isDisposed).toBe(false);
  });

  it("reports resolved singletons", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    container.resolve(LoggerPort);

    const snapshot = inspect(container);
    const loggerEntry = snapshot.singletons.find(s => s.portName === "Logger");
    expect(loggerEntry).toBeDefined();
    expect(loggerEntry?.isResolved).toBe(true);
  });

  it("returns frozen snapshot", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const snapshot = inspect(container);
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it("works with child containers", () => {
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

    const snapshot = inspect(child);
    expect(snapshot.containerName).toBe("Child");
    expect(snapshot.kind).toBe("child");
  });

  it("includes scope tree data", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const scope = container.createScope("MyScope");
    scope.resolve(LoggerPort);

    const snapshot = inspect(container);
    expect(snapshot.scopes).toBeDefined();
    expect(snapshot.scopes.children.length).toBeGreaterThanOrEqual(1);
  });

  it("throws when inspecting disposed container", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    await container.dispose();

    expect(() => inspect(container)).toThrow();
  });
});
