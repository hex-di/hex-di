/**
 * Tests for enhanced cycle error messages (TG-06).
 *
 * Covers:
 * - ASCII cycle diagram generation (6.1)
 * - Refactoring suggestion engine (6.2)
 * - CycleError and MultipleCyclesError types (6.3)
 * - Integration into build error pipeline (6.4)
 * - Multi-cycle reporting (6.5)
 * - End-to-end integration tests (6.6)
 *
 * @packageDocumentation
 */

import { describe, expect, it } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { generateCycleDiagram } from "../src/errors/cycle-diagram.js";
import { generateCycleSuggestions } from "../src/errors/cycle-suggestions.js";
import { createCycleError, createMultipleCyclesError } from "../src/errors/cycle-error.js";
import { detectAllCyclesAtRuntime } from "../src/graph/inspection/runtime-cycle-detection.js";
import {
  formatEnhancedCycleError,
  formatEnhancedCycleErrors,
} from "../src/graph/inspection/enhanced-cycle-formatting.js";
import { isCycleError, isMultipleCyclesError, isGraphBuildError } from "../src/errors/guards.js";

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

interface ServiceD {
  doD(): void;
}

// =============================================================================
// 6.1 — ASCII Cycle Diagram Generator
// =============================================================================

describe("generateCycleDiagram", () => {
  it("generates a 2-node cycle diagram", () => {
    const diagram = generateCycleDiagram(["A", "B", "A"]);

    expect(diagram).toMatchInlineSnapshot(`
      "┌─→ A
      │     ↓ requires
      │   B
      └─────┘ requires (cycle closes here)"
    `);
  });

  it("generates a 3-node cycle diagram", () => {
    const diagram = generateCycleDiagram(["A", "B", "C", "A"]);

    expect(diagram).toMatchInlineSnapshot(`
      "┌─→ A
      │     ↓ requires
      │   B
      │     ↓ requires
      │   C
      └─────┘ requires (cycle closes here)"
    `);
  });

  it("generates a 5-node cycle diagram", () => {
    const diagram = generateCycleDiagram(["A", "B", "C", "D", "E", "A"]);

    expect(diagram).toMatchInlineSnapshot(`
      "┌─→ A
      │     ↓ requires
      │   B
      │     ↓ requires
      │   C
      │     ↓ requires
      │   D
      │     ↓ requires
      │   E
      └─────┘ requires (cycle closes here)"
    `);
  });

  it("normalizes the cycle to start from the lexicographically smallest name", () => {
    const diagram = generateCycleDiagram(["C", "A", "B", "C"]);

    // Should be normalized to start from A
    expect(diagram).toContain("A");
    expect(diagram.indexOf("A")).toBeLessThan(diagram.indexOf("B"));
    expect(diagram.indexOf("B")).toBeLessThan(diagram.indexOf("C"));
  });

  it("handles a self-loop", () => {
    const diagram = generateCycleDiagram(["A", "A"]);

    expect(diagram).toMatchInlineSnapshot(`
      "┌─→ A
      └─────┘ requires (cycle closes here)"
    `);
  });

  it("returns empty string for empty cycle", () => {
    const diagram = generateCycleDiagram([]);
    expect(diagram).toBe("");
  });
});

// =============================================================================
// 6.2 — Refactoring Suggestion Engine
// =============================================================================

