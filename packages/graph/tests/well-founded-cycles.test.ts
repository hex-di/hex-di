/**
 * Tests for well-founded cycle support (TG-15).
 *
 * Covers:
 * - 15.1: Detect well-founded cycles (all edges via lazyPort)
 * - 15.2: Distinguish well-founded from ill-founded cycles
 * - 15.3: Update enhanced cycle errors for well-founded cycles
 *
 * @packageDocumentation
 */

import { describe, expect, it } from "vitest";
import { port, createAdapter, lazyPort } from "@hex-di/core";
import {
  extractLazyEdges,
  verifyWellFoundedness,
  classifyAllCycles,
} from "../src/graph/inspection/well-founded-cycle.js";
import { detectAllCyclesAtRuntime } from "../src/graph/inspection/runtime-cycle-detection.js";
import {
  formatEnhancedCycleError,
  formatEnhancedCycleErrors,
} from "../src/graph/inspection/enhanced-cycle-formatting.js";
import { generateCycleDiagram } from "../src/errors/cycle-diagram.js";
import { createCycleError } from "../src/errors/cycle-error.js";

// =============================================================================
// Test Interfaces
// =============================================================================

interface ServiceA {
  doA(): void;
}

interface ServiceB {
  doB(): void;
}

interface ServiceC {
  doC(): void;
}

// =============================================================================
// 15.1 — Detect well-founded cycles (all edges via lazyPort)
// =============================================================================

describe("15.1: well-founded cycle detection", () => {
  it("detects a cycle when one edge is lazy (A -> B, B --lazy--> A)", () => {
    const PortA = port<ServiceA>()({ name: "A" });
    const PortB = port<ServiceB>()({ name: "B" });

    const adapterA = createAdapter({
      provides: PortA,
      requires: [PortB],
      lifetime: "singleton",
      factory: () => ({ doA() {} }),
    });
    const adapterB = createAdapter({
      provides: PortB,
      requires: [lazyPort(PortA)],
      lifetime: "singleton",
      factory: () => ({ doB() {} }),
    });

    // Cycle should be detected (lazy edges are included in cycle detection)
    const cycles = detectAllCyclesAtRuntime([adapterA, adapterB]);
    expect(cycles.length).toBe(1);
    expect(cycles[0]).toContain("A");
    expect(cycles[0]).toContain("B");
  });

  it("graph with well-founded cycle (lazy edge) builds without errors", () => {
    const PortA = port<ServiceA>()({ name: "A" });
    const PortB = port<ServiceB>()({ name: "B" });

    const adapterA = createAdapter({
      provides: PortA,
      requires: [PortB],
      lifetime: "singleton",
      factory: () => ({ doA() {} }),
    });
    const adapterB = createAdapter({
      provides: PortB,
      requires: [lazyPort(PortA)],
      lifetime: "singleton",
      factory: () => ({ doB() {} }),
    });

    // formatEnhancedCycleErrors should return null (well-founded cycle is accepted)
    const result = formatEnhancedCycleErrors([adapterA, adapterB]);
    expect(result).toBeNull();
  });

  it("both edges lazy: A --lazy--> B, B --lazy--> A is well-founded", () => {
    const PortA = port<ServiceA>()({ name: "A" });
    const PortB = port<ServiceB>()({ name: "B" });

    const adapterA = createAdapter({
      provides: PortA,
      requires: [lazyPort(PortB)],
      lifetime: "singleton",
      factory: () => ({ doA() {} }),
    });
    const adapterB = createAdapter({
      provides: PortB,
      requires: [lazyPort(PortA)],
      lifetime: "singleton",
      factory: () => ({ doB() {} }),
    });

    const result = formatEnhancedCycleErrors([adapterA, adapterB]);
    expect(result).toBeNull();
  });

  it("3-node cycle with one lazy edge: A -> B -> C --lazy--> A is well-founded", () => {
    const PortA = port<ServiceA>()({ name: "A" });
    const PortB = port<ServiceB>()({ name: "B" });
    const PortC = port<ServiceC>()({ name: "C" });

    const adapterA = createAdapter({
      provides: PortA,
      requires: [PortB],
      lifetime: "singleton",
      factory: () => ({ doA() {} }),
    });
    const adapterB = createAdapter({
      provides: PortB,
      requires: [PortC],
      lifetime: "singleton",
      factory: () => ({ doB() {} }),
    });
    const adapterC = createAdapter({
      provides: PortC,
      requires: [lazyPort(PortA)],
      lifetime: "singleton",
      factory: () => ({ doC() {} }),
    });

    const result = formatEnhancedCycleErrors([adapterA, adapterB, adapterC]);
    expect(result).toBeNull();
  });
});

// =============================================================================
// 15.2 — Distinguish well-founded from ill-founded cycles
// =============================================================================

