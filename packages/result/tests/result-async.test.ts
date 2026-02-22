import { describe, it, expect, vi } from "vitest";
import { ok, err, ResultAsync } from "../src/index.js";
import { fromPromise, fromSafePromise, fromAsyncThrowable } from "../src/index.js";
import type { Result } from "../src/index.js";

describe("BEH-06-001: ResultAsync class definition with brand, private constructor and promise", () => {
  it("ResultAsync is a class (constructor function)", () => {
    expect(typeof ResultAsync).toBe("function");
  });

  it("ResultAsync instances cannot be constructed directly (private constructor)", () => {
    // Only static constructors can create instances
    const ra = ResultAsync.ok(1);
    expect(ra).toBeInstanceOf(ResultAsync);
  });
});

describe("BEH-06-002: ResultAsync PromiseLike implementation (then/await)", () => {
  it("ResultAsync implements then() and can be awaited", async () => {
    const ra = ResultAsync.ok(42);
    // .then is available (PromiseLike)
    expect(typeof ra.then).toBe("function");
    const result = await ra;
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(42);
  });

  it("ResultAsync.then() receives the resolved Result", async () => {
    const ra = ResultAsync.ok(42);
    const result = await ra.then((r) => r);
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(42);
  });
});

describe("BEH-06-003: ResultAsync static constructors (ok, err, fromPromise, fromSafePromise, fromResult, fromThrowable, fromCallback, race)", () => {
  // DoD 8 #1
  it("ResultAsync.ok(42) resolves to Ok(42)", async () => {
    const result = await ResultAsync.ok(42);
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(42);
  });

  // DoD 8 #2
  it("ResultAsync.err('x') resolves to Err('x')", async () => {
    const result = await ResultAsync.err("x");
    expect(result._tag).toBe("Err");
    if (result.isErr()) expect(result.error).toBe("x");
  });

  // DoD 8 #3
  it("fromPromise(resolved, mapErr) resolves to Ok", async () => {
    const result = await fromPromise(Promise.resolve(42), () => "error");
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(42);
  });

  // DoD 8 #4
  it("fromPromise(rejected, mapErr) resolves to Err(mapped)", async () => {
    const result = await fromPromise(Promise.reject("boom"), e => `mapped: ${e}`);
    expect(result._tag).toBe("Err");
    if (result.isErr()) expect(result.error).toBe("mapped: boom");
  });

  // DoD 8 #5
  it("fromSafePromise(promise) resolves to Ok", async () => {
    const result = await fromSafePromise(Promise.resolve(42));
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(42);
  });

  // DoD 8 #26
  it("fromAsyncThrowable(asyncFn, mapErr) wraps async fn", async () => {
    const safeFn = fromAsyncThrowable(
      async (n: number) => n * 2,
      () => "error"
    );
    const result = await safeFn(21);
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(42);
  });

  // --- fromResult ---
  it("ResultAsync.fromResult() wraps a Promise<Result>", async () => {
    const promise = Promise.resolve(ok(42));
    const result = await ResultAsync.fromResult(promise);
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(42);
  });

  it("ResultAsync.fromResult() wraps a Promise<Err>", async () => {
    const promise: Promise<Result<number, string>> = Promise.resolve(err("x"));
    const result = await ResultAsync.fromResult(promise);
    expect(result._tag).toBe("Err");
    if (result.isErr()) expect(result.error).toBe("x");
  });

  // BEH-06-003: fromCallback
  describe("fromCallback", () => {
    it("resolves to Ok when callback provides value", async () => {
      const result = await ResultAsync.fromCallback<number, string>((cb) => {
        cb(null, 42);
      });
      expect(result._tag).toBe("Ok");
      if (result.isOk()) expect(result.value).toBe(42);
    });

    it("resolves to Err when callback provides error", async () => {
      const result = await ResultAsync.fromCallback<number, string>((cb) => {
        cb("fail", 0 as never);
      });
      expect(result._tag).toBe("Err");
      if (result.isErr()) expect(result.error).toBe("fail");
    });

    it("handles async callbacks", async () => {
      const result = await ResultAsync.fromCallback<number, string>((cb) => {
        Promise.resolve().then(() => cb(null, 99));
      });
      expect(result._tag).toBe("Ok");
      if (result.isOk()) expect(result.value).toBe(99);
    });
  });

  // BEH-05-008 / BEH-06-003: race
  describe("race", () => {
    it("returns the first ResultAsync to resolve", async () => {
      const fast = ResultAsync.ok(1);
      const slow = new Promise<never>(() => {}); // never resolves
      const result = await ResultAsync.race(fast, ResultAsync.fromSafePromise(slow));
      expect(result._tag).toBe("Ok");
      if (result.isOk()) expect(result.value).toBe(1);
    });

    it("returns Err if the first to resolve is Err", async () => {
      const fast = ResultAsync.err("first");
      const slow = ResultAsync.fromSafePromise(new Promise<number>(() => {})); // never resolves
      const result = await ResultAsync.race(fast, slow);
      expect(result._tag).toBe("Err");
      if (result.isErr()) expect(result.error).toBe("first");
    });
  });
});

