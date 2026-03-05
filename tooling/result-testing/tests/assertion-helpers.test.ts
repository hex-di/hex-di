import { describe, it, expect } from "vitest";
import { ok, err, ResultAsync, some, none } from "@hex-di/result";
import {
  expectOk,
  expectErr,
  expectOkAsync,
  expectErrAsync,
  expectSome,
  expectNone,
  expectErrorTag,
  expectErrorNamespace,
} from "../src/index.js";

// =============================================================================
// BEH-T01-001: expectOk
// =============================================================================

describe("expectOk", () => {
  it("returns the value from an Ok result", () => {
    const value = expectOk(ok(42));
    expect(value).toBe(42);
  });

  it("returns complex object from Ok", () => {
    const data = { name: "Alice", id: 1 };
    const value = expectOk(ok(data));
    expect(value).toBe(data);
  });

  it("throws on Err result with descriptive message", () => {
    expect(() => expectOk(err("fail"))).toThrow('Expected Ok but got Err: "fail"');
  });

  it("includes error value in throw message", () => {
    expect(() => expectOk(err({ code: 404 }))).toThrow('Expected Ok but got Err: {"code":404}');
  });
});

// =============================================================================
// BEH-T01-002: expectErr
// =============================================================================

describe("expectErr", () => {
  it("returns the error from an Err result", () => {
    const error = expectErr(err("fail"));
    expect(error).toBe("fail");
  });

  it("returns complex error object from Err", () => {
    const error = { code: 404, message: "Not found" };
    const result = expectErr(err(error));
    expect(result).toBe(error);
  });

  it("throws on Ok result with descriptive message", () => {
    expect(() => expectErr(ok("x"))).toThrow('Expected Err but got Ok: "x"');
  });

  it("includes ok value in throw message", () => {
    expect(() => expectErr(ok(42))).toThrow("Expected Err but got Ok: 42");
  });
});

// =============================================================================
// BEH-T01-003: expectOkAsync
// =============================================================================

describe("expectOkAsync", () => {
  it("returns the value from an Ok ResultAsync", async () => {
    const value = await expectOkAsync(ResultAsync.ok(42));
    expect(value).toBe(42);
  });

  it("throws on Err ResultAsync", async () => {
    await expect(expectOkAsync(ResultAsync.err("fail"))).rejects.toThrow("Expected Ok but got Err");
  });
});

// =============================================================================
// BEH-T01-004: expectErrAsync
// =============================================================================

describe("expectErrAsync", () => {
  it("returns the error from an Err ResultAsync", async () => {
    const error = await expectErrAsync(ResultAsync.err("fail"));
    expect(error).toBe("fail");
  });

  it("throws on Ok ResultAsync", async () => {
    await expect(expectErrAsync(ResultAsync.ok(42))).rejects.toThrow("Expected Err but got Ok");
  });
});

// =============================================================================
// BEH-T01-005: expectSome
// =============================================================================

describe("expectSome", () => {
  it("returns the value from a Some option", () => {
    const value = expectSome(some(42));
    expect(value).toBe(42);
  });

  it("returns complex object from Some", () => {
    const data = { timeout: 3000 };
    const value = expectSome(some(data));
    expect(value).toBe(data);
  });

  it("throws on None option", () => {
    expect(() => expectSome(none())).toThrow("Expected Some but got None");
  });
});

// =============================================================================
// BEH-T01-006: expectNone
// =============================================================================

// =============================================================================
// TINV-2: Error messages include actual value (formatValue fallback)
// =============================================================================

describe("formatValue fallback (circular reference)", () => {
  it("uses String() fallback when JSON.stringify fails", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => expectOk(err(circular))).toThrow("Expected Ok but got Err:");
  });
});

describe("expectNone", () => {
  it("returns void for None option", () => {
    const result = expectNone(none());
    expect(result).toBeUndefined();
  });

  it("throws on Some option", () => {
    expect(() => expectNone(some(42))).toThrow("Expected None but got Some: 42");
  });

  it("includes value in throw message for object", () => {
    expect(() => expectNone(some({ x: 1 }))).toThrow('Expected None but got Some: {"x":1}');
  });
});

// =============================================================================
// expectErrorTag
// =============================================================================

describe("expectErrorTag", () => {
  it("passes when _tag matches", () => {
    expectErrorTag({ _tag: "NotFound" }, "NotFound");
  });

  it("throws when _tag does not match", () => {
    expect(() => expectErrorTag({ _tag: "NotFound" }, "Timeout")).toThrow(
      'Expected error tag "Timeout" but got "NotFound"'
    );
  });
});

// =============================================================================
// expectErrorNamespace
// =============================================================================

describe("expectErrorNamespace", () => {
  it("passes when _namespace matches", () => {
    expectErrorNamespace({ _namespace: "HttpError" }, "HttpError");
  });

  it("throws when _namespace does not match", () => {
    expect(() => expectErrorNamespace({ _namespace: "HttpError" }, "DbError")).toThrow(
      'Expected error namespace "DbError" but got "HttpError"'
    );
  });
});
