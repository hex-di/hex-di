/**
 * Tests for structured ValidationResult.errors (GraphValidationError objects).
 */
import { describe, expect, it } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";
import type { GraphValidationError } from "../src/errors/index.js";

// =============================================================================
// Fixtures
// =============================================================================

const LoggerPort = port<{ log: () => void }>()({ name: "Logger" });
const DbPort = port<{ query: () => string }>()({ name: "Db" });

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [] as const,
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const DbAdapter = createAdapter({
  provides: DbPort,
  requires: [LoggerPort] as const,
  lifetime: "singleton",
  factory: () => ({ query: () => "result" }),
});

// Captive dependency fixtures
const ScopedPort = port<{ getData: () => string }>()({ name: "Scoped" });
const CaptiveSingletonPort = port<{ process: () => void }>()({
  name: "CaptiveSingleton",
});

const ScopedAdapter = createAdapter({
  provides: ScopedPort,
  requires: [] as const,
  lifetime: "scoped",
  factory: () => ({ getData: () => "data" }),
});

const CaptiveSingletonAdapter = createAdapter({
  provides: CaptiveSingletonPort,
  requires: [ScopedPort] as const,
  lifetime: "singleton",
  factory: () => ({ process: () => {} }),
});

// Helper to get a builder with captive deps bypassing compile-time errors.
// Test files allow `any` for mocking flexibility per project rules.
function makeCaptiveBuilder(): GraphBuilder {
  return (GraphBuilder.create() as any).provide(ScopedAdapter).provide(CaptiveSingletonAdapter);
}

// =============================================================================
// Tests
// =============================================================================

describe("Structured ValidationResult.errors", () => {
  it("returns empty errors for valid complete graph", () => {
    const result = GraphBuilder.create().provide(LoggerAdapter).provide(DbAdapter).validate();

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns MissingDependencyBuildError for unsatisfied requirements", () => {
    const result = GraphBuilder.create().provide(DbAdapter).validate();

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);

    const error = result.errors[0];
    expect(error._tag).toBe("MissingDependency");
    if (error._tag === "MissingDependency") {
      expect(error.missingPorts).toContain("Logger");
      expect(error.message).toContain("Missing adapters for");
      expect(error.message).toContain("Logger");
    }
  });

  it("returns CaptiveDependencyBuildError for captive deps", () => {
    const builder = makeCaptiveBuilder();
    const result = builder.validate();

    expect(result.valid).toBe(false);

    const captiveError = result.errors.find(
      (e: GraphValidationError) => e._tag === "CaptiveDependency"
    );
    expect(captiveError).toBeDefined();
    if (captiveError && captiveError._tag === "CaptiveDependency") {
      expect(captiveError.dependentPort).toBe("CaptiveSingleton");
      expect(captiveError.dependentLifetime).toBe("singleton");
      expect(captiveError.captivePort).toBe("Scoped");
      expect(captiveError.captiveLifetime).toBe("scoped");
      expect(captiveError.message).toContain("HEX003");
    }
  });

  it("can have multiple structured errors", () => {
    // Graph with both missing deps and captive deps
    const MissingPort = port<{ missing: () => void }>()({ name: "MissingDep" });

    const AdapterWithMissing = createAdapter({
      provides: CaptiveSingletonPort,
      requires: [ScopedPort, MissingPort] as const,
      lifetime: "singleton",
      factory: () => ({ process: () => {} }),
    });

    const builder: GraphBuilder = (GraphBuilder.create() as any)
      .provide(ScopedAdapter)
      .provide(AdapterWithMissing);

    const result = builder.validate();

    expect(result.valid).toBe(false);
    // Should have both a MissingDependency and a CaptiveDependency error
    const tags = result.errors.map((e: GraphValidationError) => e._tag);
    expect(tags).toContain("MissingDependency");
    expect(tags).toContain("CaptiveDependency");
  });

  it("errors have human-readable message field", () => {
    const result = GraphBuilder.create().provide(DbAdapter).validate();

    expect(result.errors).toHaveLength(1);
    expect(typeof result.errors[0].message).toBe("string");
    expect(result.errors[0].message.length).toBeGreaterThan(0);
  });

  it("error _tag enables exhaustive narrowing", () => {
    const result = GraphBuilder.create().provide(DbAdapter).validate();

    for (const error of result.errors) {
      switch (error._tag) {
        case "CyclicDependency":
          expect(error.cyclePath).toBeDefined();
          break;
        case "CaptiveDependency":
          expect(error.dependentPort).toBeDefined();
          break;
        case "MissingDependency":
          expect(error.missingPorts).toBeDefined();
          break;
      }
    }
  });
});
