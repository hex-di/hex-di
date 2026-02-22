// @traces BEH-R07-001 BEH-R07-002 BEH-R07-003 BEH-R07-004 BEH-R07-005
import { describe, it, expectTypeOf } from "vitest";
import { ok, err, some, none, ResultAsync, type Result, type Option } from "@hex-di/result";
import {
  matchResult,
  matchResultAsync,
  matchOption,
  resultAction,
} from "../../src/server/index.js";

describe("matchResult types (BEH-R07-001)", () => {
  it("infers return type from handlers", () => {
    const result: Result<string, number> = ok("hello");
    const output = matchResult(result, {
      ok: (value) => {
        expectTypeOf(value).toEqualTypeOf<string>();
        return value.length;
      },
      err: (error) => {
        expectTypeOf(error).toEqualTypeOf<number>();
        return -1;
      },
    });
    expectTypeOf(output).toEqualTypeOf<number>();
  });

  it("handlers with different return types produce union", () => {
    const result: Result<string, number> = ok("hello");
    const output = matchResult(result, {
      ok: () => "string" as const,
      err: () => 42 as const,
    });
    expectTypeOf(output).toEqualTypeOf<"string" | 42>();
  });

  // @ts-expect-error missing err handler
  matchResult(ok("x"), { ok: () => 1 });
});

describe("matchResultAsync types (BEH-R07-002)", () => {
  it("returns Promise<A | B>", () => {
    const output = matchResultAsync(ResultAsync.ok("data"), {
      ok: (value) => {
        expectTypeOf(value).toEqualTypeOf<string>();
        return value.length;
      },
      err: () => -1,
    });
    expectTypeOf(output).toEqualTypeOf<Promise<number>>();
  });

  // @ts-expect-error missing ok handler
  void matchResultAsync(ResultAsync.ok("x"), { err: () => 1 });
});

describe("matchOption types (BEH-R07-003)", () => {
  it("infers return type from handlers", () => {
    const option: Option<string> = some("hello");
    const output = matchOption(option, {
      some: (value) => {
        expectTypeOf(value).toEqualTypeOf<string>();
        return value.length;
      },
      none: () => 0,
    });
    expectTypeOf(output).toEqualTypeOf<number>();
  });

  // @ts-expect-error missing none handler
  matchOption(some("x"), { some: () => 1 });
});

describe("resultAction types (BEH-R07-004)", () => {
  it("preserves argument types and infers result", () => {
    const action = resultAction(
      async (id: string, count: number) => ({ id, count }),
      (e) => String(e),
    );
    expectTypeOf(action).toEqualTypeOf<
      (id: string, count: number) => Promise<Result<{ id: string; count: number }, string>>
    >();
  });
});