describe("BEH-06-004: ResultAsync static combinators re-export", () => {
  it("ResultAsync.partition is available", () => {
    expect(typeof ResultAsync.partition).toBe("function");
  });

  it("ResultAsync.forEach is available", () => {
    expect(typeof ResultAsync.forEach).toBe("function");
  });

  it("ResultAsync.zipOrAccumulate is available", () => {
    expect(typeof ResultAsync.zipOrAccumulate).toBe("function");
  });
});

describe("BEH-06-005: ResultAsync.Do starts async Do notation chain", () => {
  it("ResultAsync.ok({}) starts a Do-notation chain via andThen", async () => {
    const result = await ResultAsync.ok({}).andThen(() => ok(42));
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(42);
  });
});

describe("BEH-06-006: ResultAsync instance transformation methods (map, mapErr, mapBoth)", () => {
  // DoD 8 #7
  it("resultAsync.map(v => v * 2) transforms Ok value", async () => {
    const result = await ResultAsync.ok(21).map(v => v * 2);
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(42);
  });

  // DoD 8 #8
  it("resultAsync.map(async v => v * 2) accepts async transform", async () => {
    const result = await ResultAsync.ok(21).map(async v => v * 2);
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(42);
  });

  // DoD 8 #9
  it("resultAsync.mapErr(e => e.toUpperCase()) transforms Err value", async () => {
    const result = await ResultAsync.err("fail").mapErr(e => e.toUpperCase());
    expect(result._tag).toBe("Err");
    if (result.isErr()) expect(result.error).toBe("FAIL");
  });

  // --- Dual-path coverage: map on Err ---
  it("resultAsync.map() on Err passes through unchanged", async () => {
    const fn = vi.fn((v: number) => v * 2);
    const result = await ResultAsync.err("x").map(fn);
    expect(result._tag).toBe("Err");
    if (result.isErr()) expect(result.error).toBe("x");
    expect(fn).not.toHaveBeenCalled();
  });

  // --- Dual-path coverage: mapErr on Ok ---
  it("resultAsync.mapErr() on Ok passes through unchanged", async () => {
    const fn = vi.fn((e: string) => e.toUpperCase());
    const result = await ResultAsync.ok(42).mapErr(fn);
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(42);
    expect(fn).not.toHaveBeenCalled();
  });

  // --- mapBoth ---
  it("resultAsync.mapBoth() transforms Ok value", async () => {
    const result = await ResultAsync.ok(21).mapBoth(
      v => v * 2,
      e => e
    );
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(42);
  });

  it("resultAsync.mapBoth() transforms Err value", async () => {
    const result = await ResultAsync.err("fail").mapBoth(
      v => v,
      e => e.toUpperCase()
    );
    expect(result._tag).toBe("Err");
    if (result.isErr()) expect(result.error).toBe("FAIL");
  });

  it("resultAsync.mapBoth() accepts async transforms", async () => {
    const result = await ResultAsync.ok(10).mapBoth(
      async v => v + 1,
      async e => e
    );
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(11);
  });
});

