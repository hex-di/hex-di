/**
 * GxP integrity hash chain tests.
 *
 * Verifies FNV-1a hash chain for tamper evidence,
 * detecting modified/deleted entries and chain continuity.
 */

import { describe, it, expect } from "vitest";
import { computeEntryHash, withIntegrity } from "../../src/utils/integrity.js";
import { createMemoryLogger } from "../../src/index.js";

describe("computeEntryHash", () => {
  it("should produce a hash chain where each hash depends on the previous", () => {
    const hash1 = computeEntryHash(
      { level: "info", message: "first", timestamp: 1000, sequence: 1 },
      "00000000"
    );
    const hash2 = computeEntryHash(
      { level: "info", message: "second", timestamp: 1001, sequence: 2 },
      hash1
    );
    const hash3 = computeEntryHash(
      { level: "info", message: "third", timestamp: 1002, sequence: 3 },
      hash2
    );

    // All hashes should be 8-char hex
    expect(hash1).toMatch(/^[0-9a-f]{8}$/);
    expect(hash2).toMatch(/^[0-9a-f]{8}$/);
    expect(hash3).toMatch(/^[0-9a-f]{8}$/);

    // All different
    expect(hash1).not.toBe(hash2);
    expect(hash2).not.toBe(hash3);
  });

  it("should produce different hash if entry is modified", () => {
    const prev = "00000000";
    const original = computeEntryHash(
      { level: "info", message: "hello", timestamp: 1000, sequence: 1 },
      prev
    );
    const modified = computeEntryHash(
      { level: "info", message: "hello TAMPERED", timestamp: 1000, sequence: 1 },
      prev
    );
    expect(original).not.toBe(modified);
  });

  it("should detect deleted entry by chain break", () => {
    const hash1 = computeEntryHash(
      { level: "info", message: "first", timestamp: 1000, sequence: 1 },
      "00000000"
    );
    const hash2 = computeEntryHash(
      { level: "info", message: "second", timestamp: 1001, sequence: 2 },
      hash1
    );
    const hash3 = computeEntryHash(
      { level: "info", message: "third", timestamp: 1002, sequence: 3 },
      hash2
    );

    // If entry 2 is deleted, re-computing hash3 from hash1 gives different result
    const hash3FromHash1 = computeEntryHash(
      { level: "info", message: "third", timestamp: 1002, sequence: 3 },
      hash1
    );
    expect(hash3FromHash1).not.toBe(hash3);
  });

  it("should start chain from known seed '00000000'", () => {
    const hash = computeEntryHash(
      { level: "info", message: "first", timestamp: 1000, sequence: 1 },
      "00000000"
    );
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
    // Deterministic - same input should always produce same hash
    const hash2 = computeEntryHash(
      { level: "info", message: "first", timestamp: 1000, sequence: 1 },
      "00000000"
    );
    expect(hash).toBe(hash2);
  });
});

describe("withIntegrity", () => {
  it("should attach __integrity to annotations", () => {
    const mem = createMemoryLogger();
    const logger = withIntegrity(mem);

    logger.info("test message");

    const entries = mem.getEntries();
    expect(entries).toHaveLength(1);
    const integrity = entries[0].annotations.__integrity;
    expect(integrity).toBeDefined();
    expect(typeof (integrity as Record<string, string>).hash).toBe("string");
    expect(typeof (integrity as Record<string, string>).previousHash).toBe("string");
  });

  it("should chain hashes across entries", () => {
    const mem = createMemoryLogger();
    const logger = withIntegrity(mem);

    logger.info("first");
    logger.info("second");

    const entries = mem.getEntries();
    const integrity1 = entries[0].annotations.__integrity as Record<string, string>;
    const integrity2 = entries[1].annotations.__integrity as Record<string, string>;

    // First entry's previousHash should be the seed
    expect(integrity1.previousHash).toBe("00000000");
    // Second entry's previousHash should be first entry's hash
    expect(integrity2.previousHash).toBe(integrity1.hash);
  });
});
