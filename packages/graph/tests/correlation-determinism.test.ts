/**
 * Tests for deterministic correlation ID generation.
 *
 * All tests use the factory pattern `createCorrelationIdGenerator()` which
 * creates isolated generators with no shared global state.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { createCorrelationIdGenerator } from "../src/graph/inspection/correlation.js";

describe("Correlation ID determinism", () => {
  describe("counter-based mode (default)", () => {
    it("generates sequential IDs starting from 0", () => {
      const generate = createCorrelationIdGenerator();

      expect(generate()).toBe("insp_0_0000");
      expect(generate()).toBe("insp_1_0001");
      expect(generate()).toBe("insp_2_0002");
    });

    it("each generator starts from 0 (isolated state)", () => {
      const gen1 = createCorrelationIdGenerator();
      gen1(); // "insp_0_0000"
      gen1(); // "insp_1_0001"

      // New generator starts fresh - no global reset needed
      const gen2 = createCorrelationIdGenerator();
      expect(gen2()).toBe("insp_0_0000");
    });

    it("is deterministic - same sequence produces same IDs", () => {
      // Create two independent generators
      const gen1 = createCorrelationIdGenerator();
      const gen2 = createCorrelationIdGenerator();

      // Both produce identical sequences
      const ids1 = [gen1(), gen1()];
      const ids2 = [gen2(), gen2()];

      expect(ids1).toEqual(ids2);
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
      expect(generate()).toBe("insp_0_0000");
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
      expect(gen2()).toBe("insp_0_0000");
    });

    it("parallel usage produces predictable results", () => {
      const genA = createCorrelationIdGenerator();
      const genB = createCorrelationIdGenerator();

      // Interleaved calls
      expect(genA()).toBe("insp_0_0000");
      expect(genB()).toBe("insp_0_0000");
      expect(genA()).toBe("insp_1_0001");
      expect(genB()).toBe("insp_1_0001");
    });
  });
});
