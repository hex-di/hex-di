import { describe, it, expect } from "vitest";
import { ok, err } from "../src/index.js";
import type { Result } from "../src/index.js";
import { isResult } from "../src/core/guards.js";

describe("Type Guards", () => {
  // DoD 3 #1
  it("ok(1).isOk() returns true", () => {
    expect(ok(1).isOk()).toBe(true);
  });

  // DoD 3 #2
  it("ok(1).isErr() returns false", () => {
    expect(ok(1).isErr()).toBe(false);
  });

  // DoD 3 #3
  it("err('x').isOk() returns false", () => {
    expect(err("x").isOk()).toBe(false);
  });

  // DoD 3 #4
  it("err('x').isErr() returns true", () => {
    expect(err("x").isErr()).toBe(true);
  });

  // DoD 3 #5
  it("isOk() narrows type to Ok in conditional", () => {
    const result: Result<number, string> = ok(42);
    if (result.isOk()) {
      // If this compiles, narrowing works
      expect(result.value).toBe(42);
    } else {
      throw new Error("Should not reach here");
    }
  });

  // DoD 3 #6
  it("isErr() narrows type to Err in conditional", () => {
    const result: Result<number, string> = err("fail");
    if (result.isErr()) {
      expect(result.error).toBe("fail");
    } else {
      throw new Error("Should not reach here");
    }
  });

  // DoD 3 #7
  it("ok(5).isOkAnd(v => v > 3) returns true", () => {
    expect(ok(5).isOkAnd(v => v > 3)).toBe(true);
  });

  // DoD 3 #8
  it("ok(1).isOkAnd(v => v > 3) returns false", () => {
    expect(ok(1).isOkAnd(v => v > 3)).toBe(false);
  });

  // DoD 3 #9
  it("err('x').isOkAnd(v => v > 3) returns false", () => {
    const result: Result<number, string> = err("x");
    expect(result.isOkAnd(v => v > 3)).toBe(false);
  });

  // DoD 3 #10
  it("err('x').isErrAnd(e => e === 'x') returns true", () => {
    expect(err("x").isErrAnd(e => e === "x")).toBe(true);
  });

  // DoD 3 #11
  it("ok(1).isErrAnd(e => e === 'x') returns false", () => {
    const result: Result<number, string> = ok(1);
    expect(result.isErrAnd(e => e === "x")).toBe(false);
  });

  // DoD 3 #12
  it("isResult(ok(1)) returns true", () => {
    expect(isResult(ok(1))).toBe(true);
  });

  // DoD 3 #13
  it("isResult(err('x')) returns true", () => {
    expect(isResult(err("x"))).toBe(true);
  });

  // DoD 3 #14
  it("isResult('not a result') returns false", () => {
    expect(isResult("not a result")).toBe(false);
  });

  // DoD 3 #15
  it("isResult(null) returns false", () => {
    expect(isResult(null)).toBe(false);
  });

  // DoD 3 #16
  it("isResult(undefined) returns false", () => {
    expect(isResult(undefined)).toBe(false);
  });

  // DoD 3 #17
  it("Narrowing with _tag discriminant works in switch statement", () => {
    function extract(result: Result<number, string>): number | string {
      switch (result._tag) {
        case "Ok":
          return result.value;
        case "Err":
          return result.error;
      }
    }
    expect(extract(ok(42))).toBe(42);
    expect(extract(err("fail"))).toBe("fail");
  });

  // DoD 3 #18
  it("Array .filter(r => r.isOk()) produces only Ok values", () => {
    const results: Result<number, string>[] = [ok(1), err("bad"), ok(3)];
    const successes = results.filter((r): r is typeof r & { _tag: "Ok" } => r.isOk());
    expect(successes).toHaveLength(2);
    expect(successes[0].value).toBe(1);
    expect(successes[1].value).toBe(3);
  });
});
