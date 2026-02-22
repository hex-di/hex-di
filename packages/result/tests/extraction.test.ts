import { describe, it, expect } from "vitest";
import { ok, err } from "../src/index.js";
import type { Result } from "../src/index.js";
import { UnwrapError } from "../src/unsafe/unwrap-error.js";

describe("Extraction", () => {
  describe("BEH-04-001: match(onOk, onErr) pattern matching / fold extraction", () => {
    // DoD 6 #1
    it("ok(42).match(v => v + 1, e => 0) returns 43", () => {
      const result = ok(42).match(
        v => v + 1,
        () => 0
      );
      expect(result).toBe(43);
    });

    // DoD 6 #2
    it("err('x').match(v => v + 1, e => 0) returns 0", () => {
      const result: Result<number, string> = err("x");
      const matched = result.match(
        v => v + 1,
        () => 0
      );
      expect(matched).toBe(0);
    });
  });

  describe("BEH-04-002: unwrapOr(default) extracts Ok value or returns default", () => {
    // DoD 6 #3
    it("ok(42).unwrapOr(0) returns 42", () => {
      expect(ok(42).unwrapOr(0)).toBe(42);
    });

    // DoD 6 #4
    it("err('x').unwrapOr(0) returns 0", () => {
      const result: Result<number, string> = err("x");
      expect(result.unwrapOr(0)).toBe(0);
    });
  });

  describe("BEH-04-003: unwrapOrElse(f) extracts Ok value or computes fallback from error", () => {
    // DoD 6 #5
    it("ok(42).unwrapOrElse(e => 0) returns 42", () => {
      expect(ok(42).unwrapOrElse(() => 0)).toBe(42);
    });

    // DoD 6 #6
    it("err('x').unwrapOrElse(e => e.length) returns 1", () => {
      const result: Result<number, string> = err("x");
      expect(result.unwrapOrElse(e => e.length)).toBe(1);
    });
  });

  describe("BEH-04-004: expect(msg) assertive Ok extraction, throws UnwrapError on Err", () => {
    // DoD 6 #15
    it("ok(42).expect('should not throw') returns 42", () => {
      expect(ok(42).expect("should not throw")).toBe(42);
    });

    // DoD 6 #16
    it("err('x').expect('oops') throws UnwrapError with message 'oops'", () => {
      const result: Result<number, string> = err("x");
      expect(() => result.expect("oops")).toThrow(UnwrapError);
      expect(() => result.expect("oops")).toThrow("oops");
    });
  });

  describe("BEH-04-005: expectErr(msg) assertive Err extraction, throws UnwrapError on Ok", () => {
    // DoD 6 #17
    it("err('x').expectErr('should not throw') returns 'x'", () => {
      expect(err("x").expectErr("should not throw")).toBe("x");
    });

    // DoD 6 #18
    it("ok(42).expectErr('oops') throws UnwrapError with message 'oops'", () => {
      expect(() => ok(42).expectErr("oops")).toThrow(UnwrapError);
      expect(() => ok(42).expectErr("oops")).toThrow("oops");
    });
  });

  describe("BEH-04-006: toNullable() returns value for Ok, null for Err", () => {
    // DoD 6 #7
    it("ok(42).toNullable() returns 42", () => {
      expect(ok(42).toNullable()).toBe(42);
    });

    // DoD 6 #8
    it("err('x').toNullable() returns null", () => {
      const result: Result<number, string> = err("x");
      expect(result.toNullable()).toBeNull();
    });
  });

  describe("BEH-04-007: toUndefined() returns value for Ok, undefined for Err", () => {
    // DoD 6 #9
    it("ok(42).toUndefined() returns 42", () => {
      expect(ok(42).toUndefined()).toBe(42);
    });

    // DoD 6 #10
    it("err('x').toUndefined() returns undefined", () => {
      const result: Result<number, string> = err("x");
      expect(result.toUndefined()).toBeUndefined();
    });
  });

  describe("BEH-04-008: intoTuple() Go-style [error, value] tuple extraction", () => {
    // DoD 6 #11
    it("ok(42).intoTuple() returns [null, 42]", () => {
      expect(ok(42).intoTuple()).toEqual([null, 42]);
    });

    // DoD 6 #12
    it("err('x').intoTuple() returns ['x', null]", () => {
      expect(err("x").intoTuple()).toEqual(["x", null]);
    });
  });

  describe("BEH-04-009: merge() extracts contained value regardless of variant", () => {
    // DoD 6 #13
    it("ok(42).merge() returns 42", () => {
      expect(ok(42).merge()).toBe(42);
    });

    // DoD 6 #14
    it("err('x').merge() returns 'x'", () => {
      expect(err("x").merge()).toBe("x");
    });
  });

  // DoD 6 #23
  it("ok(42).toJSON() returns { _tag: 'Ok', _schemaVersion: 1, value: 42 }", () => {
    expect(ok(42).toJSON()).toEqual({ _tag: "Ok", _schemaVersion: 1, value: 42 });
  });

  // DoD 6 #24
  it("err('x').toJSON() returns { _tag: 'Err', _schemaVersion: 1, error: 'x' }", () => {
    expect(err("x").toJSON()).toEqual({ _tag: "Err", _schemaVersion: 1, error: "x" });
  });
});
