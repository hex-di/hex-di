/**
 * Unit tests for the extracted build validation logic.
 *
 * This tests that:
 * 1. The shared validation function is used by both buildGraph and buildGraphFragment
 * 2. Both functions have identical validation behavior
 * 3. The validation logic is correctly extracted
 *
 * Note: Cycle detection (HEX002) is tested elsewhere (inspection-phase3.test.ts)
 * because it requires deep graphs (50+ levels) to trigger the depth limit exceeded
 * condition. This file focuses on captive dependency detection (HEX003) which
 * runs unconditionally.
 */
import { describe, expect, it } from "vitest";
import { createPort, createAdapter } from "@hex-di/core";
import { buildGraph, buildGraphFragment, validateBuildable } from "../src/builder/builder-build.js";

// =============================================================================
// Test Fixtures
// =============================================================================

const LoggerPort = createPort<{ log: (msg: string) => void }, "Logger">({ name: "Logger" });
const DbPort = createPort<{ query: () => string }, "Db">({ name: "Db" });

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
const ScopedPort = createPort<{ getData: () => string }, "Scoped">({ name: "Scoped" });
const CaptiveSingletonPort = createPort<{ process: () => void }, "CaptiveSingleton">({
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
// validateBuildable Tests
// =============================================================================

describe("validateBuildable shared function", () => {
  it("is exported from builder-build module", () => {
    expect(typeof validateBuildable).toBe("function");
  });

  it("does not throw for valid graph", () => {
    const buildable = {
      adapters: [LoggerAdapter, DbAdapter],
      overridePortNames: new Set<string>(),
    };

    expect(() => validateBuildable(buildable)).not.toThrow();
  });

  it("throws for captive dependency", () => {
    const buildable = {
      adapters: [ScopedAdapter, CaptiveSingletonAdapter],
      overridePortNames: new Set<string>(),
    };

    expect(() => validateBuildable(buildable)).toThrow(/captive/i);
  });

  it("throws with HEX003 error code for captive dependency", () => {
    const buildable = {
      adapters: [ScopedAdapter, CaptiveSingletonAdapter],
      overridePortNames: new Set<string>(),
    };

    expect(() => validateBuildable(buildable)).toThrow(/HEX003/);
  });
});

// =============================================================================
// Behavioral Equivalence Tests
// =============================================================================

describe("buildGraph and buildGraphFragment have identical validation", () => {
  it("both use validateBuildable for validation", () => {
    // Valid graph: both should succeed
    const validBuildable = {
      adapters: [LoggerAdapter, DbAdapter],
      overridePortNames: new Set<string>(),
    };

    const graph1 = buildGraph(validBuildable);
    const graph2 = buildGraphFragment(validBuildable);

    // Both should return frozen objects with same structure
    expect(Object.isFrozen(graph1)).toBe(true);
    expect(Object.isFrozen(graph2)).toBe(true);
    expect(graph1.adapters).toEqual(graph2.adapters);
    expect(graph1.overridePortNames).toEqual(graph2.overridePortNames);
  });

  it("both throw same error for captive dependency", () => {
    const captiveBuildable = {
      adapters: [ScopedAdapter, CaptiveSingletonAdapter],
      overridePortNames: new Set<string>(),
    };

    let error1: Error | undefined;
    let error2: Error | undefined;

    try {
      buildGraph(captiveBuildable);
    } catch (e) {
      error1 = e instanceof Error ? e : new Error(String(e));
    }

    try {
      buildGraphFragment(captiveBuildable);
    } catch (e) {
      error2 = e instanceof Error ? e : new Error(String(e));
    }

    // Both should throw
    expect(error1).toBeDefined();
    expect(error2).toBeDefined();

    // Both should throw same error message
    expect(error1?.message).toBe(error2?.message);
  });
});
