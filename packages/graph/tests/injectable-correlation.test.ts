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
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import {
  createCorrelationIdGenerator,
  type CorrelationIdGenerator,
} from "../src/graph/inspection/correlation.js";

describe("createCorrelationIdGenerator()", () => {
  describe("creates isolated generators", () => {
    it("should create a generator that starts at 0", () => {
      const generate = createCorrelationIdGenerator();

      expect(generate()).toBe("insp_0_0000");
      expect(generate()).toBe("insp_1_0001");
    });

    it("should create independent generators with their own counters", () => {
      const gen1 = createCorrelationIdGenerator();
      const gen2 = createCorrelationIdGenerator();

      // Both start at 0
      expect(gen1()).toBe("insp_0_0000");
      expect(gen2()).toBe("insp_0_0000");

      // Each increments independently
      expect(gen1()).toBe("insp_1_0001");
      expect(gen1()).toBe("insp_2_0002");
      expect(gen2()).toBe("insp_1_0001");
    });

    it("should not share state between generators", () => {
      const gen1 = createCorrelationIdGenerator();
      const gen2 = createCorrelationIdGenerator();

      // Use gen1 multiple times
      gen1();
      gen1();
      gen1();

      // gen2 should still start at 0
      expect(gen2()).toBe("insp_0_0000");
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
      expect(generate()).toBe("insp_0_0000");
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

    expect(result1.correlationId).toBe("insp_0_0000");
    expect(result2.correlationId).toBe("insp_1_0001");
  });
});