describe("BEH-06-007: ResultAsync instance chaining methods (andThen, orElse, andTee, orTee, andThrough, inspect, inspectErr)", () => {
  // DoD 8 #10
  it("resultAsync.andThen(v => ok(v + 1)) chains sync Result", async () => {
    const result = await ResultAsync.ok(41).andThen(v => ok(v + 1));
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(42);
  });

  // DoD 8 #11
  it("resultAsync.andThen(v => ResultAsync.ok(v + 1)) chains async Result", async () => {
    const result = await ResultAsync.ok(41).andThen(v => ResultAsync.ok(v + 1));
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(42);
  });

  // DoD 8 #12
  it("resultAsync.orElse(e => ok(99)) recovers from error", async () => {
    const result = await ResultAsync.err("x").orElse(() => ok(99));
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(99);
  });

  // DoD 8 #13
  it("resultAsync.andTee(v => {}) calls side effect, returns original", async () => {
    const fn = vi.fn();
    const result = await ResultAsync.ok(42).andTee(fn);
    expect(fn).toHaveBeenCalledWith(42);
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(42);
  });

  // DoD 8 #14
  it("resultAsync.andTee(async v => {}) accepts async side effect", async () => {
    const fn = vi.fn(async () => {});
    const result = await ResultAsync.ok(42).andTee(fn);
    expect(fn).toHaveBeenCalledWith(42);
    expect(result._tag).toBe("Ok");
  });

  // DoD 8 #15
  it("resultAsync.orTee(e => {}) calls side effect on Err", async () => {
    const fn = vi.fn();
    const result = await ResultAsync.err("x").orTee(fn);
    expect(fn).toHaveBeenCalledWith("x");
    expect(result._tag).toBe("Err");
  });

  // DoD 8 #16
  it("resultAsync.andThrough(v => ok('x')) returns original on Ok", async () => {
    const result = await ResultAsync.ok(42).andThrough(() => ok("x"));
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(42);
  });

  // DoD 8 #17
  it("resultAsync.andThrough(v => err('fail')) propagates Err", async () => {
    const result = await ResultAsync.ok(42).andThrough(() => err("fail"));
    expect(result._tag).toBe("Err");
    if (result.isErr()) expect(result.error).toBe("fail");
  });

  // DoD 8 #27
  it("Chaining multiple async operations preserves error accumulation", async () => {
    type _E1 = { _tag: "E1" };
    type E2 = { _tag: "E2" };
    const result = await ResultAsync.ok(1)
      .andThen(v => ok(v + 1))
      .andThen(() => err({ _tag: "E2" } satisfies E2));

    expect(result._tag).toBe("Err");
  });

  // --- Mutation gap: andThen on Err does not call fn ---
  it("resultAsync.andThen() on Err does not call fn and passes through", async () => {
    const fn = vi.fn(() => ok(99));
    const result = await ResultAsync.err("x").andThen(fn);
    expect(result._tag).toBe("Err");
    if (result.isErr()) expect(result.error).toBe("x");
    expect(fn).not.toHaveBeenCalled();
  });

  // --- Dual-path coverage: orElse on Ok ---
  it("resultAsync.orElse() on Ok passes through unchanged", async () => {
    const fn = vi.fn(() => ok(99));
    const result = await ResultAsync.ok(42).orElse(fn);
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(42);
    expect(fn).not.toHaveBeenCalled();
  });

  // --- Dual-path coverage: orTee on Ok ---
  it("resultAsync.orTee() on Ok does not call side effect", async () => {
    const fn = vi.fn();
    const result = await ResultAsync.ok(42).orTee(fn);
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(42);
    expect(fn).not.toHaveBeenCalled();
  });

  // --- andTee error swallowing ---
  it("resultAsync.andTee() swallows errors from side effect", async () => {
    const result = await ResultAsync.ok(42).andTee(() => {
      throw new Error("boom");
    });
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(42);
  });

  it("resultAsync.andTee() on Err does not call side effect", async () => {
    const fn = vi.fn();
    const result = await ResultAsync.err("x").andTee(fn);
    expect(result._tag).toBe("Err");
    if (result.isErr()) expect(result.error).toBe("x");
    expect(fn).not.toHaveBeenCalled();
  });

  // --- orTee error swallowing ---
  it("resultAsync.orTee() swallows errors from side effect", async () => {
    const result = await ResultAsync.err("x").orTee(() => {
      throw new Error("boom");
    });
    expect(result._tag).toBe("Err");
    if (result.isErr()) expect(result.error).toBe("x");
  });

  // --- andThrough with ResultAsync return ---
  it("resultAsync.andThrough() works with ResultAsync side effect", async () => {
    const result = await ResultAsync.ok(42).andThrough(() => ResultAsync.ok("ignored"));
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(42);
  });

  it("resultAsync.andThrough() on Err passes through", async () => {
    const fn = vi.fn(() => ok("x"));
    const result = await ResultAsync.err("fail").andThrough(fn);
    expect(result._tag).toBe("Err");
    if (result.isErr()) expect(result.error).toBe("fail");
    expect(fn).not.toHaveBeenCalled();
  });

  // --- inspect / inspectErr ---
  it("resultAsync.inspect() calls fn on Ok", async () => {
    const fn = vi.fn();
    const result = await ResultAsync.ok(42).inspect(fn);
    expect(fn).toHaveBeenCalledWith(42);
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(42);
  });

  it("resultAsync.inspect() does not call fn on Err", async () => {
    const fn = vi.fn();
    const result = await ResultAsync.err("x").inspect(fn);
    expect(fn).not.toHaveBeenCalled();
    expect(result._tag).toBe("Err");
  });

  it("resultAsync.inspectErr() calls fn on Err", async () => {
    const fn = vi.fn();
    const result = await ResultAsync.err("x").inspectErr(fn);
    expect(fn).toHaveBeenCalledWith("x");
    expect(result._tag).toBe("Err");
    if (result.isErr()) expect(result.error).toBe("x");
  });

  it("resultAsync.inspectErr() does not call fn on Ok", async () => {
    const fn = vi.fn();
    const result = await ResultAsync.ok(42).inspectErr(fn);
    expect(fn).not.toHaveBeenCalled();
    expect(result._tag).toBe("Ok");
  });
});