describe("generateCycleSuggestions", () => {
  const PortA = port<ServiceA>()({ name: "A" });
  const PortB = port<ServiceB>()({ name: "B" });
  const PortC = port<ServiceC>()({ name: "C" });

  it("always returns at least one suggestion", () => {
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

    const suggestions = generateCycleSuggestions(["A", "B", "A"], {
      adapters: [adapterA, adapterB],
    });

    expect(suggestions.length).toBeGreaterThanOrEqual(1);
  });

  it("produces LazyEdge suggestion for mutual dependency", () => {
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

    const suggestions = generateCycleSuggestions(["A", "B", "A"], {
      adapters: [adapterA, adapterB],
    });

    const lazyEdge = suggestions.find(s => s._tag === "LazyEdge");
    expect(lazyEdge).toBeDefined();
    expect(lazyEdge?.description).toContain("lazyPort");
  });

  it("produces InterfaceExtraction suggestion when adapter has many requires", () => {
    const adapterA = createAdapter({
      provides: PortA,
      requires: [PortB],
      lifetime: "singleton",
      factory: () => ({ doA() {} }),
    });
    const adapterB = createAdapter({
      provides: PortB,
      requires: [PortA, PortC],
      lifetime: "singleton",
      factory: () => ({ doB() {} }),
    });
    const adapterC = createAdapter({
      provides: PortC,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ doC() {} }),
    });

    const suggestions = generateCycleSuggestions(["A", "B", "A"], {
      adapters: [adapterA, adapterB, adapterC],
    });

    const extraction = suggestions.find(s => s._tag === "InterfaceExtraction");
    expect(extraction).toBeDefined();
    expect(extraction?.description).toContain("Extract");
  });

  it("produces ScopeSeparation suggestion when adapters have different lifetimes", () => {
    const adapterA = createAdapter({
      provides: PortA,
      requires: [PortB],
      lifetime: "singleton",
      factory: () => ({ doA() {} }),
    });
    const adapterB = createAdapter({
      provides: PortB,
      requires: [PortA],
      lifetime: "scoped",
      factory: () => ({ doB() {} }),
    });

    const suggestions = generateCycleSuggestions(["A", "B", "A"], {
      adapters: [adapterA, adapterB],
    });

    const scopeSep = suggestions.find(s => s._tag === "ScopeSeparation");
    expect(scopeSep).toBeDefined();
    expect(scopeSep?.description).toContain("scope");
  });

  it("produces EventDecoupling suggestion for event-named ports", () => {
    const EventBusPort = port<{ emit(): void }>()({ name: "EventBus" });
    const adapterA = createAdapter({
      provides: PortA,
      requires: [EventBusPort],
      lifetime: "singleton",
      factory: () => ({ doA() {} }),
    });
    const eventAdapter = createAdapter({
      provides: EventBusPort,
      requires: [PortA],
      lifetime: "singleton",
      factory: () => ({ emit() {} }),
    });

    const suggestions = generateCycleSuggestions(["A", "EventBus", "A"], {
      adapters: [adapterA, eventAdapter],
    });

    const eventDecoupling = suggestions.find(s => s._tag === "EventDecoupling");
    expect(eventDecoupling).toBeDefined();
    expect(eventDecoupling?.description).toContain("event");
  });

  it("suggestions are frozen", () => {
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

    const suggestions = generateCycleSuggestions(["A", "B", "A"], {
      adapters: [adapterA, adapterB],
    });

    expect(Object.isFrozen(suggestions)).toBe(true);
    for (const suggestion of suggestions) {
      expect(Object.isFrozen(suggestion)).toBe(true);
    }
  });

  it("sorts suggestions by score (LazyEdge first)", () => {
    const adapterA = createAdapter({
      provides: PortA,
      requires: [PortB],
      lifetime: "singleton",
      factory: () => ({ doA() {} }),
    });
    const adapterB = createAdapter({
      provides: PortB,
      requires: [PortA, PortC],
      lifetime: "scoped",
      factory: () => ({ doB() {} }),
    });
    const adapterC = createAdapter({
      provides: PortC,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ doC() {} }),
    });

    const suggestions = generateCycleSuggestions(["A", "B", "A"], {
      adapters: [adapterA, adapterB, adapterC],
    });

    // LazyEdge has highest score, should appear first
    expect(suggestions[0]._tag).toBe("LazyEdge");
  });
});

// =============================================================================
// 6.3 — CycleError and MultipleCyclesError Types
// =============================================================================

describe("CycleError", () => {
  it("has correct _tag discriminant", () => {
    const error = createCycleError({
      cycle: ["A", "B", "A"],
      diagram: "test diagram",
      suggestions: [],
      message: "test message",
    });

    expect(error._tag).toBe("CycleDetected");
  });

  it("is frozen", () => {
    const error = createCycleError({
      cycle: ["A", "B", "A"],
      diagram: "test diagram",
      suggestions: [],
      message: "test message",
    });

    expect(Object.isFrozen(error)).toBe(true);
    expect(Object.isFrozen(error.cycle)).toBe(true);
  });

  it("preserves all fields", () => {
    const error = createCycleError({
      cycle: ["A", "B", "A"],
      diagram: "test diagram",
      suggestions: Object.freeze([
        Object.freeze({
          _tag: "LazyEdge" as const,
          description: "test",
          targetAdapter: "A",
          targetPort: "B",
        }),
      ]),
      message: "test message",
    });

    expect(error.cycle).toEqual(["A", "B", "A"]);
    expect(error.diagram).toBe("test diagram");
    expect(error.suggestions).toHaveLength(1);
    expect(error.message).toBe("test message");
  });
});

