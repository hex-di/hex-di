import { describe, it, expect } from "vitest";
import { ok, err, ResultAsync, RESULT_BRAND } from "../src/index.js";
import type { Result } from "../src/index.js";
import { isResult, isResultAsync } from "../src/core/guards.js";

describe("Type Guards", () => {
  // DoD 3 #1
  it("BEH-01-011: ok(1).isOk() returns true", () => {
    expect(ok(1).isOk()).toBe(true);
  });

  // DoD 3 #2
  it("BEH-01-011: ok(1).isErr() returns false", () => {
    expect(ok(1).isErr()).toBe(false);
  });

  // DoD 3 #3
  it("BEH-01-011: err('x').isOk() returns false", () => {
    expect(err("x").isOk()).toBe(false);
  });

  // DoD 3 #4
  it("BEH-01-011: err('x').isErr() returns true", () => {
    expect(err("x").isErr()).toBe(true);
  });

  // DoD 3 #5
  it("BEH-01-011: isOk() narrows type to Ok in conditional", () => {
    const result: Result<number, string> = ok(42);
    if (result.isOk()) {
      // If this compiles, narrowing works
      expect(result.value).toBe(42);
    } else {
      throw new Error("Should not reach here");
    }
  });

  // DoD 3 #6
  it("BEH-01-011: isErr() narrows type to Err in conditional", () => {
    const result: Result<number, string> = err("fail");
    if (result.isErr()) {
      expect(result.error).toBe("fail");
    } else {
      throw new Error("Should not reach here");
    }
  });

  // DoD 3 #7
  it("BEH-01-011: ok(5).isOkAnd(v => v > 3) returns true", () => {
    expect(ok(5).isOkAnd(v => v > 3)).toBe(true);
  });

  // DoD 3 #8
  it("BEH-01-011: ok(1).isOkAnd(v => v > 3) returns false", () => {
    expect(ok(1).isOkAnd(v => v > 3)).toBe(false);
  });

  // DoD 3 #9
  it("BEH-01-011: err('x').isOkAnd(v => v > 3) returns false", () => {
    const result: Result<number, string> = err("x");
    expect(result.isOkAnd(v => v > 3)).toBe(false);
  });

  // DoD 3 #10
  it("BEH-01-011: err('x').isErrAnd(e => e === 'x') returns true", () => {
    expect(err("x").isErrAnd(e => e === "x")).toBe(true);
  });

  // DoD 3 #11
  it("BEH-01-011: ok(1).isErrAnd(e => e === 'x') returns false", () => {
    const result: Result<number, string> = ok(1);
    expect(result.isErrAnd(e => e === "x")).toBe(false);
  });

  // DoD 3 #12
  it("BEH-01-009: isResult(ok(1)) returns true", () => {
    expect(isResult(ok(1))).toBe(true);
  });

  // DoD 3 #13
  it("BEH-01-009: isResult(err('x')) returns true", () => {
    expect(isResult(err("x"))).toBe(true);
  });

  // DoD 3 #14
  it("BEH-01-009: isResult('not a result') returns false", () => {
    expect(isResult("not a result")).toBe(false);
  });

  // DoD 3 #15
  it("BEH-01-009: isResult(null) returns false", () => {
    expect(isResult(null)).toBe(false);
  });

  // DoD 3 #16
  it("BEH-01-009: isResult(undefined) returns false", () => {
    expect(isResult(undefined)).toBe(false);
  });

  // DoD 3 #17
  it("BEH-01-011: Narrowing with _tag discriminant works in switch statement", () => {
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

  // --- Mutation gap: isResult with object having _tag: "Ok" but no value ---
  it("BEH-01-009, INV-3: isResult({ _tag: 'Ok' }) without value property returns false", () => {
    expect(isResult({ _tag: "Ok" })).toBe(false);
  });

  // --- Mutation gap: isResult with object having _tag: "Err" but no error ---
  it("BEH-01-009, INV-3: isResult({ _tag: 'Err' }) without error property returns false", () => {
    expect(isResult({ _tag: "Err" })).toBe(false);
  });

  // --- Mutation gap: isResult with non-Result object having _tag ---
  it("BEH-01-009, INV-3: isResult({ _tag: 'Other', value: 1 }) returns false", () => {
    expect(isResult({ _tag: "Other", value: 1 })).toBe(false);
  });

  // --- Mutation gap: isResult with number ---
  it("BEH-01-009: isResult(42) returns false", () => {
    expect(isResult(42)).toBe(false);
  });

  // --- Mutation gap: isResult with boolean ---
  it("BEH-01-009: isResult(true) returns false", () => {
    expect(isResult(true)).toBe(false);
  });

  // --- Mutation gap: isResult with object matching Ok shape but wrong tag ---
  it("BEH-01-009, INV-3: isResult({ _tag: 'Err', value: 1 }) returns false (has value, not error)", () => {
    expect(isResult({ _tag: "Err", value: 1 })).toBe(false);
  });

  // --- Mutation gap: isResult with object matching Err shape but wrong tag ---
  it("BEH-01-009, INV-3: isResult({ _tag: 'Ok', error: 'x' }) returns false (has error, not value)", () => {
    expect(isResult({ _tag: "Ok", error: "x" })).toBe(false);
  });

  // DoD 3 #18
  it("BEH-01-011: Array .filter(r => r.isOk()) produces only Ok values", () => {
    const results: Result<number, string>[] = [ok(1), err("bad"), ok(3)];
    const successes = results.filter((r): r is typeof r & { _tag: "Ok" } => r.isOk());
    expect(successes).toHaveLength(2);
    expect(successes[0].value).toBe(1);
    expect(successes[1].value).toBe(3);
  });

  // INV-3: Brand symbol prevents forgery — structurally identical object without RESULT_BRAND is rejected
  it("INV-3: rejects structurally similar object that lacks RESULT_BRAND symbol", () => {
    const forgery = { _tag: "Ok" as const, value: 42, isOk: () => true, isErr: () => false };
    expect(isResult(forgery)).toBe(false);
    // Confirm a real Result passes for contrast
    expect(isResult(ok(42))).toBe(true);
  });

  it("INV-3: real Result carries RESULT_BRAND symbol", () => {
    const result = ok(1);
    expect(RESULT_BRAND in result).toBe(true);
  });
});

describe("BEH-01-010: isResultAsync", () => {
  it("BEH-01-010: returns true for ResultAsync.ok(1)", () => {
    expect(isResultAsync(ResultAsync.ok(1))).toBe(true);
  });

  it("BEH-01-010: returns true for ResultAsync.err('x')", () => {
    expect(isResultAsync(ResultAsync.err("x"))).toBe(true);
  });

  it("BEH-01-010: returns true for ResultAsync.fromSafePromise(...)", () => {
    expect(isResultAsync(ResultAsync.fromSafePromise(Promise.resolve(42)))).toBe(true);
  });

  it("BEH-01-010: returns false for ok(1) (sync Result, no then)", () => {
    expect(isResultAsync(ok(1))).toBe(false);
  });

  it("BEH-01-010: returns false for err('x') (sync Result)", () => {
    expect(isResultAsync(err("x"))).toBe(false);
  });

  it("BEH-01-010: returns false for null", () => {
    expect(isResultAsync(null)).toBe(false);
  });

  it("BEH-01-010: returns false for undefined", () => {
    expect(isResultAsync(undefined)).toBe(false);
  });

  it("BEH-01-010: returns false for a string", () => {
    expect(isResultAsync("string")).toBe(false);
  });

  it("BEH-01-010: returns false for a number", () => {
    expect(isResultAsync(42)).toBe(false);
  });

  it("BEH-01-010: returns false for a plain Promise (has then but no match)", () => {
    expect(isResultAsync(Promise.resolve(1))).toBe(false);
  });

  it("BEH-01-010: returns false for { match: 'not-a-fn' }", () => {
    expect(isResultAsync({ match: "not-a-fn" })).toBe(false);
  });

  it("BEH-01-010: returns true for structural match { then: fn, match: fn }", () => {
    const fake = { then: () => {}, match: () => {} };
    expect(isResultAsync(fake)).toBe(true);
  });

  it("BEH-01-010: returns false for { match: fn } without then", () => {
    expect(isResultAsync({ match: () => {} })).toBe(false);
  });

  it("BEH-01-010: returns false for { then: 'not-a-fn', match: fn }", () => {
    expect(isResultAsync({ then: "not-a-fn", match: () => {} })).toBe(false);
  });

  // INV-9: ResultAsync brand identity — every ResultAsync created via factory methods is recognized
  it("INV-9: ResultAsync.ok() is recognized by isResultAsync", () => {
    const ra = ResultAsync.ok(1);
    expect(isResultAsync(ra)).toBe(true);
  });

  it("INV-9: ResultAsync.err() is recognized by isResultAsync", () => {
    const ra = ResultAsync.err("fail");
    expect(isResultAsync(ra)).toBe(true);
  });
});
