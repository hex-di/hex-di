import { describe, it, expect, vi } from "vitest";
import { ok, err } from "../src/index.js";
import type { Result } from "../src/index.js";
import {
  pipe, map, mapErr, mapBoth, andThen, orElse, match,
  unwrapOr, flatten, flip, and, or, mapOr, mapOrElse,
  contains, containsErr, inspect, inspectErr,
  toNullable, toUndefined, intoTuple, merge,
  toOption, toOptionErr, toJSON,
} from "../src/fn/index.js";

describe("BEH-10-001, INV-14: Standalone Functions", () => {
  describe("BEH-10-002: pipe", () => {
    it("pipe(value) returns value unchanged", () => {
      expect(pipe(42)).toBe(42);
    });

    it("pipe(ok(21), map(n => n * 2)) returns Ok(42)", () => {
      const result = pipe(ok(21), map((n: number) => n * 2));
      expect(result._tag).toBe("Ok");
      if (result.isOk()) expect(result.value).toBe(42);
    });

    it("pipe chains multiple functions", () => {
      const result = pipe(
        ok(10),
        map((n: number) => n * 2),
        map((n: number) => n + 1),
        unwrapOr(0),
      );
      expect(result).toBe(21);
    });
  });

  describe("BEH-10-003: map", () => {
    it("delegates to result.map", () => {
      const result = map((n: number) => n * 2)(ok(21));
      expect(result._tag).toBe("Ok");
      if (result.isOk()) expect(result.value).toBe(42);
    });

    it("passes through Err", () => {
      const result = map((n: number) => n * 2)(err("x") as Result<number, string>);
      expect(result._tag).toBe("Err");
    });
  });

  describe("BEH-10-003: mapErr", () => {
    it("delegates to result.mapErr", () => {
      const result = mapErr((e: string) => e.toUpperCase())(err("fail"));
      expect(result._tag).toBe("Err");
      if (result.isErr()) expect(result.error).toBe("FAIL");
    });
  });

  describe("BEH-10-003: mapBoth", () => {
    it("delegates to result.mapBoth on Ok", () => {
      const result = mapBoth((n: number) => n * 2, (e: string) => e.toUpperCase())(ok(21) as Result<number, string>);
      expect(result._tag).toBe("Ok");
      if (result.isOk()) expect(result.value).toBe(42);
    });

    it("delegates to result.mapBoth on Err", () => {
      const result = mapBoth((n: number) => n * 2, (e: string) => e.toUpperCase())(err("fail") as Result<number, string>);
      expect(result._tag).toBe("Err");
      if (result.isErr()) expect(result.error).toBe("FAIL");
    });
  });

  describe("BEH-10-003: andThen", () => {
    it("delegates to result.andThen", () => {
      const result = andThen((n: number) => ok(n * 2))(ok(21));
      expect(result._tag).toBe("Ok");
      if (result.isOk()) expect(result.value).toBe(42);
    });
  });

  describe("BEH-10-003: orElse", () => {
    it("delegates to result.orElse", () => {
      const result = orElse((_: string) => ok(99))(err("fail") as Result<number, string>);
      expect(result._tag).toBe("Ok");
      if (result.isOk()) expect(result.value).toBe(99);
    });
  });

  describe("BEH-10-003: match", () => {
    it("delegates to result.match on Ok", () => {
      expect(match((n: number) => n * 2, (e: string) => e.length)(ok(21) as Result<number, string>)).toBe(42);
    });

    it("delegates to result.match on Err", () => {
      expect(match((n: number) => n * 2, (e: string) => e.length)(err("ab") as Result<number, string>)).toBe(2);
    });
  });

  describe("BEH-10-003: unwrapOr", () => {
    it("delegates to result.unwrapOr", () => {
      expect(unwrapOr(0)(ok(42))).toBe(42);
      expect(unwrapOr(0)(err("x") as Result<number, string>)).toBe(0);
    });
  });

  describe("BEH-10-003: flatten", () => {
    it("delegates to result.flatten", () => {
      const result = flatten()(ok(ok(42)));
      expect(result._tag).toBe("Ok");
      if (result.isOk()) expect(result.value).toBe(42);
    });
  });

  describe("BEH-10-003: flip", () => {
    it("delegates to result.flip", () => {
      const result = flip()(ok(42));
      expect(result._tag).toBe("Err");
      if (result.isErr()) expect(result.error).toBe(42);
    });
  });

  describe("BEH-10-003: and", () => {
    it("delegates to result.and", () => {
      const result = and(ok("b"))(ok(1));
      expect(result._tag).toBe("Ok");
      if (result.isOk()) expect(result.value).toBe("b");
    });
  });

  describe("BEH-10-003: or", () => {
    it("delegates to result.or", () => {
      const result = or(ok(99))(err("x") as Result<number, string>);
      expect(result._tag).toBe("Ok");
      if (result.isOk()) expect(result.value).toBe(99);
    });
  });

  describe("BEH-10-003: mapOr", () => {
    it("delegates to result.mapOr", () => {
      expect(mapOr(0, (n: number) => n * 2)(ok(21))).toBe(42);
      expect(mapOr(0, (n: number) => n * 2)(err("x") as Result<number, string>)).toBe(0);
    });
  });

  describe("BEH-10-003: mapOrElse", () => {
    it("delegates to result.mapOrElse", () => {
      expect(mapOrElse((e: string) => e.length, (n: number) => n * 2)(ok(21) as Result<number, string>)).toBe(42);
      expect(mapOrElse((e: string) => e.length, (n: number) => n * 2)(err("ab") as Result<number, string>)).toBe(2);
    });
  });

  describe("BEH-10-003: contains", () => {
    it("delegates to result.contains", () => {
      expect(contains(42)(ok(42))).toBe(true);
      expect(contains(42)(ok(99))).toBe(false);
    });
  });

  describe("BEH-10-003: containsErr", () => {
    it("delegates to result.containsErr", () => {
      expect(containsErr("x")(err("x"))).toBe(true);
      expect(containsErr("x")(err("y"))).toBe(false);
    });
  });

  describe("BEH-10-003: inspect", () => {
    it("delegates to result.inspect", () => {
      const fn = vi.fn();
      inspect(fn)(ok(42));
      expect(fn).toHaveBeenCalledWith(42);
    });
  });

  describe("BEH-10-003: inspectErr", () => {
    it("delegates to result.inspectErr", () => {
      const fn = vi.fn();
      inspectErr(fn)(err("x"));
      expect(fn).toHaveBeenCalledWith("x");
    });
  });

  describe("BEH-10-003: toNullable", () => {
    it("delegates to result.toNullable", () => {
      expect(toNullable()(ok(42))).toBe(42);
      expect(toNullable()(err("x"))).toBeNull();
    });
  });

  describe("BEH-10-003: toUndefined", () => {
    it("delegates to result.toUndefined", () => {
      expect(toUndefined()(ok(42))).toBe(42);
      expect(toUndefined()(err("x"))).toBeUndefined();
    });
  });

  describe("BEH-10-003: intoTuple", () => {
    it("delegates to result.intoTuple", () => {
      expect(intoTuple()(ok(42))).toEqual([null, 42]);
      expect(intoTuple()(err("x"))).toEqual(["x", null]);
    });
  });

  describe("BEH-10-003: merge", () => {
    it("delegates to result.merge", () => {
      expect(merge()(ok(42))).toBe(42);
      expect(merge()(err("x"))).toBe("x");
    });
  });

  describe("BEH-10-003: toOption", () => {
    it("delegates to result.toOption", () => {
      const opt = toOption()(ok(42));
      expect(opt._tag).toBe("Some");
      if (opt.isSome()) expect(opt.value).toBe(42);
    });
  });

  describe("BEH-10-003: toOptionErr", () => {
    it("delegates to result.toOptionErr", () => {
      const opt = toOptionErr()(err("x"));
      expect(opt._tag).toBe("Some");
      if (opt.isSome()) expect(opt.value).toBe("x");
    });
  });

  describe("BEH-10-003: toJSON", () => {
    it("delegates to result.toJSON", () => {
      expect(toJSON()(ok(42))).toEqual({ _tag: "Ok", _schemaVersion: 1, value: 42 });
      expect(toJSON()(err("x"))).toEqual({ _tag: "Err", _schemaVersion: 1, error: "x" });
    });
  });

  describe("BEH-10-004: Usage examples", () => {
    it("pipe chain: transforms Ok through multiple standalone functions", () => {
      const result = pipe(
        ok(5),
        map((n: number) => n * 3),
        andThen((n: number) => (n > 10 ? ok(n) : err("too small"))),
        mapErr((e: string) => e.toUpperCase()),
        unwrapOr(0),
      );
      expect(result).toBe(15);
    });

    it("reusable pipeline: composed standalone functions can be stored and reused", () => {
      const double = map((n: number) => n * 2);
      const addOne = map((n: number) => n + 1);
      const extract = unwrapOr(0);

      expect(extract(addOne(double(ok(10))))).toBe(21);
      expect(extract(addOne(double(err("x") as Result<number, string>)))).toBe(0);
    });

    it("mixing with methods: standalone pipe and instance methods interop", () => {
      const result = pipe(
        ok(10),
        map((n: number) => n + 5),
      );
      // Continue with instance method
      const final = result.map((n) => n * 2).unwrapOr(0);
      expect(final).toBe(30);
    });
  });
});