describe("15.2: well-founded vs ill-founded classification", () => {
  it("extractLazyEdges identifies lazy ports in adapter requires", () => {
    const PortA = port<ServiceA>()({ name: "A" });
    const PortB = port<ServiceB>()({ name: "B" });

    const adapterA = createAdapter({
      provides: PortA,
      requires: [PortB],
      lifetime: "singleton",
      factory: () => ({ doA() {} }),
    });
    const adapterB = createAdapter({
      provides: PortB,
      requires: [lazyPort(PortA)],
      lifetime: "singleton",
      factory: () => ({ doB() {} }),
    });

    const { edgeKeys, edges } = extractLazyEdges([adapterA, adapterB]);

    expect(edgeKeys.has("B->A")).toBe(true);
    expect(edgeKeys.has("A->B")).toBe(false);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toEqual({ from: "B", to: "A" });
  });

  it("verifyWellFoundedness: cycle with lazy edge is well-founded", () => {
    const lazyEdgeKeys = new Set(["B->A"]);
    const result = verifyWellFoundedness(["A", "B", "A"], lazyEdgeKeys);

    expect(result._tag).toBe("WellFounded");
    expect(result.lazyEdges).toHaveLength(1);
    expect(result.lazyEdges[0]).toEqual({ from: "B", to: "A" });
  });

  it("verifyWellFoundedness: cycle without lazy edges is ill-founded", () => {
    const lazyEdgeKeys = new Set<string>();
    const result = verifyWellFoundedness(["A", "B", "A"], lazyEdgeKeys);

    expect(result._tag).toBe("IllFounded");
    expect(result.reason).toContain("No lazy edges");
  });

  it("verifyWellFoundedness: all edges lazy is well-founded", () => {
    const lazyEdgeKeys = new Set(["A->B", "B->A"]);
    const result = verifyWellFoundedness(["A", "B", "A"], lazyEdgeKeys);

    expect(result._tag).toBe("WellFounded");
    expect(result.lazyEdges).toHaveLength(2);
  });

  it("verifyWellFoundedness: 3-node cycle with lazy closing edge is well-founded", () => {
    // A -> B -> C --lazy--> A: eager edges A->B, B->C are acyclic
    const lazyEdgeKeys = new Set(["C->A"]);
    const result = verifyWellFoundedness(["A", "B", "C", "A"], lazyEdgeKeys);

    expect(result._tag).toBe("WellFounded");
    expect(result.lazyEdges).toHaveLength(1);
  });

  it("verifyWellFoundedness: 3-node cycle with lazy opening edge is also well-founded", () => {
    // A --lazy--> B -> C -> A: removing A->B leaves B->C, C->A (not a cycle)
    const lazyEdgeKeys = new Set(["A->B"]);
    const result = verifyWellFoundedness(["A", "B", "C", "A"], lazyEdgeKeys);

    expect(result._tag).toBe("WellFounded");
  });

  it("CycleError has isWellFounded: boolean field", () => {
    const error = createCycleError({
      cycle: ["A", "B", "A"],
      diagram: "test",
      suggestions: [],
      message: "test",
      isWellFounded: true,
      lazyEdges: [{ from: "B", to: "A" }],
    });

    expect(error.isWellFounded).toBe(true);
    expect(error.lazyEdges).toHaveLength(1);
  });

  it("CycleError defaults isWellFounded to false", () => {
    const error = createCycleError({
      cycle: ["A", "B", "A"],
      diagram: "test",
      suggestions: [],
      message: "test",
    });

    expect(error.isWellFounded).toBe(false);
    expect(error.lazyEdges).toHaveLength(0);
  });

  it("classifyAllCycles classifies well-founded cycle", () => {
    const PortA = port<ServiceA>()({ name: "A" });
    const PortB = port<ServiceB>()({ name: "B" });

    const adapterA = createAdapter({
      provides: PortA,
      requires: [PortB],
      lifetime: "singleton",
      factory: () => ({ doA() {} }),
    });
    const adapterB = createAdapter({
      provides: PortB,
      requires: [lazyPort(PortA)],
      lifetime: "singleton",
      factory: () => ({ doB() {} }),
    });

    const cycles: ReadonlyArray<ReadonlyArray<string>> = [["A", "B", "A"]];
    const checks = classifyAllCycles(cycles, [adapterA, adapterB]);

    expect(checks).toHaveLength(1);
    expect(checks[0]._tag).toBe("WellFounded");
  });

  it("ill-founded cycle (no lazy edges) produces error", () => {
    const PortA = port<ServiceA>()({ name: "A" });
    const PortB = port<ServiceB>()({ name: "B" });

    const adapterA = createAdapter({
      provides: PortA,
      requires: [PortB],
      lifetime: "singleton",
      factory: () => ({ doA() {} }),
    });
    const adapterB = createAdapter({
      provides: PortB,
      requires: [PortA],
      lifetime: "singleton",
      factory: () => ({ doB() {} }),
    });

    const result = formatEnhancedCycleErrors([adapterA, adapterB]);

    expect(result).not.toBeNull();
    if (result && result._tag === "CycleDetected") {
      expect(result.isWellFounded).toBe(false);
    }
  });
});