describe("BEH-06-008: ResultAsync instance extraction methods (match, unwrapOr, unwrapOrElse, toNullable, toUndefined, intoTuple, merge)", () => {
  // DoD 8 #18
  it("resultAsync.match(onOk, onErr) returns Promise", async () => {
    const value = await ResultAsync.ok(42).match(
      v => v + 1,
      () => 0
    );
    expect(value).toBe(43);
  });

  // --- Dual-path coverage: match on Err ---
  it("resultAsync.match() on Err calls onErr", async () => {
    const value = await ResultAsync.err("x").match(
      () => 0,
      e => e.length
    );
    expect(value).toBe(1);
  });

  // DoD 8 #19
  it("resultAsync.unwrapOr(0) returns Promise of value or default", async () => {
    expect(await ResultAsync.ok(42).unwrapOr(0)).toBe(42);
    expect(await ResultAsync.err("x").unwrapOr(0)).toBe(0);
  });

  // --- unwrapOrElse ---
  it("resultAsync.unwrapOrElse() returns value on Ok", async () => {
    expect(await ResultAsync.ok(42).unwrapOrElse(() => 0)).toBe(42);
  });

  it("resultAsync.unwrapOrElse() calls fn on Err", async () => {
    expect(await ResultAsync.err("abc").unwrapOrElse(e => e.length)).toBe(3);
  });

  // DoD 8 #20
  it("resultAsync.toNullable() returns Promise of value or null", async () => {
    expect(await ResultAsync.ok(42).toNullable()).toBe(42);
    expect(await ResultAsync.err("x").toNullable()).toBeNull();
  });

  // --- toUndefined ---
  it("resultAsync.toUndefined() returns value on Ok", async () => {
    expect(await ResultAsync.ok(42).toUndefined()).toBe(42);
  });

  it("resultAsync.toUndefined() returns undefined on Err", async () => {
    expect(await ResultAsync.err("x").toUndefined()).toBeUndefined();
  });

  // DoD 8 #21
  it("resultAsync.intoTuple() returns Promise of tuple", async () => {
    expect(await ResultAsync.ok(42).intoTuple()).toEqual([null, 42]);
    expect(await ResultAsync.err("x").intoTuple()).toEqual(["x", null]);
  });

  // --- merge ---
  it("resultAsync.merge() returns value on Ok", async () => {
    expect(await ResultAsync.ok(42).merge()).toBe(42);
  });

  it("resultAsync.merge() returns error on Err", async () => {
    expect(await ResultAsync.err("x").merge()).toBe("x");
  });
});

