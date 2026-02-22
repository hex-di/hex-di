import { describe, it, expectTypeOf } from "vitest";
import { ok, err } from "../src/index.js";
import type { Result } from "../src/index.js";
import { bind, let_ } from "../src/do/bind.js";

// BEH-12-002, BEH-12-003
describe("Do Notation - Type Level", () => {
  it("bind returns a function compatible with andThen", () => {
    // bind needs context type inference from andThen — test via composition
    const result = ok({}).andThen(bind("x", () => ok(1)));
    expectTypeOf(result).toMatchTypeOf<Result<{ readonly x: number }, never>>();
  });

  it("bind extends context with the new key via Result.Do", () => {
    // Result.Do is ok({}) — an empty object, not Record<string, unknown>
    const result = ok({}).andThen(bind("x", () => ok(42)));
    expectTypeOf(result).toMatchTypeOf<Result<{ readonly x: number }, never>>();
  });

  it("bind propagates Err type from the inner Result", () => {
    const result = ok({}).andThen(
      bind("x", () => ok(1) as Result<number, "fail">),
    );
    expectTypeOf(result).toMatchTypeOf<Result<{ readonly x: number }, "fail">>();
  });

  it("chained binds accumulate context keys", () => {
    const result = ok({})
      .andThen(bind("x", () => ok(1)))
      .andThen(bind("y", () => ok("hello")));
    expectTypeOf(result).toMatchTypeOf<
      Result<{ readonly x: number; readonly y: string }, never>
    >();
  });

  it("let_ returns a function compatible with andThen", () => {
    // let_ needs context type inference from andThen — test via composition
    const result = ok({}).andThen(let_("label", () => "hello"));
    expectTypeOf(result).toMatchTypeOf<Result<{ readonly label: string }, never>>();
  });

  it("let_ adds plain value to context (never errors)", () => {
    const result = ok({}).andThen(let_("x", () => 42));
    expectTypeOf(result).toMatchTypeOf<Result<{ readonly x: number }, never>>();
  });

  it("bind + let_ compose in a chain", () => {
    const result = ok({})
      .andThen(bind("a", () => ok(10)))
      .andThen(let_("b", (ctx) => ctx.a * 2));
    expectTypeOf(result).toMatchTypeOf<
      Result<{ readonly a: number; readonly b: number }, never>
    >();
  });
});
