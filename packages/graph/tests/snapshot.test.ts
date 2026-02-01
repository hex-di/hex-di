/**
 * Comprehensive Snapshot Test Suite
 *
 * These tests use snapshots to catch unintended changes to:
 * 1. Inspection output format
 * 2. Error message formatting
 * 3. Adapter/Graph structure
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { createPort, createAdapter, createAsyncAdapter } from "@hex-di/core";
import { parseGraphError } from "../src/advanced.js";
import { GraphBuilder } from "../src/index.js";
import { inspectGraph, GraphErrorCode } from "../src/advanced.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(msg: string): void;
}
interface Database {
  query(sql: string): Promise<unknown>;
}
interface Cache {
  get(key: string): unknown;
}
interface UserService {
  getUser(id: string): Promise<object>;
}
interface Config {
  get(key: string): string;
}

const LoggerPort = createPort<Logger>({ name: "Logger" });
const DatabasePort = createPort<Database>({ name: "Database" });
const CachePort = createPort<Cache>({ name: "Cache" });
const UserServicePort = createPort<UserService>({ name: "UserService" });
const ConfigPort = createPort<Config>({ name: "Config" });

// =============================================================================
// GraphInspection Output Snapshots
// =============================================================================

describe("GraphInspection output snapshots", () => {
  it("snapshot: empty builder inspection", () => {
    const builder = GraphBuilder.create();
    const inspection = builder.inspect();

    // Exclude correlationId from snapshot (it's randomly generated)
    const { correlationId: _correlationId, ...deterministicFields } = inspection;
    expect(deterministicFields).toMatchInlineSnapshot(`
      {
        "adapterCount": 0,
        "dependencyMap": {},
        "depthLimitExceeded": false,
        "depthWarning": undefined,
        "disposalWarnings": [],
        "isComplete": true,
        "maxChainDepth": 0,
        "orphanPorts": [],
        "overrides": [],
        "performanceRecommendation": "safe",
        "portsWithFinalizers": [],
        "provides": [],
        "suggestions": [],
        "summary": "Graph(0 adapters, 0 unsatisfied): ",
        "typeComplexityScore": 0,
        "unnecessaryLazyPorts": [],
        "unsatisfiedRequirements": [],
      }
    `);
    // Verify correlationId format separately
    expect(inspection.correlationId).toMatch(/^insp_\d+_[a-z0-9]+$/);
  });

  it("snapshot: single adapter builder inspection", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const inspection = GraphBuilder.create().provide(LoggerAdapter).inspect();

    // Exclude correlationId from snapshot (it's randomly generated)
    const { correlationId: _correlationId, ...deterministicFields } = inspection;
    expect(deterministicFields).toMatchInlineSnapshot(`
      {
        "adapterCount": 1,
        "dependencyMap": {
          "Logger": [],
        },
        "depthLimitExceeded": false,
        "depthWarning": undefined,
        "disposalWarnings": [],
        "isComplete": true,
        "maxChainDepth": 0,
        "orphanPorts": [
          "Logger",
        ],
        "overrides": [],
        "performanceRecommendation": "safe",
        "portsWithFinalizers": [],
        "provides": [
          "Logger (singleton)",
        ],
        "suggestions": [
          {
            "action": "Verify 'Logger' is an intended entry point, or remove the adapter if unused.",
            "message": "Port 'Logger' is provided but not required by any other adapter.",
            "portName": "Logger",
            "type": "orphan_port",
          },
        ],
        "summary": "Graph(1 adapters, 0 unsatisfied): Logger",
        "typeComplexityScore": 1,
        "unnecessaryLazyPorts": [],
        "unsatisfiedRequirements": [],
      }
    `);
  });

  it("snapshot: incomplete graph inspection with suggestions", () => {
    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [LoggerPort],
      lifetime: "scoped",
      factory: () => ({ query: async () => ({}) }),
    });

    const inspection = GraphBuilder.create().provide(DatabaseAdapter).inspect();

    // Exclude correlationId from snapshot (it's randomly generated)
    const { correlationId: _correlationId, ...deterministicFields } = inspection;
    expect(deterministicFields).toMatchInlineSnapshot(`
      {
        "adapterCount": 1,
        "dependencyMap": {
          "Database": [
            "Logger",
          ],
        },
        "depthLimitExceeded": false,
        "depthWarning": undefined,
        "disposalWarnings": [],
        "isComplete": false,
        "maxChainDepth": 1,
        "orphanPorts": [
          "Database",
        ],
        "overrides": [],
        "performanceRecommendation": "safe",
        "portsWithFinalizers": [],
        "provides": [
          "Database (scoped)",
        ],
        "suggestions": [
          {
            "action": "Add an adapter that provides 'Logger' using .provide(LoggerAdapter).",
            "message": "Port 'Logger' is required by Database but has no adapter.",
            "portName": "Logger",
            "type": "missing_adapter",
          },
        ],
        "summary": "Graph(1 adapters, 1 unsatisfied): Database. Missing: Logger",
        "typeComplexityScore": 4,
        "unnecessaryLazyPorts": [],
        "unsatisfiedRequirements": [
          "Logger",
        ],
      }
    `);
  });

  it("snapshot: complex graph inspection", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [LoggerPort],
      lifetime: "scoped",
      factory: () => ({ query: async () => ({}) }),
    });

    const CacheAdapter = createAdapter({
      provides: CachePort,
      requires: [LoggerPort],
      lifetime: "singleton",
      factory: () => ({ get: () => ({}) }),
    });

    const UserServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [DatabasePort, CachePort],
      lifetime: "transient",
      factory: () => ({ getUser: async () => ({}) }),
    });

    const inspection = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(CacheAdapter)
      .provide(UserServiceAdapter)
      .inspect();

    // Exclude correlationId from snapshot (it's randomly generated)
    const { correlationId: _correlationId, ...deterministicFields } = inspection;
    expect(deterministicFields).toMatchInlineSnapshot(`
      {
        "adapterCount": 4,
        "dependencyMap": {
          "Cache": [
            "Logger",
          ],
          "Database": [
            "Logger",
          ],
          "Logger": [],
          "UserService": [
            "Database",
            "Cache",
          ],
        },
        "depthLimitExceeded": false,
        "depthWarning": undefined,
        "disposalWarnings": [],
        "isComplete": true,
        "maxChainDepth": 2,
        "orphanPorts": [
          "UserService",
        ],
        "overrides": [],
        "performanceRecommendation": "safe",
        "portsWithFinalizers": [],
        "provides": [
          "Logger (singleton)",
          "Database (scoped)",
          "Cache (singleton)",
          "UserService (transient)",
        ],
        "suggestions": [
          {
            "action": "Verify 'UserService' is an intended entry point, or remove the adapter if unused.",
            "message": "Port 'UserService' is provided but not required by any other adapter.",
            "portName": "UserService",
            "type": "orphan_port",
          },
        ],
        "summary": "Graph(4 adapters, 0 unsatisfied): Logger, Database, Cache, UserService",
        "typeComplexityScore": 14,
        "unnecessaryLazyPorts": [],
        "unsatisfiedRequirements": [],
      }
    `);
  });

  it("snapshot: graph with async adapters inspection", () => {
    const AsyncConfigAdapter = createAsyncAdapter({
      provides: ConfigPort,
      requires: [],
      factory: async () => ({ get: () => "" }),
    });

    const AsyncDatabaseAdapter = createAsyncAdapter({
      provides: DatabasePort,
      requires: [ConfigPort],
      factory: async () => ({ query: async () => ({}) }),
    });

    const inspection = GraphBuilder.create()
      .provide(AsyncConfigAdapter)
      .provide(AsyncDatabaseAdapter)
      .inspect();

    // Exclude correlationId from snapshot (it's randomly generated)
    const { correlationId: _correlationId, ...deterministicFields } = inspection;
    expect(deterministicFields).toMatchInlineSnapshot(`
      {
        "adapterCount": 2,
        "dependencyMap": {
          "Config": [],
          "Database": [
            "Config",
          ],
        },
        "depthLimitExceeded": false,
        "depthWarning": undefined,
        "disposalWarnings": [],
        "isComplete": true,
        "maxChainDepth": 1,
        "orphanPorts": [
          "Database",
        ],
        "overrides": [],
        "performanceRecommendation": "safe",
        "portsWithFinalizers": [],
        "provides": [
          "Config (singleton)",
          "Database (singleton)",
        ],
        "suggestions": [
          {
            "action": "Verify 'Database' is an intended entry point, or remove the adapter if unused.",
            "message": "Port 'Database' is provided but not required by any other adapter.",
            "portName": "Database",
            "type": "orphan_port",
          },
        ],
        "summary": "Graph(2 adapters, 0 unsatisfied): Config, Database",
        "typeComplexityScore": 5,
        "unnecessaryLazyPorts": [],
        "unsatisfiedRequirements": [],
      }
    `);
  });
});

// =============================================================================
// inspectGraph() Output Snapshots
// =============================================================================

describe("inspectGraph() output snapshots", () => {
  it("snapshot: built graph inspection", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [LoggerPort],
      lifetime: "scoped",
      factory: () => ({ query: async () => ({}) }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();

    const info = inspectGraph(graph);

    // Exclude correlationId from snapshot (it's randomly generated)
    const { correlationId: _correlationId, ...deterministicFields } = info;
    expect(deterministicFields).toMatchInlineSnapshot(`
      {
        "adapterCount": 2,
        "dependencyMap": {
          "Database": [
            "Logger",
          ],
          "Logger": [],
        },
        "depthLimitExceeded": false,
        "depthWarning": undefined,
        "disposalWarnings": [],
        "isComplete": true,
        "maxChainDepth": 1,
        "orphanPorts": [
          "Database",
        ],
        "overrides": [],
        "performanceRecommendation": "safe",
        "portsWithFinalizers": [],
        "provides": [
          "Logger (singleton)",
          "Database (scoped)",
        ],
        "suggestions": [
          {
            "action": "Verify 'Database' is an intended entry point, or remove the adapter if unused.",
            "message": "Port 'Database' is provided but not required by any other adapter.",
            "portName": "Database",
            "type": "orphan_port",
          },
        ],
        "summary": "Graph(2 adapters, 0 unsatisfied): Logger, Database",
        "typeComplexityScore": 5,
        "unnecessaryLazyPorts": [],
        "unsatisfiedRequirements": [],
      }
    `);
  });

  it("snapshot: fragment inspection with missing dependencies", () => {
    const UserServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [DatabasePort, CachePort],
      lifetime: "transient",
      factory: () => ({ getUser: async () => ({}) }),
    });

    const fragment = GraphBuilder.create().provide(UserServiceAdapter).buildFragment();

    const info = inspectGraph(fragment);

    // Exclude correlationId from snapshot (it's randomly generated)
    const { correlationId: _correlationId, ...deterministicFields } = info;
    expect(deterministicFields).toMatchInlineSnapshot(`
      {
        "adapterCount": 1,
        "dependencyMap": {
          "UserService": [
            "Database",
            "Cache",
          ],
        },
        "depthLimitExceeded": false,
        "depthWarning": undefined,
        "disposalWarnings": [],
        "isComplete": false,
        "maxChainDepth": 1,
        "orphanPorts": [
          "UserService",
        ],
        "overrides": [],
        "performanceRecommendation": "safe",
        "portsWithFinalizers": [],
        "provides": [
          "UserService (transient)",
        ],
        "suggestions": [
          {
            "action": "Add an adapter that provides 'Cache' using .provide(CacheAdapter).",
            "message": "Port 'Cache' is required by UserService but has no adapter.",
            "portName": "Cache",
            "type": "missing_adapter",
          },
          {
            "action": "Add an adapter that provides 'Database' using .provide(DatabaseAdapter).",
            "message": "Port 'Database' is required by UserService but has no adapter.",
            "portName": "Database",
            "type": "missing_adapter",
          },
        ],
        "summary": "Graph(1 adapters, 2 unsatisfied): UserService. Missing: Cache, Database",
        "typeComplexityScore": 4,
        "unnecessaryLazyPorts": [],
        "unsatisfiedRequirements": [
          "Cache",
          "Database",
        ],
      }
    `);
  });
});

// =============================================================================
// parseGraphError() Output Snapshots
// =============================================================================

describe("parseGraphError() output snapshots", () => {
  it("snapshot: duplicate adapter error parsing", () => {
    const errorMsg =
      "ERROR[HEX001]: Duplicate adapter for 'Logger'. Fix: Remove one .provide() call, or use .override() for child graphs.";

    const parsed = parseGraphError(errorMsg);

    expect(parsed).toMatchInlineSnapshot(`
      {
        "code": "DUPLICATE_ADAPTER",
        "details": {
          "portName": "Logger",
        },
        "message": "ERROR[HEX001]: Duplicate adapter for 'Logger'. Fix: Remove one .provide() call, or use .override() for child graphs.",
      }
    `);
  });

  it("snapshot: circular dependency error parsing", () => {
    const errorMsg =
      "ERROR[HEX002]: Circular dependency: UserService -> Database -> UserService. Fix: Break cycle by extracting shared logic, using lazy resolution, or inverting a dependency.";

    const parsed = parseGraphError(errorMsg);

    expect(parsed).toMatchInlineSnapshot(`
      {
        "code": "CIRCULAR_DEPENDENCY",
        "details": {
          "cyclePath": "UserService -> Database -> UserService",
        },
        "message": "ERROR[HEX002]: Circular dependency: UserService -> Database -> UserService. Fix: Break cycle by extracting shared logic, using lazy resolution, or inverting a dependency.",
      }
    `);
  });

  it("snapshot: captive dependency error parsing", () => {
    const errorMsg =
      "ERROR[HEX003]: Captive dependency: Singleton 'UserCache' cannot depend on Scoped 'RequestContext'. Fix: Change 'UserCache' to Scoped/Transient, or change 'RequestContext' to Singleton.";

    const parsed = parseGraphError(errorMsg);

    expect(parsed).toMatchInlineSnapshot(`
      {
        "code": "CAPTIVE_DEPENDENCY",
        "details": {
          "captiveLifetime": "Scoped",
          "captiveName": "RequestContext",
          "dependentLifetime": "Singleton",
          "dependentName": "UserCache",
        },
        "message": "ERROR[HEX003]: Captive dependency: Singleton 'UserCache' cannot depend on Scoped 'RequestContext'. Fix: Change 'UserCache' to Scoped/Transient, or change 'RequestContext' to Singleton.",
      }
    `);
  });

  it("snapshot: missing dependency error parsing", () => {
    const errorMsg = "ERROR[HEX008]: Missing adapters for Logger, Database.";

    const parsed = parseGraphError(errorMsg);

    expect(parsed).toMatchInlineSnapshot(`
      {
        "code": "MISSING_DEPENDENCY",
        "details": {
          "missingPorts": "Logger, Database",
        },
        "message": "ERROR[HEX008]: Missing adapters for Logger, Database.",
      }
    `);
  });

  it("snapshot: lifetime inconsistency error parsing", () => {
    const errorMsg =
      "ERROR[HEX005]: Lifetime inconsistency for 'Logger': Graph A provides Singleton, Graph B provides Scoped. Fix: Use the same lifetime in both graphs, or remove one adapter before merging.";

    const parsed = parseGraphError(errorMsg);

    expect(parsed).toMatchInlineSnapshot(`
      {
        "code": "LIFETIME_INCONSISTENCY",
        "details": {
          "lifetimeA": "Singleton",
          "lifetimeB": "Scoped",
          "portName": "Logger",
        },
        "message": "ERROR[HEX005]: Lifetime inconsistency for 'Logger': Graph A provides Singleton, Graph B provides Scoped. Fix: Use the same lifetime in both graphs, or remove one adapter before merging.",
      }
    `);
  });

  it("snapshot: multiple errors parsing", () => {
    const errorMsg =
      "Multiple validation errors:\n  1. ERROR[HEX001]: Duplicate adapter for 'Logger'.\n  2. ERROR[HEX002]: Circular dependency: A -> B -> A.";

    const parsed = parseGraphError(errorMsg);

    expect(parsed).toMatchInlineSnapshot(`
      {
        "code": "MULTIPLE_ERRORS",
        "details": {
          "errorCodes": "HEX001,HEX002",
          "errorCount": "2",
        },
        "message": "Multiple validation errors:
        1. ERROR[HEX001]: Duplicate adapter for 'Logger'.
        2. ERROR[HEX002]: Circular dependency: A -> B -> A.",
      }
    `);
  });
});

// =============================================================================
// Adapter Structure Snapshots
// =============================================================================

describe("adapter structure snapshots", () => {
  it("snapshot: sync adapter structure", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    // Only check stable properties, not function references
    expect({
      lifetime: adapter.lifetime,
      factoryKind: adapter.factoryKind,
      clonable: adapter.clonable,
      hasFactory: typeof adapter.factory === "function",
      hasProvides: adapter.provides === LoggerPort,
      requiresLength: adapter.requires.length,
    }).toMatchInlineSnapshot(`
      {
        "clonable": false,
        "factoryKind": "sync",
        "hasFactory": true,
        "hasProvides": true,
        "lifetime": "singleton",
        "requiresLength": 0,
      }
    `);
  });

  it("snapshot: async adapter structure", () => {
    const adapter = createAsyncAdapter({
      provides: DatabasePort,
      requires: [LoggerPort],
      factory: async () => ({ query: async () => ({}) }),
      clonable: false,
    });

    expect({
      lifetime: adapter.lifetime,
      factoryKind: adapter.factoryKind,
      clonable: adapter.clonable,
      hasFactory: typeof adapter.factory === "function",
      hasProvides: adapter.provides === DatabasePort,
      requiresLength: adapter.requires.length,
    }).toMatchInlineSnapshot(`
      {
        "clonable": false,
        "factoryKind": "async",
        "hasFactory": true,
        "hasProvides": true,
        "lifetime": "singleton",
        "requiresLength": 1,
      }
    `);
  });

  it("snapshot: adapter with finalizer structure", () => {
    const adapter = createAsyncAdapter({
      provides: DatabasePort,
      requires: [],
      factory: async () => ({ query: async () => ({}) }),
      finalizer: async () => {},
    });

    expect({
      hasFinalizer: typeof adapter.finalizer === "function",
      factoryKind: adapter.factoryKind,
    }).toMatchInlineSnapshot(`
      {
        "factoryKind": "async",
        "hasFinalizer": true,
      }
    `);
  });
});

// =============================================================================
// GraphErrorCode Enum Snapshot
// =============================================================================

describe("GraphErrorCode enum snapshot", () => {
  it("snapshot: all error codes", () => {
    expect(GraphErrorCode).toMatchInlineSnapshot(`
      {
        "CAPTIVE_DEPENDENCY": "CAPTIVE_DEPENDENCY",
        "CIRCULAR_DEPENDENCY": "CIRCULAR_DEPENDENCY",
        "DEPTH_LIMIT_EXCEEDED": "DEPTH_LIMIT_EXCEEDED",
        "DUPLICATE_ADAPTER": "DUPLICATE_ADAPTER",
        "DUPLICATE_REQUIRES": "DUPLICATE_REQUIRES",
        "INVALID_FACTORY": "INVALID_FACTORY",
        "INVALID_FINALIZER": "INVALID_FINALIZER",
        "INVALID_LAZY_PORT": "INVALID_LAZY_PORT",
        "INVALID_LIFETIME_TYPE": "INVALID_LIFETIME_TYPE",
        "INVALID_LIFETIME_VALUE": "INVALID_LIFETIME_VALUE",
        "INVALID_PROVIDES": "INVALID_PROVIDES",
        "INVALID_REQUIRES_ELEMENT": "INVALID_REQUIRES_ELEMENT",
        "INVALID_REQUIRES_TYPE": "INVALID_REQUIRES_TYPE",
        "LIFETIME_INCONSISTENCY": "LIFETIME_INCONSISTENCY",
        "MISSING_DEPENDENCY": "MISSING_DEPENDENCY",
        "MISSING_PROVIDES": "MISSING_PROVIDES",
        "MULTIPLE_ERRORS": "MULTIPLE_ERRORS",
        "OVERRIDE_WITHOUT_PARENT": "OVERRIDE_WITHOUT_PARENT",
        "REVERSE_CAPTIVE_DEPENDENCY": "REVERSE_CAPTIVE_DEPENDENCY",
        "SELF_DEPENDENCY": "SELF_DEPENDENCY",
        "UNKNOWN_ERROR": "UNKNOWN_ERROR",
      }
    `);
  });
});
