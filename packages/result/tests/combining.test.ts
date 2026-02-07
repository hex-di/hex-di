import { describe, it, expect } from "vitest";
import { ok, err } from "../src/index.js";
import { all } from "../src/combinators/all.js";
import { allSettled } from "../src/combinators/all-settled.js";
import { any } from "../src/combinators/any.js";
import { collect } from "../src/combinators/collect.js";

describe("Combining", () => {
  // DoD 7 #1
  it("all(ok(1), ok(2), ok(3)) returns Ok([1, 2, 3])", () => {
    const result = all(ok(1), ok(2), ok(3));
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toEqual([1, 2, 3]);
  });

  // DoD 7 #2
  it("all(ok(1), err('a'), ok(3)) returns Err('a') (first error)", () => {
    const result = all(ok(1), err("a"), ok(3));
    expect(result._tag).toBe("Err");
    if (result.isErr()) expect(result.error).toBe("a");
  });

  // DoD 7 #3
  it("all(ok(1), err('a'), err('b')) returns Err('a') (short-circuits)", () => {
    const result = all(ok(1), err("a"), err("b"));
    expect(result._tag).toBe("Err");
    if (result.isErr()) expect(result.error).toBe("a");
  });

  // DoD 7 #4
  it("all() with empty args returns Ok([])", () => {
    const result = all();
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toEqual([]);
  });

  // DoD 7 #5
  it("allSettled(ok(1), ok(2)) returns Ok([1, 2])", () => {
    const result = allSettled(ok(1), ok(2));
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toEqual([1, 2]);
  });

  // DoD 7 #6
  it("allSettled(ok(1), err('a'), err('b')) returns Err(['a', 'b'])", () => {
    const result = allSettled(ok(1), err("a"), err("b"));
    expect(result._tag).toBe("Err");
    if (result.isErr()) expect(result.error).toEqual(["a", "b"]);
  });

  // DoD 7 #7
  it("allSettled(ok(1), err('a'), ok(3)) returns Err(['a'])", () => {
    const result = allSettled(ok(1), err("a"), ok(3));
    expect(result._tag).toBe("Err");
    if (result.isErr()) expect(result.error).toEqual(["a"]);
  });

  // DoD 7 #8
  it("any(ok(1), err('a')) returns Ok(1) (first success)", () => {
    const result = any(ok(1), err("a"));
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(1);
  });

  // DoD 7 #9
  it("any(err('a'), ok(2)) returns Ok(2)", () => {
    const result = any(err("a"), ok(2));
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(2);
  });

  // DoD 7 #10
  it("any(err('a'), err('b')) returns Err(['a', 'b'])", () => {
    const result = any(err("a"), err("b"));
    expect(result._tag).toBe("Err");
    if (result.isErr()) expect(result.error).toEqual(["a", "b"]);
  });

  // DoD 7 #11
  it("collect({ a: ok(1), b: ok('str') }) returns Ok({ a: 1, b: 'str' })", () => {
    const result = collect({ a: ok(1), b: ok("str") });
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toEqual({ a: 1, b: "str" });
  });

  // DoD 7 #12
  it("collect({ a: ok(1), b: err('x') }) returns Err('x')", () => {
    const result = collect({ a: ok(1), b: err("x") });
    expect(result._tag).toBe("Err");
    if (result.isErr()) expect(result.error).toBe("x");
  });

  // DoD 7 #13
  it("all preserves tuple types (not widened to array)", () => {
    const result = all(ok(1), ok("two"), ok(true));
    expect(result._tag).toBe("Ok");
    if (result.isOk()) {
      expect(result.value[0]).toBe(1);
      expect(result.value[1]).toBe("two");
      expect(result.value[2]).toBe(true);
    }
  });

  // DoD 7 #14
  it("all with array input (non-tuple) works correctly", () => {
    const results = [ok(1), ok(2), ok(3)];
    const result = all(...results);
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toEqual([1, 2, 3]);
  });
});
