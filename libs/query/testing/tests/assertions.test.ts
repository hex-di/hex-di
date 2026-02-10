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
// expectQueryState
// =============================================================================

describe("expectQueryState", () => {
  it("toBeLoading asserts pending + fetching", () => {
    const state = makeQueryState({
      status: "pending",
      isFetching: true,
    });

    expectQueryState(state).toBeLoading();
  });

  it("toBeSuccess asserts success status", () => {
    const state = makeQueryState({
      status: "success",
      isSuccess: true,
      data: [1, 2, 3],
    });

    expectQueryState(state).toBeSuccess();
  });

  it("toBeSuccess with data checks data value", () => {
    const data = [{ id: "1", name: "Alice" }];
    const state = makeQueryState({
      status: "success",
      isSuccess: true,
      data,
    });

    expectQueryState(state).toBeSuccess(data);
  });

  it("toBeError asserts error status", () => {
    const state = makeQueryState({
      status: "error",
      isError: true,
      error: { _tag: "NetworkError" },
    });

    expectQueryState(state).toBeError();
  });

  it("toBeError with error checks error value", () => {
    const error = { _tag: "NetworkError", message: "Failed" };
    const state = makeQueryState({
      status: "error",
      isError: true,
      error,
    });

    expectQueryState(state).toBeError(error);
  });

  it("toBeRefetching asserts refetching + fetching", () => {
    const state = makeQueryState({
      isRefetching: true,
      isFetching: true,
    });

    expectQueryState(state).toBeRefetching();
  });

  it("toBeFresh asserts not stale", () => {
    const state = makeQueryState({
      isStale: false,
    });

    expectQueryState(state).toBeFresh();
  });

  it("toBeStale asserts stale", () => {
    const state = makeQueryState({
      isStale: true,
    });

    expectQueryState(state).toBeStale();
  });

  // --- Negative tests: verify assertions throw on wrong state ---

  it("toBeLoading throws on non-loading state", () => {
    const state = makeQueryState({ status: "success", isSuccess: true, isFetching: false });
    expect(() => expectQueryState(state).toBeLoading()).toThrow();
  });

  it("toBeSuccess throws on error state", () => {
    const state = makeQueryState({ status: "error", isError: true, isSuccess: false });
    expect(() => expectQueryState(state).toBeSuccess()).toThrow();
  });

  it("toBeSuccess with wrong data throws", () => {
    const state = makeQueryState({ status: "success", isSuccess: true, data: [1, 2] });
    expect(() => expectQueryState(state).toBeSuccess([3, 4])).toThrow();
  });

  it("toBeError throws on success state", () => {
    const state = makeQueryState({ status: "success", isSuccess: true, isError: false });
    expect(() => expectQueryState(state).toBeError()).toThrow();
  });

  it("toBeError with wrong error throws", () => {
    const state = makeQueryState({ status: "error", isError: true, error: { _tag: "A" } });
    expect(() => expectQueryState(state).toBeError({ _tag: "B" })).toThrow();
  });

  it("toBeRefetching throws on non-refetching state", () => {
    const state = makeQueryState({ isRefetching: false, isFetching: false });
    expect(() => expectQueryState(state).toBeRefetching()).toThrow();
  });

  it("toBeFresh throws on stale state", () => {
    const state = makeQueryState({ isStale: true });
    expect(() => expectQueryState(state).toBeFresh()).toThrow();
  });

  it("toBeStale throws on fresh state", () => {
    const state = makeQueryState({ isStale: false });
    expect(() => expectQueryState(state).toBeStale()).toThrow();
  });
});

// =============================================================================
// expectQueryResult
// =============================================================================

describe("expectQueryResult", () => {
  it("toBeOk asserts Ok tag", () => {
    const result = ok(42);
    expectQueryResult(result).toBeOk();
  });

  it("toBeOk with data checks value", () => {
    const data = [{ id: "1", name: "Alice" }];
    const result = ok(data);
    expectQueryResult(result).toBeOk(data);
  });

  it("toBeErr asserts Err tag", () => {
    const result = err("fail");
    expectQueryResult(result).toBeErr();
  });

  it("toBeErr with error checks error value", () => {
    const error = { _tag: "NotFound", message: "User not found" };
    const result = err(error);
    expectQueryResult(result).toBeErr(error);
  });

  it("toBeUndefined asserts undefined result", () => {
    expectQueryResult(undefined).toBeUndefined();
  });

  it("toBeOk fails for Err result", () => {
    const result = err("fail");
    expect(() => expectQueryResult(result).toBeOk()).toThrow();
  });

  it("toBeErr fails for Ok result", () => {
    const result = ok(42);
    expect(() => expectQueryResult(result).toBeErr()).toThrow();
  });

  it("toBeUndefined fails for defined result", () => {
    const result = ok(42);
    expect(() => expectQueryResult(result).toBeUndefined()).toThrow();
  });

  it("toBeOk with wrong data throws", () => {
    const result = ok([1, 2]);
    expect(() => expectQueryResult(result).toBeOk([3, 4])).toThrow();
  });

  it("toBeErr with wrong error throws", () => {
    const result = err({ _tag: "A" });
    expect(() => expectQueryResult(result).toBeErr({ _tag: "B" })).toThrow();
  });
});
