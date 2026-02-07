/**
 * Tests for inspection summary mode (RUN-01 requirement).
 *
 * Summary mode provides a lightweight 7-field view for quick health checks,
 * vs the full 15+ field GraphInspection for detailed debugging.
 */
import { describe, it, expect } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";
import { inspectGraph } from "../src/graph/inspection/index.js";
import type { GraphSummary, GraphInspection } from "../src/graph/types/inspection.js";

// =============================================================================
// Test Fixtures
// =============================================================================

const LoggerPort = port<{ log: (msg: string) => void }>()({ name: "Logger" });
const DatabasePort = port<{ query: () => string }>()({ name: "Database" });
const CachePort = port<{ get: (key: string) => string }>()({ name: "Cache" });
const UserServicePort = port<{ getUser: (id: string) => object }>()({
  name: "UserService",
});
const MissingPort = port<{ missing: () => void }>()({ name: "MissingDep" });

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [] as const,
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [LoggerPort] as const,
  lifetime: "scoped",
  factory: () => ({ query: () => "result" }),
});

const CacheAdapter = createAdapter({
  provides: CachePort,
  requires: [LoggerPort] as const,
  lifetime: "transient",
  factory: () => ({ get: () => "value" }),
});

const _UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort] as const,
  lifetime: "scoped",
  factory: () => ({ getUser: () => ({}) }),
});

// Async adapter for testing asyncAdapterCount
const AsyncLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [] as const,
  lifetime: "singleton",
  factory: async () => ({ log: () => {} }),
});

// Adapter with missing dependency
const IncompleteAdapter = createAdapter({
  provides: CachePort,
  requires: [MissingPort] as const,
  lifetime: "transient",
  factory: () => ({ get: () => "value" }),
});

// =============================================================================
// Default Behavior Tests (No Options)
// =============================================================================

describe("Default inspect() behavior", () => {
  it("returns full GraphInspection when no options provided", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter);

    const inspection = builder.inspect();

    // Full inspection should have many more fields
    expect(inspection).toHaveProperty("adapterCount");
    expect(inspection).toHaveProperty("provides");
    expect(inspection).toHaveProperty("unsatisfiedRequirements");
    expect(inspection).toHaveProperty("dependencyMap");
    expect(inspection).toHaveProperty("overrides");
    expect(inspection).toHaveProperty("maxChainDepth");
    expect(inspection).toHaveProperty("summary");
    expect(inspection).toHaveProperty("isComplete");
    expect(inspection).toHaveProperty("suggestions");
    expect(inspection).toHaveProperty("orphanPorts");
    expect(inspection).toHaveProperty("disposalWarnings");
    expect(inspection).toHaveProperty("typeComplexityScore");
    expect(inspection).toHaveProperty("performanceRecommendation");
    expect(inspection).toHaveProperty("portsWithFinalizers");
    expect(inspection).toHaveProperty("correlationId");
    expect(inspection).toHaveProperty("ports");
    expect(inspection).toHaveProperty("directionSummary");
  });

  it("returns full GraphInspection when options is empty object", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);

    const inspection = builder.inspect({});

    // Should have full inspection fields
    expect(inspection).toHaveProperty("dependencyMap");
    expect(inspection).toHaveProperty("correlationId");
  });

  it("returns full GraphInspection when summary is false", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);

    const inspection = builder.inspect({ summary: false });

    // Should have full inspection fields
    expect(inspection).toHaveProperty("dependencyMap");
    expect(inspection).toHaveProperty("correlationId");
  });
});

// =============================================================================
// Summary Mode Tests
// =============================================================================

describe("Summary mode { summary: true }", () => {
  it("returns GraphSummary with exactly 7 fields", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter);

    const summary = builder.inspect({ summary: true });

    // Should have exactly 7 fields
    const keys = Object.keys(summary);
    expect(keys).toHaveLength(7);

    // All 7 required fields
    expect(summary).toHaveProperty("adapterCount");
    expect(summary).toHaveProperty("asyncAdapterCount");
    expect(summary).toHaveProperty("isComplete");
    expect(summary).toHaveProperty("missingPorts");
    expect(summary).toHaveProperty("isValid");
    expect(summary).toHaveProperty("errors");
    expect(summary).toHaveProperty("provides");
  });

  it("should NOT have full inspection fields in summary mode", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter);

    const summary = builder.inspect({ summary: true });

    // Summary should NOT have these full inspection fields
    expect(summary).not.toHaveProperty("dependencyMap");
    expect(summary).not.toHaveProperty("correlationId");
    expect(summary).not.toHaveProperty("suggestions");
    expect(summary).not.toHaveProperty("orphanPorts");
    expect(summary).not.toHaveProperty("summary"); // The human-readable summary string
    expect(summary).not.toHaveProperty("maxChainDepth");
  });
});

