import { describe, it, expect, vi } from "vitest";
import { ok, err } from "../src/index.js";
import type { Result } from "../src/index.js";

describe("Transformations", () => {
  // DoD 4 #1
  it("ok(2).map(x => x * 3) returns Ok(6)", () => {
    const result = ok(2).map(x => x * 3);
    expect(result._tag).toBe("Ok");
    expect(result.value).toBe(6);
  });

  // DoD 4 #2
  it("err('x').map(x => x * 3) returns Err('x') unchanged", () => {
    const result: Result<number, string> = err("x");
    const mapped = result.map(x => x * 3);
    expect(mapped._tag).toBe("Err");
    if (mapped.isErr()) {
      expect(mapped.error).toBe("x");
    }
  });

  // DoD 4 #3
  it("ok(2).mapErr(e => e.toUpperCase()) returns Ok(2) unchanged", () => {
    const result: Result<number, string> = ok(2);
    const mapped = result.mapErr(e => e.toUpperCase());
    expect(mapped._tag).toBe("Ok");
    if (mapped.isOk()) {
      expect(mapped.value).toBe(2);
    }
  });

  // DoD 4 #4
  it("err('fail').mapErr(e => e.toUpperCase()) returns Err('FAIL')", () => {
    const result = err("fail").mapErr(e => e.toUpperCase());
    expect(result._tag).toBe("Err");
    expect(result.error).toBe("FAIL");
  });

  // DoD 4 #5
  it("ok(2).mapBoth(v => v * 2, e => e) returns Ok(4)", () => {
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
  it("err('x').mapBoth(v => v * 2, e => e.toUpperCase()) returns Err('X')", () => {
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
  it("ok(ok(42)).flatten() returns Ok(42)", () => {
    const nested = ok(ok(42));
    const flat = nested.flatten();
    expect(flat._tag).toBe("Ok");
    if (flat.isOk()) {
      expect(flat.value).toBe(42);
    }
  });

  // DoD 4 #8
  it("ok(err('inner')).flatten() returns Err('inner')", () => {
    const nested = ok(err("inner"));
    const flat = nested.flatten();
    expect(flat._tag).toBe("Err");
    if (flat.isErr()) {
      expect(flat.error).toBe("inner");
    }
  });

  // DoD 4 #9
  it("err('outer').flatten() returns Err('outer')", () => {
    const outer: Result<Result<number, string>, string> = err("outer");
    const flat = outer.flatten();
    expect(flat._tag).toBe("Err");
    if (flat.isErr()) {
      expect(flat.error).toBe("outer");
    }
  });

  // DoD 4 #10
  it("ok(42).flip() returns Err(42)", () => {
    const result = ok(42).flip();
    expect(result._tag).toBe("Err");
    expect(result.error).toBe(42);
  });

  // DoD 4 #11
  it("err('x').flip() returns Ok('x')", () => {
    const result = err("x").flip();
    expect(result._tag).toBe("Ok");
    expect(result.value).toBe("x");
  });

  // DoD 4 #12
  it("map does not call the function on Err", () => {
    const fn = vi.fn((x: number) => x * 2);
    const result: Result<number, string> = err("x");
    result.map(fn);
    expect(fn).not.toHaveBeenCalled();
  });

  // DoD 4 #13
  it("mapErr does not call the function on Ok", () => {
    const fn = vi.fn((e: string) => e.toUpperCase());
    const result: Result<number, string> = ok(2);
    result.mapErr(fn);
    expect(fn).not.toHaveBeenCalled();
  });
});
