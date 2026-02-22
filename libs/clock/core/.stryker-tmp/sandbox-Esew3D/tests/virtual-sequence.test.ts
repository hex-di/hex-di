/**
 * VirtualSequenceGenerator tests — DoD 5
 */
// @ts-nocheck


import { describe, it, expect } from "vitest";
import { createVirtualSequenceGenerator } from "../src/testing/virtual-sequence.js";

// =============================================================================
// DoD 5: Virtual Sequence Generator
// =============================================================================

describe("VirtualSequenceGenerator", () => {
  it("createVirtualSequenceGenerator() starts at 0 by default", () => {
    const seq = createVirtualSequenceGenerator();
    expect(seq.current()).toBe(0);
  });

  it("createVirtualSequenceGenerator() with custom startAt", () => {
    const seq = createVirtualSequenceGenerator({ startAt: 100 });
    expect(seq.current()).toBe(100);
  });

  it("setCounter() sets the internal counter", () => {
    const seq = createVirtualSequenceGenerator();
    seq.setCounter(50);
    expect(seq.current()).toBe(50);
  });

  it("next() after setCounter(N) returns N+1", () => {
    const seq = createVirtualSequenceGenerator();
    seq.setCounter(10);
    const result = seq.next();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(11);
    }
  });

  it("setCounter() to MAX_SAFE_INTEGER-1, next() returns MAX_SAFE_INTEGER", () => {
    const seq = createVirtualSequenceGenerator();
    seq.setCounter(Number.MAX_SAFE_INTEGER - 1);
    const result = seq.next();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(Number.MAX_SAFE_INTEGER);
    }
  });

  it("setCounter() to MAX_SAFE_INTEGER, next() returns err(SequenceOverflowError)", () => {
    const seq = createVirtualSequenceGenerator();
    seq.setCounter(Number.MAX_SAFE_INTEGER);
    const result = seq.next();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("SequenceOverflowError");
      expect(result.error.lastValue).toBe(Number.MAX_SAFE_INTEGER);
    }
  });

  it("reset() sets counter back to 0 (only on VirtualSequenceGenerator)", () => {
    const seq = createVirtualSequenceGenerator();
    seq.next();
    seq.next();
    seq.next();
    seq.reset();
    expect(seq.current()).toBe(0);
  });

  it("next() returns 1 after reset() (only on VirtualSequenceGenerator)", () => {
    const seq = createVirtualSequenceGenerator();
    seq.next();
    seq.next();
    seq.reset();
    const result = seq.next();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(1);
    }
  });

  it("setCounter() throws TypeError when value is NaN", () => {
    const seq = createVirtualSequenceGenerator();
    expect(() => seq.setCounter(NaN)).toThrow(TypeError);
  });

  it("setCounter() throws TypeError when value is Infinity or -Infinity", () => {
    const seq = createVirtualSequenceGenerator();
    expect(() => seq.setCounter(Infinity)).toThrow(TypeError);
    expect(() => seq.setCounter(-Infinity)).toThrow(TypeError);
  });

  it("setCounter() accepts negative values without error", () => {
    const seq = createVirtualSequenceGenerator();
    expect(() => seq.setCounter(-10)).not.toThrow();
    expect(seq.current()).toBe(-10);
  });

  it("createVirtualSequenceGenerator() throws TypeError when startAt is NaN", () => {
    expect(() => createVirtualSequenceGenerator({ startAt: NaN })).toThrow(TypeError);
  });

  it("createVirtualSequenceGenerator() throws TypeError when startAt is non-integer (e.g., 1.5)", () => {
    expect(() => createVirtualSequenceGenerator({ startAt: 1.5 })).toThrow(TypeError);
  });

  it("createVirtualSequenceGenerator() accepts negative integer startAt without error", () => {
    expect(() => createVirtualSequenceGenerator({ startAt: -5 })).not.toThrow();
  });

  it("VirtualSequenceGenerator has reset() method that SequenceGeneratorPort does not", () => {
    const seq = createVirtualSequenceGenerator();
    expect("reset" in seq).toBe(true);
    expect(typeof seq.reset).toBe("function");
  });
});
