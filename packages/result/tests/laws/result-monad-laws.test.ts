/**
 * Property-based tests for Result monad laws.
 *
 * Verifies BEH-16-001 (left identity), BEH-16-002 (right identity),
 * BEH-16-003 (associativity) using fast-check.
 *
 * Cross-refs: INV-17, INV-18, INV-19
 */

import { describe, it } from "vitest";
import * as fc from "fast-check";
import { ok, err } from "../../src/index.js";
import type { Result } from "../../src/index.js";
import { arbResult, arbOk, arbErr } from "../arbitraries.js";

const NUM_RUNS = 1000;

/**
 * Structural equality for Result values.
 * Compares _tag and value/error fields.
 */
function resultEqual<T, E>(a: Result<T, E>, b: Result<T, E>): boolean {
  if (a._tag !== b._tag) return false;
  if (a._tag === "Ok" && b._tag === "Ok") return a.value === b.value;
  if (a._tag === "Err" && b._tag === "Err") return a.error === b.error;
  return false;
}

describe("Result Monad Laws (BEH-16)", () => {
  // -------------------------------------------------------------------
  // BEH-16-001: Left Identity
  // ok(a).andThen(f) === f(a)
  // -------------------------------------------------------------------
  describe("BEH-16-001: Monad Left Identity — ok(a).andThen(f) === f(a)", () => {
    it("holds for integer values with identity-wrapped f", () => {
      fc.assert(
        fc.property(fc.integer(), a => {
          const f = (x: number) => ok(x);
          return resultEqual(ok(a).andThen(f), f(a));
        }),
        { numRuns: NUM_RUNS }
      );
    });

    it("holds for integer values with value-transforming f", () => {
      fc.assert(
        fc.property(fc.integer(), a => {
          const f = (x: number) => ok(x * 2 + 1);
          return resultEqual(ok(a).andThen(f), f(a));
        }),
        { numRuns: NUM_RUNS }
      );
    });

    it("holds for integer values with error-producing f", () => {
      fc.assert(
        fc.property(fc.integer(), a => {
          const f = (x: number): Result<number, string> => (x >= 0 ? ok(x * 2) : err("negative"));
          return resultEqual(ok(a).andThen(f), f(a));
        }),
        { numRuns: NUM_RUNS }
      );
    });

    it("holds for string values", () => {
      fc.assert(
        fc.property(fc.string(), a => {
          const f = (s: string): Result<number, string> =>
            s.length > 0 ? ok(s.length) : err("empty");
          return resultEqual(ok(a).andThen(f), f(a));
        }),
        { numRuns: NUM_RUNS }
      );
    });

    it("holds for array values", () => {
      fc.assert(
        fc.property(fc.array(fc.integer()), a => {
          const f = (arr: ReadonlyArray<number>): Result<number, string> =>
            arr.length > 0 ? ok(arr.length) : err("empty array");
          return resultEqual(ok(a).andThen(f), f(a));
        }),
        { numRuns: NUM_RUNS }
      );
    });

    it("holds for object values", () => {
      fc.assert(
        fc.property(fc.record({ x: fc.integer(), y: fc.string() }), a => {
          const f = (obj: { x: number; y: string }) => ok(obj.x + obj.y.length);
          return resultEqual(ok(a).andThen(f), f(a));
        }),
        { numRuns: NUM_RUNS }
      );
    });
  });

  // -------------------------------------------------------------------
  // BEH-16-002: Right Identity
  // m.andThen(ok) === m
  // -------------------------------------------------------------------
  describe("BEH-16-002: Monad Right Identity — m.andThen(ok) === m", () => {
    it("holds for Ok values", () => {
      fc.assert(
        fc.property(arbOk(fc.integer()), m => {
          return resultEqual(m.andThen(ok), m);
        }),
        { numRuns: NUM_RUNS }
      );
    });

    it("holds for Err values", () => {
      fc.assert(
        fc.property(arbErr(fc.string()), m => {
          const result = m.andThen(ok);
          // Err short-circuits andThen: result should be the same Err
          return result._tag === "Err" && m._tag === "Err" && result.error === m.error;
        }),
        { numRuns: NUM_RUNS }
      );
    });

    it("holds for arbitrary Result<number, string>", () => {
      fc.assert(
        fc.property(arbResult(fc.integer(), fc.string()), m => {
          return resultEqual(m.andThen(ok), m);
        }),
        { numRuns: NUM_RUNS }
      );
    });

    it("holds for Result<string, number>", () => {
      fc.assert(
        fc.property(arbResult(fc.string(), fc.integer()), m => {
          return resultEqual(m.andThen(ok), m);
        }),
        { numRuns: NUM_RUNS }
      );
    });
  });

  // -------------------------------------------------------------------
  // BEH-16-003: Associativity
  // m.andThen(f).andThen(g) === m.andThen(x => f(x).andThen(g))
  // -------------------------------------------------------------------
  describe("BEH-16-003: Monad Associativity — m.andThen(f).andThen(g) === m.andThen(x => f(x).andThen(g))", () => {
    it("holds when both f and g succeed", () => {
      const f = (x: number) => ok(x + 1);
      const g = (x: number) => ok(x * 2);

      fc.assert(
        fc.property(arbResult(fc.integer(), fc.string()), m => {
          const left = m.andThen(f).andThen(g);
          const right = m.andThen(x => f(x).andThen(g));
          return resultEqual(left, right);
        }),
        { numRuns: NUM_RUNS }
      );
    });

    it("holds when f may fail", () => {
      const f = (x: number): Result<number, string> => (x > 0 ? ok(x + 1) : err("neg"));
      const g = (x: number) => ok(x * 2);

      fc.assert(
        fc.property(arbResult(fc.integer(), fc.string()), m => {
          const left = m.andThen(f).andThen(g);
          const right = m.andThen(x => f(x).andThen(g));
          return resultEqual(left, right);
        }),
        { numRuns: NUM_RUNS }
      );
    });

    it("holds when g may fail", () => {
      const f = (x: number) => ok(x + 1);
      const g = (x: number): Result<number, string> => (x < 100 ? ok(x * 2) : err("overflow"));

      fc.assert(
        fc.property(arbResult(fc.integer(), fc.string()), m => {
          const left = m.andThen(f).andThen(g);
          const right = m.andThen(x => f(x).andThen(g));
          return resultEqual(left, right);
        }),
        { numRuns: NUM_RUNS }
      );
    });

    it("holds when both f and g may fail", () => {
      const f = (x: number): Result<number, string> => (x > 0 ? ok(x + 1) : err("neg"));
      const g = (x: number): Result<number, string> => (x < 100 ? ok(x * 2) : err("big"));

      fc.assert(
        fc.property(arbResult(fc.integer(), fc.string()), m => {
          const left = m.andThen(f).andThen(g);
          const right = m.andThen(x => f(x).andThen(g));
          return resultEqual(left, right);
        }),
        { numRuns: NUM_RUNS }
      );
    });

    it("holds for string-based functions", () => {
      const f = (s: string): Result<number, string> => (s.length > 0 ? ok(s.length) : err("empty"));
      const g = (n: number): Result<string, string> =>
        n < 50 ? ok("x".repeat(n)) : err("too long");

      fc.assert(
        fc.property(arbResult(fc.string(), fc.string()), m => {
          const left = m.andThen(f).andThen(g);
          const right = m.andThen(x => f(x).andThen(g));
          return resultEqual(left, right);
        }),
        { numRuns: NUM_RUNS }
      );
    });
  });
});
