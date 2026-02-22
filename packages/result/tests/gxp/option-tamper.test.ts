/**
 * GxP integrity: Option brand tamper evidence (INV-11).
 *
 * Verifies that OPTION_BRAND prevents forgery and that isOption()
 * rejects structurally similar objects without the genuine brand symbol.
 */

import { describe, it, expect } from "vitest";
import { some, none, isOption, OPTION_BRAND } from "../../src/index.js";

describe("GxP: Brand-based isOption — INV-11", () => {
  it("rejects structurally similar objects without brand", () => {
    const fake = { _tag: "Some" as const, value: 42 };
    expect(isOption(fake)).toBe(false);
  });

  it("accepts genuine some()", () => {
    expect(isOption(some(1))).toBe(true);
  });

  it("accepts genuine none()", () => {
    expect(isOption(none())).toBe(true);
  });

  it("rejects objects with a manually set OPTION_BRAND-like symbol", () => {
    const fakeSymbol = Symbol("Option");
    const fake = { _tag: "Some", value: 1, [fakeSymbol]: true };
    expect(isOption(fake)).toBe(false);
  });

  it("OPTION_BRAND is a unique symbol", () => {
    expect(typeof OPTION_BRAND).toBe("symbol");
  });
});
