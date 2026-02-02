/**
 * Tests for deterministic output ordering.
 *
 * These tests verify that array outputs are consistently sorted and
 * cycle paths are normalized to canonical form.
 *
 * ## Why Determinism Matters
 *
 * Non-deterministic outputs cause:
 * - Flaky tests that pass/fail randomly
 * - Noisy diffs in code review
 * - Difficulty comparing inspection results
 * - Hard-to-reproduce bugs
 *
 * ## What We Test
 *
 * 1. **Sorted Arrays**: All Set-derived arrays must be alphabetically sorted
 * 2. **Canonical Cycles**: Cycle paths must start from lexicographically smallest node
 * 3. **Structured Errors**: Unknown errors must return a structured response
 */

import { describe, it, expect } from "vitest";
import { port, createAdapter, type AdapterConstraint } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";
import {
  inspectGraph,
  GraphErrorCode,
  detectCycleAtRuntime,
  parseGraphError,
} from "../src/advanced.js";

// =============================================================================
// Test Fixtures
// =============================================================================

const ZebraPort = port<{ run(): void }>()({ name: "Zebra" });
const ApplePort = port<{ grow(): void }>()({ name: "Apple" });
const MangoPort = port<{ juice(): void }>()({ name: "Mango" });
const BananaPort = port<{ peel(): void }>()({ name: "Banana" });

// =============================================================================
// inspectGraph Deterministic Outputs Tests
// =============================================================================

describe("inspectGraph deterministic outputs", () => {
  it("unsatisfiedRequirements is alphabetically sorted", () => {
    // Create a builder with unsatisfied requirements in non-alphabetical order
    const adapterZebra = createAdapter({
      provides: ZebraPort,
      requires: [MangoPort, ApplePort, BananaPort], // M, A, B - not alphabetical
      lifetime: "singleton",
      factory: () => ({ run: () => {} }),
    });

    // Use builder.inspect() since we have unsatisfied dependencies
    const builder = GraphBuilder.create().provide(adapterZebra);
    const inspection = builder.inspect();

    // Requirements should be sorted: Apple, Banana, Mango
    expect(inspection.unsatisfiedRequirements).toEqual(["Apple", "Banana", "Mango"]);
  });

  it("orphanPorts is alphabetically sorted", () => {
    // Create a graph with orphan ports (provided but not required by anything)
    const zebraAdapter = createAdapter({
      provides: ZebraPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ run: () => {} }),
    });

    const mangoAdapter = createAdapter({
      provides: MangoPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ juice: () => {} }),
    });

    const appleAdapter = createAdapter({
      provides: ApplePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ grow: () => {} }),
    });

    // Registration order: Zebra, Mango, Apple (not alphabetical)
    const graph = GraphBuilder.create()
      .provide(zebraAdapter)
      .provide(mangoAdapter)
      .provide(appleAdapter)
      .build();

    const inspection = inspectGraph(graph);

    // All ports are orphans (none required by others)
    // Should be sorted: Apple, Mango, Zebra
    expect(inspection.orphanPorts).toEqual(["Apple", "Mango", "Zebra"]);
  });

  it("overrides is alphabetically sorted", () => {
    // Create a parent graph
    const parentZebraAdapter = createAdapter({
      provides: ZebraPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ run: () => {} }),
    });

    const parentMangoAdapter = createAdapter({
      provides: MangoPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ juice: () => {} }),
    });

    const parentAppleAdapter = createAdapter({
      provides: ApplePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ grow: () => {} }),
    });

    const parentGraph = GraphBuilder.create()
      .provide(parentZebraAdapter)
      .provide(parentMangoAdapter)
      .provide(parentAppleAdapter)
      .build();

    // Child overrides in non-alphabetical order: Zebra, Apple, Mango
    const childZebraAdapter = createAdapter({
      provides: ZebraPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ run: () => {} }),
    });

    const childAppleAdapter = createAdapter({
      provides: ApplePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ grow: () => {} }),
    });

    const childMangoAdapter = createAdapter({
      provides: MangoPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ juice: () => {} }),
    });

    const childGraph = GraphBuilder.forParent(parentGraph)
      .override(childZebraAdapter)
      .override(childAppleAdapter)
      .override(childMangoAdapter)
      .build();

    const inspection = inspectGraph(childGraph);

    // Overrides should be sorted: Apple, Mango, Zebra
    expect(inspection.overrides).toEqual(["Apple", "Mango", "Zebra"]);
  });

  it("produces identical output regardless of adapter registration order", () => {
    // Two graphs with same adapters in different registration order
    // Both adapters have missing dependencies intentionally
    const adapterA = createAdapter({
      provides: ApplePort,
      requires: [MangoPort],
      lifetime: "singleton",
      factory: () => ({ grow: () => {} }),
    });

    const adapterB = createAdapter({
      provides: BananaPort,
      requires: [ZebraPort],
      lifetime: "singleton",
      factory: () => ({ peel: () => {} }),
    });

    // Use builder inspect() to check unsatisfied requirements before build
    // Graph 1: A then B
    const builder1 = GraphBuilder.create().provide(adapterA).provide(adapterB);

    // Graph 2: B then A
    const builder2 = GraphBuilder.create().provide(adapterB).provide(adapterA);

    const inspection1 = builder1.inspect();
    const inspection2 = builder2.inspect();

    // Both should have identical unsatisfiedRequirements (sorted)
    expect(inspection1.unsatisfiedRequirements).toEqual(inspection2.unsatisfiedRequirements);
    expect(inspection1.orphanPorts).toEqual(inspection2.orphanPorts);
    // Verify they are sorted: Mango, Zebra alphabetically
    expect(inspection1.unsatisfiedRequirements).toEqual(["Mango", "Zebra"]);
  });
});

