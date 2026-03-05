/**
 * Tests for initialization order computation (TG-16).
 *
 * Covers:
 * - 16.1: Stable topological sort via computeInitializationOrder
 * - 16.2: initializationOrder exposed via inspectGraph
 * - 16.4: Comprehensive test cases
 */

import { describe, it, expect } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import type { AdapterConstraint } from "@hex-di/core";
import { GraphBuilder } from "../src/builder/builder.js";
import { computeInitializationOrder } from "../src/graph/inspection/init-order.js";
import { inspectGraph } from "../src/graph/inspection/inspector.js";
import type { InspectableGraph } from "../src/graph/types/inspection.js";

// =============================================================================
// Test Ports
// =============================================================================

interface Config {
  dbUrl: string;
}
interface Database {
  query(sql: string): void;
}
interface Cache {
  get(key: string): string | null;
}
interface Logger {
  log(msg: string): void;
}
interface UserService {
  find(id: string): void;
}
interface OrderService {
  create(): void;
}

const ConfigPort = port<Config>()({ name: "Config" });
const DatabasePort = port<Database>()({ name: "Database" });
const CachePort = port<Cache>()({ name: "Cache" });
const LoggerPort = port<Logger>()({ name: "Logger" });
const UserServicePort = port<UserService>()({ name: "UserService" });
const OrderServicePort = port<OrderService>()({ name: "OrderService" });

// =============================================================================
// Adapters
// =============================================================================

const configAdapter = createAdapter({
  provides: ConfigPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ dbUrl: "localhost" }),
});

const loggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const databaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [ConfigPort],
  lifetime: "singleton",
  factory: () => ({ query: () => {} }),
});

const cacheAdapter = createAdapter({
  provides: CachePort,
  requires: [ConfigPort],
  lifetime: "singleton",
  factory: () => ({ get: () => null }),
});

const userServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [DatabasePort, CachePort],
  lifetime: "scoped",
  factory: () => ({ find: () => {} }),
});

const orderServiceAdapter = createAdapter({
  provides: OrderServicePort,
  requires: [UserServicePort, LoggerPort],
  lifetime: "scoped",
  factory: () => ({ create: () => {} }),
});

/**
 * Helper to create an InspectableGraph from a builder.
 */
function toInspectable(builder: {
  adapters: readonly AdapterConstraint[];
  overridePortNames: ReadonlySet<string>;
}): InspectableGraph {
  return {
    adapters: builder.adapters,
    overridePortNames: builder.overridePortNames,
  };
}

// Cycle test service interfaces
interface CycleServiceA {
  doA(): void;
}
interface CycleServiceB {
  doB(): void;
}
interface CycleServiceC {
  doC(): void;
}

// Cycle test ports
const CycleAPort = port<CycleServiceA>()({ name: "CycleA" });
const CycleBPort = port<CycleServiceB>()({ name: "CycleB" });
const CycleCPort = port<CycleServiceC>()({ name: "CycleC" });

// Cycle adapters: CycleA -> CycleC, CycleB -> CycleA, CycleC -> CycleB
const cycleAAdapter = createAdapter({
  provides: CycleAPort,
  requires: [CycleCPort],
  lifetime: "singleton",
  factory: () => ({ doA() {} }),
});

const cycleBAdapter = createAdapter({
  provides: CycleBPort,
  requires: [CycleAPort],
  lifetime: "singleton",
  factory: () => ({ doB() {} }),
});

const cycleCAdapter = createAdapter({
  provides: CycleCPort,
  requires: [CycleBPort],
  lifetime: "singleton",
  factory: () => ({ doC() {} }),
});

// =============================================================================
// 16.1: computeInitializationOrder
// =============================================================================

