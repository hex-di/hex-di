/**
 * GxP integrity: Result immutability (INV-1).
 *
 * Verifies that all Result instances created by ok() and err() are
 * Object.freeze()d and cannot be mutated after construction.
 */

import { describe, it, expect } from "vitest";
import { ok, err } from "../../src/index.js";

describe("GxP: Result immutability — INV-1", () => {
  it("ok() values are frozen", () => {
    const result = ok(42);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("err() values are frozen", () => {
    const result = err("fail");
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("ok() value property cannot be mutated", () => {
    const result = ok({ mutable: true });
    expect(() => {
      (result as any).value = "tampered";
    }).toThrow();
  });

  it("err() error property cannot be mutated", () => {
    const result = err("original");
    expect(() => {
      (result as any).error = "tampered";
    }).toThrow();
  });

  it("ok() _tag property cannot be mutated", () => {
    const result = ok(1);
    expect(() => {
      (result as any)._tag = "Err";
    }).toThrow();
  });

  it("err() _tag property cannot be mutated", () => {
    const result = err("x");
    expect(() => {
      (result as any)._tag = "Ok";
    }).toThrow();
  });

  it("cannot add new properties to ok()", () => {
    const result = ok(1);
    expect(() => {
      (result as any).injected = true;
    }).toThrow();
  });

  it("cannot add new properties to err()", () => {
    const result = err("x");
    expect(() => {
      (result as any).injected = true;
    }).toThrow();
  });
});
