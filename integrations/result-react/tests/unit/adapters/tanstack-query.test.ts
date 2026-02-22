// @traces BEH-R05-001 BEH-R05-002 BEH-R05-004 BEH-R05-005
import { describe, it, expect } from "vitest";
import { ResultAsync } from "@hex-di/result";
import {
  toQueryFn,
  toQueryOptions,
  toMutationFn,
  toMutationOptions,
} from "../../../src/adapters/tanstack-query.js";

describe("toQueryFn (BEH-R05-001)", () => {
  it("resolves with Ok value", async () => {
    const fn = toQueryFn(() => ResultAsync.ok("hello"));
    await expect(fn()).resolves.toBe("hello");
  });

  it("throws Err value", async () => {
    const fn = toQueryFn(() => ResultAsync.err("boom"));
    await expect(fn()).rejects.toBe("boom");
  });
});

describe("toQueryOptions (BEH-R05-002)", () => {
  it("returns queryKey and queryFn", async () => {
    const options = toQueryOptions(["user", 1], () => ResultAsync.ok("alice"));
    expect(options.queryKey).toEqual(["user", 1]);
    await expect(options.queryFn()).resolves.toBe("alice");
  });
});

describe("toMutationFn (BEH-R05-004)", () => {
  it("resolves with Ok value on success", async () => {
    const fn = toMutationFn((name: string) => ResultAsync.ok(`saved: ${name}`));
    await expect(fn("alice")).resolves.toBe("saved: alice");
  });

  it("throws Err value on failure", async () => {
    const fn = toMutationFn((_name: string) => ResultAsync.err("fail"));
    await expect(fn("alice")).rejects.toBe("fail");
  });
});

describe("toMutationOptions (BEH-R05-005)", () => {
  it("returns mutationFn merged with extra options", async () => {
    const options = toMutationOptions(
      (name: string) => ResultAsync.ok(`saved: ${name}`),
      { retry: 3 },
    );

    expect(options.mutationFn).toBeDefined();
    expect(options.retry).toBe(3);
    const result = await options.mutationFn!("bob");
    expect(result).toBe("saved: bob");
  });
});