describe("16.1: computeInitializationOrder", () => {
  it("returns empty array for empty adapter list", () => {
    const result = computeInitializationOrder([]);
    expect(result).toEqual([]);
  });

  it("returns single level for adapters with no dependencies", () => {
    const result = computeInitializationOrder([configAdapter, loggerAdapter]);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    // Both are independent, so they appear in the same level
    expect(result![0]).toContain("Config");
    expect(result![0]).toContain("Logger");
  });

  it("computes correct levels for linear dependency chain", () => {
    const result = computeInitializationOrder([
      configAdapter,
      databaseAdapter,
      cacheAdapter,
      userServiceAdapter,
    ]);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(3);

    // Level 0: Config (no deps)
    expect(result![0]).toEqual(["Config"]);

    // Level 1: Database and Cache (depend only on Config)
    expect(result![1]).toContain("Database");
    expect(result![1]).toContain("Cache");

    // Level 2: UserService (depends on Database and Cache)
    expect(result![2]).toEqual(["UserService"]);
  });

  it("computes correct levels for diamond dependency", () => {
    const result = computeInitializationOrder([
      configAdapter,
      databaseAdapter,
      cacheAdapter,
      userServiceAdapter,
    ]);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(3);
    expect(result![0]).toEqual(["Config"]);
    expect(result![1]).toHaveLength(2);
    expect(result![2]).toEqual(["UserService"]);
  });

  it("uses registration order for tie-breaking within levels", () => {
    // Register Database before Cache
    const result1 = computeInitializationOrder([
      configAdapter,
      databaseAdapter,
      cacheAdapter,
      userServiceAdapter,
    ]);

    expect(result1).not.toBeNull();
    expect(result1![1]).toEqual(["Database", "Cache"]);

    // Register Cache before Database
    const result2 = computeInitializationOrder([
      configAdapter,
      cacheAdapter,
      databaseAdapter,
      userServiceAdapter,
    ]);

    expect(result2).not.toBeNull();
    expect(result2![1]).toEqual(["Cache", "Database"]);
  });

  it("handles complex multi-level graph", () => {
    const result = computeInitializationOrder([
      configAdapter,
      loggerAdapter,
      databaseAdapter,
      cacheAdapter,
      userServiceAdapter,
      orderServiceAdapter,
    ]);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(4);

    // Level 0: Config and Logger (no internal deps)
    expect(result![0]).toContain("Config");
    expect(result![0]).toContain("Logger");

    // Level 1: Database and Cache (depend on Config)
    expect(result![1]).toContain("Database");
    expect(result![1]).toContain("Cache");

    // Level 2: UserService (depends on Database and Cache)
    expect(result![2]).toEqual(["UserService"]);

    // Level 3: OrderService (depends on UserService and Logger)
    expect(result![3]).toEqual(["OrderService"]);
  });

  it("produces a flat order where every port appears after its dependencies", () => {
    const result = computeInitializationOrder([
      configAdapter,
      loggerAdapter,
      databaseAdapter,
      cacheAdapter,
      userServiceAdapter,
      orderServiceAdapter,
    ]);

    expect(result).not.toBeNull();

    // Flatten the levels into a single ordered array
    const flatOrder = result!.flatMap(level => [...level]);

    // Build a position index
    const position = new Map<string, number>();
    flatOrder.forEach((name, idx) => position.set(name, idx));

    // Verify: every dependency appears before its dependent
    const depMap: Record<string, string[]> = {
      Config: [],
      Logger: [],
      Database: ["Config"],
      Cache: ["Config"],
      UserService: ["Database", "Cache"],
      OrderService: ["UserService", "Logger"],
    };

    for (const [portName, deps] of Object.entries(depMap)) {
      for (const dep of deps) {
        const portPos = position.get(portName);
        const depPos = position.get(dep);
        expect(portPos).toBeDefined();
        expect(depPos).toBeDefined();
        expect(depPos!).toBeLessThan(portPos!);
      }
    }
  });

  it("returns null for cyclic dependencies", () => {
    const result = computeInitializationOrder([cycleAAdapter, cycleBAdapter, cycleCAdapter]);
    expect(result).toBeNull();
  });

  it("is a frozen (immutable) result", () => {
    const result = computeInitializationOrder([configAdapter, databaseAdapter]);
    expect(result).not.toBeNull();
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result![0])).toBe(true);
    expect(Object.isFrozen(result![1])).toBe(true);
  });

  it("handles external dependencies gracefully (only internal ports counted)", () => {
    // Database requires Config, but Config is not provided
    const result = computeInitializationOrder([databaseAdapter]);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0]).toEqual(["Database"]);
  });
});

