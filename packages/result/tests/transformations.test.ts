import { describe, it, expect, vi } from "vitest";
import { ok, err, isResult, isOption } from "../src/index.js";
import { some, none } from "../src/option/option.js";
import type { Result } from "../src/index.js";

describe("Transformations", () => {
  // DoD 4 #1
  it("BEH-03-001: ok(2).map(x => x * 3) returns Ok(6)", () => {
    const result = ok(2).map(x => x * 3);
    expect(result._tag).toBe("Ok");
    expect(result.value).toBe(6);
  });

  // DoD 4 #2
  it("BEH-03-001: err('x').map(x => x * 3) returns Err('x') unchanged", () => {
    const result: Result<number, string> = err("x");
    const mapped = result.map(x => x * 3);
    expect(mapped._tag).toBe("Err");
    if (mapped.isErr()) {
      expect(mapped.error).toBe("x");
    }
  });

  // DoD 4 #3
  it("BEH-03-002: ok(2).mapErr(e => e.toUpperCase()) returns Ok(2) unchanged", () => {
    const result: Result<number, string> = ok(2);
    const mapped = result.mapErr(e => e.toUpperCase());
    expect(mapped._tag).toBe("Ok");
    if (mapped.isOk()) {
      expect(mapped.value).toBe(2);
    }
  });

  // DoD 4 #4
  it("BEH-03-002: err('fail').mapErr(e => e.toUpperCase()) returns Err('FAIL')", () => {
    const result = err("fail").mapErr(e => e.toUpperCase());
    expect(result._tag).toBe("Err");
    expect(result.error).toBe("FAIL");
  });

  // DoD 4 #5
  it("BEH-03-003: ok(2).mapBoth(v => v * 2, e => e) returns Ok(4)", () => {
    const result: Result<number, string> = ok(2);
    const mapped = result.mapBoth(
      v => v * 2,
      e => e
    );
    expect(mapped._tag).toBe("Ok");
    if (mapped.isOk()) {
      expect(mapped.value).toBe(4);
    }
  });

  // DoD 4 #6
  it("BEH-03-003: err('x').mapBoth(v => v * 2, e => e.toUpperCase()) returns Err('X')", () => {
    const result: Result<number, string> = err("x");
    const mapped = result.mapBoth(
      v => v * 2,
      e => e.toUpperCase()
    );
    expect(mapped._tag).toBe("Err");
    if (mapped.isErr()) {
      expect(mapped.error).toBe("X");
    }
  });

  // DoD 4 #7
  it("BEH-03-004: ok(ok(42)).flatten() returns Ok(42)", () => {
    const nested = ok(ok(42));
    const flat = nested.flatten();
    expect(flat._tag).toBe("Ok");
    if (flat.isOk()) {
      expect(flat.value).toBe(42);
    }
  });

  // DoD 4 #8
  it("BEH-03-004: ok(err('inner')).flatten() returns Err('inner')", () => {
    const nested = ok(err("inner"));
    const flat = nested.flatten();
    expect(flat._tag).toBe("Err");
    if (flat.isErr()) {
      expect(flat.error).toBe("inner");
    }
  });

  // DoD 4 #9
  it("BEH-03-004: err('outer').flatten() returns Err('outer')", () => {
    const outer: Result<Result<number, string>, string> = err("outer");
    const flat = outer.flatten();
    expect(flat._tag).toBe("Err");
    if (flat.isErr()) {
      expect(flat.error).toBe("outer");
    }
  });

  // DoD 4 #10
  it("BEH-03-005: ok(42).flip() returns Err(42)", () => {
    const result = ok(42).flip();
    expect(result._tag).toBe("Err");
    expect(result.error).toBe(42);
  });

  // DoD 4 #11
  it("BEH-03-005: err('x').flip() returns Ok('x')", () => {
    const result = err("x").flip();
    expect(result._tag).toBe("Ok");
    expect(result.value).toBe("x");
  });

  // DoD 4 #12
  it("BEH-03-001: map does not call the function on Err", () => {
    const fn = vi.fn((x: number) => x * 2);
    const result: Result<number, string> = err("x");
    result.map(fn);
    expect(fn).not.toHaveBeenCalled();
  });

  // DoD 4 #13
  it("BEH-03-002: mapErr does not call the function on Ok", () => {
    const fn = vi.fn((e: string) => e.toUpperCase());
    const result: Result<number, string> = ok(2);
    result.mapErr(fn);
    expect(fn).not.toHaveBeenCalled();
  });

  // BEH-03-013: and
  it("BEH-03-013: ok(1).and(ok(2)) returns Ok(2)", () => {
    const result = ok(1).and(ok(2));
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(2);
  });

  it("BEH-03-013: ok(1).and(err('b')) returns Err('b')", () => {
    const result = ok(1).and(err("b"));
    expect(result._tag).toBe("Err");
    if (result.isErr()) expect(result.error).toBe("b");
  });

  it("BEH-03-013: err('a').and(ok(2)) returns Err('a')", () => {
    const result: Result<number, string> = err("a");
    const r = result.and(ok(2));
    expect(r._tag).toBe("Err");
    if (r.isErr()) expect(r.error).toBe("a");
  });

  // BEH-03-014: or
  it("BEH-03-014: ok(1).or(ok(2)) returns Ok(1)", () => {
    const result: Result<number, string> = ok(1);
    const r = result.or(ok(2));
    expect(r._tag).toBe("Ok");
    if (r.isOk()) expect(r.value).toBe(1);
  });

  it("BEH-03-014: err('a').or(ok(2)) returns Ok(2)", () => {
    const result: Result<number, string> = err("a");
    const r = result.or(ok(2));
    expect(r._tag).toBe("Ok");
    if (r.isOk()) expect(r.value).toBe(2);
  });

  it("BEH-03-014: err('a').or(err('b')) returns Err('b')", () => {
    const result: Result<number, string> = err("a");
    const r = result.or(err("b"));
    expect(r._tag).toBe("Err");
    if (r.isErr()) expect(r.error).toBe("b");
  });

  // BEH-03-015: mapOr
  it("BEH-03-015: ok(2).mapOr(0, x => x * 3) returns 6", () => {
    expect(ok(2).mapOr(0, x => x * 3)).toBe(6);
  });

  it("BEH-03-015: err('x').mapOr(0, x => x * 3) returns 0", () => {
    const result: Result<number, string> = err("x");
    expect(result.mapOr(0, x => x * 3)).toBe(0);
  });

  // BEH-03-016: mapOrElse
  it("BEH-03-016: ok(2).mapOrElse(e => 0, x => x * 3) returns 6", () => {
    const result: Result<number, string> = ok(2);
    expect(result.mapOrElse(() => 0, x => x * 3)).toBe(6);
  });

  it("BEH-03-016: err('x').mapOrElse(e => e.length, x => x * 3) returns 1", () => {
    const result: Result<number, string> = err("x");
    expect(result.mapOrElse(e => e.length, x => x * 3)).toBe(1);
  });

  // BEH-03-017: contains
  it("BEH-03-017: ok(42).contains(42) returns true", () => {
    expect(ok(42).contains(42)).toBe(true);
  });

  it("BEH-03-017: ok(42).contains(99) returns false", () => {
    expect(ok(42).contains(99)).toBe(false);
  });

  it("BEH-03-017: err('x').contains(42) returns false", () => {
    const result: Result<number, string> = err("x");
    expect(result.contains(42)).toBe(false);
  });

  // BEH-03-018: containsErr
  it("BEH-03-018: err('x').containsErr('x') returns true", () => {
    expect(err("x").containsErr("x")).toBe(true);
  });

  it("BEH-03-018: err('x').containsErr('y') returns false", () => {
    expect(err("x").containsErr("y")).toBe(false);
  });

  it("BEH-03-018: ok(42).containsErr('x') returns false", () => {
    const result: Result<number, string> = ok(42);
    expect(result.containsErr("x")).toBe(false);
  });

  // BEH-03-019: toOption
  it("BEH-03-019: ok(42).toOption() returns Some(42)", () => {
    const opt = ok(42).toOption();
    expect(opt._tag).toBe("Some");
    expect(isOption(opt)).toBe(true);
    if (opt.isSome()) expect(opt.value).toBe(42);
  });

  it("BEH-03-019: err('x').toOption() returns None", () => {
    const result: Result<number, string> = err("x");
    const opt = result.toOption();
    expect(opt._tag).toBe("None");
    expect(opt.isNone()).toBe(true);
  });

  // BEH-03-020: toOptionErr
  it("BEH-03-020: ok(42).toOptionErr() returns None", () => {
    const result: Result<number, string> = ok(42);
    const opt = result.toOptionErr();
    expect(opt._tag).toBe("None");
  });

  it("BEH-03-020: err('x').toOptionErr() returns Some('x')", () => {
    const opt = err("x").toOptionErr();
    expect(opt._tag).toBe("Some");
    if (opt.isSome()) expect(opt.value).toBe("x");
  });

  // BEH-03-021: transpose
  it("BEH-03-021: ok(some(42)).transpose() returns Some(Ok(42))", () => {
    const result = ok(some(42)).transpose();
    expect(result._tag).toBe("Some");
    if (result.isSome()) {
      expect(isResult(result.value)).toBe(true);
      expect(result.value._tag).toBe("Ok");
      if (result.value.isOk()) expect(result.value.value).toBe(42);
    }
  });

  it("BEH-03-021: ok(none()).transpose() returns None", () => {
    const result = ok(none()).transpose();
    expect(result._tag).toBe("None");
  });

  it("BEH-03-021: err('x').transpose() returns Some(Err('x'))", () => {
    const result: Result<number, string> = err("x");
    const transposed = result.transpose();
    expect(transposed._tag).toBe("Some");
    if (transposed.isSome()) {
      expect(transposed.value._tag).toBe("Err");
    }
  });
});