// =============================================================================
// Summary Field Value Tests
// =============================================================================

describe("Summary field values", () => {
  describe("adapterCount", () => {
    it("matches graph.adapters.length", () => {
      const builder = GraphBuilder.create()
        .provide(LoggerAdapter)
        .provide(DatabaseAdapter)
        .provide(CacheAdapter);

      const summary = builder.inspect({ summary: true });

      expect(summary.adapterCount).toBe(3);
      expect(summary.adapterCount).toBe(builder.adapters.length);
    });

    it("is 0 for empty graph", () => {
      const builder = GraphBuilder.create();
      const summary = builder.inspect({ summary: true });

      expect(summary.adapterCount).toBe(0);
    });
  });

  describe("asyncAdapterCount", () => {
    it("counts async factories correctly", () => {
      const builder = GraphBuilder.create().provide(AsyncLoggerAdapter).provide(DatabaseAdapter);

      const summary = builder.inspect({ summary: true });

      expect(summary.asyncAdapterCount).toBe(1);
    });

    it("is 0 when no async adapters", () => {
      const builder = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter);

      const summary = builder.inspect({ summary: true });

      expect(summary.asyncAdapterCount).toBe(0);
    });
  });

  describe("isComplete", () => {
    it("is true when all dependencies satisfied", () => {
      const builder = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter);

      const summary = builder.inspect({ summary: true });

      expect(summary.isComplete).toBe(true);
    });

    it("is false when ports are missing", () => {
      const builder = GraphBuilder.create().provide(IncompleteAdapter);

      const summary = builder.inspect({ summary: true });

      expect(summary.isComplete).toBe(false);
    });
  });

  describe("missingPorts", () => {
    it("lists unregistered required ports", () => {
      const builder = GraphBuilder.create().provide(IncompleteAdapter);

      const summary = builder.inspect({ summary: true });

      expect(summary.missingPorts).toContain("MissingDep");
    });

    it("is empty array when complete", () => {
      const builder = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter);

      const summary = builder.inspect({ summary: true });

      expect(summary.missingPorts).toEqual([]);
    });

    it("is sorted alphabetically", () => {
      // Create adapters that require multiple missing ports
      const PortA = port<unknown>()({ name: "ZZZ" });
      const PortB = port<unknown>()({ name: "AAA" });
      const PortC = port<unknown>()({ name: "MMM" });
      const PortD = port<unknown>()({ name: "Output" });

      const MultiDepAdapter = createAdapter({
        provides: PortD,
        requires: [PortA, PortB, PortC] as const,
        lifetime: "singleton",
        factory: () => ({}),
      });

      const builder = GraphBuilder.create().provide(MultiDepAdapter);
      const summary = builder.inspect({ summary: true });

      expect(summary.missingPorts).toEqual(["AAA", "MMM", "ZZZ"]);
    });
  });

  describe("isValid", () => {
    it("is true when complete with no errors", () => {
      const builder = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter);

      const summary = builder.inspect({ summary: true });

      expect(summary.isValid).toBe(true);
      expect(summary.isComplete).toBe(true);
      expect(summary.errors).toEqual([]);
    });

    it("is false when not complete", () => {
      const builder = GraphBuilder.create().provide(IncompleteAdapter);

      const summary = builder.inspect({ summary: true });

      expect(summary.isValid).toBe(false);
      expect(summary.isComplete).toBe(false);
    });
  });

  describe("errors", () => {
    it("contains validation errors for missing adapters", () => {
      const builder = GraphBuilder.create().provide(IncompleteAdapter);

      const summary = builder.inspect({ summary: true });

      expect(summary.errors.length).toBeGreaterThan(0);
      expect(summary.errors[0]).toContain("Missing adapters");
      expect(summary.errors[0]).toContain("MissingDep");
    });

    it("is empty for valid graphs", () => {
      const builder = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter);

      const summary = builder.inspect({ summary: true });

      expect(summary.errors).toEqual([]);
    });
  });

  describe("provides", () => {
    it("lists all provided port names", () => {
      const builder = GraphBuilder.create()
        .provide(LoggerAdapter)
        .provide(DatabaseAdapter)
        .provide(CacheAdapter);

      const summary = builder.inspect({ summary: true });

      expect(summary.provides).toContain("Logger");
      expect(summary.provides).toContain("Database");
      expect(summary.provides).toContain("Cache");
      expect(summary.provides).toHaveLength(3);
    });

    it("does NOT include lifetime info (unlike full inspection)", () => {
      const builder = GraphBuilder.create().provide(LoggerAdapter);

      const summary = builder.inspect({ summary: true });

      // Summary provides: just port names
      expect(summary.provides[0]).toBe("Logger");
      expect(summary.provides[0]).not.toContain("singleton");

      // Full inspection provides: port name with lifetime
      const full = builder.inspect();
      expect(full.provides[0]).toBe("Logger (singleton)");
    });
  });
});

