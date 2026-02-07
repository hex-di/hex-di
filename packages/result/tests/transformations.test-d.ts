import { describe, it, expectTypeOf } from "vitest";
import { ok, err } from "../src/index.js";
import type { Result } from "../src/index.js";

describe("Transformations - Type Level", () => {
  // DoD 4 type #1
  it("ok(1).map(v => String(v)) infers as Result<string, never>", () => {
    const result = ok(1).map(v => String(v));
    expectTypeOf(result).toMatchTypeOf<Result<string, never>>();
  });

  // DoD 4 type #2
  it("err('x').mapErr(e => 42) infers as Result<never, number>", () => {
    const result = err("x").mapErr(() => 42);
    expectTypeOf(result).toMatchTypeOf<Result<never, number>>();
  });

  // DoD 4 type #3
  it("ok(ok(42)).flatten() infers as Result<number, never>", () => {
    const result = ok(ok(42)).flatten();
    expectTypeOf(result).toMatchTypeOf<Result<number, never>>();
  });

  // DoD 4 type #4
  it("ok(42).flip() infers as Result<never, number>", () => {
    const result = ok(42).flip();
    expectTypeOf(result).toMatchTypeOf<Result<never, number>>();
  });

  // DoD 4 type #5
  it("err('x').flip() infers as Result<string, never>", () => {
    const result = err("x").flip();
    expectTypeOf(result).toMatchTypeOf<Result<string, never>>();
  });

  // DoD 4 type #6
  it("mapBoth infers correct transformed types for both branches", () => {
    const result: Result<number, string> = ok(42);
    const mapped = result.mapBoth(
      v => String(v),
      e => new Error(e)
    );
    expectTypeOf(mapped).toMatchTypeOf<Result<string, Error>>();
  });
});
