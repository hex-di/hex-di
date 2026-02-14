/**
 * GxP integrity tests for @hex-di/result.
 *
 * Verifies:
 * - RESULT_BRAND presence on Ok and Err
 * - Object.freeze() on all Result instances
 * - Brand-based isResult rejects structurally similar objects
 */

import { describe, it, expect } from "vitest";
import { ok, err, isResult, RESULT_BRAND } from "../src/index.js";
import type { Result } from "../src/index.js";

describe("GxP: RESULT_BRAND", () => {
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

describe("GxP: Result immutability (Object.freeze)", () => {
  it("ok() values are frozen", () => {
    const result = ok(42);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("err() values are frozen", () => {
    const result = err("fail");
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("ok() value property cannot be mutated", () => {
    const result = ok({ mutable: true });
    expect(() => {
      (result as any).value = "tampered";
    }).toThrow();
  });

  it("err() error property cannot be mutated", () => {
    const result = err("original");
    expect(() => {
      (result as any).error = "tampered";
    }).toThrow();
  });

  it("ok() _tag property cannot be mutated", () => {
    const result = ok(1);
    expect(() => {
      (result as any)._tag = "Err";
    }).toThrow();
  });

  it("err() _tag property cannot be mutated", () => {
    const result = err("x");
    expect(() => {
      (result as any)._tag = "Ok";
    }).toThrow();
  });

  it("cannot add new properties to ok()", () => {
    const result = ok(1);
    expect(() => {
      (result as any).injected = true;
    }).toThrow();
  });

  it("cannot add new properties to err()", () => {
    const result = err("x");
    expect(() => {
      (result as any).injected = true;
    }).toThrow();
  });
});

describe("GxP: Brand-based isResult", () => {
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
    // Using a different symbol (not the actual RESULT_BRAND)
    const fakeSymbol = Symbol("Result");
    const fake = { _tag: "Ok", value: 1, [fakeSymbol]: true };
    expect(isResult(fake)).toBe(false);
  });
});
