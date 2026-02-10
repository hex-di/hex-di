/**
 * Cycle Detection Tests
 *
 * Unit tests for withCycleDetection in isolation,
 * plus integration tests with DerivedService and LinkedDerivedService.
 */

import { describe, expect, it } from "vitest";
import { withCycleDetection } from "../src/services/cycle-detection.js";
import { createDerivedServiceImpl } from "../src/services/derived-service-impl.js";
import { createLinkedDerivedServiceImpl } from "../src/services/linked-derived-service-impl.js";
import { createSignal } from "../src/reactivity/signals.js";

function expectTaggedThrow(fn: () => unknown, tag: string): Record<string, unknown> {
  let thrown: unknown;
  try {
    fn();
  } catch (e) {
    thrown = e;
  }
  expect(thrown).toBeDefined();
  expect(thrown).toHaveProperty("_tag", tag);
  return thrown as Record<string, unknown>;
}

// =============================================================================
// withCycleDetection unit tests
// =============================================================================

describe("withCycleDetection", () => {
  it("returns fn() result when no cycle", () => {
    const result = withCycleDetection("A", () => 42);
    expect(result).toBe(42);
  });

  it("cleans up after normal execution", () => {
    withCycleDetection("A", () => 1);
    // Should not throw on second call with same name (stack cleaned up)
    const result = withCycleDetection("A", () => 2);
    expect(result).toBe(2);
  });

  it("detects direct self-cycle (A -> A)", () => {
    const err = expectTaggedThrow(
      () => withCycleDetection("A", () => withCycleDetection("A", () => 0)),
      "CircularDerivedDependency"
    );
    expect(err.dependencyChain).toEqual(["A", "A"]);
  });

  it("detects indirect cycle (A -> B -> A)", () => {
    const err = expectTaggedThrow(
      () =>
        withCycleDetection("A", () =>
          withCycleDetection("B", () => withCycleDetection("A", () => 0))
        ),
      "CircularDerivedDependency"
    );
    expect(err.dependencyChain).toEqual(["A", "B", "A"]);
  });

  it("detects long chain (A -> B -> C -> A)", () => {
    const err = expectTaggedThrow(
      () =>
        withCycleDetection("A", () =>
          withCycleDetection("B", () =>
            withCycleDetection("C", () => withCycleDetection("A", () => 0))
          )
        ),
      "CircularDerivedDependency"
    );
    expect(err.dependencyChain).toEqual(["A", "B", "C", "A"]);
  });

  it("cleans up after cycle error", () => {
    // Trigger a cycle, then verify the stack is clean
    try {
      withCycleDetection("X", () => withCycleDetection("X", () => 0));
    } catch {
      // expected
    }

    // Should work fine with "X" again
    const result = withCycleDetection("X", () => 99);
    expect(result).toBe(99);
  });

  it("cleans up after non-cycle error in fn", () => {
    try {
      withCycleDetection("Y", () => {
        throw new Error("unrelated");
      });
    } catch {
      // expected
    }

    // Should work fine with "Y" again
    const result = withCycleDetection("Y", () => 77);
    expect(result).toBe(77);
  });
});

// =============================================================================
// DerivedService circular detection integration
// =============================================================================

describe("DerivedService circular detection", () => {
  it("self-referencing derived throws CircularDerivedDependency", () => {
    const sig = createSignal(0);

    const selfRef: { value: unknown } = createDerivedServiceImpl({
      portName: "SelfRef",
      containerName: "root",
      select: () => {
        sig.get();
        // Reading own value triggers the computed callback recursively
        return (selfRef as { value: unknown }).value;
      },
    });

    expectTaggedThrow(() => selfRef.value, "CircularDerivedDependency");
  });

  it("two-node cycle (A <-> B) throws CircularDerivedDependency", () => {
    // eslint-disable-next-line prefer-const -- mutual reference requires let
    let derivedB: { value: unknown };

    const derivedA = createDerivedServiceImpl({
      portName: "CycleA",
      containerName: "root",
      select: () => (derivedB as { value: unknown }).value,
    });

    derivedB = createDerivedServiceImpl({
      portName: "CycleB",
      containerName: "root",
      select: () => derivedA.value,
    });

    expectTaggedThrow(() => derivedA.value, "CircularDerivedDependency");
  });

  it("three-node cycle (A -> B -> C -> A) throws CircularDerivedDependency", () => {
    // eslint-disable-next-line prefer-const -- mutual reference requires let
    let derivedC: { value: unknown };

    const derivedA = createDerivedServiceImpl({
      portName: "Chain3A",
      containerName: "root",
      select: () => derivedBRef.value,
    });

    const derivedBRef = createDerivedServiceImpl({
      portName: "Chain3B",
      containerName: "root",
      select: () => (derivedC as { value: unknown }).value,
    });

    derivedC = createDerivedServiceImpl({
      portName: "Chain3C",
      containerName: "root",
      select: () => derivedA.value,
    });

    expectTaggedThrow(() => derivedA.value, "CircularDerivedDependency");
  });

  it("non-circular chain works correctly", () => {
    const sig = createSignal(10);

    const d1 = createDerivedServiceImpl({
      portName: "Linear1",
      containerName: "root",
      select: () => sig.get() * 2,
    });

    const d2 = createDerivedServiceImpl({
      portName: "Linear2",
      containerName: "root",
      select: () => d1.value + 1,
    });

    expect(d2.value).toBe(21);
  });

  it("evaluation state cleaned up after cycle error", () => {
    const sig = createSignal(5);

    const selfRef: { value: unknown } = createDerivedServiceImpl({
      portName: "CleanupTest",
      containerName: "root",
      select: () => {
        sig.get();
        return (selfRef as { value: unknown }).value;
      },
    });

    // Trigger cycle
    try {
      void selfRef.value;
    } catch {
      /* expected */
    }

    // Create a fresh derived with the same port name — should work
    const fresh = createDerivedServiceImpl({
      portName: "CleanupTest",
      containerName: "root",
      select: () => sig.get() + 1,
    });

    expect(fresh.value).toBe(6);
  });
});

// =============================================================================
// LinkedDerivedService circular detection integration
// =============================================================================

describe("LinkedDerivedService circular detection", () => {
  it("self-referencing linked derived throws CircularDerivedDependency", () => {
    const sig = createSignal(0);

    const selfRef: { value: unknown } = createLinkedDerivedServiceImpl({
      portName: "LinkedSelfRef",
      containerName: "root",
      select: () => {
        sig.get();
        return (selfRef as { value: unknown }).value;
      },
      write: () => {
        /* noop */
      },
    });

    expectTaggedThrow(() => selfRef.value, "CircularDerivedDependency");
  });

  it("linked derived in a cycle with regular derived throws CircularDerivedDependency", () => {
    // eslint-disable-next-line prefer-const -- mutual reference requires let
    let linkedB: { value: unknown };

    const derivedA = createDerivedServiceImpl({
      portName: "MixedCycleA",
      containerName: "root",
      select: () => (linkedB as { value: unknown }).value,
    });

    linkedB = createLinkedDerivedServiceImpl({
      portName: "MixedCycleB",
      containerName: "root",
      select: () => derivedA.value,
      write: () => {
        /* noop */
      },
    });

    expectTaggedThrow(() => derivedA.value, "CircularDerivedDependency");
  });
});
