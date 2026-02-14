/**
 * Tests for deterministic correlation ID generation.
 *
 * All tests use the factory pattern `createCorrelationIdGenerator()` which
 * creates isolated generators with no shared global state.
 *
 * Counter-based IDs use the format: `insp_{processId}_{counter}_{suffix}`
 * where processId is a random prefix unique to each generator.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { createCorrelationIdGenerator } from "../src/graph/inspection/correlation.js";

/** Matches the counter-based correlation ID format */
const COUNTER_ID_PATTERN = /^insp_[a-z0-9]+_(\d+)_[a-z0-9]+$/;

function extractCounter(id: string): number {
  const match = COUNTER_ID_PATTERN.exec(id);
  if (!match) throw new Error(`ID does not match expected pattern: ${id}`);
  return Number(match[1]);
}

describe("Correlation ID determinism", () => {
  describe("counter-based mode (default)", () => {
    it("generates sequential IDs starting from 0", () => {
      const generate = createCorrelationIdGenerator();

      const id0 = generate();
      const id1 = generate();
      const id2 = generate();

      expect(extractCounter(id0)).toBe(0);
      expect(extractCounter(id1)).toBe(1);
      expect(extractCounter(id2)).toBe(2);
    });

    it("each generator starts from 0 (isolated state)", () => {
      const gen1 = createCorrelationIdGenerator();
      gen1(); // counter 0
      gen1(); // counter 1

      // New generator starts fresh - no global reset needed
      const gen2 = createCorrelationIdGenerator();
      expect(extractCounter(gen2())).toBe(0);
    });

    it("includes a process-unique prefix", () => {
      const gen1 = createCorrelationIdGenerator();
      const gen2 = createCorrelationIdGenerator();

      const id1 = gen1();
      const id2 = gen2();

      // Both match the pattern
      expect(id1).toMatch(COUNTER_ID_PATTERN);
      expect(id2).toMatch(COUNTER_ID_PATTERN);

      // Different generators produce different prefixes (with high probability)
      const prefix1 = id1.split("_")[1];
      const prefix2 = id2.split("_")[1];
      expect(prefix1).not.toBe(prefix2);
    });

    it("is deterministic within a single generator", () => {
      const gen = createCorrelationIdGenerator();

      // Same generator produces consistent incrementing IDs
      const id0 = gen();
      const id1 = gen();
      const id2 = gen();

      expect(extractCounter(id0)).toBe(0);
      expect(extractCounter(id1)).toBe(1);
      expect(extractCounter(id2)).toBe(2);

      // All share the same prefix
      const prefix = id0.split("_")[1];
      expect(id1.split("_")[1]).toBe(prefix);
      expect(id2.split("_")[1]).toBe(prefix);
    });
  });

  describe("seeded mode", () => {
    it("produces deterministic IDs from seed", () => {
      const generate = createCorrelationIdGenerator();

      const id1 = generate("test-seed");
      const id2 = generate("test-seed");
      expect(id1).toBe(id2);
    });

    it("different seeds produce different IDs", () => {
      const generate = createCorrelationIdGenerator();

      const id1 = generate("seed-1");
      const id2 = generate("seed-2");
      expect(id1).not.toBe(id2);
    });

    it("does not affect counter-based mode", () => {
      const generate = createCorrelationIdGenerator();

      generate("some-seed"); // seeded call - does not increment counter
      // Counter should still be at 0
      expect(extractCounter(generate())).toBe(0);
    });
  });

  describe("isolation guarantees", () => {
    it("generators do not share state", () => {
      const gen1 = createCorrelationIdGenerator();
      const gen2 = createCorrelationIdGenerator();

      // Use gen1 multiple times
      gen1();
      gen1();
      gen1();

      // gen2 should still start at 0
      expect(extractCounter(gen2())).toBe(0);
    });

    it("parallel usage produces predictable results", () => {
      const genA = createCorrelationIdGenerator();
      const genB = createCorrelationIdGenerator();

      // Interleaved calls
      expect(extractCounter(genA())).toBe(0);
      expect(extractCounter(genB())).toBe(0);
      expect(extractCounter(genA())).toBe(1);
      expect(extractCounter(genB())).toBe(1);
    });
  });
});