// =============================================================================
// 16.2: initializationOrder in GraphInspection
// =============================================================================

describe("16.2: initializationOrder in GraphInspection", () => {
  it("is included in inspectGraph result", () => {
    const builder = GraphBuilder.create()
      .provide(configAdapter)
      .provide(loggerAdapter)
      .provide(databaseAdapter)
      .provide(cacheAdapter)
      .provide(userServiceAdapter);

    const inspection = inspectGraph(toInspectable(builder));

    expect(inspection.initializationOrder).toBeDefined();
    expect(Array.isArray(inspection.initializationOrder)).toBe(true);
    expect(inspection.initializationOrder.length).toBeGreaterThan(0);
  });

  it("has correct structure: array of arrays of strings", () => {
    const builder = GraphBuilder.create().provide(configAdapter).provide(databaseAdapter);

    const inspection = inspectGraph(toInspectable(builder));

    for (const level of inspection.initializationOrder) {
      expect(Array.isArray(level)).toBe(true);
      for (const portName of level) {
        expect(typeof portName).toBe("string");
      }
    }
  });

  it("matches the expected levels for a simple graph", () => {
    const builder = GraphBuilder.create()
      .provide(configAdapter)
      .provide(databaseAdapter)
      .provide(cacheAdapter)
      .provide(userServiceAdapter);

    const inspection = inspectGraph(toInspectable(builder));

    expect(inspection.initializationOrder).toHaveLength(3);
    expect(inspection.initializationOrder[0]).toEqual(["Config"]);
    expect(inspection.initializationOrder[1]).toContain("Database");
    expect(inspection.initializationOrder[1]).toContain("Cache");
    expect(inspection.initializationOrder[2]).toEqual(["UserService"]);
  });

  it("returns empty array for empty graph", () => {
    const builder = GraphBuilder.create();
    const inspection = inspectGraph(toInspectable(builder));
    expect(inspection.initializationOrder).toEqual([]);
  });

  it("is included in JSON-serialized output", () => {
    const builder = GraphBuilder.create().provide(configAdapter).provide(databaseAdapter);

    const inspection = inspectGraph(toInspectable(builder));
    const json = JSON.parse(JSON.stringify(inspection));
    expect(json.initializationOrder).toBeDefined();
    expect(json.initializationOrder).toHaveLength(2);
  });

  it("includes all provided ports exactly once", () => {
    const builder = GraphBuilder.create()
      .provide(configAdapter)
      .provide(loggerAdapter)
      .provide(databaseAdapter)
      .provide(cacheAdapter)
      .provide(userServiceAdapter)
      .provide(orderServiceAdapter);

    const inspection = inspectGraph(toInspectable(builder));
    const allPorts = inspection.initializationOrder.flatMap(level => [...level]);

    expect(allPorts).toHaveLength(6);
    expect(new Set(allPorts).size).toBe(6);
    expect(allPorts).toContain("Config");
    expect(allPorts).toContain("Logger");
    expect(allPorts).toContain("Database");
    expect(allPorts).toContain("Cache");
    expect(allPorts).toContain("UserService");
    expect(allPorts).toContain("OrderService");
  });
});

// =============================================================================
// Stability and determinism
// =============================================================================

describe("16.1: Stability guarantees", () => {
  it("produces identical output for the same registration order", () => {
    const order1 = computeInitializationOrder([
      configAdapter,
      loggerAdapter,
      databaseAdapter,
      cacheAdapter,
      userServiceAdapter,
    ]);

    const order2 = computeInitializationOrder([
      configAdapter,
      loggerAdapter,
      databaseAdapter,
      cacheAdapter,
      userServiceAdapter,
    ]);

    expect(order1).toEqual(order2);
  });

  it("produces deterministic output regardless of number of calls", () => {
    const results = Array.from({ length: 10 }, () =>
      computeInitializationOrder([
        configAdapter,
        loggerAdapter,
        databaseAdapter,
        cacheAdapter,
        userServiceAdapter,
        orderServiceAdapter,
      ])
    );

    for (let i = 1; i < results.length; i++) {
      expect(results[i]).toEqual(results[0]);
    }
  });
});
