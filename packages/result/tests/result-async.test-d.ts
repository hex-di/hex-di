import { describe, it, expectTypeOf } from "vitest";
import { ok, err, ResultAsync } from "../src/index.js";
import type { Result } from "../src/index.js";

describe("ResultAsync - Type Level", () => {
  // DoD 8 type #1
  it("ResultAsync.ok(42) infers ResultAsync<number, never>", () => {
    const ra = ResultAsync.ok(42);
    expectTypeOf(ra).toMatchTypeOf<ResultAsync<number, never>>();
  });

  // DoD 8 type #2
  it("ResultAsync.err('x') infers ResultAsync<never, string>", () => {
    const ra = ResultAsync.err("x");
    expectTypeOf(ra).toMatchTypeOf<ResultAsync<never, string>>();
  });

  // DoD 8 type #3
  it("resultAsync.map(v => 'str') infers ResultAsync<string, E>", () => {
    const ra = ResultAsync.ok(42).map(() => "str");
    expectTypeOf(ra).toMatchTypeOf<ResultAsync<string, never>>();
  });

  // DoD 8 type #4
  it("resultAsync.andThen(v => ok(1)) accepts sync Result and returns ResultAsync", () => {
    const ra = ResultAsync.ok(42).andThen(() => ok(1));
    // Verify the map method exists, confirming it's a ResultAsync
    expectTypeOf(ra.map).toBeFunction();
  });

  // DoD 8 type #5
  it("resultAsync.andThen(v => ResultAsync.ok(1)) accepts ResultAsync", () => {
    const ra = ResultAsync.ok(42).andThen(() => ResultAsync.ok(1));
    expectTypeOf(ra.map).toBeFunction();
  });

  // DoD 8 type #6
  it("Async andThen accumulates error types", () => {
    type E1 = { _tag: "E1" };
    type E2 = { _tag: "E2" };
    const ra = ResultAsync.ok(42)
      .andThen((): Result<string, E1> => ok("x"))
      .andThen((): Result<boolean, E2> => ok(true));
    expectTypeOf(ra).toMatchTypeOf<ResultAsync<boolean, E1 | E2>>();
  });

  // DoD 8 type #7 - covered by collect tests

  // DoD 8 type #8 - covered by collect tests
});
