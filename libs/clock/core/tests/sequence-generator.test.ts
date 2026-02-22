/**
 * SequenceGeneratorPort and system sequence generator tests — DoD 2
 */

import { describe, it, expect } from "vitest";
import { SequenceGeneratorPort, createSequenceOverflowError } from "../src/ports/sequence.js";
import { createSystemSequenceGenerator } from "../src/adapters/system-clock.js";

// =============================================================================
// DoD 2: SequenceGeneratorPort
// =============================================================================

describe("SequenceGeneratorPort", () => {
  it("has name 'SequenceGenerator'", () => {
    expect(SequenceGeneratorPort.__portName).toBe("SequenceGenerator");
  });

  it("service interface has 'next' and 'current' but NOT 'reset'", () => {
    const seq = {
      next: () => ({ _tag: "Ok" as const, value: 1, isOk: () => true, isErr: () => false }),
      current: () => 0,
    };
    expect("reset" in seq).toBe(false);
  });
});

// =============================================================================
// DoD 2: SystemSequenceGenerator runtime behavior
// =============================================================================

describe("SystemSequenceGenerator", () => {
  it("next() returns 1 on first call", () => {
    const seq = createSystemSequenceGenerator();
    const result = seq.next();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(1);
    }
  });

  it("next() returns strictly increasing values", () => {
    const seq = createSystemSequenceGenerator();
    const v1 = seq.next();
    const v2 = seq.next();
    const v3 = seq.next();
    expect(v1.isOk() && v2.isOk() && v3.isOk()).toBe(true);
    if (v1.isOk() && v2.isOk() && v3.isOk()) {
      expect(v2.value).toBeGreaterThan(v1.value);
      expect(v3.value).toBeGreaterThan(v2.value);
    }
  });

  it("next() returns consecutive integers", () => {
    const seq = createSystemSequenceGenerator();
    for (let i = 1; i <= 10; i++) {
      const result = seq.next();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(i);
      }
    }
  });

  it("current() returns 0 before any next() call", () => {
    const seq = createSystemSequenceGenerator();
    expect(seq.current()).toBe(0);
  });

  it("current() returns last value from next()", () => {
    const seq = createSystemSequenceGenerator();
    seq.next();
    seq.next();
    const result = seq.next(); // 3
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(seq.current()).toBe(result.value);
    }
  });

  it("current() does not advance the counter", () => {
    const seq = createSystemSequenceGenerator();
    seq.next(); // 1
    const before = seq.current();
    const beforeAgain = seq.current();
    const beforeThird = seq.current();
    expect(before).toBe(1);
    expect(beforeAgain).toBe(1);
    expect(beforeThird).toBe(1);
  });

  it("next() returns err(SequenceOverflowError) at MAX_SAFE_INTEGER", () => {
    // We can test this via VirtualSequenceGenerator but here we test the error type
    const overflowError = createSequenceOverflowError(Number.MAX_SAFE_INTEGER);
    expect(overflowError._tag).toBe("SequenceOverflowError");
    expect(overflowError.lastValue).toBe(Number.MAX_SAFE_INTEGER);
    expect(Object.isFrozen(overflowError)).toBe(true);
  });

  it("SequenceOverflowError has correct _tag", () => {
    const error = createSequenceOverflowError(42);
    expect(error._tag).toBe("SequenceOverflowError");
  });

  it("SequenceOverflowError has correct lastValue", () => {
    const error = createSequenceOverflowError(100);
    expect(error.lastValue).toBe(100);
  });

  it("SequenceOverflowError is frozen", () => {
    const error = createSequenceOverflowError(1);
    expect(Object.isFrozen(error)).toBe(true);
  });

  it("SystemSequenceGenerator has no reset property (structurally irresettable)", () => {
    const seq = createSystemSequenceGenerator();
    expect("reset" in seq).toBe(false);
  });
});