describe("MultipleCyclesError", () => {
  it("has correct _tag discriminant", () => {
    const error = createMultipleCyclesError({
      cycles: [],
      summary: "Found 0 cycles",
      message: "test",
    });

    expect(error._tag).toBe("MultipleCyclesDetected");
  });

  it("is frozen", () => {
    const cycleError = createCycleError({
      cycle: ["A", "B", "A"],
      diagram: "diagram",
      suggestions: [],
      message: "msg",
    });

    const error = createMultipleCyclesError({
      cycles: [cycleError],
      summary: "Found 1 cycle",
      message: "test",
    });

    expect(Object.isFrozen(error)).toBe(true);
    expect(Object.isFrozen(error.cycles)).toBe(true);
  });
});

describe("type guards", () => {
  it("isCycleError identifies CycleDetected", () => {
    const error = createCycleError({
      cycle: ["A", "B", "A"],
      diagram: "d",
      suggestions: [],
      message: "m",
    });
    expect(isCycleError(error)).toBe(true);
    expect(isGraphBuildError(error)).toBe(true);
  });

  it("isMultipleCyclesError identifies MultipleCyclesDetected", () => {
    const error = createMultipleCyclesError({
      cycles: [],
      summary: "s",
      message: "m",
    });
    expect(isMultipleCyclesError(error)).toBe(true);
    expect(isGraphBuildError(error)).toBe(true);
  });

  it("guards return false for unrelated objects", () => {
    expect(isCycleError({ _tag: "Something" })).toBe(false);
    expect(isMultipleCyclesError(null)).toBe(false);
  });
});

// =============================================================================
// 6.4 — Integration into Build Error Pipeline (via tryBuild)
// =============================================================================

describe("enhanced cycle errors in build pipeline", () => {
  it("formatEnhancedCycleError produces CycleError with diagram and suggestions", () => {
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

    const error = formatEnhancedCycleError(["A", "B", "A"], [adapterA, adapterB]);

    expect(error._tag).toBe("CycleDetected");
    expect(error.diagram).toContain("\u250C");
    expect(error.diagram).toContain("\u2514");
    expect(error.diagram).toContain("requires");
    expect(error.suggestions.length).toBeGreaterThanOrEqual(1);
    expect(error.cycle).toEqual(["A", "B", "A"]);
  });

  it("formatEnhancedCycleErrors returns null for acyclic graph", () => {
    const PortA = port<ServiceA>()({ name: "A" });
    const PortB = port<ServiceB>()({ name: "B" });

    const adapterA = createAdapter({
      provides: PortA,
      requires: [],
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
    expect(result).toBeNull();
  });

  it("formatEnhancedCycleErrors returns CycleError for single cycle", () => {
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
    expect(result?._tag).toBe("CycleDetected");
  });
});

// =============================================================================
// 6.5 — Multi-Cycle Reporting
// =============================================================================

describe("multi-cycle detection", () => {
  it("detectAllCyclesAtRuntime finds two independent cycles", () => {
    const PortA = port<ServiceA>()({ name: "A" });
    const PortB = port<ServiceB>()({ name: "B" });
    const PortC = port<ServiceC>()({ name: "C" });
    const PortD = port<ServiceD>()({ name: "D" });

    // Cycle 1: A -> B -> A
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

    // Cycle 2: C -> D -> C
    const adapterC = createAdapter({
      provides: PortC,
      requires: [PortD],
      lifetime: "singleton",
      factory: () => ({ doC() {} }),
    });
    const adapterD = createAdapter({
      provides: PortD,
      requires: [PortC],
      lifetime: "singleton",
      factory: () => ({ doD() {} }),
    });

    const cycles = detectAllCyclesAtRuntime([adapterA, adapterB, adapterC, adapterD]);

    expect(cycles.length).toBe(2);
  });

  it("returns empty array for acyclic graph", () => {
    const PortA = port<ServiceA>()({ name: "A" });
    const PortB = port<ServiceB>()({ name: "B" });

    const adapterA = createAdapter({
      provides: PortA,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ doA() {} }),
    });
    const adapterB = createAdapter({
      provides: PortB,
      requires: [PortA],
      lifetime: "singleton",
      factory: () => ({ doB() {} }),
    });

    const cycles = detectAllCyclesAtRuntime([adapterA, adapterB]);
    expect(cycles.length).toBe(0);
  });

  it("deduplicates rotations of the same cycle", () => {
    const PortA = port<ServiceA>()({ name: "A" });
    const PortB = port<ServiceB>()({ name: "B" });
    const PortC = port<ServiceC>()({ name: "C" });

    // A -> B -> C -> A (single 3-node cycle)
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
      requires: [PortA],
      lifetime: "singleton",
      factory: () => ({ doC() {} }),
    });

    const cycles = detectAllCyclesAtRuntime([adapterA, adapterB, adapterC]);

    // Should find exactly 1 cycle (not 3 rotations)
    expect(cycles.length).toBe(1);
    // Normalized to start from A (lexicographically smallest)
    expect(cycles[0][0]).toBe("A");
  });

  it("formatEnhancedCycleErrors returns MultipleCyclesError for 2+ cycles", () => {
    const PortA = port<ServiceA>()({ name: "A" });
    const PortB = port<ServiceB>()({ name: "B" });
    const PortC = port<ServiceC>()({ name: "C" });
    const PortD = port<ServiceD>()({ name: "D" });

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
    const adapterC = createAdapter({
      provides: PortC,
      requires: [PortD],
      lifetime: "singleton",
      factory: () => ({ doC() {} }),
    });
    const adapterD = createAdapter({
      provides: PortD,
      requires: [PortC],
      lifetime: "singleton",
      factory: () => ({ doD() {} }),
    });

    const result = formatEnhancedCycleErrors([adapterA, adapterB, adapterC, adapterD]);

    expect(result).not.toBeNull();
    expect(result?._tag).toBe("MultipleCyclesDetected");
    if (result?._tag === "MultipleCyclesDetected") {
      expect(result.cycles.length).toBe(2);
      expect(result.summary).toContain("2");
    }
  });
});