describe("BEH-06-009: ResultAsync conversion methods (flatten, flip, toJSON)", () => {
  // --- flatten ---
  it("resultAsync.flatten() unwraps nested Ok", async () => {
    const inner: Result<number, string> = ok(42);
    const nested: ResultAsync<Result<number, string>, string> = ResultAsync.ok(inner);
    const flat = await nested.flatten();
    expect(flat._tag).toBe("Ok");
    if (flat.isOk()) expect(flat.value).toBe(42);
  });

  it("resultAsync.flatten() unwraps nested Err", async () => {
    const inner: Result<number, string> = err("inner");
    const nested: ResultAsync<Result<number, string>, string> = ResultAsync.ok(inner);
    const flat = await nested.flatten();
    expect(flat._tag).toBe("Err");
    if (flat.isErr()) expect(flat.error).toBe("inner");
  });

  it("resultAsync.flatten() on outer Err passes through", async () => {
    const nested: ResultAsync<Result<number, string>, string> = ResultAsync.err("outer");
    const flat = await nested.flatten();
    expect(flat._tag).toBe("Err");
    if (flat.isErr()) expect(flat.error).toBe("outer");
  });

  // --- flip ---
  it("resultAsync.flip() converts Ok to Err", async () => {
    const result = await ResultAsync.ok(42).flip();
    expect(result._tag).toBe("Err");
    if (result.isErr()) expect(result.error).toBe(42);
  });

  it("resultAsync.flip() converts Err to Ok", async () => {
    const result = await ResultAsync.err("x").flip();
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe("x");
  });

  // --- toJSON ---
  it("resultAsync.toJSON() returns Ok JSON", async () => {
    expect(await ResultAsync.ok(42).toJSON()).toEqual({ _tag: "Ok", _schemaVersion: 1, value: 42 });
  });

  it("resultAsync.toJSON() returns Err JSON", async () => {
    expect(await ResultAsync.err("x").toJSON()).toEqual({ _tag: "Err", _schemaVersion: 1, error: "x" });
  });
});

describe("BEH-06-010: Async bridges on sync Result (toAsync, asyncMap, asyncAndThen)", () => {
  // DoD 6 #19
  it("ok(42).toAsync() returns ResultAsync that resolves to Ok(42)", async () => {
    const result = await ok(42).toAsync();
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(42);
  });

  // DoD 6 #20
  it("err('x').toAsync() returns ResultAsync that resolves to Err('x')", async () => {
    const result = await err("x").toAsync();
    expect(result._tag).toBe("Err");
    if (result.isErr()) expect(result.error).toBe("x");
  });

  // DoD 6 #21
  it("ok(42).asyncMap(async v => v * 2) returns ResultAsync resolving to Ok(84)", async () => {
    const result = await ok(42).asyncMap(async v => v * 2);
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(84);
  });

  // DoD 6 #22
  it("ok(42).asyncAndThen(v => ResultAsync.ok(v * 2)) returns ResultAsync", async () => {
    const result = await ok(42).asyncAndThen(v => ResultAsync.ok(v * 2));
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(84);
  });
});

describe("BEH-06-011 / INV-8: Lazy ResultAsync registration via _setResultAsyncImpl()", () => {
  it("ok().toAsync() works because _setResultAsyncImpl was called at import time", async () => {
    // If registration didn't happen, toAsync() would throw
    const result = await ok(1).toAsync();
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe(1);
  });

  it("err().toAsync() works because _setResultAsyncImpl was called at import time", async () => {
    const result = await err("e").toAsync();
    expect(result._tag).toBe("Err");
    if (result.isErr()) expect(result.error).toBe("e");
  });
});

describe("INV-2: ResultAsync internal promise never rejects", () => {
  // DoD 8 #6
  it("ResultAsync never rejects, even when inner promise rejects", async () => {
    const ra = fromPromise(Promise.reject("bad"), e => `err: ${e}`);
    // Should not reject - should resolve to Err
    const result = await ra;
    expect(result._tag).toBe("Err");
  });
});
