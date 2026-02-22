/**
 * GxP integrity: Result brand tamper evidence (INV-3).
 *
 * Verifies that RESULT_BRAND prevents forgery and that isResult()
 * rejects structurally similar objects without the genuine brand symbol.
 */

import { describe, it, expect } from "vitest";
import { ok, err, isResult, RESULT_BRAND } from "../../src/index.js";

describe("GxP: RESULT_BRAND — INV-3", () => {
  it("ok() values carry the RESULT_BRAND symbol", () => {
    const result = ok(42);
    expect(RESULT_BRAND in result).toBe(true);
    expect(result[RESULT_BRAND]).toBe(true);
  });

  it("err() values carry the RESULT_BRAND symbol", () => {
    const result = err("fail");
    expect(RESULT_BRAND in result).toBe(true);
    expect(result[RESULT_BRAND]).toBe(true);
  });

  it("RESULT_BRAND is a unique symbol", () => {
    expect(typeof RESULT_BRAND).toBe("symbol");
  });
});

describe("GxP: Brand-based isResult — INV-3", () => {
  it("rejects structurally similar objects without brand", () => {
    const fake = { _tag: "Ok" as const, value: 42 };
    expect(isResult(fake)).toBe(false);
  });

  it("rejects structurally similar Err objects without brand", () => {
    const fake = { _tag: "Err" as const, error: "fail" };
    expect(isResult(fake)).toBe(false);
  });

  it("accepts genuine ok() results", () => {
    expect(isResult(ok(1))).toBe(true);
  });

  it("accepts genuine err() results", () => {
    expect(isResult(err("x"))).toBe(true);
  });

  it("rejects objects with a manually set RESULT_BRAND-like symbol", () => {
    const fakeSymbol = Symbol("Result");
    const fake = { _tag: "Ok", value: 1, [fakeSymbol]: true };
    expect(isResult(fake)).toBe(false);
  });
});
