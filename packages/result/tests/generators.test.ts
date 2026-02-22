import { describe, it, expect, vi } from "vitest";
import { ok, err } from "../src/index.js";
import type { Result } from "../src/index.js";
import { safeTry } from "../src/generators/safe-try.js";
import { ResultAsync } from "../src/async/result-async.js";

describe("BEH-07-001: Generators", () => {
  // DoD 9 #1
  it("BEH-07-003: safeTry sync: all Ok yields produce final Ok", () => {
    const result = safeTry(function* () {
      const a = yield* ok(1);
      const b = yield* ok(2);
      const c = yield* ok(3);
      return ok(a + b + c);
    });
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(6);
  });

  // DoD 9 #2
  it("BEH-07-001: safeTry sync: first Err yield short-circuits", () => {
    const result = safeTry(function* () {
      const a = yield* ok(1);
      const _b = yield* err("fail");
      // This line should never execute
      return ok(a + 999);
    });
    expect(result._tag).toBe("Err");
    if (result.isErr()) expect(result.error).toBe("fail");
  });

  // DoD 9 #3
  it("BEH-07-005: safeTry sync: intermediate Ok values are extracted by yield*", () => {
    const result = safeTry(function* () {
      const name = yield* ok("Alice");
      const age = yield* ok(30);
      return ok({ name, age });
    });
    expect(result._tag).toBe("Ok");
    if (result.isOk()) {
      expect(result.value).toEqual({ name: "Alice", age: 30 });
    }
  });

  // DoD 9 #4
  it("BEH-07-005: safeTry sync: error type is union of all yielded Err types", () => {
    type E1 = { _tag: "E1" };
    type E2 = { _tag: "E2" };

    function step1(): Result<number, E1> {
      return ok(1);
    }
    function step2(): Result<string, E2> {
      return err({ _tag: "E2" });
    }

    const result = safeTry(function* () {
      const a = yield* step1();
      const b = yield* step2();
      return ok(`${a}-${b}`);
    });

    expect(result._tag).toBe("Err");
    if (result.isErr()) {
      expect(result.error).toEqual({ _tag: "E2" });
    }
  });

  // DoD 9 #5
  it("BEH-07-003: safeTry async: all Ok yields produce final Ok", async () => {
    const result = safeTry(async function* () {
      const a = yield* ok(1);
      const b = yield* ok(2);
      return ok(a + b);
    });
    const resolved = await result;
    expect(resolved._tag).toBe("Ok");
    if (resolved.isOk()) expect(resolved.value).toBe(3);
  });

  // DoD 9 #6
  it("BEH-07-001: safeTry async: first Err yield short-circuits", async () => {
    const result = safeTry(async function* () {
      const _a = yield* ok(1);
      const _b = yield* err("async-fail");
      return ok(999);
    });
    const resolved = await result;
    expect(resolved._tag).toBe("Err");
    if (resolved.isErr()) expect(resolved.error).toBe("async-fail");
  });

  // DoD 9 #7
  it("BEH-07-003: safeTry async: can yield* both Result and ResultAsync (via await)", async () => {
    const result = safeTry(async function* () {
      const a = yield* ok(10); // sync Result
      const b = yield* await ResultAsync.ok(20); // async ResultAsync → await → Result
      return ok(a + b);
    });
    const resolved = await result;
    expect(resolved._tag).toBe("Ok");
    if (resolved.isOk()) expect(resolved.value).toBe(30);
  });

  // DoD 9 #8
  it("BEH-07-003: safeTry async: returns ResultAsync", async () => {
    const result = safeTry(async function* () {
      const v = yield* ok(42);
      return ok(v);
    });
    // ResultAsync is PromiseLike — can be awaited
    const resolved = await result;
    expect(resolved._tag).toBe("Ok");
    if (resolved.isOk()) expect(resolved.value).toBe(42);
  });

  // --- Mutation gap: async generator cleanup ---
  it("BEH-07-004: safeTry async: generator cleanup runs on early return", async () => {
    const cleanup = vi.fn();

    const result = safeTry(async function* () {
      try {
        const _a = yield* ok(1);
        const _b = yield* err("async-stop");
        return ok(999);
      } finally {
        cleanup();
      }
    });

    const resolved = await result;
    expect(resolved._tag).toBe("Err");
    if (resolved.isErr()) expect(resolved.error).toBe("async-stop");
    expect(cleanup).toHaveBeenCalledOnce();
  });

  // DoD 9 #9
  it("BEH-07-002: Ok [Symbol.iterator] yields the Ok value", () => {
    const iter = ok(42)[Symbol.iterator]();
    const result = iter.next();
    expect(result.done).toBe(true);
    expect(result.value).toBe(42);
  });

  // DoD 9 #10
  it("BEH-07-002: Err [Symbol.iterator] yields early return with Err", () => {
    const e = err("bad");
    const iter = e[Symbol.iterator]();
    const result = iter.next();
    expect(result.done).toBe(false);
    expect(result.value).toBe(e);
  });

  // --- Mutation gap: Ok iterator return() method ---
  it("BEH-07-002: Ok iterator return() produces done result with given value", () => {
    const iter = ok(42)[Symbol.iterator]();
    const result = iter.return(99);
    expect(result.done).toBe(true);
    expect(result.value).toBe(99);
  });

  // --- Mutation gap: Ok iterator throw() method ---
  it("BEH-07-002: Ok iterator throw() re-throws the error", () => {
    const iter = ok(42)[Symbol.iterator]();
    expect(() => iter.throw(new Error("test"))).toThrow("test");
  });

  // --- Mutation gap: Ok iterator [Symbol.iterator] returns self ---
  it("BEH-07-002: Ok iterator [Symbol.iterator]() returns self", () => {
    const iter = ok(42)[Symbol.iterator]();
    expect(iter[Symbol.iterator]()).toBe(iter);
  });

  // --- Mutation gap: Err iterator continues with error after yield ---
  it("INV-4: Err iterator throws unreachable on second next()", () => {
    const e = err("bad");
    const iter = e[Symbol.iterator]();
    iter.next(); // first yields the Err
    expect(() => iter.next()).toThrow("unreachable");
  });

  // DoD 9 #11
  it("BEH-07-004: Generator cleanup runs on early return", () => {
    const cleanup = vi.fn();

    const result = safeTry(function* () {
      try {
        const _a = yield* ok(1);
        const _b = yield* err("stop");
        return ok(999);
      } finally {
        cleanup();
      }
    });

    expect(result._tag).toBe("Err");
    expect(cleanup).toHaveBeenCalledOnce();
  });

  // DoD 9 #12
  it("BEH-07-005: Nested safeTry calls compose correctly", () => {
    function inner(n: number): Result<number, string> {
      return safeTry(function* () {
        const v = yield* ok(n * 2);
        return ok(v);
      });
    }

    const result = safeTry(function* () {
      const a = yield* inner(5);
      const b = yield* inner(10);
      return ok(a + b);
    });

    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(30);
  });
});
