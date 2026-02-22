import { describe, it, expect } from "vitest";
import { ok, err, some, none } from "@hex-di/result";

// =============================================================================
// BEH-T05-001: Assertion<T> augmentation — all 8 matchers callable
// =============================================================================

describe("Assertion<T> matchers are callable", () => {
  it("toBeOk()", () => {
    expect(ok(42)).toBeOk();
  });

  it("toBeOk(expected)", () => {
    expect(ok(42)).toBeOk(42);
  });

  it("toBeErr()", () => {
    expect(err("fail")).toBeErr();
  });

  it("toBeErr(expected)", () => {
    expect(err("fail")).toBeErr("fail");
  });

  it("toBeOkWith(expected)", () => {
    expect(ok(42)).toBeOkWith(42);
  });

  it("toBeErrWith(expected)", () => {
    expect(err("fail")).toBeErrWith("fail");
  });

  it("toBeSome()", () => {
    expect(some(42)).toBeSome();
  });

  it("toBeSome(expected)", () => {
    expect(some(42)).toBeSome(42);
  });

  it("toBeNone()", () => {
    expect(none()).toBeNone();
  });

  it("toContainOk(value)", () => {
    expect(ok(42)).toContainOk(42);
  });

  it("toContainErr(error)", () => {
    expect(err("fail")).toContainErr("fail");
  });
});

// =============================================================================
// BEH-T05-002: AsymmetricMatchersContaining augmentation
// =============================================================================

describe("AsymmetricMatchersContaining matchers are callable", () => {
  it("expect.toBeOk()", () => {
    expect({ result: ok(42) }).toEqual({
      result: expect.toBeOk(42),
    });
  });

  it("expect.toBeErr()", () => {
    expect({ result: err("fail") }).toEqual({
      result: expect.toBeErr("fail"),
    });
  });
});

// =============================================================================
// BEH-T05-001 / BEH-T05-002: Negative type cases
// =============================================================================

describe("matchers with required arguments reject missing args", () => {
  it("toBeOkWith requires argument", () => {
    // @ts-expect-error — toBeOkWith requires an expected argument
    expect(ok(42)).toBeOkWith();
  });

  it("toBeErrWith requires argument", () => {
    // @ts-expect-error — toBeErrWith requires an expected argument
    expect(err("fail")).toBeErrWith();
  });

  it("toContainOk requires argument", () => {
    // @ts-expect-error — toContainOk requires a value argument
    expect(ok(42)).toContainOk();
  });

  it("toContainErr requires argument", () => {
    // @ts-expect-error — toContainErr requires an error argument
    expect(err("fail")).toContainErr();
  });
});
