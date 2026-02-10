import { describe, it, expect, beforeAll } from "vitest";
import { ok, err, ResultAsync } from "@hex-di/result";
import {
  expectOk,
  expectErr,
  expectOkAsync,
  expectErrAsync,
  setupResultMatchers,
} from "../src/index.js";

beforeAll(() => {
  setupResultMatchers();
});

describe("expectOk", () => {
  it("returns the value from an Ok result", () => {
    const value = expectOk(ok(42));
    expect(value).toBe(42);
  });

  it("throws on Err result", () => {
    expect(() => expectErr(ok("x"))).toThrow();
  });
});

describe("expectErr", () => {
  it("returns the error from an Err result", () => {
    const error = expectErr(err("fail"));
    expect(error).toBe("fail");
  });

  it("throws on Ok result", () => {
    expect(() => expectOk(err("fail"))).toThrow();
  });
});

describe("expectOkAsync", () => {
  it("returns the value from an Ok ResultAsync", async () => {
    const value = await expectOkAsync(ResultAsync.ok(42));
    expect(value).toBe(42);
  });
});

describe("expectErrAsync", () => {
  it("returns the error from an Err ResultAsync", async () => {
    const error = await expectErrAsync(ResultAsync.err("fail"));
    expect(error).toBe("fail");
  });
});

describe("custom matchers", () => {
  it("toBeOk() passes for Ok results", () => {
    expect(ok(42)).toBeOk();
  });

  it("toBeOk(value) passes for matching Ok value", () => {
    expect(ok(42)).toBeOk(42);
  });

  it("toBeErr() passes for Err results", () => {
    expect(err("fail")).toBeErr();
  });

  it("toBeErr(error) passes for matching Err error", () => {
    expect(err("fail")).toBeErr("fail");
  });

  it("toBeOk() with deep equal objects", () => {
    expect(ok({ a: 1 })).toBeOk({ a: 1 });
  });

  it("toBeErr() with deep equal objects", () => {
    expect(err({ _tag: "NotFound" })).toBeErr({ _tag: "NotFound" });
  });
});