// =============================================================================
// detectCycleAtRuntime Canonical Paths Tests
// =============================================================================

describe("detectCycleAtRuntime canonical paths", () => {
  // Helper to create adapters with specific dependency chains
  function makeAdapter(portName: string, requires: string[]): AdapterConstraint {
    return {
      provides: { __portName: portName, __brand: Symbol() },
      requires: requires.map(name => ({ __portName: name, __brand: Symbol() })),
      lifetime: "singleton",
      factory: () => ({}),
    } as unknown as AdapterConstraint;
  }

  it("cycle A→B→C→A always reported as [A,B,C,A]", () => {
    // Create cycle: A -> B -> C -> A
    const adapters = [makeAdapter("A", ["B"]), makeAdapter("B", ["C"]), makeAdapter("C", ["A"])];

    const cycle = detectCycleAtRuntime(adapters);

    // Should be normalized to start from lexicographically smallest: A
    expect(cycle).toEqual(["A", "B", "C", "A"]);
  });

  it("same cycle from different starting points produces identical output", () => {
    // Create cycle: X -> Y -> Z -> X
    // Test that regardless of which adapter we register first, the cycle
    // is reported the same way

    // Order 1: X, Y, Z
    const adapters1 = [makeAdapter("X", ["Y"]), makeAdapter("Y", ["Z"]), makeAdapter("Z", ["X"])];

    // Order 2: Z, X, Y
    const adapters2 = [makeAdapter("Z", ["X"]), makeAdapter("X", ["Y"]), makeAdapter("Y", ["Z"])];

    // Order 3: Y, Z, X
    const adapters3 = [makeAdapter("Y", ["Z"]), makeAdapter("Z", ["X"]), makeAdapter("X", ["Y"])];

    const cycle1 = detectCycleAtRuntime(adapters1);
    const cycle2 = detectCycleAtRuntime(adapters2);
    const cycle3 = detectCycleAtRuntime(adapters3);

    // All should produce identical canonical output: [X, Y, Z, X]
    expect(cycle1).toEqual(cycle2);
    expect(cycle2).toEqual(cycle3);
    expect(cycle1).toEqual(["X", "Y", "Z", "X"]);
  });

  it("normalizes two-node cycles correctly", () => {
    // Create cycle: B -> A -> B
    const adapters = [makeAdapter("B", ["A"]), makeAdapter("A", ["B"])];

    const cycle = detectCycleAtRuntime(adapters);

    // Should start from lexicographically smallest: A
    expect(cycle).toEqual(["A", "B", "A"]);
  });

  it("self-loop is reported as [A, A]", () => {
    // Create self-loop: A -> A
    const adapters = [makeAdapter("A", ["A"])];

    const cycle = detectCycleAtRuntime(adapters);

    expect(cycle).toEqual(["A", "A"]);
  });
});

// =============================================================================
// parseGraphError Structured Unknown Error Tests
// =============================================================================

describe("parseGraphError structured unknown", () => {
  it("returns UNKNOWN_ERROR code for unrecognized HEX errors", () => {
    // A hypothetical future error code that isn't recognized
    const unknownError = "ERROR[HEX999]: Some new error type that we haven't added parsing for.";

    const parsed = parseGraphError(unknownError);

    // Should return structured result, not undefined
    expect(parsed).not.toBeUndefined();
    expect(parsed?.code).toBe(GraphErrorCode.UNKNOWN_ERROR);
    expect(parsed?.message).toBe(unknownError);
    expect(parsed?.details).toHaveProperty("rawMessage", unknownError);
    // Should preserve the unknown HEX code for diagnostics
    expect(parsed?.details).toHaveProperty("unknownCode", "HEX999");
  });

  it("returns UNKNOWN_ERROR for WARNING messages without specific handler", () => {
    // A warning format we might not have a specific handler for
    const unknownWarning = "WARNING[HEX999]: Some new warning type.";

    const parsed = parseGraphError(unknownWarning);

    expect(parsed).not.toBeUndefined();
    expect(parsed?.code).toBe(GraphErrorCode.UNKNOWN_ERROR);
    // Should also extract unknownCode from WARNING messages
    expect(parsed?.details).toHaveProperty("unknownCode", "HEX999");
  });

  it("returns undefined for non-graph errors", () => {
    // Random string that doesn't look like a graph error
    const notAnError = "This is just a regular string";

    const parsed = parseGraphError(notAnError);

    expect(parsed).toBeUndefined();
  });

  it("existing error codes still work correctly", () => {
    // Verify we haven't broken existing parsing
    const duplicateError =
      "ERROR[HEX001]: Duplicate adapter for 'Logger'. Fix: Remove one .provide() call.";

    const parsed = parseGraphError(duplicateError);

    expect(parsed?.code).toBe(GraphErrorCode.DUPLICATE_ADAPTER);
    expect(parsed?.details).toHaveProperty("portName", "Logger");
  });
});
