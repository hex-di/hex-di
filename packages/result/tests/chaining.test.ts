import { describe, it, expect, vi } from "vitest";
import { ok, err } from "../src/index.js";
import type { Result } from "../src/index.js";

describe("Chaining", () => {
  // DoD 5 #1
  it("ok(2).andThen(v => ok(v * 3)) returns Ok(6)", () => {
    const result = ok(2).andThen(v => ok(v * 3));
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(6);
  });

  // DoD 5 #2
  it("ok(2).andThen(v => err('fail')) returns Err('fail')", () => {
    const result = ok(2).andThen(() => err("fail"));
    expect(result._tag).toBe("Err");
    if (result.isErr()) expect(result.error).toBe("fail");
  });

  // DoD 5 #3
  it("err('x').andThen(v => ok(v * 3)) returns Err('x')", () => {
    const result: Result<number, string> = err("x");
    const chained = result.andThen(v => ok(v * 3));
    expect(chained._tag).toBe("Err");
    if (chained.isErr()) expect(chained.error).toBe("x");
  });

  // DoD 5 #4
  it("err('x').orElse(e => ok(99)) returns Ok(99)", () => {
    const result: Result<number, string> = err("x");
    const recovered = result.orElse(() => ok(99));
    expect(recovered._tag).toBe("Ok");
    if (recovered.isOk()) expect(recovered.value).toBe(99);
  });

  // DoD 5 #5
  it("err('x').orElse(e => err('new')) returns Err('new')", () => {
    const result: Result<number, string> = err("x");
    const recovered = result.orElse(() => err("new"));
    expect(recovered._tag).toBe("Err");
    if (recovered.isErr()) expect(recovered.error).toBe("new");
  });

  // DoD 5 #6
  it("ok(1).orElse(e => ok(99)) returns Ok(1)", () => {
    const result: Result<number, string> = ok(1);
    const recovered = result.orElse(() => ok(99));
    expect(recovered._tag).toBe("Ok");
    if (recovered.isOk()) expect(recovered.value).toBe(1);
  });

  // DoD 5 #7
  it("ok(2).andTee(v => {}) returns Ok(2)", () => {
    const result = ok(2).andTee(() => {});
    expect(result._tag).toBe("Ok");
    expect(result.value).toBe(2);
  });

  // DoD 5 #8
  it("ok(2).andTee(v => { throw ... }) returns Ok(2) (swallows error)", () => {
    const result = ok(2).andTee(() => {
      throw new Error("boom");
    });
    expect(result._tag).toBe("Ok");
    expect(result.value).toBe(2);
  });

  // DoD 5 #9
  it("err('x').andTee(v => {}) returns Err('x')", () => {
    const result: Result<number, string> = err("x");
    const teed = result.andTee(() => {});
    expect(teed._tag).toBe("Err");
    if (teed.isErr()) expect(teed.error).toBe("x");
  });

  // DoD 5 #10
  it("andTee calls the function with the Ok value", () => {
    const fn = vi.fn();
    ok(42).andTee(fn);
    expect(fn).toHaveBeenCalledWith(42);
  });

  // DoD 5 #11
  it("err('x').orTee(e => {}) returns Err('x')", () => {
    const result: Result<number, string> = err("x");
    const teed = result.orTee(() => {});
    expect(teed._tag).toBe("Err");
    if (teed.isErr()) expect(teed.error).toBe("x");
  });

  // DoD 5 #12
  it("orTee calls the function with the Err value", () => {
    const fn = vi.fn();
    err("x").orTee(fn);
    expect(fn).toHaveBeenCalledWith("x");
  });

  // DoD 5 #13
  it("ok(1).orTee(e => {}) returns Ok(1)", () => {
    const result: Result<number, string> = ok(1);
    const teed = result.orTee(() => {});
    expect(teed._tag).toBe("Ok");
    if (teed.isOk()) expect(teed.value).toBe(1);
  });

  // DoD 5 #14
  it("ok(2).andThrough(v => ok('ignored')) returns Ok(2) (original value)", () => {
    const result = ok(2).andThrough(() => ok("ignored"));
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(2);
  });

  // DoD 5 #15
  it("ok(2).andThrough(v => err('fail')) returns Err('fail') (propagates)", () => {
    const result = ok(2).andThrough(() => err("fail"));
    expect(result._tag).toBe("Err");
    if (result.isErr()) expect(result.error).toBe("fail");
  });

  // DoD 5 #16
  it("err('x').andThrough(v => ok('ignored')) returns Err('x')", () => {
    const result: Result<number, string> = err("x");
    const through = result.andThrough(() => ok("ignored"));
    expect(through._tag).toBe("Err");
    if (through.isErr()) expect(through.error).toBe("x");
  });

  // DoD 5 #17
  it("inspect calls function on Ok, returns same Result", () => {
    const fn = vi.fn();
    const original = ok(42);
    const result = original.inspect(fn);
    expect(fn).toHaveBeenCalledWith(42);
    expect(result).toBe(original);
  });

  // DoD 5 #18
  it("inspect does not call function on Err", () => {
    const fn = vi.fn();
    const result: Result<number, string> = err("x");
    result.inspect(fn);
    expect(fn).not.toHaveBeenCalled();
  });

  // DoD 5 #19
  it("inspectErr calls function on Err, returns same Result", () => {
    const fn = vi.fn();
    const original = err("x");
    const result = original.inspectErr(fn);
    expect(fn).toHaveBeenCalledWith("x");
    expect(result).toBe(original);
  });

  // DoD 5 #20
  it("inspectErr does not call function on Ok", () => {
    const fn = vi.fn();
    const result: Result<number, string> = ok(42);
    result.inspectErr(fn);
    expect(fn).not.toHaveBeenCalled();
  });

  // DoD 5 #21
  it("Chaining andThen accumulates error types via union", () => {
    type E1 = { _tag: "E1" };
    type E2 = { _tag: "E2" };
    const step1 = (): Result<number, E1> => ok(1);
    const step2 = (_n: number): Result<string, E2> => ok("done");

    const result = step1().andThen(step2);
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe("done");
  });

  // DoD 5 #22
  it("Three-step andThen chain short-circuits on first Err", () => {
    const step1 = vi.fn((): Result<number, string> => ok(1));
    const step2 = vi.fn((_n: number): Result<number, string> => err("fail"));
    const step3 = vi.fn((_n: number): Result<number, string> => ok(3));

    const result = step1().andThen(step2).andThen(step3);
    expect(result._tag).toBe("Err");
    expect(step3).not.toHaveBeenCalled();
  });
});