// =============================================================================
// 6.6 — End-to-End Integration Tests
// =============================================================================

describe("end-to-end integration", () => {
  it("simple cycle produces diagram matching snapshot", () => {
    const PortA = port<ServiceA>()({ name: "AuthService" });
    const PortB = port<ServiceB>()({ name: "UserRepository" });
    const PortC = port<ServiceC>()({ name: "EventBus" });

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
      requires: [PortA],
      lifetime: "singleton",
      factory: () => ({ doC() {} }),
    });

    const error = formatEnhancedCycleError(
      ["AuthService", "UserRepository", "EventBus", "AuthService"],
      [adapterA, adapterB, adapterC]
    );

    expect(error.diagram).toMatchInlineSnapshot(`
      "┌─→ AuthService
      │     ↓ requires
      │   UserRepository
      │     ↓ requires
      │   EventBus
      └─────┘ requires (cycle closes here)"
    `);
  });

  it("mutual dependency produces LazyEdge suggestion", () => {
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

    const error = formatEnhancedCycleError(["A", "B", "A"], [adapterA, adapterB]);

    const lazyEdge = error.suggestions.find(s => s._tag === "LazyEdge");
    expect(lazyEdge).toBeDefined();
    expect(lazyEdge?.description).toContain("lazyPort");
  });

  it("two independent cycles produce MultipleCyclesError with 2 entries", () => {
    const PortA = port<ServiceA>()({ name: "A" });
    const PortB = port<ServiceB>()({ name: "B" });
    const PortC = port<ServiceC>()({ name: "C" });
    const PortD = port<ServiceD>()({ name: "D" });

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
    const adapterC = createAdapter({
      provides: PortC,
      requires: [PortD],
      lifetime: "singleton",
      factory: () => ({ doC() {} }),
    });
    const adapterD = createAdapter({
      provides: PortD,
      requires: [PortC],
      lifetime: "singleton",
      factory: () => ({ doD() {} }),
    });

    const result = formatEnhancedCycleErrors([adapterA, adapterB, adapterC, adapterD]);

    expect(result).not.toBeNull();
    expect(result?._tag).toBe("MultipleCyclesDetected");
    if (result?._tag === "MultipleCyclesDetected") {
      expect(result.cycles.length).toBe(2);

      // Each cycle has its own diagram
      for (const cycle of result.cycles) {
        expect(cycle.diagram).toContain("\u250C");
        expect(cycle.suggestions.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("formatEnhancedCycleErrors produces error with diagram and suggestions", () => {
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

    const error = formatEnhancedCycleErrors([adapterA, adapterB]);

    expect(error).not.toBeNull();
    if (error && isCycleError(error)) {
      expect(error.diagram).toBeTruthy();
      expect(error.suggestions.length).toBeGreaterThanOrEqual(1);
      expect(error.cycle).toContain("A");
      expect(error.cycle).toContain("B");
    } else if (error && isMultipleCyclesError(error)) {
      // Also valid if detected as multi
      expect(error.cycles.length).toBeGreaterThanOrEqual(1);
    }
  });
});
