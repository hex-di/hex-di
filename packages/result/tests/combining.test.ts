import { describe, it, expect } from "vitest";
import { ok, err } from "../src/index.js";
import { all } from "../src/combinators/all.js";
import { allSettled } from "../src/combinators/all-settled.js";
import { any } from "../src/combinators/any.js";
import { collect } from "../src/combinators/collect.js";
import { partition } from "../src/combinators/partition.js";
import { forEach } from "../src/combinators/for-each.js";
import { zipOrAccumulate } from "../src/combinators/zip-or-accumulate.js";
import type { Result } from "../src/index.js";

describe("Combining", () => {
  // DoD 7 #1
  it("BEH-05-001: all(ok(1), ok(2), ok(3)) returns Ok([1, 2, 3])", () => {
    const result = all(ok(1), ok(2), ok(3));
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toEqual([1, 2, 3]);
  });

  // DoD 7 #2
  it("BEH-05-001: all(ok(1), err('a'), ok(3)) returns Err('a') (first error)", () => {
    const result = all(ok(1), err("a"), ok(3));
    expect(result._tag).toBe("Err");
    if (result.isErr()) expect(result.error).toBe("a");
  });

  // DoD 7 #3
  it("BEH-05-001: all(ok(1), err('a'), err('b')) returns Err('a') (short-circuits)", () => {
    const result = all(ok(1), err("a"), err("b"));
    expect(result._tag).toBe("Err");
    if (result.isErr()) expect(result.error).toBe("a");
  });

  // DoD 7 #4
  it("BEH-05-001: all() with empty args returns Ok([])", () => {
    const result = all();
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toEqual([]);
  });

  // DoD 7 #5
  it("BEH-05-002: allSettled(ok(1), ok(2)) returns Ok([1, 2])", () => {
    const result = allSettled(ok(1), ok(2));
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toEqual([1, 2]);
  });

  // DoD 7 #6
  it("BEH-05-002: allSettled(ok(1), err('a'), err('b')) returns Err(['a', 'b'])", () => {
    const result = allSettled(ok(1), err("a"), err("b"));
    expect(result._tag).toBe("Err");
    if (result.isErr()) expect(result.error).toEqual(["a", "b"]);
  });

  // DoD 7 #7
  it("BEH-05-002: allSettled(ok(1), err('a'), ok(3)) returns Err(['a'])", () => {
    const result = allSettled(ok(1), err("a"), ok(3));
    expect(result._tag).toBe("Err");
    if (result.isErr()) expect(result.error).toEqual(["a"]);
  });

  // DoD 7 #8
  it("BEH-05-003: any(ok(1), err('a')) returns Ok(1) (first success)", () => {
    const result = any(ok(1), err("a"));
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(1);
  });

  // DoD 7 #9
  it("BEH-05-003: any(err('a'), ok(2)) returns Ok(2)", () => {
    const result = any(err("a"), ok(2));
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(2);
  });

  // DoD 7 #10
  it("BEH-05-003: any(err('a'), err('b')) returns Err(['a', 'b'])", () => {
    const result = any(err("a"), err("b"));
    expect(result._tag).toBe("Err");
    if (result.isErr()) expect(result.error).toEqual(["a", "b"]);
  });

  // DoD 7 #11
  it("BEH-05-004: collect({ a: ok(1), b: ok('str') }) returns Ok({ a: 1, b: 'str' })", () => {
    const result = collect({ a: ok(1), b: ok("str") });
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toEqual({ a: 1, b: "str" });
  });

  // DoD 7 #12
  it("BEH-05-004: collect({ a: ok(1), b: err('x') }) returns Err('x')", () => {
    const result = collect({ a: ok(1), b: err("x") });
    expect(result._tag).toBe("Err");
    if (result.isErr()) expect(result.error).toBe("x");
  });

  // DoD 7 #13
  it("BEH-05-001: all preserves tuple types (not widened to array)", () => {
    const result = all(ok(1), ok("two"), ok(true));
    expect(result._tag).toBe("Ok");
    if (result.isOk()) {
      expect(result.value[0]).toBe(1);
      expect(result.value[1]).toBe("two");
      expect(result.value[2]).toBe(true);
    }
  });

  // DoD 7 #14
  it("BEH-05-001: all with array input (non-tuple) works correctly", () => {
    const results = [ok(1), ok(2), ok(3)];
    const result = all(...results);
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toEqual([1, 2, 3]);
  });

  // BEH-05-005: partition
  describe("BEH-05-005: partition", () => {
    it("splits mixed results into [oks, errs]", () => {
      const [oks, errs] = partition([ok(1), err("a"), ok(2), err("b")]);
      expect(oks).toEqual([1, 2]);
      expect(errs).toEqual(["a", "b"]);
    });

    it("all Ok returns [allValues, []]", () => {
      const [oks, errs] = partition([ok(1), ok(2), ok(3)]);
      expect(oks).toEqual([1, 2, 3]);
      expect(errs).toEqual([]);
    });

    it("all Err returns [[], allErrors]", () => {
      const results: Result<number, string>[] = [err("a"), err("b")];
      const [oks, errs] = partition(results);
      expect(oks).toEqual([]);
      expect(errs).toEqual(["a", "b"]);
    });

    it("empty input returns [[], []]", () => {
      const [oks, errs] = partition([]);
      expect(oks).toEqual([]);
      expect(errs).toEqual([]);
    });

    it("preserves order within each array", () => {
      const [oks, errs] = partition([ok(1), err("x"), ok(2), err("y"), ok(3)]);
      expect(oks).toEqual([1, 2, 3]);
      expect(errs).toEqual(["x", "y"]);
    });
  });

  // BEH-05-006: forEach
  describe("BEH-05-006: forEach", () => {
    it("maps all items when all succeed", () => {
      const result = forEach([1, 2, 3], (n) => ok(n * 2));
      expect(result._tag).toBe("Ok");
      if (result.isOk()) expect(result.value).toEqual([2, 4, 6]);
    });

    it("short-circuits on first Err", () => {
      const result = forEach([1, -1, 3], (n) =>
        n > 0 ? ok(n * 2) : err("negative"),
      );
      expect(result._tag).toBe("Err");
      if (result.isErr()) expect(result.error).toBe("negative");
    });

    it("passes index as second argument", () => {
      const result = forEach(["a", "b", "c"], (_item, i) => ok(i));
      expect(result._tag).toBe("Ok");
      if (result.isOk()) expect(result.value).toEqual([0, 1, 2]);
    });

    it("empty input returns Ok([])", () => {
      const result = forEach([], () => err("never"));
      expect(result._tag).toBe("Ok");
      if (result.isOk()) expect(result.value).toEqual([]);
    });

    it("does not call f for items after first Err", () => {
      let callCount = 0;
      forEach([1, -1, 3], (n) => {
        callCount++;
        return n > 0 ? ok(n) : err("negative");
      });
      expect(callCount).toBe(2); // called for 1 and -1, not 3
    });
  });

  // BEH-05-007: zipOrAccumulate
  describe("BEH-05-007: zipOrAccumulate", () => {
    it("all Ok returns Ok with tuple of values", () => {
      const result = zipOrAccumulate(ok(1), ok("hello"), ok(true));
      expect(result._tag).toBe("Ok");
      if (result.isOk()) expect(result.value).toEqual([1, "hello", true]);
    });

    it("collects all errors into NonEmptyArray", () => {
      const result = zipOrAccumulate(ok(1), err("a"), err("b"));
      expect(result._tag).toBe("Err");
      if (result.isErr()) {
        expect(result.error).toEqual(["a", "b"]);
        expect(result.error.length).toBeGreaterThanOrEqual(1);
      }
    });

    it("single error returns NonEmptyArray with one element", () => {
      const result = zipOrAccumulate(ok(1), err("only"), ok(3));
      expect(result._tag).toBe("Err");
      if (result.isErr()) expect(result.error).toEqual(["only"]);
    });

    it("empty input returns Ok([])", () => {
      const result = zipOrAccumulate();
      expect(result._tag).toBe("Ok");
      if (result.isOk()) expect(result.value).toEqual([]);
    });
  });
});
