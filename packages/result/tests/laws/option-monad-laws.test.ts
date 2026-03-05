/**
 * Property-based tests for Option monad laws.
 *
 * Verifies BEH-16-006: Option left identity, right identity, and associativity
 * using fast-check.
 */

import { describe, it } from "vitest";
import * as fc from "fast-check";
import { some, none } from "../../src/index.js";
import type { Option } from "../../src/index.js";
import { arbOption, arbSome } from "../arbitraries.js";

const NUM_RUNS = 1000;

/**
 * Structural equality for Option values.
 */
function optionEqual<T>(a: Option<T>, b: Option<T>): boolean {
  if (a._tag !== b._tag) return false;
  if (a._tag === "Some" && b._tag === "Some") return a.value === b.value;
  // Both None
  return true;
}

describe("Option Monad Laws (BEH-16-006)", () => {
  // -------------------------------------------------------------------
  // Left Identity: some(a).andThen(f) === f(a)
  // -------------------------------------------------------------------
  describe("Left Identity — some(a).andThen(f) === f(a)", () => {
    it("holds for integer values with identity-wrapped f", () => {
      fc.assert(
        fc.property(fc.integer(), a => {
          const f = (x: number) => some(x);
          return optionEqual(some(a).andThen(f), f(a));
        }),
        { numRuns: NUM_RUNS }
      );
    });

    it("holds for integer values with value-transforming f", () => {
      fc.assert(
        fc.property(fc.integer(), a => {
          const f = (x: number) => some(x * 2 + 1);
          return optionEqual(some(a).andThen(f), f(a));
        }),
        { numRuns: NUM_RUNS }
      );
    });

    it("holds for integer values with none-producing f", () => {
      fc.assert(
        fc.property(fc.integer(), a => {
          const f = (x: number): Option<number> => (x >= 0 ? some(x * 2) : none());
          return optionEqual(some(a).andThen(f), f(a));
        }),
        { numRuns: NUM_RUNS }
      );
    });

    it("holds for string values", () => {
      fc.assert(
        fc.property(fc.string(), a => {
          const f = (s: string): Option<number> => (s.length > 0 ? some(s.length) : none());
          return optionEqual(some(a).andThen(f), f(a));
        }),
        { numRuns: NUM_RUNS }
      );
    });
  });

  // -------------------------------------------------------------------
  // Right Identity: m.andThen(some) === m
  // -------------------------------------------------------------------
  describe("Right Identity — m.andThen(some) === m", () => {
    it("holds for Some values", () => {
      fc.assert(
        fc.property(arbSome(fc.integer()), m => {
          return optionEqual(m.andThen(some), m);
        }),
        { numRuns: NUM_RUNS }
      );
    });

    it("holds for None values", () => {
      // None.andThen short-circuits, so none().andThen(some) === none()
      const m = none();
      const result = m.andThen(some);
      return optionEqual(result, m);
    });

    it("holds for arbitrary Option<number>", () => {
      fc.assert(
        fc.property(arbOption(fc.integer()), m => {
          return optionEqual(m.andThen(some), m);
        }),
        { numRuns: NUM_RUNS }
      );
    });

    it("holds for arbitrary Option<string>", () => {
      fc.assert(
        fc.property(arbOption(fc.string()), m => {
          return optionEqual(m.andThen(some), m);
        }),
        { numRuns: NUM_RUNS }
      );
    });
  });

  // -------------------------------------------------------------------
  // Associativity: m.andThen(f).andThen(g) === m.andThen(x => f(x).andThen(g))
  // -------------------------------------------------------------------
  describe("Associativity — m.andThen(f).andThen(g) === m.andThen(x => f(x).andThen(g))", () => {
    it("holds when both f and g produce Some", () => {
      const f = (x: number) => some(x + 1);
      const g = (x: number) => some(x * 2);

      fc.assert(
        fc.property(arbOption(fc.integer()), m => {
          const left = m.andThen(f).andThen(g);
          const right = m.andThen(x => f(x).andThen(g));
          return optionEqual(left, right);
        }),
        { numRuns: NUM_RUNS }
      );
    });

    it("holds when f may produce None", () => {
      const f = (x: number): Option<number> => (x > 0 ? some(x + 1) : none());
      const g = (x: number) => some(x * 2);

      fc.assert(
        fc.property(arbOption(fc.integer()), m => {
          const left = m.andThen(f).andThen(g);
          const right = m.andThen(x => f(x).andThen(g));
          return optionEqual(left, right);
        }),
        { numRuns: NUM_RUNS }
      );
    });

    it("holds when g may produce None", () => {
      const f = (x: number) => some(x + 1);
      const g = (x: number): Option<number> => (x < 100 ? some(x * 2) : none());

      fc.assert(
        fc.property(arbOption(fc.integer()), m => {
          const left = m.andThen(f).andThen(g);
          const right = m.andThen(x => f(x).andThen(g));
          return optionEqual(left, right);
        }),
        { numRuns: NUM_RUNS }
      );
    });

    it("holds when both f and g may produce None", () => {
      const f = (x: number): Option<number> => (x > 0 ? some(x + 1) : none());
      const g = (x: number): Option<number> => (x < 100 ? some(x * 2) : none());

      fc.assert(
        fc.property(arbOption(fc.integer()), m => {
          const left = m.andThen(f).andThen(g);
          const right = m.andThen(x => f(x).andThen(g));
          return optionEqual(left, right);
        }),
        { numRuns: NUM_RUNS }
      );
    });

    it("holds for string-based functions", () => {
      const f = (s: string): Option<number> => (s.length > 0 ? some(s.length) : none());
      const g = (n: number): Option<string> => (n < 50 ? some("x".repeat(n)) : none());

      fc.assert(
        fc.property(arbOption(fc.string()), m => {
          const left = m.andThen(f).andThen(g);
          const right = m.andThen(x => f(x).andThen(g));
          return optionEqual(left, right);
        }),
        { numRuns: NUM_RUNS }
      );
    });
  });
});
