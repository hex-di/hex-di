/**
 * GxP sequence number tests.
 *
 * Verifies monotonic sequence numbers for log ordering
 * and gap detection in audit trails.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { nextSequence, resetSequence } from "../../src/utils/sequence.js";

describe("nextSequence", () => {
  beforeEach(() => {
    resetSequence();
  });

  it("should return monotonically increasing numbers", () => {
    const a = nextSequence();
    const b = nextSequence();
    const c = nextSequence();
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });

  it("should return unique numbers", () => {
    const numbers = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      numbers.add(nextSequence());
    }
    expect(numbers.size).toBe(1000);
  });

  it("should start from 1 after reset", () => {
    const first = nextSequence();
    expect(first).toBe(1);
    nextSequence();
    nextSequence();
    resetSequence();
    const afterReset = nextSequence();
    expect(afterReset).toBe(1);
  });

  it("should produce continuous sequence without gaps", () => {
    const numbers: number[] = [];
    for (let i = 0; i < 100; i++) {
      numbers.push(nextSequence());
    }
    for (let i = 1; i < numbers.length; i++) {
      expect(numbers[i] - numbers[i - 1]).toBe(1);
    }
  });
});
