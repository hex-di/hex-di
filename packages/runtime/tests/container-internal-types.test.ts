/**
 * Tests for src/container/internal-types.ts
 * Covers type guards and runtime adapter utilities.
 */
import { describe, it, expect, vi } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { ADAPTER_ACCESS, INTERNAL_ACCESS } from "../src/inspection/symbols.js";

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

// =============================================================================
// Tests
// =============================================================================

describe("container internal types and adapter access", () => {
  it("container exposes ADAPTER_ACCESS for port lookup", () => {
    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(loggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    // Container should have ADAPTER_ACCESS symbol
    const adapterFn = (container as any)[ADAPTER_ACCESS];
    expect(typeof adapterFn).toBe("function");

    // Should return adapter for registered port
    const adapter = adapterFn(LoggerPort);
    expect(adapter).toBeDefined();
  });

  it("ADAPTER_ACCESS returns undefined for non-registered port", () => {
    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(loggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const adapterFn = (container as any)[ADAPTER_ACCESS];
    const adapter = adapterFn(DatabasePort);
    expect(adapter).toBeUndefined();
  });

  it("INTERNAL_ACCESS provides adapter map with port info", () => {
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

    const state = container[INTERNAL_ACCESS]();
    expect(state.adapterMap.size).toBe(2);

    // Adapter info should be accessible
    for (const [_portObj, adapterInfo] of state.adapterMap) {
      if (adapterInfo.portName === "Logger") {
        expect(adapterInfo.lifetime).toBe("singleton");
        expect(adapterInfo.dependencyCount).toBe(0);
        expect(adapterInfo.dependencyNames).toEqual([]);
      }
      if (adapterInfo.portName === "Database") {
        expect(adapterInfo.lifetime).toBe("transient");
        expect(adapterInfo.dependencyCount).toBe(1);
        expect(adapterInfo.dependencyNames).toContain("Logger");
      }
    }
  });

  it("INTERNAL_ACCESS provides overridePorts set", () => {
    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(loggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const state = container[INTERNAL_ACCESS]();
    expect(state.overridePorts).toBeDefined();
    expect(state.overridePorts.size).toBe(0); // Root has no overrides
  });

  it("INTERNAL_ACCESS isOverride returns false for root container", () => {
    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(loggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const state = container[INTERNAL_ACCESS]();
    expect(state.isOverride("Logger")).toBe(false);
    expect(state.isOverride("NonExistent")).toBe(false);
  });

  it("child container has overridePorts for override adapters", () => {
    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const parentGraph = GraphBuilder.create().provide(loggerAdapter).build();
    const parent = createContainer({ graph: parentGraph, name: "Parent" });

    // Create child with override
    const mockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const childGraph = GraphBuilder.forParent(parentGraph).override(mockLoggerAdapter).build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const childState = child[INTERNAL_ACCESS]();
    expect(childState.overridePorts.has("Logger")).toBe(true);
    expect(childState.isOverride("Logger")).toBe(true);
  });

  it("child container INTERNAL_ACCESS provides inheritanceModes", () => {
    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const parentGraph = GraphBuilder.create().provide(loggerAdapter).build();
    const parent = createContainer({ graph: parentGraph, name: "Parent" });

    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const childState = child[INTERNAL_ACCESS]();
    expect(childState.inheritanceModes).toBeDefined();
    expect(childState.inheritanceModes).toBeInstanceOf(Map);
  });

  it("child containers array populated on parent", () => {
    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(loggerAdapter).build();
    const parent = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().build();
    parent.createChild(childGraph, { name: "Child1" });
    parent.createChild(childGraph, { name: "Child2" });

    const state = parent[INTERNAL_ACCESS]();
    expect(state.childContainers).toHaveLength(2);
  });
});
