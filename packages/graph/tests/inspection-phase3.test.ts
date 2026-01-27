/**
 * Tests for Phase 3 inspection features:
 * - Disposal order validation
 * - Performance monitoring utilities
 *
 * NOTE: Visualization tests (Mermaid/DOT) have moved to @hex-di/visualization package.
 */
import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/ports";
import {
  createAdapter,
  GraphBuilder,
  inspectionToJSON,
  detectCycleAtRuntime,
  type AdapterConstraint,
} from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

const LoggerPort = createPort<"Logger", { log: (msg: string) => void }>("Logger");
const DatabasePort = createPort<"Database", { query: () => string }>("Database");
const CachePort = createPort<"Cache", { get: (key: string) => string }>("Cache");
const UserServicePort = createPort<"UserService", { getUser: (id: string) => object }>(
  "UserService"
);

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [] as const,
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

// Adapter with finalizer
const DatabaseAdapterWithFinalizer = createAdapter({
  provides: DatabasePort,
  requires: [LoggerPort] as const,
  lifetime: "scoped",
  factory: () => ({ query: () => "result" }),
  finalizer: () => {
    // Cleanup database connections
  },
});

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort] as const,
  lifetime: "scoped",
  factory: () => ({ getUser: () => ({}) }),
});

// =============================================================================
// Disposal Order Validation Tests
// =============================================================================

describe("Disposal order validation", () => {
  it("detects when adapter with finalizer depends on adapter without finalizer", () => {
    // Database has finalizer, Logger does not
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapterWithFinalizer);

    const inspection = builder.inspect();

    expect(inspection.disposalWarnings).toHaveLength(1);
    expect(inspection.disposalWarnings[0]).toContain("Database");
    expect(inspection.disposalWarnings[0]).toContain("Logger");
    expect(inspection.disposalWarnings[0]).toContain("no finalizer");
  });

  it("reports no warnings when no finalizers exist", () => {
    // We're testing the case where no adapters have finalizers
    const SimpleCache = createAdapter({
      provides: CachePort,
      requires: [LoggerPort] as const,
      lifetime: "transient",
      factory: () => ({ get: () => "value" }),
    });

    const inspectionSimple = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(SimpleCache)
      .inspect();

    expect(inspectionSimple.disposalWarnings).toHaveLength(0);
  });

  it("tracks ports with finalizers", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapterWithFinalizer);

    const inspection = builder.inspect();

    expect(inspection.portsWithFinalizers).toContain("Database");
    expect(inspection.portsWithFinalizers).not.toContain("Logger");
  });

  it("includes disposal warnings in suggestions", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapterWithFinalizer);

    const inspection = builder.inspect();

    const disposalSuggestions = inspection.suggestions.filter(s => s.type === "disposal_warning");
    expect(disposalSuggestions).toHaveLength(1);
    expect(disposalSuggestions[0].portName).toBe("Database");
    expect(disposalSuggestions[0].action).toContain("finalizer");
  });
});

// =============================================================================
// Performance Monitoring Tests
// =============================================================================

describe("Performance monitoring", () => {
  it("computes type complexity score for empty graph", () => {
    const builder = GraphBuilder.create();
    const inspection = builder.inspect();

    expect(inspection.typeComplexityScore).toBe(0);
    expect(inspection.performanceRecommendation).toBe("safe");
  });

  it("computes type complexity score for simple graph", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapterWithFinalizer)
      .provide(UserServiceAdapter);

    const inspection = builder.inspect();

    // Simple graph should be "safe"
    expect(inspection.typeComplexityScore).toBeGreaterThan(0);
    expect(inspection.performanceRecommendation).toBe("safe");
  });

  it("returns correct performance recommendations based on score", () => {
    // We can't easily test high complexity, but we can verify the fields exist
    const builder = GraphBuilder.create().provide(LoggerAdapter);
    const inspection = builder.inspect();

    expect(typeof inspection.typeComplexityScore).toBe("number");
    expect(["safe", "monitor", "consider-splitting"]).toContain(
      inspection.performanceRecommendation
    );
  });

  it("includes complexity metrics in JSON output", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);
    const inspection = builder.inspect();
    const json = inspectionToJSON(inspection);

    expect(json.typeComplexityScore).toBe(inspection.typeComplexityScore);
    expect(json.performanceRecommendation).toBe(inspection.performanceRecommendation);
    expect(json.portsWithFinalizers).toEqual([...inspection.portsWithFinalizers]);
    expect(json.disposalWarnings).toEqual([...inspection.disposalWarnings]);
  });
});

// =============================================================================
// NOTE: Visualization tests (Mermaid/DOT) have moved to @hex-di/visualization
// =============================================================================

// =============================================================================
// Integration Tests
// =============================================================================

