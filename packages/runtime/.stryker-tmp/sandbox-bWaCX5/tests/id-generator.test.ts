/**
 * Tests for Container ID Generator.
 *
 * ## Design
 *
 * The `createContainerIdGenerator()` factory creates isolated generators
 * with their own internal counter. This eliminates global mutable state and
 * enables:
 *
 * - **Test isolation**: Each test/generator has independent state
 * - **Parallel safety**: Multiple generators can run without conflicts
 * - **Dependency injection**: Pass generators as dependencies
 *
 * @packageDocumentation
 */
// @ts-nocheck

import { describe, it, expect } from "vitest";
import {
  createContainerIdGenerator,
  generateChildContainerId,
  resetChildContainerIdCounter,
  type ContainerIdGenerator,
} from "../src/container/id-generator.js";

describe("createContainerIdGenerator()", () => {
  describe("creates isolated generators", () => {
    it("should create a generator that starts at 1", () => {
      const generate = createContainerIdGenerator();

      expect(generate()).toBe("child-1");
      expect(generate()).toBe("child-2");
      expect(generate()).toBe("child-3");
    });

    it("should create independent generators with their own counters", () => {
      const gen1 = createContainerIdGenerator();
      const gen2 = createContainerIdGenerator();

      // Both start at 1
      expect(gen1()).toBe("child-1");
      expect(gen2()).toBe("child-1");

      // Each increments independently
      expect(gen1()).toBe("child-2");
      expect(gen1()).toBe("child-3");
      expect(gen2()).toBe("child-2");
    });

    it("should not share state between generators", () => {
      const gen1 = createContainerIdGenerator();
      const gen2 = createContainerIdGenerator();

      // Use gen1 multiple times
      gen1();
      gen1();
      gen1();

      // gen2 should still start at 1
      expect(gen2()).toBe("child-1");
    });
  });

  describe("ID format", () => {
    it("should produce IDs in the format 'child-N'", () => {
      const generate = createContainerIdGenerator();

      for (let i = 1; i <= 10; i++) {
        expect(generate()).toBe(`child-${i}`);
      }
    });

    it("should handle large numbers", () => {
      const generate = createContainerIdGenerator();

      // Generate 100 IDs
      for (let i = 1; i < 100; i++) {
        generate();
      }

      expect(generate()).toBe("child-100");
    });
  });
});

describe("ContainerIdGenerator type", () => {
  it("should have correct function signature", () => {
    const generate: ContainerIdGenerator = createContainerIdGenerator();

    const id: string = generate();

    expect(typeof id).toBe("string");
  });

  it("can be passed as a dependency", () => {
    // Simulates dependency injection pattern
    function createContainerWithId(
      name: string,
      generator: ContainerIdGenerator
    ): { id: string; name: string } {
      return {
        id: generator(),
        name,
      };
    }

    const gen = createContainerIdGenerator();
    const container1 = createContainerWithId("test1", gen);
    const container2 = createContainerWithId("test2", gen);

    expect(container1.id).toBe("child-1");
    expect(container2.id).toBe("child-2");
  });
});

describe("generateChildContainerId() (backward compatibility)", () => {
  it("should generate unique IDs from default generator", () => {
    resetChildContainerIdCounter();

    const id1 = generateChildContainerId();
    const id2 = generateChildContainerId();

    expect(id1).toBe("child-1");
    expect(id2).toBe("child-2");
  });

  it("should be resettable via resetChildContainerIdCounter()", () => {
    resetChildContainerIdCounter();

    generateChildContainerId();
    generateChildContainerId();

    resetChildContainerIdCounter();

    expect(generateChildContainerId()).toBe("child-1");
  });
});

describe("test isolation", () => {
  it("factory generators are isolated from default generator", () => {
    resetChildContainerIdCounter();

    const isolatedGen = createContainerIdGenerator();

    // Use default generator
    generateChildContainerId();
    generateChildContainerId();

    // Isolated generator should still start at 1
    expect(isolatedGen()).toBe("child-1");
  });

  it("multiple test suites get independent state with factory", () => {
    // Simulates multiple test suites running in parallel
    const suite1Gen = createContainerIdGenerator();
    const suite2Gen = createContainerIdGenerator();

    // Suite 1 creates many containers
    for (let i = 0; i < 50; i++) {
      suite1Gen();
    }

    // Suite 2 should be unaffected
    expect(suite2Gen()).toBe("child-1");
    expect(suite2Gen()).toBe("child-2");
  });
});
