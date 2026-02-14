/**
 * Tests for injectable correlation ID generator.
 *
 * ## Design
 *
 * The `createCorrelationIdGenerator()` factory creates isolated generators
 * with their own internal counter. This eliminates global mutable state and
 * enables:
 *
 * - **Test isolation**: Each test/generator has independent state
 * - **Parallel safety**: Multiple generators can run without conflicts
 * - **Dependency injection**: Pass generators as dependencies
 *
 * Counter-based IDs use the format: `insp_{processId}_{counter}_{suffix}`
 * where processId is a random prefix unique to each generator.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import {
  createCorrelationIdGenerator,
  type CorrelationIdGenerator,
} from "../src/graph/inspection/correlation.js";

/** Matches the counter-based correlation ID format */
const COUNTER_ID_PATTERN = /^insp_[a-z0-9]+_(\d+)_[a-z0-9]+$/;

function extractCounter(id: string): number {
  const match = COUNTER_ID_PATTERN.exec(id);
  if (!match) throw new Error(`ID does not match expected pattern: ${id}`);
  return Number(match[1]);
}

describe("createCorrelationIdGenerator()", () => {
  describe("creates isolated generators", () => {
    it("should create a generator that starts at 0", () => {
      const generate = createCorrelationIdGenerator();

      expect(extractCounter(generate())).toBe(0);
      expect(extractCounter(generate())).toBe(1);
    });

    it("should create independent generators with their own counters", () => {
      const gen1 = createCorrelationIdGenerator();
      const gen2 = createCorrelationIdGenerator();

      // Both start at 0
      expect(extractCounter(gen1())).toBe(0);
      expect(extractCounter(gen2())).toBe(0);

      // Each increments independently
      expect(extractCounter(gen1())).toBe(1);
      expect(extractCounter(gen1())).toBe(2);
      expect(extractCounter(gen2())).toBe(1);
    });

    it("should not share state between generators", () => {
      const gen1 = createCorrelationIdGenerator();
      const gen2 = createCorrelationIdGenerator();

      // Use gen1 multiple times
      gen1();
      gen1();
      gen1();

      // gen2 should still start at 0
      expect(extractCounter(gen2())).toBe(0);
    });
  });

  describe("supports seeded mode", () => {
    it("should return same ID for same seed", () => {
      const generate = createCorrelationIdGenerator();

      const id1 = generate("test-seed");
      const id2 = generate("test-seed");

      expect(id1).toBe(id2);
    });

    it("seeded calls should not affect counter", () => {
      const generate = createCorrelationIdGenerator();

      generate("seed-1"); // Seeded call
      generate("seed-2"); // Seeded call

      // Counter should still be at 0
      expect(extractCounter(generate())).toBe(0);
    });

    it("different seeds produce different IDs", () => {
      const generate = createCorrelationIdGenerator();

      const id1 = generate("seed-a");
      const id2 = generate("seed-b");

      expect(id1).not.toBe(id2);
    });
  });
});

describe("CorrelationIdGenerator type", () => {
  it("should have correct function signature", () => {
    const generate: CorrelationIdGenerator = createCorrelationIdGenerator();

    // Should accept optional seed
    const id1: string = generate();
    const id2: string = generate("seed");

    expect(typeof id1).toBe("string");
    expect(typeof id2).toBe("string");
  });

  it("can be passed as a dependency", () => {
    // Simulates dependency injection pattern
    function processWithCorrelation(
      data: string,
      generator: CorrelationIdGenerator
    ): { correlationId: string; data: string } {
      return {
        correlationId: generator(),
        data,
      };
    }

    const gen = createCorrelationIdGenerator();
    const result1 = processWithCorrelation("test1", gen);
    const result2 = processWithCorrelation("test2", gen);

    expect(extractCounter(result1.correlationId)).toBe(0);
    expect(extractCounter(result2.correlationId)).toBe(1);
  });
});
