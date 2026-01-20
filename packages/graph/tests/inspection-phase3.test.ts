/**
 * Tests for Phase 3 inspection features:
 * - Disposal order validation
 * - Performance monitoring utilities
 * - Mermaid graph export
 */
import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/ports";
import { createAdapter, GraphBuilder, toMermaidGraph, inspectionToJSON } from "../src/index.js";

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
// Mermaid Graph Export Tests
// =============================================================================

describe("toMermaidGraph", () => {
  it("generates basic Mermaid diagram", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapterWithFinalizer);

    const inspection = builder.inspect();
    const mermaid = toMermaidGraph(inspection);

    expect(mermaid).toContain("graph TB");
    expect(mermaid).toContain("Logger");
    expect(mermaid).toContain("Database");
    expect(mermaid).toContain("-->");
  });

  it("shows lifetimes by default", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);
    const inspection = builder.inspect();
    const mermaid = toMermaidGraph(inspection);

    expect(mermaid).toContain("singleton");
  });

  it("can hide lifetimes", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);
    const inspection = builder.inspect();
    const mermaid = toMermaidGraph(inspection, { showLifetimes: false });

    expect(mermaid).not.toContain("singleton");
  });

  it("supports different directions", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);
    const inspection = builder.inspect();

    expect(toMermaidGraph(inspection, { direction: "LR" })).toContain("graph LR");
    expect(toMermaidGraph(inspection, { direction: "BT" })).toContain("graph BT");
    expect(toMermaidGraph(inspection, { direction: "RL" })).toContain("graph RL");
  });

  it("highlights missing dependencies with dashed arrows", () => {
    const builder = GraphBuilder.create().provide(DatabaseAdapterWithFinalizer);
    // Database requires Logger which is not provided
    const inspection = builder.inspect();
    const mermaid = toMermaidGraph(inspection);

    expect(mermaid).toContain("Logger");
    expect(mermaid).toContain("MISSING");
    expect(mermaid).toContain("-.->"); // Dashed arrow for missing deps
  });

  it("can disable missing dependency highlighting", () => {
    const builder = GraphBuilder.create().provide(DatabaseAdapterWithFinalizer);
    const inspection = builder.inspect();
    const mermaid = toMermaidGraph(inspection, { highlightMissing: false });

    expect(mermaid).not.toContain("MISSING");
  });

  it("adds title when provided", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);
    const inspection = builder.inspect();
    const mermaid = toMermaidGraph(inspection, { title: "My Application" });

    expect(mermaid).toContain("title: My Application");
  });

  it("shows finalizer emoji when enabled", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapterWithFinalizer);

    const inspection = builder.inspect();
    const mermaid = toMermaidGraph(inspection, { showFinalizers: true });

    // Database has a finalizer
    expect(mermaid).toContain("🗑️");
  });

  it("sanitizes node IDs for Mermaid compatibility", () => {
    // Port names with special characters should be sanitized
    const SpecialPort = createPort<"Special:Port", { value: number }>("Special:Port");
    const SpecialAdapter = createAdapter({
      provides: SpecialPort,
      requires: [] as const,
      lifetime: "singleton",
      factory: () => ({ value: 42 }),
    });

    const builder = GraphBuilder.create().provide(SpecialAdapter);
    const inspection = builder.inspect();
    const mermaid = toMermaidGraph(inspection);

    // The node ID should be sanitized (: replaced with _)
    expect(mermaid).toContain("Special_Port");
    // But the label should show the original name
    expect(mermaid).toContain("Special:Port");
  });
});

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
