/**
 * Tests for correlation ID utility.
 */

import { describe, it, expect, afterEach } from "vitest";
import { generateCorrelationId, configureCorrelationId, resetCorrelationId } from "../src/index.js";

describe("generateCorrelationId()", () => {
  afterEach(() => {
    resetCorrelationId();
  });

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
    expect(ids.size).toBe(100);
  });

  it("generates monotonic counter-based IDs by default", () => {
    const id1 = generateCorrelationId();
    const id2 = generateCorrelationId();
    expect(id1).toBe("corr_0_0000");
    expect(id2).toBe("corr_1_0001");
  });

  it("produces IDs matching the corr_{n}_{base36} format", () => {
    const id = generateCorrelationId();
    expect(id).toMatch(/^corr_\d+_[a-z0-9]+$/);
  });

  it("produces deterministic sequence after reset", () => {
    generateCorrelationId();
    generateCorrelationId();
    resetCorrelationId();
    expect(generateCorrelationId()).toBe("corr_0_0000");
  });

  it("uses custom generator when configured", () => {
    let counter = 100;
    configureCorrelationId({
      generator: () => `custom_${counter++}`,
    });
    expect(generateCorrelationId()).toBe("custom_100");
    expect(generateCorrelationId()).toBe("custom_101");
  });

  it("returns to default after reset", () => {
    configureCorrelationId({ generator: () => "custom" });
    resetCorrelationId();
    expect(generateCorrelationId()).toBe("corr_0_0000");
  });
});
