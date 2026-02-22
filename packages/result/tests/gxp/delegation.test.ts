/**
 * GxP integrity: Standalone function delegation (INV-14).
 *
 * Verifies that every standalone function in fn/* delegates to the
 * corresponding Result instance method and produces identical results.
 */

import { describe, it, expect } from "vitest";
import { ok, err } from "../../src/index.js";
import { map } from "../../src/fn/map.js";
import { mapErr } from "../../src/fn/map-err.js";
import { andThen } from "../../src/fn/and-then.js";
import { orElse } from "../../src/fn/or-else.js";
import { unwrapOr } from "../../src/fn/unwrap-or.js";

describe("GxP: Standalone function delegation — INV-14", () => {
  it("map(fn) produces same result as .map(fn)", () => {
    const fn = (x: number) => x * 2;
    const result = ok(21);
    const viaMethod = result.map(fn);
    const viaStandalone = map(fn)(result);
    expect(viaMethod.match(v => v, () => null)).toBe(viaStandalone.match(v => v, () => null));
  });

  it("mapErr(fn) produces same result as .mapErr(fn)", () => {
    const fn = (e: string) => e.toUpperCase();
    const result = err("fail");
    const viaMethod = result.mapErr(fn);
    const viaStandalone = mapErr(fn)(result);
    expect(viaMethod.match(() => null, e => e)).toBe(viaStandalone.match(() => null, e => e));
  });

  it("andThen(fn) produces same result as .andThen(fn)", () => {
    const fn = (x: number) => ok(x + 1);
    const result = ok(1);
    const viaMethod = result.andThen(fn);
    const viaStandalone = andThen(fn)(result);
    expect(viaMethod.match(v => v, () => null)).toBe(viaStandalone.match(v => v, () => null));
  });

  it("orElse(fn) produces same result as .orElse(fn)", () => {
    const fn = (e: string) => ok(e.length);
    const result = err("fail");
    const viaMethod = result.orElse(fn);
    const viaStandalone = orElse(fn)(result);
    expect(viaMethod.match(v => v, () => null)).toBe(viaStandalone.match(v => v, () => null));
  });

  it("unwrapOr(fallback) produces same result as .unwrapOr(fallback)", () => {
    const okResult = ok(42);
    const errResult = err("fail");
    expect(unwrapOr(0)(okResult)).toBe(okResult.unwrapOr(0));
    expect(unwrapOr(0)(errResult)).toBe(errResult.unwrapOr(0));
  });
});