describe("Phase 3 integration", () => {
  it("all new fields are present in inspection", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapterWithFinalizer)
      .provide(UserServiceAdapter);

    const inspection = builder.inspect();

    // New fields from Phase 3
    expect(inspection).toHaveProperty("disposalWarnings");
    expect(inspection).toHaveProperty("typeComplexityScore");
    expect(inspection).toHaveProperty("performanceRecommendation");
    expect(inspection).toHaveProperty("portsWithFinalizers");

    // Arrays should be frozen
    expect(Object.isFrozen(inspection.disposalWarnings)).toBe(true);
    expect(Object.isFrozen(inspection.portsWithFinalizers)).toBe(true);
  });

  it("JSON serialization includes all new fields", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapterWithFinalizer);

    const inspection = builder.inspect();
    const json = inspectionToJSON(inspection);

    expect(json).toHaveProperty("disposalWarnings");
    expect(json).toHaveProperty("typeComplexityScore");
    expect(json).toHaveProperty("performanceRecommendation");
    expect(json).toHaveProperty("portsWithFinalizers");
  });
});

// =============================================================================
// Depth Limit Detection Tests
// =============================================================================

describe("Depth limit detection", () => {
  describe("depthLimitExceeded flag", () => {
    it("is false for simple graphs with depth below 50", () => {
      const builder = GraphBuilder.create()
        .provide(LoggerAdapter)
        .provide(DatabaseAdapterWithFinalizer)
        .provide(UserServiceAdapter);

      const inspection = builder.inspect();

      expect(inspection.depthLimitExceeded).toBe(false);
      expect(inspection.maxChainDepth).toBeLessThan(50);
    });

    it("is included in JSON serialization", () => {
      const builder = GraphBuilder.create().provide(LoggerAdapter);

      const inspection = builder.inspect();
      const json = inspectionToJSON(inspection);

      expect(json).toHaveProperty("depthLimitExceeded");
      expect(json.depthLimitExceeded).toBe(inspection.depthLimitExceeded);
    });
  });

  describe("detectCycleAtRuntime", () => {
    it("returns null for acyclic graph", () => {
      const adapters: AdapterConstraint[] = [
        createAdapter({
          provides: LoggerPort,
          requires: [] as const,
          lifetime: "singleton",
          factory: () => ({ log: () => {} }),
        }),
        createAdapter({
          provides: DatabasePort,
          requires: [LoggerPort] as const,
          lifetime: "singleton",
          factory: () => ({ query: () => "result" }),
        }),
      ];

      const cycle = detectCycleAtRuntime(adapters);
      expect(cycle).toBeNull();
    });

    it("detects simple two-node cycle", () => {
      // Create two ports that depend on each other
      const PortA = createPort<"PortA", { value: string }>("PortA");
      const PortB = createPort<"PortB", { value: string }>("PortB");

      const adapters: AdapterConstraint[] = [
        createAdapter({
          provides: PortA,
          requires: [PortB] as const,
          lifetime: "singleton",
          factory: () => ({ value: "a" }),
        }),
        createAdapter({
          provides: PortB,
          requires: [PortA] as const,
          lifetime: "singleton",
          factory: () => ({ value: "b" }),
        }),
      ];

      const cycle = detectCycleAtRuntime(adapters);
      expect(cycle).not.toBeNull();
      expect(cycle).toContain("PortA");
      expect(cycle).toContain("PortB");
    });

    it("detects longer cycle chain", () => {
      // Create A -> B -> C -> A cycle
      const PortA = createPort<"A", { value: string }>("A");
      const PortB = createPort<"B", { value: string }>("B");
      const PortC = createPort<"C", { value: string }>("C");

      const adapters: AdapterConstraint[] = [
        createAdapter({
          provides: PortA,
          requires: [PortC] as const,
          lifetime: "singleton",
          factory: () => ({ value: "a" }),
        }),
        createAdapter({
          provides: PortB,
          requires: [PortA] as const,
          lifetime: "singleton",
          factory: () => ({ value: "b" }),
        }),
        createAdapter({
          provides: PortC,
          requires: [PortB] as const,
          lifetime: "singleton",
          factory: () => ({ value: "c" }),
        }),
      ];

      const cycle = detectCycleAtRuntime(adapters);
      expect(cycle).not.toBeNull();
      // Cycle should contain all three ports
      expect(cycle!.length).toBeGreaterThanOrEqual(3);
    });

    it("ignores external dependencies not in the graph", () => {
      // Create adapter that depends on a port not in the graph
      const ExternalPort = createPort<"External", { value: string }>("External");
      const InternalPort = createPort<"Internal", { value: string }>("Internal");

      const adapters: AdapterConstraint[] = [
        createAdapter({
          provides: InternalPort,
          requires: [ExternalPort] as const, // External is not in graph
          lifetime: "singleton",
          factory: () => ({ value: "internal" }),
        }),
      ];

      const cycle = detectCycleAtRuntime(adapters);
      expect(cycle).toBeNull(); // Should not fail due to missing external dep
    });

    it("handles empty adapter list", () => {
      const cycle = detectCycleAtRuntime([]);
      expect(cycle).toBeNull();
    });

    it("handles single adapter with no dependencies", () => {
      const adapters: AdapterConstraint[] = [
        createAdapter({
          provides: LoggerPort,
          requires: [] as const,
          lifetime: "singleton",
          factory: () => ({ log: () => {} }),
        }),
      ];

      const cycle = detectCycleAtRuntime(adapters);
      expect(cycle).toBeNull();
    });
  });
});
