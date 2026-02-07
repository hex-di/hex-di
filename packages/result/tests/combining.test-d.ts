import { describe, it, expectTypeOf } from "vitest";
import { ok, err } from "../src/index.js";
import type { Result } from "../src/index.js";
import { all } from "../src/combinators/all.js";
import { allSettled } from "../src/combinators/all-settled.js";
import { any } from "../src/combinators/any.js";
import { collect } from "../src/combinators/collect.js";

describe("Combining - Type Level", () => {
  // DoD 7 type #1
  it("all(ok(1), ok('str')) infers Result<[number, string], never>", () => {
    const result = all(ok(1), ok("str"));
    expectTypeOf(result).toMatchTypeOf<Result<[number, string], never>>();
  });

  // DoD 7 type #2
  it("all(ok(1), err('a')) error type is union of all error types", () => {
    type E1 = { _tag: "E1" };
    type E2 = { _tag: "E2" };
    const r1: Result<number, E1> = ok(1);
    const r2: Result<string, E2> = err({ _tag: "E2" });
    const result = all(r1, r2);
    expectTypeOf(result).toMatchTypeOf<Result<[number, string], E1 | E2>>();
  });

  // DoD 7 type #3
  it("allSettled(ok(1), ok('str')) Ok type is tuple [number, string]", () => {
    const result = allSettled(ok(1), ok("str"));
    if (result.isOk()) {
      expectTypeOf(result.value).toEqualTypeOf<[number, string]>();
    }
  });

  // DoD 7 type #4
  it("allSettled error type is array of error union", () => {
    type E1 = { _tag: "E1" };
    type E2 = { _tag: "E2" };
    const r1: Result<number, E1> = ok(1);
    const r2: Result<string, E2> = err({ _tag: "E2" });
    const result = allSettled(r1, r2);
    if (result.isErr()) {
      expectTypeOf(result.error).toMatchTypeOf<(E1 | E2)[]>();
    }
  });

  // DoD 7 type #5
  it("any Ok type is union of all Ok types", () => {
    const result = any(ok(1), ok("str"));
    if (result.isOk()) {
      expectTypeOf(result.value).toMatchTypeOf<number | string>();
    }
  });

  // DoD 7 type #6
  it("any error type is tuple of all error types", () => {
    type E1 = { _tag: "E1" };
    type E2 = { _tag: "E2" };
    const r1: Result<number, E1> = err({ _tag: "E1" });
    const r2: Result<string, E2> = err({ _tag: "E2" });
    const result = any(r1, r2);
    if (result.isErr()) {
      expectTypeOf(result.error).toMatchTypeOf<[E1, E2]>();
    }
  });

  // DoD 7 type #7
  it("collect({ a: ok(1), b: ok('str') }) infers correct record type", () => {
    const result = collect({ a: ok(1), b: ok("str") });
    if (result.isOk()) {
      expectTypeOf(result.value).toEqualTypeOf<{ a: number; b: string }>();
    }
  });

  // DoD 7 type #8
  it("collect error type is union of all record entry error types", () => {
    type E1 = { _tag: "E1" };
    type E2 = { _tag: "E2" };
    const result = collect({
      a: ok(1) as Result<number, E1>,
      b: err({ _tag: "E2" }) as Result<string, E2>,
    });
    if (result.isErr()) {
      expectTypeOf(result.error).toMatchTypeOf<E1 | E2>();
    }
  });
});
