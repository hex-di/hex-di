import { describe, it, expectTypeOf } from "vitest";
import { ok, err } from "../src/index.js";
import type { Result, Ok, Err } from "../src/core/types.js";
import type {
  InferOk,
  InferErr,
  IsResult,
  FlattenResult,
  InferOkTuple,
  InferErrUnion,
  InferOkRecord,
} from "../src/type-utils.js";

describe("Core Types - Type Level", () => {
  // DoD 1 type #1
  it("Ok<number, never> is assignable to Result<number, string>", () => {
    const success = ok(42);
    expectTypeOf(success).toMatchTypeOf<Result<number, string>>();
  });

  // DoD 1 type #2
  it("Err<never, string> is assignable to Result<number, string>", () => {
    const failure = err("fail");
    expectTypeOf(failure).toMatchTypeOf<Result<number, string>>();
  });

  // DoD 1 type #3
  it("InferOk<Result<number, string>> resolves to number", () => {
    expectTypeOf<InferOk<Result<number, string>>>().toEqualTypeOf<number>();
  });

  // DoD 1 type #4
  it("InferErr<Result<number, string>> resolves to string", () => {
    expectTypeOf<InferErr<Result<number, string>>>().toEqualTypeOf<string>();
  });

  // DoD 1 type #7
  it("IsResult<Result<number, string>> resolves to true", () => {
    expectTypeOf<IsResult<Result<number, string>>>().toEqualTypeOf<true>();
  });

  // DoD 1 type #8
  it("IsResult<string> resolves to false", () => {
    expectTypeOf<IsResult<string>>().toEqualTypeOf<false>();
  });

  // DoD 1 type #10
  it("FlattenResult<Result<Result<number, string>, boolean>> resolves correctly", () => {
    expectTypeOf<FlattenResult<Result<Result<number, string>, boolean>>>().toEqualTypeOf<
      Result<number, string | boolean>
    >();
  });

  // DoD 1 type #11
  it("InferOkTuple extracts Ok types from a tuple of Results", () => {
    expectTypeOf<InferOkTuple<[Result<number, string>, Result<boolean, Error>]>>().toEqualTypeOf<
      [number, boolean]
    >();
  });

  // DoD 1 type #12
  it("InferErrUnion extracts union of Err types", () => {
    expectTypeOf<InferErrUnion<[Result<number, string>, Result<boolean, Error>]>>().toEqualTypeOf<
      string | Error
    >();
  });

  // DoD 1 type #13
  it("InferOkRecord extracts Ok types from a record", () => {
    expectTypeOf<
      InferOkRecord<{ a: Result<number, string>; b: Result<boolean, Error> }>
    >().toEqualTypeOf<{ a: number; b: boolean }>();
  });

  // DoD 1 type #14
  it("Ok phantom type E = never does not widen", () => {
    const success = ok(42); // Ok<number, never>
    // Assigning to a Result with a specific error type should work
    const _result: Result<number, string> = success;
    expectTypeOf(_result).toMatchTypeOf<Result<number, string>>();
  });

  // DoD 1 type #15
  it("Err phantom type T = never does not widen", () => {
    const failure = err("fail"); // Err<never, string>
    const _result: Result<number, string> = failure;
    expectTypeOf(_result).toMatchTypeOf<Result<number, string>>();
  });

  // DoD 2 type #1
  it("ok(42) infers as Ok<number, never>", () => {
    const result = ok(42);
    expectTypeOf(result).toEqualTypeOf<Ok<number, never>>();
  });

  // DoD 2 type #2
  it("err('fail') infers as Err<never, string>", () => {
    const result = err("fail");
    expectTypeOf(result).toEqualTypeOf<Err<never, string>>();
  });
});
