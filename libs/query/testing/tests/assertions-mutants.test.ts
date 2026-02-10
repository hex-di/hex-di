import { describe, it, expect } from "vitest";
import { ok, err } from "@hex-di/result";
import type { QueryState } from "@hex-di/query";
import { expectQueryState, expectQueryResult } from "../src/index.js";

// =============================================================================
// Test helpers
// =============================================================================

function makeQueryState<TData, TError>(
  overrides: Partial<QueryState<TData, TError>>
): QueryState<TData, TError> {
  return {
    status: "pending",
    data: undefined,
    error: undefined,
    isFetching: false,
    isRefetching: false,
    isSuccess: false,
    isError: false,
    isStale: false,
    dataUpdatedAt: undefined,
    errorUpdatedAt: undefined,
    fetchCount: 0,
    ...overrides,
  } as QueryState<TData, TError>;
}

// =============================================================================
// expectQueryState — mutation killers
//
// The optional parameter pattern:
//   toBeSuccess(data?: TData) { ... if (data !== undefined) expect(state.data).toEqual(data) }
//
// Mutants:
// 1. Remove `if (data !== undefined)` → always compare data (fails when called without arg)
// 2. Negate condition → never compare data (fails when called with wrong arg)
// 3. Remove the expect(...).toEqual(...) → no data assertion even when provided
//
// To kill: call with no arg (status-only), with matching arg, with wrong arg.
// =============================================================================

describe("expectQueryState (mutation killers)", () => {
  // --- toBeSuccess without data arg: only checks status ---
  it("toBeSuccess without data arg does not check data value", () => {
    const state = makeQueryState({
      status: "success",
      isSuccess: true,
      data: "any-data-here",
    });

    // Should pass regardless of what data contains
    expectQueryState(state).toBeSuccess();
  });

  // --- toBeSuccess with undefined-valued data in state ---
  it("toBeSuccess with matching undefined data passes", () => {
    const state = makeQueryState({
      status: "success",
      isSuccess: true,
      data: undefined,
    });

    // Called without arg, should pass
    expectQueryState(state).toBeSuccess();
  });

  // --- toBeSuccess with correct data ---
  it("toBeSuccess with correct data passes", () => {
    const state = makeQueryState({
      status: "success",
      isSuccess: true,
      data: [1, 2, 3],
    });

    expectQueryState(state).toBeSuccess([1, 2, 3]);
  });

  // --- toBeSuccess with wrong data throws ---
  it("toBeSuccess with wrong data throws", () => {
    const state = makeQueryState({
      status: "success",
      isSuccess: true,
      data: [1, 2, 3],
    });

    expect(() => expectQueryState(state).toBeSuccess([4, 5, 6])).toThrow();
  });

  // --- toBeError without error arg: only checks status ---
  it("toBeError without error arg does not check error value", () => {
    const state = makeQueryState({
      status: "error",
      isError: true,
      error: { _tag: "NetworkError", message: "Oops" },
    });

    expectQueryState(state).toBeError();
  });

  // --- toBeError with correct error ---
  it("toBeError with correct error passes", () => {
    const error = { _tag: "NetworkError", message: "Fail" };
    const state = makeQueryState({
      status: "error",
      isError: true,
      error,
    });

    expectQueryState(state).toBeError(error);
  });

  // --- toBeError with wrong error throws ---
  it("toBeError with wrong error throws", () => {
    const state = makeQueryState({
      status: "error",
      isError: true,
      error: { _tag: "A" },
    });

    expect(() => expectQueryState(state).toBeError({ _tag: "B" })).toThrow();
  });
});

// =============================================================================
// expectQueryResult — mutation killers
//
// Same optional parameter pattern as above, plus the guard:
//   if (result === undefined) return;
//   expect(result._tag).toBe("Ok");
//   if (data !== undefined && result._tag === "Ok") { expect(result.value).toEqual(data); }
//
// Mutants:
// 1. Remove `expect(result).toBeDefined()` → undefined result silently passes
// 2. Remove `result._tag === "Ok"` from compound condition → checks value on Err
// 3. Remove `if (data !== undefined ...)` → always checks value
// =============================================================================

describe("expectQueryResult (mutation killers)", () => {
  // --- toBeOk on undefined result: should fail ---
  it("toBeOk fails when result is undefined", () => {
    expect(() => expectQueryResult(undefined).toBeOk()).toThrow();
  });

  // --- toBeOk without data arg: only checks tag ---
  it("toBeOk without data arg does not check value", () => {
    const result = ok("anything");
    expectQueryResult(result).toBeOk();
  });

  // --- toBeOk with correct data ---
  it("toBeOk with correct data passes", () => {
    const data = [1, 2, 3];
    expectQueryResult(ok(data)).toBeOk(data);
  });

  // --- toBeOk with wrong data throws ---
  it("toBeOk with wrong data throws", () => {
    expect(() => expectQueryResult(ok([1, 2])).toBeOk([3, 4])).toThrow();
  });

  // --- toBeErr on undefined result: should fail ---
  it("toBeErr fails when result is undefined", () => {
    expect(() => expectQueryResult(undefined).toBeErr()).toThrow();
  });

  // --- toBeErr without error arg: only checks tag ---
  it("toBeErr without error arg does not check error value", () => {
    const result = err("some-error");
    expectQueryResult(result).toBeErr();
  });

  // --- toBeErr with correct error ---
  it("toBeErr with correct error passes", () => {
    const error = { _tag: "NotFound" };
    expectQueryResult(err(error)).toBeErr(error);
  });

  // --- toBeErr with wrong error throws ---
  it("toBeErr with wrong error throws", () => {
    expect(() => expectQueryResult(err({ _tag: "A" })).toBeErr({ _tag: "B" })).toThrow();
  });

  // --- toBeOk on undefined result with data arg: should still fail ---
  it("toBeOk with data arg on undefined result throws", () => {
    expect(() => expectQueryResult<number, string>(undefined).toBeOk(42)).toThrow();
  });

  // --- toBeErr on undefined result with error arg: should still fail ---
  it("toBeErr with error arg on undefined result throws", () => {
    expect(() => expectQueryResult<number, string>(undefined).toBeErr("fail")).toThrow();
  });
});