// =============================================================================
// Summary Object Immutability Tests
// =============================================================================

describe("Summary object immutability", () => {
  it("summary object is frozen", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);
    const summary = builder.inspect({ summary: true });

    expect(Object.isFrozen(summary)).toBe(true);
  });

  it("missingPorts array is frozen", () => {
    const builder = GraphBuilder.create().provide(IncompleteAdapter);
    const summary = builder.inspect({ summary: true });

    expect(Object.isFrozen(summary.missingPorts)).toBe(true);
  });

  it("errors array is frozen", () => {
    const builder = GraphBuilder.create().provide(IncompleteAdapter);
    const summary = builder.inspect({ summary: true });

    expect(Object.isFrozen(summary.errors)).toBe(true);
  });

  it("provides array is frozen", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);
    const summary = builder.inspect({ summary: true });

    expect(Object.isFrozen(summary.provides)).toBe(true);
  });
});

// =============================================================================
// Backward Compatibility Tests
// =============================================================================

describe("Backward compatibility", () => {
  it("existing code without options continues to work", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter);

    // This should compile and return GraphInspection
    const inspection = builder.inspect();

    // Should have full inspection properties
    expect(inspection.adapterCount).toBe(2);
    expect(inspection.isComplete).toBe(true);
    expect(inspection.summary).toContain("Graph(2 adapters");
    expect(inspection.dependencyMap).toBeDefined();
  });

  it("inspect() with no args returns same result as before", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);

    const inspection = builder.inspect();

    // Verify it's a full GraphInspection by checking unique properties
    expect(typeof inspection.correlationId).toBe("string");
    expect(typeof inspection.maxChainDepth).toBe("number");
    expect(Array.isArray(inspection.suggestions)).toBe(true);
  });
});

// =============================================================================
// inspectGraph() Direct Usage Tests
// =============================================================================

describe("inspectGraph() direct usage", () => {
  it("inspectGraph with { summary: true } returns GraphSummary", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter);

    const summary = inspectGraph(
      {
        adapters: builder.adapters,
        overridePortNames: builder.overridePortNames,
      },
      { summary: true }
    );

    expect(Object.keys(summary)).toHaveLength(7);
    expect(summary.adapterCount).toBe(2);
    expect(summary.isValid).toBe(true);
  });

  it("inspectGraph without options returns GraphInspection", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);

    const inspection = inspectGraph({
      adapters: builder.adapters,
      overridePortNames: builder.overridePortNames,
    });

    expect(inspection).toHaveProperty("correlationId");
    expect(inspection).toHaveProperty("dependencyMap");
  });
});

// =============================================================================
// Type Safety Tests (Compile-Time)
// =============================================================================

describe("Type safety", () => {
  it("summary mode return type is GraphSummary", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);

    // TypeScript should infer this as GraphSummary
    const summary: GraphSummary = builder.inspect({ summary: true });

    // If we got here, types are correct
    expect(summary.isValid).toBeDefined();
  });

  it("default mode return type is GraphInspection", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);

    // TypeScript should infer this as GraphInspection
    const inspection: GraphInspection = builder.inspect();

    // If we got here, types are correct
    expect(inspection.correlationId).toBeDefined();
  });
});
