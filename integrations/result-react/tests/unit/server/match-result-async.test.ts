// @traces BEH-R07-002 INV-R5 INV-R10
import { describe, it, expect } from "vitest";
import { ok, ResultAsync } from "@hex-di/result";
import { matchResultAsync } from "../../../src/server/index.js";

describe("matchResultAsync (BEH-R07-002)", () => {
  it("resolves ok handler on Ok ResultAsync", async () => {
    const resultAsync = ResultAsync.ok(42);
    const output = await matchResultAsync(resultAsync, {
      ok: value => `value: ${value}`,
      err: error => `error: ${error}`,
    });
    expect(output).toBe("value: 42");
  });

  it("resolves err handler on Err ResultAsync", async () => {
    const resultAsync = ResultAsync.err("not found");
    const output = await matchResultAsync(resultAsync, {
      ok: value => `value: ${value}`,
      err: error => `error: ${error}`,
    });
    expect(output).toBe("error: not found");
  });

  it("works with Promise<Result>", async () => {
    const promise = Promise.resolve(ok(99));
    const output = await matchResultAsync(promise, {
      ok: value => value * 2,
      err: () => 0,
    });
    expect(output).toBe(198);
  });

  it("supports async handlers", async () => {
    const resultAsync = ResultAsync.ok("hello");
    const output = await matchResultAsync(resultAsync, {
      ok: async value => `async: ${value}`,
      err: async error => `async error: ${error}`,
    });
    expect(output).toBe("async: hello");
  });
});
