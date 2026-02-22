import { describe, it, expectTypeOf } from "vitest";
import { ok, err } from "../src/index.js";
import type { Result, Ok, Err } from "../src/index.js";
import type { ResultAsync } from "../src/core/types.js";

describe("Extraction - Type Level", () => {
  // DoD 6 type #1
  it("match return type is union of both handler return types", () => {
    // On Ok<number, string>, match returns A (string here)
    const okResult = ok(42).match(
      v => v.toString(),
      (e: never) => 0
    );
    expectTypeOf(okResult).toEqualTypeOf<string>();
    // On Err<number, string>, match returns B (number here)
    const errResult = err("x").match(
      (v: never) => "",
      e => e.length
    );
    expectTypeOf(errResult).toEqualTypeOf<number>();
  });

  // DoD 6 type #2
  it("unwrapOr return type on Ok is T", () => {
    const value = ok(42).unwrapOr(null);
    expectTypeOf(value).toEqualTypeOf<number>();
  });

  // DoD 6 type #3
  it("toNullable return type on Ok is T", () => {
    const value = ok(42).toNullable();
    expectTypeOf(value).toEqualTypeOf<number>();
  });

  // DoD 6 type #4
  it("toUndefined return type on Ok is T", () => {
    const value = ok(42).toUndefined();
    expectTypeOf(value).toEqualTypeOf<number>();
  });

  // DoD 6 type #5
  it("intoTuple return type on Ok is [null, T]", () => {
    const tuple = ok(42).intoTuple();
    expectTypeOf(tuple).toEqualTypeOf<[null, number]>();
  });

  // DoD 6 type #6
  it("merge return type is T on Ok, E on Err", () => {
    const okMerge = ok(42).merge();
    expectTypeOf(okMerge).toEqualTypeOf<number>();
    const errMerge = err("x").merge();
    expectTypeOf(errMerge).toEqualTypeOf<string>();
  });

  // DoD 6 type #7
  it("toAsync return type is ResultAsync<T, E>", () => {
    expectTypeOf(ok(42).toAsync).returns.toMatchTypeOf<ResultAsync<number, never>>();
  });

  // DoD 6 type #8
  it("asyncMap return type is ResultAsync<U, E>", () => {
    // Just check the signature exists and returns the right shape
    const fn = async (v: number) => String(v);
    expectTypeOf(ok(42).asyncMap(fn)).toMatchTypeOf<ResultAsync<string, never>>();
  });

  // DoD 6 type #9
  it("toJSON return type matches discriminated union shape", () => {
    const okJson = ok(42).toJSON();
    expectTypeOf(okJson).toEqualTypeOf<{ _tag: "Ok"; _schemaVersion: 1; value: number }>();
    const errJson = err("x").toJSON();
    expectTypeOf(errJson).toEqualTypeOf<{ _tag: "Err"; _schemaVersion: 1; error: string }>();
  });
});
