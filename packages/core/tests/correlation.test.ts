/**
 * Tests for correlation ID utility.
 */

import { describe, it, expect } from "vitest";
import { generateCorrelationId } from "../src/index.js";

describe("generateCorrelationId()", () => {
  it("returns a string", () => {
    const id = generateCorrelationId();
    expect(typeof id).toBe("string");
  });

  it("returns a non-empty string", () => {
    const id = generateCorrelationId();
    expect(id.length).toBeGreaterThan(0);
  });

  it("returns unique IDs on successive calls", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateCorrelationId());
    }
    // With Math.random(), 100 IDs should all be unique
    expect(ids.size).toBe(100);
  });

  it("returns an alphanumeric string", () => {
    const id = generateCorrelationId();
    expect(id).toMatch(/^[a-z0-9]+$/);
  });

  it("returns a string with reasonable length", () => {
    const id = generateCorrelationId();
    // substring(2, 15) should produce up to 13 chars
    expect(id.length).toBeLessThanOrEqual(13);
    expect(id.length).toBeGreaterThan(0);
  });
});
