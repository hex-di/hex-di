import { describe, it, expect } from "vitest";
import { fromThrowable } from "../src/constructors/from-throwable.js";
import { fromNullable } from "../src/constructors/from-nullable.js";
import { fromPredicate } from "../src/constructors/from-predicate.js";
import { tryCatch } from "../src/constructors/try-catch.js";

describe("Constructors", () => {
  describe("fromThrowable", () => {
    // DoD 2 #5
    it("returns Ok when fn succeeds (zero-arg overload)", () => {
      const result = fromThrowable(
        () => JSON.parse('{"a":1}'),
        () => "parse error"
      );
      expect(result._tag).toBe("Ok");
      if (result.isOk()) expect(result.value).toEqual({ a: 1 });
    });

    // DoD 2 #6
    it("returns Err when fn throws (zero-arg overload)", () => {
      const result = fromThrowable(
        () => JSON.parse("not json"),
        () => "parse error"
      );
      expect(result._tag).toBe("Err");
      if (result.isErr()) expect(result.error).toBe("parse error");
    });

    // DoD 2 #7
    it("passes thrown value to mapErr", () => {
      const result = fromThrowable(
        () => {
          throw new Error("boom");
        },
        e => (e instanceof Error ? e.message : "unknown")
      );
      expect(result._tag).toBe("Err");
      if (result.isErr()) expect(result.error).toBe("boom");
    });

    // DoD 2 #8
    it("overload wraps function: returns (...args) => Result", () => {
      const safeParse = fromThrowable(
        (input: string) => JSON.parse(input),
        () => "parse error"
      );
      expect(typeof safeParse).toBe("function");
    });

    // DoD 2 #9
    it("wrapped function returns Ok on success", () => {
      const safeParse = fromThrowable(
        (input: string) => JSON.parse(input),
        () => "parse error"
      );
      const result = safeParse('{"a":1}');
      expect(result._tag).toBe("Ok");
      if (result.isOk()) expect(result.value).toEqual({ a: 1 });
    });

    // DoD 2 #10
    it("wrapped function returns Err on throw", () => {
      const safeParse = fromThrowable(
        (input: string) => JSON.parse(input),
        () => "parse error"
      );
      const result = safeParse("not json");
      expect(result._tag).toBe("Err");
      if (result.isErr()) expect(result.error).toBe("parse error");
    });
  });

  describe("fromNullable", () => {
    // DoD 2 #16
    it("returns Ok for non-null value", () => {
      const result = fromNullable(42, () => "was null");
      expect(result._tag).toBe("Ok");
      if (result.isOk()) expect(result.value).toBe(42);
    });

    // DoD 2 #17
    it("returns Err with onNull() result for null", () => {
      const result = fromNullable(null, () => "was null");
      expect(result._tag).toBe("Err");
      if (result.isErr()) expect(result.error).toBe("was null");
    });

    // DoD 2 #18
    it("returns Err with onNull() result for undefined", () => {
      const result = fromNullable(undefined, () => "was null");
      expect(result._tag).toBe("Err");
      if (result.isErr()) expect(result.error).toBe("was null");
    });
  });

  describe("fromPredicate", () => {
    // DoD 2 #19
    it("returns Ok when predicate is true", () => {
      const result = fromPredicate(
        5,
        n => n > 3,
        n => `${n} too small`
      );
      expect(result._tag).toBe("Ok");
      if (result.isOk()) expect(result.value).toBe(5);
    });

    // DoD 2 #20
    it("returns Err when predicate is false", () => {
      const result = fromPredicate(
        1,
        n => n > 3,
        n => `${n} too small`
      );
      expect(result._tag).toBe("Err");
      if (result.isErr()) expect(result.error).toBe("1 too small");
    });

    // DoD 2 #21
    it("with type guard narrows the Ok type", () => {
      interface Admin {
        role: "admin";
        permissions: string[];
      }
      interface User {
        role: string;
      }
      const user: User = { role: "admin" };
      const result = fromPredicate(
        user,
        (u): u is Admin => u.role === "admin",
        u => `${u.role} is not admin`
      );
      expect(result._tag).toBe("Ok");
      if (result.isOk()) {
        expect(result.value.role).toBe("admin");
      }
    });
  });

  describe("tryCatch", () => {
    // DoD 2 #22
    it("returns Ok when fn succeeds (executes immediately)", () => {
      const result = tryCatch(
        () => 42,
        () => "error"
      );
      expect(result._tag).toBe("Ok");
      if (result.isOk()) expect(result.value).toBe(42);
    });

    // DoD 2 #23
    it("returns Err when fn throws", () => {
      const result = tryCatch(
        () => {
          throw new Error("boom");
        },
        e => (e instanceof Error ? e.message : "unknown")
      );
      expect(result._tag).toBe("Err");
      if (result.isErr()) expect(result.error).toBe("boom");
    });
  });
});
