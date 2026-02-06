/**
 * Tests for trace and span ID generation.
 *
 * Verifies:
 * - Correct ID lengths (32 chars for trace, 16 chars for span)
 * - Hex format validation
 * - Uniqueness (no collisions in 1000 generations)
 * - Not-all-zeros per W3C spec
 * - Type guard utilities for ID validation
 */

import { describe, it, expect } from "vitest";
import {
  generateTraceId,
  generateSpanId,
  isValidTraceId,
  isValidSpanId,
  isAttributeValue,
  isSpanKind,
  isSpanStatus,
} from "../../src/index.js";

const HEX_REGEX = /^[0-9a-f]+$/;

describe("generateTraceId", () => {
  it("should generate 32-character hex string", () => {
    const id = generateTraceId();
    expect(id).toHaveLength(32);
    expect(HEX_REGEX.test(id)).toBe(true);
  });

  it("should not generate all zeros", () => {
    // Generate multiple IDs and verify none are all-zeros
    for (let i = 0; i < 100; i++) {
      const id = generateTraceId();
      expect(id).not.toBe("0".repeat(32));
    }
  });

  it("should generate unique IDs (1000 samples, no collisions)", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(generateTraceId());
    }
    expect(ids.size).toBe(1000);
  });

  it("should produce lowercase hex characters", () => {
    for (let i = 0; i < 50; i++) {
      const id = generateTraceId();
      expect(id).toBe(id.toLowerCase());
    }
  });
});

describe("generateSpanId", () => {
  it("should generate 16-character hex string", () => {
    const id = generateSpanId();
    expect(id).toHaveLength(16);
    expect(HEX_REGEX.test(id)).toBe(true);
  });

  it("should not generate all zeros", () => {
    for (let i = 0; i < 100; i++) {
      const id = generateSpanId();
      expect(id).not.toBe("0".repeat(16));
    }
  });

  it("should generate unique IDs (1000 samples, no collisions)", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(generateSpanId());
    }
    expect(ids.size).toBe(1000);
  });

  it("should produce lowercase hex characters", () => {
    for (let i = 0; i < 50; i++) {
      const id = generateSpanId();
      expect(id).toBe(id.toLowerCase());
    }
  });
});

describe("isValidTraceId", () => {
  it("should accept valid trace ID", () => {
    expect(isValidTraceId("4bf92f3577b34da6a3ce929d0e0e4736")).toBe(true);
  });

  it("should reject all-zeros trace ID", () => {
    expect(isValidTraceId("00000000000000000000000000000000")).toBe(false);
  });

  it("should reject too-short ID", () => {
    expect(isValidTraceId("4bf92f35")).toBe(false);
  });

  it("should reject too-long ID", () => {
    expect(isValidTraceId("4bf92f3577b34da6a3ce929d0e0e4736ff")).toBe(false);
  });

  it("should reject non-hex characters", () => {
    expect(isValidTraceId("ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ")).toBe(false);
  });

  it("should reject uppercase hex", () => {
    expect(isValidTraceId("4BF92F3577B34DA6A3CE929D0E0E4736")).toBe(false);
  });

  it("should validate generated trace IDs", () => {
    for (let i = 0; i < 100; i++) {
      expect(isValidTraceId(generateTraceId())).toBe(true);
    }
  });
});

describe("isValidSpanId", () => {
  it("should accept valid span ID", () => {
    expect(isValidSpanId("00f067aa0ba902b7")).toBe(true);
  });

  it("should reject all-zeros span ID", () => {
    expect(isValidSpanId("0000000000000000")).toBe(false);
  });

  it("should reject too-short ID", () => {
    expect(isValidSpanId("00f067aa")).toBe(false);
  });

  it("should reject too-long ID", () => {
    expect(isValidSpanId("00f067aa0ba902b7ff")).toBe(false);
  });

  it("should reject non-hex characters", () => {
    expect(isValidSpanId("ZZZZZZZZZZZZZZZZ")).toBe(false);
  });

  it("should reject uppercase hex", () => {
    expect(isValidSpanId("00F067AA0BA902B7")).toBe(false);
  });

  it("should validate generated span IDs", () => {
    for (let i = 0; i < 100; i++) {
      expect(isValidSpanId(generateSpanId())).toBe(true);
    }
  });
});

describe("isAttributeValue", () => {
  it("should accept string values", () => {
    expect(isAttributeValue("GET")).toBe(true);
    expect(isAttributeValue("")).toBe(true);
  });

  it("should accept number values", () => {
    expect(isAttributeValue(200)).toBe(true);
    expect(isAttributeValue(0)).toBe(true);
    expect(isAttributeValue(-1)).toBe(true);
    expect(isAttributeValue(3.14)).toBe(true);
  });

  it("should accept boolean values", () => {
    expect(isAttributeValue(true)).toBe(true);
    expect(isAttributeValue(false)).toBe(true);
  });

  it("should accept homogeneous arrays", () => {
    expect(isAttributeValue(["a", "b"])).toBe(true);
    expect(isAttributeValue([1, 2, 3])).toBe(true);
    expect(isAttributeValue([true, false])).toBe(true);
  });

  it("should reject NaN", () => {
    expect(isAttributeValue(NaN)).toBe(false);
  });

  it("should reject null and undefined", () => {
    expect(isAttributeValue(null)).toBe(false);
    expect(isAttributeValue(undefined)).toBe(false);
  });

  it("should reject objects", () => {
    expect(isAttributeValue({})).toBe(false);
    expect(isAttributeValue({ key: "value" })).toBe(false);
  });

  it("should reject mixed arrays", () => {
    expect(isAttributeValue([1, "mixed"])).toBe(false);
    expect(isAttributeValue([true, 1])).toBe(false);
  });

  it("should reject empty arrays", () => {
    expect(isAttributeValue([])).toBe(false);
  });
});

describe("isSpanKind", () => {
  it("should accept valid span kinds", () => {
    expect(isSpanKind("internal")).toBe(true);
    expect(isSpanKind("server")).toBe(true);
    expect(isSpanKind("client")).toBe(true);
    expect(isSpanKind("producer")).toBe(true);
    expect(isSpanKind("consumer")).toBe(true);
  });

  it("should reject invalid span kinds", () => {
    expect(isSpanKind("unknown")).toBe(false);
    expect(isSpanKind("")).toBe(false);
    expect(isSpanKind(42)).toBe(false);
    expect(isSpanKind(null)).toBe(false);
  });
});

describe("isSpanStatus", () => {
  it("should accept valid span statuses", () => {
    expect(isSpanStatus("unset")).toBe(true);
    expect(isSpanStatus("ok")).toBe(true);
    expect(isSpanStatus("error")).toBe(true);
  });

  it("should reject invalid span statuses", () => {
    expect(isSpanStatus("unknown")).toBe(false);
    expect(isSpanStatus("")).toBe(false);
    expect(isSpanStatus(42)).toBe(false);
    expect(isSpanStatus(null)).toBe(false);
  });
});
