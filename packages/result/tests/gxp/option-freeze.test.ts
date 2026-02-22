/**
 * GxP integrity: Option immutability (INV-10).
 *
 * Verifies that all Option instances created by some() and none() are
 * Object.freeze()d and cannot be mutated after construction.
 */

import { describe, it, expect } from "vitest";
import { some, none } from "../../src/index.js";

describe("GxP: Option immutability — INV-10", () => {
  it("some() values are frozen", () => {
    const opt = some(42);
    expect(Object.isFrozen(opt)).toBe(true);
  });

  it("none() values are frozen", () => {
    const opt = none();
    expect(Object.isFrozen(opt)).toBe(true);
  });

  it("some() value property cannot be mutated", () => {
    const opt = some(42);
    expect(() => {
      (opt as any).value = "tampered";
    }).toThrow();
  });

  it("some() _tag cannot be mutated", () => {
    const opt = some(42);
    expect(() => {
      (opt as any)._tag = "None";
    }).toThrow();
  });

  it("cannot add properties to some()", () => {
    const opt = some(42);
    expect(() => {
      (opt as any).injected = true;
    }).toThrow();
  });

  it("cannot add properties to none()", () => {
    const opt = none();
    expect(() => {
      (opt as any).injected = true;
    }).toThrow();
  });
});
