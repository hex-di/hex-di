/**
 * Property-based tests for Result functor laws.
 *
 * Verifies BEH-16-004 (functor identity) and BEH-16-005 (functor composition)
 * using fast-check.
 */

import { describe, it } from "vitest";
import * as fc from "fast-check";
import type { Result } from "../../src/index.js";
import { arbResult } from "../arbitraries.js";

const NUM_RUNS = 1000;

/**
 * Structural equality for Result values.
 */
function resultEqual<T, E>(a: Result<T, E>, b: Result<T, E>): boolean {
  if (a._tag !== b._tag) return false;
  if (a._tag === "Ok" && b._tag === "Ok") return a.value === b.value;
  if (a._tag === "Err" && b._tag === "Err") return a.error === b.error;
  return false;
}

describe("Result Functor Laws (BEH-16)", () => {
  // -------------------------------------------------------------------
  // BEH-16-004: Functor Identity
  // m.map(x => x) === m
  // -------------------------------------------------------------------
  describe("BEH-16-004: Functor Identity — m.map(x => x) === m", () => {
    it("holds for Result<number, string>", () => {
      fc.assert(
        fc.property(arbResult(fc.integer(), fc.string()), m => {
          return resultEqual(
            m.map(x => x),
            m
          );
        }),
        { numRuns: NUM_RUNS }
      );
    });

    it("holds for Result<string, number>", () => {
      fc.assert(
        fc.property(arbResult(fc.string(), fc.integer()), m => {
          return resultEqual(
            m.map(x => x),
            m
          );
        }),
        { numRuns: NUM_RUNS }
      );
    });
  });

  // -------------------------------------------------------------------
  // BEH-16-005: Functor Composition
  // m.map(f).map(g) === m.map(x => g(f(x)))
  // -------------------------------------------------------------------
  describe("BEH-16-005: Functor Composition — m.map(f).map(g) === m.map(x => g(f(x)))", () => {
    it("holds for integer transformations", () => {
      const f = (x: number) => x + 1;
      const g = (x: number) => x * 2;

      fc.assert(
        fc.property(arbResult(fc.integer(), fc.string()), m => {
          const left = m.map(f).map(g);
          const right = m.map(x => g(f(x)));
          return resultEqual(left, right);
        }),
        { numRuns: NUM_RUNS }
      );
    });

    it("holds for string transformations", () => {
      const f = (s: string) => s.length;
      const g = (n: number) => n > 5;

      fc.assert(
        fc.property(arbResult(fc.string(), fc.integer()), m => {
          const left = m.map(f).map(g);
          const right = m.map(x => g(f(x)));
          return resultEqual(left, right);
        }),
        { numRuns: NUM_RUNS }
      );
    });

    it("holds for mixed type transformations", () => {
      const f = (x: number) => String(x);
      const g = (s: string) => s.length;

      fc.assert(
        fc.property(arbResult(fc.integer(), fc.string()), m => {
          const left = m.map(f).map(g);
          const right = m.map(x => g(f(x)));
          return resultEqual(left, right);
        }),
        { numRuns: NUM_RUNS }
      );
    });
  });
});
