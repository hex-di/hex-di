/**
 * Tests for Scope ID Generator.
 *
 * ## Design
 *
 * The `createScopeIdGenerator()` factory creates isolated generators
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
  createScopeIdGenerator,
  resetScopeIdCounter,
  type ScopeIdGenerator,
} from "../src/scope/impl.js";

describe("createScopeIdGenerator()", () => {
  describe("creates isolated generators", () => {
    it("should create a generator that starts at 0", () => {
      const generate = createScopeIdGenerator();

      expect(generate()).toBe("scope-0");
      expect(generate()).toBe("scope-1");
      expect(generate()).toBe("scope-2");
    });

    it("should create independent generators with their own counters", () => {
      const gen1 = createScopeIdGenerator();
      const gen2 = createScopeIdGenerator();

      // Both start at 0
      expect(gen1()).toBe("scope-0");
      expect(gen2()).toBe("scope-0");

      // Each increments independently
      expect(gen1()).toBe("scope-1");
      expect(gen1()).toBe("scope-2");
      expect(gen2()).toBe("scope-1");
    });

    it("should not share state between generators", () => {
      const gen1 = createScopeIdGenerator();
      const gen2 = createScopeIdGenerator();

      // Use gen1 multiple times
      gen1();
      gen1();
      gen1();

      // gen2 should still start at 0
      expect(gen2()).toBe("scope-0");
    });
  });

  describe("explicit naming", () => {
    it("should return the explicit name when provided", () => {
      const generate = createScopeIdGenerator();

      expect(generate("my-scope")).toBe("my-scope");
      expect(generate("another-scope")).toBe("another-scope");
    });

    it("should not increment counter when explicit name is provided", () => {
      const generate = createScopeIdGenerator();

      expect(generate()).toBe("scope-0");
      expect(generate("named")).toBe("named");
      expect(generate()).toBe("scope-1"); // Counter continues
      expect(generate("named-2")).toBe("named-2");
      expect(generate()).toBe("scope-2");
    });

    it("should handle empty string as explicit name", () => {
      const generate = createScopeIdGenerator();

      // Empty string is falsy but not undefined, so it should be returned
      expect(generate("")).toBe("");
    });
  });

  describe("ID format", () => {
    it("should produce IDs in the format 'scope-N'", () => {
      const generate = createScopeIdGenerator();

      for (let i = 0; i < 10; i++) {
        expect(generate()).toBe(`scope-${i}`);
      }
    });

    it("should handle large numbers", () => {
      const generate = createScopeIdGenerator();

      // Generate 100 IDs
      for (let i = 0; i < 99; i++) {
        generate();
      }

      expect(generate()).toBe("scope-99");
    });
  });
});

describe("ScopeIdGenerator type", () => {
  it("should have correct function signature", () => {
    const generate: ScopeIdGenerator = createScopeIdGenerator();

    const id: string = generate();

    expect(typeof id).toBe("string");
  });

  it("should accept optional name parameter", () => {
    const generate: ScopeIdGenerator = createScopeIdGenerator();

    const autoId: string = generate();
    const namedId: string = generate("custom-name");

    expect(autoId).toMatch(/^scope-\d+$/);
    expect(namedId).toBe("custom-name");
  });

  it("can be passed as a dependency", () => {
    // Simulates dependency injection pattern
    function createScopeWithId(generator: ScopeIdGenerator, name?: string): { id: string } {
      return { id: generator(name) };
    }

    const gen = createScopeIdGenerator();
    const scope1 = createScopeWithId(gen);
    const scope2 = createScopeWithId(gen, "named");
    const scope3 = createScopeWithId(gen);

    expect(scope1.id).toBe("scope-0");
    expect(scope2.id).toBe("named");
    expect(scope3.id).toBe("scope-1");
  });
});

describe("resetScopeIdCounter()", () => {
  it("should not affect independently created generators", () => {
    const isolatedGen = createScopeIdGenerator();

    // Use the isolated generator
    expect(isolatedGen()).toBe("scope-0");
    expect(isolatedGen()).toBe("scope-1");

    // Reset the global counter
    resetScopeIdCounter();

    // Isolated generator continues unaffected
    expect(isolatedGen()).toBe("scope-2");
  });
});

describe("test isolation", () => {
  it("multiple test suites get independent state with factory", () => {
    // Simulates multiple test suites running in parallel
    const suite1Gen = createScopeIdGenerator();
    const suite2Gen = createScopeIdGenerator();

    // Suite 1 creates many scopes
    for (let i = 0; i < 50; i++) {
      suite1Gen();
    }

    // Suite 2 should be unaffected
    expect(suite2Gen()).toBe("scope-0");
    expect(suite2Gen()).toBe("scope-1");
  });

  it("should demonstrate test isolation (test A)", () => {
    const gen = createScopeIdGenerator();
    expect(gen()).toBe("scope-0");
    expect(gen()).toBe("scope-1");
  });

  it("should demonstrate test isolation (test B)", () => {
    // This test should start fresh, not see state from test A
    const gen = createScopeIdGenerator();
    expect(gen()).toBe("scope-0");
    expect(gen()).toBe("scope-1");
  });
});
