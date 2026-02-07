import { describe, it, expectTypeOf } from "vitest";
import { ok, err } from "../src/index.js";
import type { Result, Ok, Err } from "../src/index.js";
import { isResult } from "../src/core/guards.js";

describe("Type Guards - Type Level", () => {
  // DoD 3 type #1
  it("After isOk() guard, value is accessible", () => {
    const result: Result<number, string> = ok(42);
    if (result.isOk()) {
      expectTypeOf(result.value).toEqualTypeOf<number>();
    }
  });

  // DoD 3 type #2
  it("After isErr() guard, error is accessible", () => {
    const result: Result<number, string> = err("fail");
    if (result.isErr()) {
      expectTypeOf(result.error).toEqualTypeOf<string>();
    }
  });

  // DoD 3 type #3
  it("isResult is a type guard: value is Result<unknown, unknown>", () => {
    const value: unknown = ok(42);
    if (isResult(value)) {
      expectTypeOf(value).toMatchTypeOf<Result<unknown, unknown>>();
    }
  });

  // DoD 3 type #4
  it("After _tag === 'Ok' check, type is narrowed to Ok variant", () => {
    const result: Result<number, string> = ok(42);
    if (result._tag === "Ok") {
      expectTypeOf(result).toMatchTypeOf<Ok<number, string>>();
      expectTypeOf(result.value).toEqualTypeOf<number>();
    }
  });

  // DoD 3 type #5
  it("After _tag === 'Err' check, type is narrowed to Err variant", () => {
    const result: Result<number, string> = err("fail");
    if (result._tag === "Err") {
      expectTypeOf(result).toMatchTypeOf<Err<number, string>>();
      expectTypeOf(result.error).toEqualTypeOf<string>();
    }
  });
});
