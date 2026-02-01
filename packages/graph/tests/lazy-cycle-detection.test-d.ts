/**
 * Type-level tests for lazy port cycle detection.
 *
 * ## Design Intent: Lazy Ports Break Cycles
 *
 * Lazy ports are an INTENTIONAL mechanism to break circular dependencies
 * at initialization time. When you use `lazyPort(A)`, you're explicitly
 * saying "I want to defer resolution of A to break an initialization cycle."
 *
 * ### How it works:
 * 1. B requires LazyA (lazy dependency)
 * 2. Dependency graph records: { B: "LazyA" }
 * 3. Cycle detection looks for path to "LazyA" (not "A")
 * 4. No cycle detected because "LazyA" != "A"
 *
 * ### Why this is correct:
 * - At initialization time, B gets a thunk (no A yet)
 * - A initializes later
 * - When B calls the thunk, A exists
 * - The "cycle" is broken for initialization purposes
 *
 * ### What IS tracked correctly:
 * - $unsatisfied shows "A" (original port) - TransformLazyToOriginal is used
 * - "Missing adapters" errors say "A" not "LazyA"
 * - Only the internal cycle detection graph uses lazy names (intentionally)
 *
 * @packageDocumentation
 */
import { describe, expectTypeOf, it } from "vitest";
import { createPort, createAdapter, lazyPort } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";

const PortA = createPort<"A", { doA(): void }>("A");
const PortB = createPort<"B", { doB(): void }>("B");

describe("Lazy ports break cycles (intentional design)", () => {
  it("allows A->B, B->lazy(A) because lazy breaks the cycle", () => {
    const LazyA = lazyPort(PortA);

    const AdapterA = createAdapter({
      provides: PortA,
      requires: [PortB] as const,
      lifetime: "singleton",
      factory: () => ({ doA: () => {} }),
    });

    const AdapterB = createAdapter({
      provides: PortB,
      requires: [LazyA] as const, // Lazy breaks cycle!
      lifetime: "singleton",
      factory: ({ LazyA: getA }) => ({
        doB: () => {
          getA();
        },
      }),
    });

    // Register B first, then A - this would be a cycle without lazy
    const builder = GraphBuilder.create().provide(AdapterB).provide(AdapterA);

    // Should NOT be a cycle error - lazy breaks the cycle
    type IsCycleError = typeof builder extends `ERROR[HEX002]: ${string}` ? true : false;
    expectTypeOf<IsCycleError>().toEqualTypeOf<false>();
  });

  it("$unsatisfied shows original port name (not lazy)", () => {
    // This verifies that TransformLazyToOriginal is used for $unsatisfied
    // even though the cycle detection graph uses lazy names
    const LazyA = lazyPort(PortA);

    const AdapterB = createAdapter({
      provides: PortB,
      requires: [LazyA] as const,
      lifetime: "singleton",
      factory: ({ LazyA: getA }) => ({
        doB: () => getA(),
      }),
    });

    const builder = GraphBuilder.create().provide(AdapterB);

    // $unsatisfied should show original port (A), not lazy port (LazyA)
    type Unsatisfied = typeof builder.$unsatisfied;
    expectTypeOf<Unsatisfied>().toEqualTypeOf<typeof PortA>();
  });

  it("still detects non-lazy cycles correctly", () => {
    const AdapterA = createAdapter({
      provides: PortA,
      requires: [PortB] as const,
      lifetime: "singleton",
      factory: () => ({ doA: () => {} }),
    });

    const AdapterB = createAdapter({
      provides: PortB,
      requires: [PortA] as const, // Non-lazy - creates cycle
      lifetime: "singleton",
      factory: () => ({ doB: () => {} }),
    });

    // This SHOULD be a cycle error
    const builder = GraphBuilder.create().provide(AdapterB).provide(AdapterA);

    type IsCycleError = typeof builder extends `ERROR[HEX002]: ${string}` ? true : false;
    expectTypeOf<IsCycleError>().toEqualTypeOf<true>();
  });
});
