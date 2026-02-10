/**
 * Tests for src/util/type-guards.ts
 */
import { describe, it, expect } from "vitest";
import { isRecord } from "../src/util/type-guards.js";

describe("isRecord", () => {
  it("returns true for plain objects", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ a: 1 })).toBe(true);
  });

  it("returns true for arrays (they are objects)", () => {
    expect(isRecord([])).toBe(true);
  });

  it("returns false for null", () => {
    expect(isRecord(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isRecord(undefined)).toBe(false);
  });

  it("returns false for primitive strings", () => {
    expect(isRecord("hello")).toBe(false);
  });

  it("returns false for numbers", () => {
    expect(isRecord(42)).toBe(false);
    expect(isRecord(0)).toBe(false);
    expect(isRecord(NaN)).toBe(false);
  });

  it("returns false for booleans", () => {
    expect(isRecord(true)).toBe(false);
    expect(isRecord(false)).toBe(false);
  });

  it("returns false for symbols", () => {
    expect(isRecord(Symbol("test"))).toBe(false);
  });

  it("returns false for functions", () => {
    expect(isRecord(() => {})).toBe(false);
  });

  it("returns true for class instances", () => {
    class Foo {}
    expect(isRecord(new Foo())).toBe(true);
  });

  it("returns true for Map and Set", () => {
    expect(isRecord(new Map())).toBe(true);
    expect(isRecord(new Set())).toBe(true);
  });
});
