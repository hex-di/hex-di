import { describe, it, expectTypeOf } from "vitest";
import { ok, err } from "../src/index.js";
import type { Result } from "../src/index.js";
import type { ResultAsync } from "../src/core/types.js";
import { safeTry } from "../src/generators/safe-try.js";

describe("Generators - Type Level", () => {
  // DoD 9 type #1
  it("safeTry sync return type is Result<T, E>", () => {
    const result = safeTry(function* () {
      const n = yield* ok(1);
      return ok(n + 1);
    });
    expectTypeOf(result).toMatchTypeOf<Result<number, never>>();
  });

  // DoD 9 type #2
  it("safeTry async return type is ResultAsync<T, E>", () => {
    const result = safeTry(async function* () {
      const n = yield* ok(1);
      return ok(n + 1);
    });
    expectTypeOf(result).toMatchTypeOf<ResultAsync<number, never>>();
  });

  // DoD 9 type #3
  it("yield* on Ok<number, never> produces number", () => {
    safeTry(function* () {
      const n = yield* ok(42);
      expectTypeOf(n).toEqualTypeOf<number>();
      return ok(n);
    });
  });

  // DoD 9 type #4
  it("Error types from multiple yields accumulate in union", () => {
    type E1 = { _tag: "E1" };
    type E2 = { _tag: "E2" };

    function step1(): Result<number, E1> {
      return ok(1);
    }
    function step2(): Result<string, E2> {
      return err({ _tag: "E2" });
    }

    const result = safeTry(function* () {
      const a = yield* step1();
      const b = yield* step2();
      return ok(`${a}-${b}`);
    });

    expectTypeOf(result).toMatchTypeOf<Result<string, E1 | E2>>();
  });
});
