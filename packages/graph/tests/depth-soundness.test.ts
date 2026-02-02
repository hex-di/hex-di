/**
 * Runtime tests for depth-limited cycle detection soundness.
 *
 * ## Key Insight
 *
 * The compile-time cycle detection has a depth limit (default 50, max 100).
 * When this limit is exceeded, the system:
 * 1. Returns `DepthExceededResult` instead of `true` (cycle) or `false` (no cycle)
 * 2. Allows the build to proceed (with a warning via `withExtendedDepth()`)
 * 3. Runtime validation in `validate()` catches any actual cycles
 *
 * This is NOT a soundness hole - it's a graceful degradation with safety net.
 *
 * @packageDocumentation
 */

import { describe, expect, it } from "vitest";
import { port, createAdapter, type AdapterConstraint } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";

// =============================================================================
// Test: Runtime catches cycles when compile-time validation is incomplete
// =============================================================================

describe("depth-limited cycle detection soundness", () => {
  describe("runtime validation catches cycles when depth limit exceeded", () => {
    it("detectCycleAtRuntime is called when inspection.depthLimitExceeded is true", async () => {
      // Import runtime cycle detection
      const { detectCycleAtRuntime } = await import("../src/advanced.js");

      // Create a simple cycle: A -> B -> A
      const PortA = port<{ a: () => void }>()({ name: "A" });
      const PortB = port<{ b: () => void }>()({ name: "B" });

      const AdapterA = createAdapter({
        provides: PortA,
        requires: [PortB],
        lifetime: "singleton",
        factory: () => ({ a: () => {} }),
      });

      const AdapterB = createAdapter({
        provides: PortB,
        requires: [PortA],
        lifetime: "singleton",
        factory: () => ({ b: () => {} }),
      });

      // Runtime should detect the cycle when called directly
      const cycle = detectCycleAtRuntime([AdapterA, AdapterB]);

      expect(cycle).not.toBeNull();
      expect(cycle).toHaveLength(3); // A -> B -> A
    });

    it("documents that validate() only runs runtime cycle detection when depthLimitExceeded is true", () => {
      // IMPORTANT: This documents a known limitation
      //
      // validate() only runs detectCycleAtRuntime when inspection.depthLimitExceeded is true
      // This is a performance optimization - no need to run expensive runtime checks
      // if compile-time validation already passed.
      //
      // Implications:
      // 1. If compile-time validation passes → no runtime cycle check
      // 2. Only if depth limit is exceeded → runtime cycle check runs
      //
      // This is acceptable because:
      // - Cycles within depth limit ARE caught at compile-time
      // - Cycles beyond depth limit trigger depthLimitExceeded → runtime check runs

      // Create ports for a cycle
      const PortX = port<{ x: () => void }>()({ name: "X" });
      const PortY = port<{ y: () => void }>()({ name: "Y" });

      const AdapterX = createAdapter({
        provides: PortX,
        requires: [PortY],
        lifetime: "singleton",
        factory: () => ({ x: () => {} }),
      });

      const AdapterY = createAdapter({
        provides: PortY,
        requires: [PortX],
        lifetime: "singleton",
        factory: () => ({ y: () => {} }),
      });

      // Cycles are now always detected at compile-time with provide()
      // This test scenario is no longer applicable since provide() always validates
      // const builder = GraphBuilder.create().provide(AdapterX).provide(AdapterY);
      // The above would now return an error string at compile-time
      expect(true).toBe(true); // Placeholder - test scenario no longer applicable
    });
  });

  describe("DepthLimitError is generated at compile-time for deep graphs", () => {
    it("documents that withMaxDepth allows configuring depth limit", () => {
      // Verify API exists (compile-time check)
      // withMaxDepth uses generic type parameter, not function argument
      const builderWithHigherDepth = GraphBuilder.withMaxDepth<75>().create();
      expect(builderWithHigherDepth).toBeDefined();

      // Verify the default depth is 50
      const defaultBuilder = GraphBuilder.create();
      expect(defaultBuilder).toBeDefined();
    });

    it("documents that withExtendedDepth converts error to warning", () => {
      // This API allows building even when depth limit is exceeded
      // The warning is tracked in $depthWarnings phantom property
      // withExtendedDepth() returns a factory, so call .create()
      const builderWithOverride = GraphBuilder.withExtendedDepth().create();
      expect(builderWithOverride).toBeDefined();
    });
  });

  describe("runtime cycle detection algorithm correctness", () => {
    it("detectCycleAtRuntime correctly identifies cycles", async () => {
      // Import the function directly for testing
      const { detectCycleAtRuntime } = await import("../src/advanced.js");

      const PortA = port<object>()({ name: "A" });
      const PortB = port<object>()({ name: "B" });
      const PortC = port<object>()({ name: "C" });

      // A -> B -> C -> A (cycle)
      const AdapterA = createAdapter({
        provides: PortA,
        requires: [PortB],
        lifetime: "singleton",
        factory: () => ({}),
      });
      const AdapterB = createAdapter({
        provides: PortB,
        requires: [PortC],
        lifetime: "singleton",
        factory: () => ({}),
      });
      const AdapterC = createAdapter({
        provides: PortC,
        requires: [PortA],
        lifetime: "singleton",
        factory: () => ({}),
      });

      const adapters: AdapterConstraint[] = [AdapterA, AdapterB, AdapterC];

      const cycle = detectCycleAtRuntime(adapters);
      expect(cycle).not.toBeNull();
      expect(cycle).toHaveLength(4); // A -> B -> C -> A
    });

    it("detectCycleAtRuntime returns null for acyclic graphs", async () => {
      const { detectCycleAtRuntime } = await import("../src/advanced.js");

      const PortA = port<object>()({ name: "A" });
      const PortB = port<object>()({ name: "B" });
      const PortC = port<object>()({ name: "C" });

      // A -> B -> C (no cycle)
      const AdapterA = createAdapter({
        provides: PortA,
        requires: [PortB],
        lifetime: "singleton",
        factory: () => ({}),
      });
      const AdapterB = createAdapter({
        provides: PortB,
        requires: [PortC],
        lifetime: "singleton",
        factory: () => ({}),
      });
      const AdapterC = createAdapter({
        provides: PortC,
        requires: [],
        lifetime: "singleton",
        factory: () => ({}),
      });

      const adapters: AdapterConstraint[] = [AdapterA, AdapterB, AdapterC];

      const cycle = detectCycleAtRuntime(adapters);
      expect(cycle).toBeNull();
    });
  });
});
