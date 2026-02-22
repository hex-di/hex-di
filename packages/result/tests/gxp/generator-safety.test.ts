/**
 * GxP integrity: Generator safety (INV-4).
 *
 * Verifies that Err's generator throws on continuation past yield,
 * and that safeTry correctly short-circuits on Err.
 */

import { describe, it, expect } from "vitest";
import { ok, err, safeTry } from "../../src/index.js";

describe("GxP: safeTry generator safety — INV-4", () => {
  it("yielding Err short-circuits the generator", () => {
    let reachedAfterYield = false;

    const result = safeTry(function* () {
      const _value: number = yield* err("short-circuit");
      reachedAfterYield = true;
      return ok(_value);
    });

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error).toBe("short-circuit");
    }
    expect(reachedAfterYield).toBe(false);
  });

  it("yielding Ok continues the generator", () => {
    const result = safeTry(function* () {
      const a: number = yield* ok(1);
      const b: number = yield* ok(2);
      return ok(a + b);
    });

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value).toBe(3);
    }
  });

  it("Err generator throws on manual continuation past yield", () => {
    const errResult = err("fail");
    const gen = errResult[Symbol.iterator]();

    // First yield returns the Err itself
    const first = gen.next();
    expect(first.done).toBe(false);

    // Continuing past the yield should throw
    expect(() => gen.next()).toThrow(/unreachable/);
  });
});