// =============================================================================
// 15.3 — Update enhanced cycle errors for well-founded cycles
// =============================================================================

describe("15.3: enhanced cycle errors with lazy annotations", () => {
  it("well-founded cycle diagram includes (lazy) markers", () => {
    const lazyEdgeKeys = new Set(["B->A"]);
    const diagram = generateCycleDiagram(["A", "B", "A"], lazyEdgeKeys);

    expect(diagram).toContain("(lazy)");
    expect(diagram).toContain("(cycle closes here)");
  });

  it("ill-founded cycle diagram does not include (lazy) for eager edges", () => {
    const lazyEdgeKeys = new Set<string>();
    const diagram = generateCycleDiagram(["A", "B", "A"], lazyEdgeKeys);

    expect(diagram).not.toContain("(lazy)");
    expect(diagram).toContain("requires");
  });

  it("3-node cycle diagram shows lazy on the correct edge", () => {
    // A -> B -> C --lazy--> A
    const lazyEdgeKeys = new Set(["C->A"]);
    const diagram = generateCycleDiagram(["A", "B", "C", "A"], lazyEdgeKeys);

    // The closing edge C -> A should be marked lazy
    expect(diagram).toContain("requires (lazy) (cycle closes here)");

    // The intermediate edges A -> B and B -> C should NOT be lazy
    const lines = diagram.split("\n");
    const requireLines = lines.filter(l => l.includes("requires") && !l.includes("cycle closes"));
    for (const line of requireLines) {
      expect(line).not.toContain("(lazy)");
    }
  });

  it("diagram with lazy on intermediate edge", () => {
    // A --lazy--> B -> C -> A
    const lazyEdgeKeys = new Set(["A->B"]);
    const diagram = generateCycleDiagram(["A", "B", "C", "A"], lazyEdgeKeys);

    // First intermediate edge A -> B should be lazy
    expect(diagram).toContain("requires (lazy)");

    // The closing edge should NOT be lazy
    const closingLine = diagram.split("\n").find(l => l.includes("cycle closes"));
    expect(closingLine).not.toContain("requires (lazy)");
  });

  it("well-founded cycles produce no refactoring suggestions", () => {
    const PortA = port<ServiceA>()({ name: "A" });
    const PortB = port<ServiceB>()({ name: "B" });

    const adapterA = createAdapter({
      provides: PortA,
      requires: [PortB],
      lifetime: "singleton",
      factory: () => ({ doA() {} }),
    });
    const adapterB = createAdapter({
      provides: PortB,
      requires: [lazyPort(PortA)],
      lifetime: "singleton",
      factory: () => ({ doB() {} }),
    });

    const { edgeKeys } = extractLazyEdges([adapterA, adapterB]);
    const error = formatEnhancedCycleError(["A", "B", "A"], [adapterA, adapterB], edgeKeys);

    expect(error.isWellFounded).toBe(true);
    expect(error.suggestions).toHaveLength(0);
    expect(error.lazyEdges).toHaveLength(1);
  });

  it("ill-founded cycles still produce refactoring suggestions", () => {
    const PortA = port<ServiceA>()({ name: "A" });
    const PortB = port<ServiceB>()({ name: "B" });

    const adapterA = createAdapter({
      provides: PortA,
      requires: [PortB],
      lifetime: "singleton",
      factory: () => ({ doA() {} }),
    });
    const adapterB = createAdapter({
      provides: PortB,
      requires: [PortA],
      lifetime: "singleton",
      factory: () => ({ doB() {} }),
    });

    const { edgeKeys } = extractLazyEdges([adapterA, adapterB]);
    const error = formatEnhancedCycleError(["A", "B", "A"], [adapterA, adapterB], edgeKeys);

    expect(error.isWellFounded).toBe(false);
    expect(error.suggestions.length).toBeGreaterThanOrEqual(1);
  });

  it("well-founded cycle message includes 'well-founded, accepted'", () => {
    const PortA = port<ServiceA>()({ name: "A" });
    const PortB = port<ServiceB>()({ name: "B" });

    const adapterA = createAdapter({
      provides: PortA,
      requires: [PortB],
      lifetime: "singleton",
      factory: () => ({ doA() {} }),
    });
    const adapterB = createAdapter({
      provides: PortB,
      requires: [lazyPort(PortA)],
      lifetime: "singleton",
      factory: () => ({ doB() {} }),
    });

    const { edgeKeys } = extractLazyEdges([adapterA, adapterB]);
    const error = formatEnhancedCycleError(["A", "B", "A"], [adapterA, adapterB], edgeKeys);

    expect(error.message).toContain("well-founded, accepted");
  });

  it("diagram without lazyEdgeKeys parameter works as before", () => {
    const diagram = generateCycleDiagram(["A", "B", "A"]);
    expect(diagram).not.toContain("(lazy)");
    expect(diagram).toContain("requires");
  });
});
