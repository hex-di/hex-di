/**
 * Tests for forward reference validation gap in build().
 *
 * This tests the fix where build() should ALWAYS perform captive dependency
 * validation at runtime, not just when depth limit is exceeded.
 *
 * ## The Gap
 *
 * Currently, buildGraph() only runs runtime captive detection when
 * `inspection.depthLimitExceeded` is true. This means if someone bypasses
 * the type system (via testing utilities, incorrect casts, or runtime
 * construction), captive dependencies can slip through to runtime.
 *
 * ## The Fix
 *
 * build() should always run captive validation as defense-in-depth.
 *
 * @packageDocumentation
 */
import { describe, expect, it } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { buildGraph, buildGraphFragment } from "../src/builder/builder-build.js";
import { detectCaptiveAtRuntime } from "../src/advanced.js";

// =============================================================================
// Test Fixtures
// =============================================================================

const ScopedPort = port<{ getData(): string }>()({ name: "ScopedService" });
const SingletonPort = port<{ process(): void }>()({ name: "SingletonService" });

const ScopedAdapter = createAdapter({
  provides: ScopedPort,
  requires: [] as const,
  lifetime: "scoped",
  factory: () => ({ getData: () => "data" }),
});

const CaptiveSingletonAdapter = createAdapter({
  provides: SingletonPort,
  requires: [ScopedPort] as const,
  lifetime: "singleton", // Captive! Singleton depends on scoped
  factory: () => ({ process: () => {} }),
});

// =============================================================================
// Tests
// =============================================================================

describe("Forward reference validation gap in build()", () => {
  it("should detect captive dependency at runtime even when depth limit is NOT exceeded", () => {
    // SCENARIO: Bypass the type system by calling buildGraph() directly
    // with adapters that form a captive dependency.
    //
    // The type system would catch this in normal usage via GraphBuilder,
    // but if someone constructs a BuildableGraph directly (e.g., in tests
    // or via runtime manipulation), build() should still catch it.

    const buildableGraph = {
      adapters: [ScopedAdapter, CaptiveSingletonAdapter],
      overridePortNames: new Set<string>(),
    };

    // CURRENT BEHAVIOR (BUG): This does NOT throw because depthLimitExceeded is false
    // EXPECTED BEHAVIOR (FIX): This SHOULD throw with captive dependency error

    expect(() => buildGraph(buildableGraph)).toThrow(/captive/i);
  });

  it("detectCaptiveAtRuntime works correctly (verifying detection function)", () => {
    // Verify the detection function works in isolation.
    // After fix, build() will call this unconditionally.
    const result = detectCaptiveAtRuntime([ScopedAdapter, CaptiveSingletonAdapter]);

    expect(result).not.toBeNull();
    expect(result?.dependentPort).toBe("SingletonService");
    expect(result?.captivePort).toBe("ScopedService");
  });
});

describe("buildGraphFragment should also validate captive dependencies", () => {
  it("should detect captive dependency in fragments", () => {
    // Fragments (child containers) should also validate captive dependencies

    const buildableGraph = {
      adapters: [ScopedAdapter, CaptiveSingletonAdapter],
      overridePortNames: new Set<string>(),
    };

    // CURRENT BEHAVIOR (BUG): This does NOT throw because depthLimitExceeded is false
    // EXPECTED BEHAVIOR (FIX): This SHOULD throw with captive dependency error

    expect(() => buildGraphFragment(buildableGraph)).toThrow(/captive/i);
  });
});
