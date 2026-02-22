// @traces BEH-R05-001 BEH-R05-002 BEH-R05-003 BEH-R05-004 BEH-R05-005
import { describe, it, expectTypeOf } from "vitest";
import { ResultAsync } from "@hex-di/result";
import {
  toQueryFn,
  toQueryOptions,
  toMutationFn,
  toMutationOptions,
} from "../../src/adapters/tanstack-query.js";
import { toSwrFetcher } from "../../src/adapters/swr.js";

describe("toQueryFn types (BEH-R05-001)", () => {
  it("returns () => Promise<T>", () => {
    const fn = toQueryFn(() => ResultAsync.ok(42));
    expectTypeOf(fn).toEqualTypeOf<() => Promise<number>>();
  });
});

describe("toQueryOptions types (BEH-R05-002)", () => {
  it("returns { queryKey, queryFn }", () => {
    const opts = toQueryOptions(["user", 1], () => ResultAsync.ok("alice"));
    expectTypeOf(opts.queryKey).toEqualTypeOf<readonly unknown[]>();
    expectTypeOf(opts.queryFn).toEqualTypeOf<() => Promise<string>>();
  });
});

describe("toMutationFn types (BEH-R05-004)", () => {
  it("preserves argument type", () => {
    const fn = toMutationFn((data: { name: string }) =>
      ResultAsync.ok(data.name),
    );
    expectTypeOf(fn).toEqualTypeOf<(args: { name: string }) => Promise<string>>();
  });
});

describe("toMutationOptions types (BEH-R05-005)", () => {
  it("returns object with mutationFn", () => {
    const opts = toMutationOptions(
      (data: string) => ResultAsync.ok(data),
    );
    expectTypeOf(opts.mutationFn).toEqualTypeOf<(args: string) => Promise<string>>();
  });
});

describe("toSwrFetcher types (BEH-R05-003)", () => {
  it("key-based fetcher returning Promise<T>", () => {
    const fetcher = toSwrFetcher((key: string) => ResultAsync.ok(`data-${key}`));
    expectTypeOf(fetcher).toEqualTypeOf<(key: string) => Promise<string>>();
  });
});
