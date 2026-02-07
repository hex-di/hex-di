import { describe, it, expectTypeOf } from "vitest";
import { ok, err } from "../src/index.js";
import type { Result, Ok, Err } from "../src/index.js";
import { fromThrowable } from "../src/constructors/from-throwable.js";
import { fromNullable } from "../src/constructors/from-nullable.js";
import { fromPredicate } from "../src/constructors/from-predicate.js";
import { tryCatch } from "../src/constructors/try-catch.js";

describe("Constructors - Type Level", () => {
  // DoD 2 type #1
  it("ok(42) infers as Ok<number, never>", () => {
    expectTypeOf(ok(42)).toEqualTypeOf<Ok<number, never>>();
  });

  // DoD 2 type #2
  it("err('fail') infers as Err<never, string>", () => {
    expectTypeOf(err("fail")).toEqualTypeOf<Err<never, string>>();
  });

  // DoD 2 type #3
  it("fromThrowable return type matches Result<T, E>", () => {
    const result = fromThrowable(
      () => 42,
      () => "error"
    );
    expectTypeOf(result).toMatchTypeOf<Result<number, string>>();
  });

  // DoD 2 type #4
  it("fromThrowable function-wrapping overload infers argument types", () => {
    const safeParse = fromThrowable(
      (input: string) => JSON.parse(input),
      () => "error"
    );
    expectTypeOf(safeParse).toBeFunction();
    expectTypeOf(safeParse).parameter(0).toEqualTypeOf<string>();
  });

  // DoD 2 type #7
  it("fromNullable strips null/undefined from Ok type", () => {
    const value: string | null | undefined = "hello";
    const result = fromNullable(value, () => "was null");
    expectTypeOf(result).toMatchTypeOf<Result<string, string>>();
  });

  // DoD 2 type #8
  it("fromPredicate with type guard narrows Ok type to U extends T", () => {
    interface Admin {
      role: "admin";
    }
    interface User {
      role: string;
    }
    const user: User = { role: "admin" };
    const result = fromPredicate(
      user,
      (u): u is Admin => u.role === "admin",
      () => "not admin"
    );
    expectTypeOf(result).toMatchTypeOf<Result<Admin, string>>();
  });

  // DoD 2 type #9
  it("tryCatch infers Result<T, E> from fn and mapErr", () => {
    const result = tryCatch(
      () => 42,
      () => "error"
    );
    expectTypeOf(result).toMatchTypeOf<Result<number, string>>();
  });
});
