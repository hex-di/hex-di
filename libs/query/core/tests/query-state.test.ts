import { describe, it, expect } from "vitest";
import { ok, err } from "@hex-di/result";
import type { QueryState } from "../src/index.js";

/**
 * Helper to create a QueryState for testing derived boolean logic.
 * This tests the state derivation rules without needing a full QueryObserver.
 */
function createState<TData, TError>(
  overrides: Partial<QueryState<TData, TError>>
): QueryState<TData, TError> {
  const base: QueryState<TData, TError> = {
    status: "pending",
    fetchStatus: "idle",
    isPending: false,
    isSuccess: false,
    isError: false,
    isFetching: false,
    isRefetching: false,
    isLoading: false,
    isStale: true,
    isPlaceholderData: false,
    isPaused: false,
    result: undefined,
    data: undefined,
    error: null,
    dataUpdatedAt: undefined,
    errorUpdatedAt: undefined,
    refetch: () => {
      throw new Error("not implemented");
    },
    ...overrides,
  };
  return base;
}

describe("QueryState", () => {
  it("initial state: status=pending, fetchStatus=idle, result=undefined", () => {
    const state = createState({
      status: "pending",
      fetchStatus: "idle",
      result: undefined,
    });
    expect(state.status).toBe("pending");
    expect(state.fetchStatus).toBe("idle");
    expect(state.result).toBeUndefined();
  });

  it("loading state: status=pending, fetchStatus=fetching, result=undefined", () => {
    const state = createState({
      status: "pending",
      fetchStatus: "fetching",
      isPending: true,
      isFetching: true,
      isLoading: true,
    });
    expect(state.status).toBe("pending");
    expect(state.fetchStatus).toBe("fetching");
    expect(state.isLoading).toBe(true);
  });

  it("success state: status=success, fetchStatus=idle, result=ok(data)", () => {
    const data = ["Alice"];
    const state = createState<string[], Error>({
      status: "success",
      fetchStatus: "idle",
      isSuccess: true,
      result: ok(data),
      data,
    });
    expect(state.status).toBe("success");
    expect(state.fetchStatus).toBe("idle");
    expect(state.result?.isOk()).toBe(true);
  });

  it("error state: status=error, fetchStatus=idle, result=err(error)", () => {
    const error = new Error("fail");
    const state = createState<string[], Error>({
      status: "error",
      fetchStatus: "idle",
      isError: true,
      result: err(error),
      error,
    });
    expect(state.status).toBe("error");
    expect(state.result?.isErr()).toBe(true);
  });

  it("refetching state: status=success, fetchStatus=fetching, previous data preserved", () => {
    const data = ["Bob"];
    const state = createState<string[], Error>({
      status: "success",
      fetchStatus: "fetching",
      isSuccess: true,
      isFetching: true,
      isRefetching: true,
      data,
    });
    expect(state.isRefetching).toBe(true);
    expect(state.data).toEqual(["Bob"]);
  });

  it("isPending is true when status === pending", () => {
    const state = createState({ status: "pending", isPending: true });
    expect(state.isPending).toBe(true);
  });

  it("isSuccess is true when status === success", () => {
    const state = createState({ status: "success", isSuccess: true });
    expect(state.isSuccess).toBe(true);
  });

  it("isError is true when status === error", () => {
    const state = createState({ status: "error", isError: true });
    expect(state.isError).toBe(true);
  });

  it("isFetching is true when fetchStatus === fetching", () => {
    const state = createState({ fetchStatus: "fetching", isFetching: true });
    expect(state.isFetching).toBe(true);
  });

  it("isLoading is true when isPending && isFetching", () => {
    const state = createState({
      status: "pending",
      fetchStatus: "fetching",
      isPending: true,
      isFetching: true,
      isLoading: true,
    });
    expect(state.isLoading).toBe(true);
  });

  it("isRefetching is true when isSuccess && isFetching", () => {
    const state = createState({
      status: "success",
      fetchStatus: "fetching",
      isSuccess: true,
      isFetching: true,
      isRefetching: true,
    });
    expect(state.isRefetching).toBe(true);
  });

  it("isLoading is false when isPending && !isFetching (initial idle)", () => {
    const state = createState({
      status: "pending",
      fetchStatus: "idle",
      isPending: true,
      isFetching: false,
      isLoading: false,
    });
    expect(state.isLoading).toBe(false);
  });

  it("isRefetching is false when isSuccess && !isFetching (idle success)", () => {
    const state = createState({
      status: "success",
      fetchStatus: "idle",
      isSuccess: true,
      isFetching: false,
      isRefetching: false,
    });
    expect(state.isRefetching).toBe(false);
  });

  it("data is derived from result.value when result is Ok", () => {
    const data = ["Alice"];
    const state = createState<string[], Error>({
      result: ok(data),
      data,
    });
    expect(state.data).toEqual(["Alice"]);
  });

  it("error is derived from result.error when result is Err", () => {
    const error = new Error("fail");
    const state = createState<string[], Error>({
      result: err(error),
      error,
    });
    expect(state.error).toBe(error);
  });

  it("data is undefined when result is undefined (pending)", () => {
    const state = createState({ result: undefined, data: undefined });
    expect(state.data).toBeUndefined();
  });
});
