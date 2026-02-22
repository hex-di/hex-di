import { describe, it, expect } from "vitest";
import { SIGNATURE_MEANINGS } from "../../src/signature/meanings.js";
import type { SignatureMeaning } from "../../src/signature/meanings.js";

describe("SIGNATURE_MEANINGS — DoD 13 tests 81-83", () => {
  // Test 81: Signature meanings constants are exported
  it("test 81: SIGNATURE_MEANINGS is exported and contains the expected keys", () => {
    expect(SIGNATURE_MEANINGS).toBeDefined();
    expect(SIGNATURE_MEANINGS.AUTHORED).toBeDefined();
    expect(SIGNATURE_MEANINGS.REVIEWED).toBeDefined();
    expect(SIGNATURE_MEANINGS.APPROVED).toBeDefined();
    expect(SIGNATURE_MEANINGS.REJECTED).toBeDefined();
    expect(SIGNATURE_MEANINGS.WITNESSED).toBeDefined();
    expect(SIGNATURE_MEANINGS.RELEASED).toBeDefined();
    expect(SIGNATURE_MEANINGS.WITNESSED_DESTRUCTION).toBeDefined();
  });
  // Test 82: Signature meanings are readonly/frozen
  it("test 82: SIGNATURE_MEANINGS is frozen (readonly — cannot be mutated)", () => {
    expect(Object.isFrozen(SIGNATURE_MEANINGS)).toBe(true);
  });

  // Test 83: Signature meaning strings are non-empty
  it("test 83: all SIGNATURE_MEANINGS values are non-empty strings", () => {
    const values = Object.values(SIGNATURE_MEANINGS) as SignatureMeaning[];
    expect(values.length).toBeGreaterThan(0);
    for (const value of values) {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it("SIGNATURE_MEANINGS.AUTHORED is authored", () => {
    expect(SIGNATURE_MEANINGS.AUTHORED).toBe("authored");
  });

  it("SIGNATURE_MEANINGS.APPROVED is approved", () => {
    expect(SIGNATURE_MEANINGS.APPROVED).toBe("approved");
  });
});
