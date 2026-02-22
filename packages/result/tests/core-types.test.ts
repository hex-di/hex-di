import { describe, it, expect } from "vitest";
import { ok, err, RESULT_BRAND, OPTION_BRAND, some, none, ResultAsync } from "../src/index.js";
import type { Result } from "../src/index.js";

describe("Core Types", () => {
  // DoD 1 #1
  it("BEH-01-004: Ok variant has _tag: 'Ok'", () => {
    const result = ok(42);
    expect(result._tag).toBe("Ok");
  });

  // DoD 1 #2
  it("BEH-01-005: Err variant has _tag: 'Err'", () => {
    const result = err("fail");
    expect(result._tag).toBe("Err");
  });

  // DoD 1 #3
  it("BEH-01-004: Ok variant holds the value in .value", () => {
    const result = ok(42);
    expect(result.value).toBe(42);
  });

  // DoD 1 #4
  it("BEH-01-005: Err variant holds the error in .error", () => {
    const result = err("fail");
    expect(result.error).toBe("fail");
  });

  // DoD 1 #5
  it("BEH-01-006: Ok and Err are structurally distinct (discriminated union)", () => {
    const success: Result<number, string> = ok(1);
    const failure: Result<number, string> = err("x");
    expect(success._tag).not.toBe(failure._tag);
  });

  // DoD 1 #6
  it("BEH-01-006: Result is a union of Ok and Err", () => {
    const success: Result<number, string> = ok(1);
    const failure: Result<number, string> = err("x");
    // Both should be valid Results — tags are one of the two valid discriminants
    expect(["Ok", "Err"]).toContain(success._tag);
    expect(["Ok", "Err"]).toContain(failure._tag);
  });

  // DoD 2 #1
  it("BEH-01-007: ok(42) creates Ok with value 42", () => {
    const result = ok(42);
    expect(result._tag).toBe("Ok");
    expect(result.value).toBe(42);
  });

  // DoD 2 #2
  it("BEH-01-008: err('fail') creates Err with error 'fail'", () => {
    const result = err("fail");
    expect(result._tag).toBe("Err");
    expect(result.error).toBe("fail");
  });

  // DoD 2 #3
  it("BEH-01-007: ok(42) has _tag: 'Ok'", () => {
    expect(ok(42)._tag).toBe("Ok");
  });

  // DoD 2 #4
  it("BEH-01-008: err('fail') has _tag: 'Err'", () => {
    expect(err("fail")._tag).toBe("Err");
  });

  // Brand symbols
  it("BEH-01-001: RESULT_BRAND is a unique symbol for brand-based identity", () => {
    expect(typeof RESULT_BRAND).toBe("symbol");
    expect(RESULT_BRAND.toString()).toBe("Symbol(Result)");
    const result = ok(1);
    expect(result[RESULT_BRAND]).toBe(true);
  });

  it("BEH-01-002: ResultAsync has distinct identity (class-based, PromiseLike)", () => {
    // ResultAsync is identified as a class (PromiseLike) rather than via a brand symbol.
    const ra = ResultAsync.ok(42);
    expect(ra).toBeDefined();
    expect(typeof ra.then).toBe("function");
    expect(ra).toBeInstanceOf(ResultAsync);
  });

  it("BEH-01-003: OPTION_BRAND is a unique symbol for Option identity", () => {
    expect(typeof OPTION_BRAND).toBe("symbol");
    expect(OPTION_BRAND.toString()).toBe("Symbol(Option)");
    const s = some(1);
    expect(s[OPTION_BRAND]).toBe(true);
    const n = none();
    expect(n[OPTION_BRAND]).toBe(true);
  });

  // Immutability invariant
  it("INV-1: ok() returns a frozen (immutable) object", () => {
    const result = ok(42);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("INV-1: err() returns a frozen (immutable) object", () => {
    const result = err("fail");
    expect(Object.isFrozen(result)).toBe(true);
  });

  // Phantom types enable free composition
  it("INV-6: Ok<T, never> and Err<never, E> compose freely into Result<T, E>", () => {
    // ok() returns Ok<number, never>, err() returns Err<never, string>.
    // Both must be assignable to Result<number, string> without explicit casting.
    const success: Result<number, string> = ok(42);
    const failure: Result<number, string> = err("oops");
    expect(success._tag).toBe("Ok");
    expect(failure._tag).toBe("Err");
  });
});
