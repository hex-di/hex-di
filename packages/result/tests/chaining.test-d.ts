import { describe, it, expectTypeOf } from "vitest";
import { ok, err } from "../src/index.js";
import type { Result } from "../src/index.js";

describe("Chaining - Type Level", () => {
  // DoD 5 type #1
  it("ok(1).andThen(v => ok('str')) infers Result<string, never>", () => {
    const result = ok(1).andThen(() => ok("str"));
    expectTypeOf(result).toMatchTypeOf<Result<string, never>>();
  });

  // DoD 5 type #2
  it("andThen accumulates error types", () => {
    type A = { _tag: "A" };
    type B = { _tag: "B" };
    const r: Result<number, A> = ok(1);
    const result = r.andThen((): Result<string, B> => ok("x"));
    expectTypeOf(result).toMatchTypeOf<Result<string, A | B>>();
  });

  // DoD 5 type #3
  it("Three andThen calls accumulate three error types in union", () => {
    type E1 = { _tag: "E1" };
    type E2 = { _tag: "E2" };
    type E3 = { _tag: "E3" };
    const r: Result<number, E1> = ok(1);
    const result = r
      .andThen((): Result<string, E2> => ok("x"))
      .andThen((): Result<boolean, E3> => ok(true));
    expectTypeOf(result).toMatchTypeOf<Result<boolean, E1 | E2 | E3>>();
  });

  // DoD 5 type #4
  it("orElse replaces error type", () => {
    type A = { _tag: "A" };
    type B = { _tag: "B" };
    const r: Result<number, A> = err({ _tag: "A" });
    const result = r.orElse((): Result<number, B> => ok(99));
    expectTypeOf(result).toMatchTypeOf<Result<number, B>>();
  });

  // DoD 5 type #5
  it("andThrough adds error type", () => {
    type A = { _tag: "A" };
    type B = { _tag: "B" };
    const r: Result<number, A> = ok(42);
    const result = r.andThrough((): Result<unknown, B> => ok("x"));
    expectTypeOf(result).toMatchTypeOf<Result<number, A | B>>();
  });

  // DoD 5 type #6
  it("andTee does not change error type", () => {
    type A = { _tag: "A" };
    const r: Result<number, A> = ok(42);
    const result = r.andTee(() => {});
    expectTypeOf(result).toMatchTypeOf<Result<number, A>>();
  });

  // DoD 5 type #7
  it("orTee does not change value type", () => {
    type A = { _tag: "A" };
    const r: Result<number, A> = err({ _tag: "A" });
    const result = r.orTee(() => {});
    expectTypeOf(result).toMatchTypeOf<Result<number, A>>();
  });
});
