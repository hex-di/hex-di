/**
 * deepFreeze utility tests — kills survived mutants in utils/deep-freeze.ts
 */

import { describe, expect, it } from "vitest";
import { deepFreeze } from "../src/utils/deep-freeze.js";

describe("deepFreeze", () => {
  it("returns primitives unchanged", () => {
    expect(deepFreeze(42)).toBe(42);
    expect(deepFreeze("hello")).toBe("hello");
    expect(deepFreeze(null)).toBe(null);
    expect(deepFreeze(undefined)).toBe(undefined);
    expect(deepFreeze(true)).toBe(true);
  });

  it("freezes a plain object", () => {
    const obj = { a: 1, b: 2 };
    deepFreeze(obj);
    expect(Object.isFrozen(obj)).toBe(true);
  });

  it("recursively freezes nested objects", () => {
    const obj = { a: { b: { c: 1 } } };
    deepFreeze(obj);
    expect(Object.isFrozen(obj)).toBe(true);
    expect(Object.isFrozen(obj.a)).toBe(true);
    expect(Object.isFrozen(obj.a.b)).toBe(true);
  });

  it("skips already-frozen objects (no infinite loop)", () => {
    const inner = Object.freeze({ x: 1 });
    const obj = { inner };
    deepFreeze(obj);
    expect(Object.isFrozen(obj)).toBe(true);
    expect(Object.isFrozen(obj.inner)).toBe(true);
  });

  it("returns same reference (identity preserved)", () => {
    const obj = { a: 1 };
    const result = deepFreeze(obj);
    expect(result).toBe(obj);
  });

  it("freezes arrays and their nested objects", () => {
    const arr = [{ x: 1 }, { y: 2 }];
    deepFreeze(arr);
    expect(Object.isFrozen(arr)).toBe(true);
    expect(Object.isFrozen(arr[0])).toBe(true);
    expect(Object.isFrozen(arr[1])).toBe(true);
  });

  it("handles circular references without infinite loop", () => {
    const obj: Record<string, unknown> = { a: 1 };
    obj["self"] = obj;
    deepFreeze(obj);
    expect(Object.isFrozen(obj)).toBe(true);
  });

  it("isRecord guard rejects functions", () => {
    const fn = () => {};
    // Functions are typeof "function", not "object", so deepFreeze passes through
    const result = deepFreeze(fn);
    expect(result).toBe(fn);
    expect(Object.isFrozen(fn)).toBe(false);
  });

  it("Object.values iteration: nested values are individually frozen", () => {
    const obj = {
      a: { x: 1 },
      b: { y: 2 },
      c: { z: 3 },
    };
    deepFreeze(obj);
    for (const val of Object.values(obj)) {
      expect(Object.isFrozen(val)).toBe(true);
    }
  });

  it("non-record values inside objects (null nested) are skipped", () => {
    const obj = { a: 1, b: null, c: "hello", d: { nested: true } };
    deepFreeze(obj);
    expect(Object.isFrozen(obj)).toBe(true);
    expect(Object.isFrozen(obj.d)).toBe(true);
  });

  it("already-frozen nested objects are not re-processed (isFrozen guard)", () => {
    const nested = { x: 1 };
    Object.freeze(nested);
    const obj = { child: nested };

    deepFreeze(obj);
    // Both should be frozen, and the nested one was already frozen
    expect(Object.isFrozen(obj)).toBe(true);
    expect(Object.isFrozen(nested)).toBe(true);
  });

  it("already-frozen top-level object returns immediately", () => {
    const obj = { a: 1, b: { c: 2 } };
    Object.freeze(obj);
    // Note: b is NOT frozen because Object.freeze is shallow
    // deepFreeze should return immediately since obj itself is frozen
    const result = deepFreeze(obj);
    expect(result).toBe(obj);
    // The inner object b should NOT be frozen because deepFreeze returned early
    expect(Object.isFrozen(obj.b)).toBe(false);
  });

  it("isRecord returns false for null (val !== null check)", () => {
    const result = deepFreeze(null);
    expect(result).toBeNull();
  });

  it("deeply nested structure: all levels are frozen", () => {
    const obj = { a: { b: { c: { d: 1 } } } };
    deepFreeze(obj);
    expect(Object.isFrozen(obj)).toBe(true);
    expect(Object.isFrozen(obj.a)).toBe(true);
    expect(Object.isFrozen(obj.a.b)).toBe(true);
    expect(Object.isFrozen(obj.a.b.c)).toBe(true);
  });

  it("mixed frozen and unfrozen nested objects", () => {
    const frozen = Object.freeze({ x: 1 });
    const unfrozen = { y: 2 };
    const obj = { a: frozen, b: unfrozen };

    deepFreeze(obj);
    expect(Object.isFrozen(obj)).toBe(true);
    expect(Object.isFrozen(frozen)).toBe(true);
    // unfrozen should now be frozen via deepFreeze recursion
    expect(Object.isFrozen(unfrozen)).toBe(true);
  });

  it("array of objects: each element is frozen recursively", () => {
    const arr = [{ a: 1 }, { b: 2 }, { c: { d: 3 } }];
    deepFreeze(arr);
    expect(Object.isFrozen(arr)).toBe(true);
    expect(Object.isFrozen(arr[0])).toBe(true);
    expect(Object.isFrozen(arr[1])).toBe(true);
    expect(Object.isFrozen(arr[2])).toBe(true);
    // Nested c.d is also frozen
    expect(Object.isFrozen((arr[2] as any).c)).toBe(true);
  });

  it("object with function value: function is not frozen (isRecord returns false)", () => {
    const fn = () => {};
    const obj = { a: 1, callback: fn };
    deepFreeze(obj);
    expect(Object.isFrozen(obj)).toBe(true);
    // Functions have typeof "function", not "object", so isRecord returns false
    expect(Object.isFrozen(fn)).toBe(false);
  });

  it("empty object is frozen", () => {
    const obj = {};
    deepFreeze(obj);
    expect(Object.isFrozen(obj)).toBe(true);
  });

  it("object with only primitive values: all frozen at top level", () => {
    const obj = { a: 1, b: "hello", c: true, d: null, e: undefined };
    deepFreeze(obj);
    expect(Object.isFrozen(obj)).toBe(true);
  });
});
