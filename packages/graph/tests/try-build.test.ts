/**
 * Tests for Result-based build API (tryBuild, tryBuildFragment, tryBuildGraph).
 */
import { describe, expect, it } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { expectOk, expectErr } from "@hex-di/result-testing";
import { GraphBuilder } from "../src/index.js";
import {
  tryBuildGraph,
  tryBuildGraphFragment,
  validateBuildable,
  buildGraph,
  buildGraphFragment,
} from "../src/builder/builder-build.js";
import { isGraphBuildError } from "../src/errors/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

const LoggerPort = port<{ log: (msg: string) => void }>()({ name: "Logger" });
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

// Captive dependency: singleton depends on scoped
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

// =============================================================================
// tryBuildGraph / tryBuildGraphFragment (standalone functions)
// =============================================================================

describe("tryBuildGraph", () => {
  it("returns Ok for valid graph", () => {
    const buildable = {
      adapters: [LoggerAdapter, DbAdapter],
      overridePortNames: new Set<string>(),
    };

    const result = tryBuildGraph(buildable);
    const graph = expectOk(result);

    expect(Object.isFrozen(graph)).toBe(true);
    expect(graph.adapters).toHaveLength(2);
  });

  it("returns Err with CaptiveDependency for captive deps", () => {
    const buildable = {
      adapters: [ScopedAdapter, CaptiveSingletonAdapter],
      overridePortNames: new Set<string>(),
    };

    const result = tryBuildGraph(buildable);
    const error = expectErr(result);

    expect(error._tag).toBe("CaptiveDependency");
    if (error._tag === "CaptiveDependency") {
      expect(error.dependentPort).toBe("CaptiveSingleton");
      expect(error.dependentLifetime).toBe("singleton");
      expect(error.captivePort).toBe("Scoped");
      expect(error.captiveLifetime).toBe("scoped");
      expect(error.message).toContain("HEX003");
    }
  });
});

describe("tryBuildGraphFragment", () => {
  it("returns Ok for valid fragment", () => {
    const buildable = {
      adapters: [LoggerAdapter],
      overridePortNames: new Set<string>(),
    };

    const result = tryBuildGraphFragment(buildable);
    const graph = expectOk(result);

    expect(Object.isFrozen(graph)).toBe(true);
    expect(graph.adapters).toHaveLength(1);
  });

  it("returns Err for captive deps (same as tryBuildGraph)", () => {
    const buildable = {
      adapters: [ScopedAdapter, CaptiveSingletonAdapter],
      overridePortNames: new Set<string>(),
    };

    const result = tryBuildGraphFragment(buildable);
    const error = expectErr(result);
    expect(error._tag).toBe("CaptiveDependency");
  });
});

// =============================================================================
// validateBuildable (returns Result)
// =============================================================================

describe("validateBuildable", () => {
  it("returns Ok for valid graph", () => {
    const buildable = {
      adapters: [LoggerAdapter, DbAdapter],
      overridePortNames: new Set<string>(),
    };

    const result = validateBuildable(buildable);
    expectOk(result);
  });

  it("returns Err for captive dependency", () => {
    const buildable = {
      adapters: [ScopedAdapter, CaptiveSingletonAdapter],
      overridePortNames: new Set<string>(),
    };

    const result = validateBuildable(buildable);
    const error = expectErr(result);
    expect(error._tag).toBe("CaptiveDependency");
  });
});

// =============================================================================
// GraphBuilder.tryBuild()
// =============================================================================

describe("GraphBuilder.tryBuild()", () => {
  it("returns Ok(Graph) for valid complete graph", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter).provide(DbAdapter);

    const result = builder.tryBuild();
    const graph = expectOk(result);

    expect(graph.adapters).toHaveLength(2);
    expect(Object.isFrozen(graph)).toBe(true);
  });

  it("Result can be chained with map()", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter).provide(DbAdapter);

    const result = builder.tryBuild();
    const count = result.map(g => g.adapters.length);
    const value = expectOk(count);
    expect(value).toBe(2);
  });

  it("Result can be matched with isOk/isErr", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter).provide(DbAdapter);

    const result = builder.tryBuild();
    expect(result.isOk()).toBe(true);
    expect(result.isErr()).toBe(false);
  });
});

// =============================================================================
// GraphBuilder.tryBuildFragment()
// =============================================================================

describe("GraphBuilder.tryBuildFragment()", () => {
  it("returns Ok for fragment with unsatisfied deps", () => {
    // Fragments don't need all deps satisfied
    const builder = GraphBuilder.create().provide(DbAdapter);

    const result = builder.tryBuildFragment();
    const graph = expectOk(result);
    expect(graph.adapters).toHaveLength(1);
  });

  it("returns Err for captive deps in fragment (via standalone function)", () => {
    // Use standalone function to avoid compile-time type-level error on provide()
    const buildable = {
      adapters: [ScopedAdapter, CaptiveSingletonAdapter],
      overridePortNames: new Set<string>(),
    };

    const result = tryBuildGraphFragment(buildable);
    const error = expectErr(result);
    expect(error._tag).toBe("CaptiveDependency");
  });
});

// =============================================================================
// isGraphBuildError type guard
// =============================================================================

describe("isGraphBuildError", () => {
  it("returns true for CyclicDependency error", () => {
    const error = { _tag: "CyclicDependency", cyclePath: ["A", "B", "A"], message: "cycle" };
    expect(isGraphBuildError(error)).toBe(true);
  });

  it("returns true for CaptiveDependency error", () => {
    const error = {
      _tag: "CaptiveDependency",
      dependentPort: "A",
      dependentLifetime: "singleton",
      captivePort: "B",
      captiveLifetime: "scoped",
      message: "captive",
    };
    expect(isGraphBuildError(error)).toBe(true);
  });

  it("returns false for MissingDependency error (not a build error)", () => {
    const error = { _tag: "MissingDependency", missingPorts: ["A"], message: "missing" };
    expect(isGraphBuildError(error)).toBe(false);
  });

  it("returns false for non-objects", () => {
    expect(isGraphBuildError(null)).toBe(false);
    expect(isGraphBuildError(undefined)).toBe(false);
    expect(isGraphBuildError("string")).toBe(false);
    expect(isGraphBuildError(42)).toBe(false);
  });

  it("returns false for objects without _tag", () => {
    expect(isGraphBuildError({})).toBe(false);
    expect(isGraphBuildError({ message: "test" })).toBe(false);
  });

  it("returns false for objects with unrelated _tag", () => {
    expect(isGraphBuildError({ _tag: "SomeOtherError" })).toBe(false);
  });
});

// =============================================================================
// Backward compatibility: build() still throws
// =============================================================================

describe("build() backward compatibility", () => {
  it("buildGraph still throws for captive dependencies", () => {
    const buildable = {
      adapters: [ScopedAdapter, CaptiveSingletonAdapter],
      overridePortNames: new Set<string>(),
    };

    expect(() => buildGraph(buildable)).toThrow(/captive/i);
  });

  it("buildGraphFragment still throws for captive dependencies", () => {
    const buildable = {
      adapters: [ScopedAdapter, CaptiveSingletonAdapter],
      overridePortNames: new Set<string>(),
    };

    expect(() => buildGraphFragment(buildable)).toThrow(/captive/i);
  });

  it("buildGraph still returns frozen graph for valid input", () => {
    const buildable = {
      adapters: [LoggerAdapter, DbAdapter],
      overridePortNames: new Set<string>(),
    };

    const graph = buildGraph(buildable);
    expect(Object.isFrozen(graph)).toBe(true);
    expect(graph.adapters).toHaveLength(2);
  });
});
