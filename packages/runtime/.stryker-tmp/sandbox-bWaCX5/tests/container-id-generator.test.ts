/**
 * Tests for src/container/id-generator.ts
 * Covers createContainerIdGenerator, generateChildContainerId,
 * resetChildContainerIdCounter.
 */
// @ts-nocheck

import { describe, it, expect, beforeEach } from "vitest";
import {
  createContainerIdGenerator,
  generateChildContainerId,
  resetChildContainerIdCounter,
} from "../src/container/id-generator.js";

describe("createContainerIdGenerator", () => {
  it("generates sequential IDs starting from child-1", () => {
    const gen = createContainerIdGenerator();
    expect(gen()).toBe("child-1");
    expect(gen()).toBe("child-2");
    expect(gen()).toBe("child-3");
  });

  it("each generator has its own independent counter", () => {
    const gen1 = createContainerIdGenerator();
    const gen2 = createContainerIdGenerator();

    expect(gen1()).toBe("child-1");
    expect(gen1()).toBe("child-2");

    // gen2 has its own counter
    expect(gen2()).toBe("child-1");
    expect(gen2()).toBe("child-2");
  });

  it("generates unique IDs within a generator", () => {
    const gen = createContainerIdGenerator();
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(gen());
    }
    expect(ids.size).toBe(100);
  });

  it("returns string type", () => {
    const gen = createContainerIdGenerator();
    const id = gen();
    expect(typeof id).toBe("string");
  });

  it("follows child-N format", () => {
    const gen = createContainerIdGenerator();
    const id = gen();
    expect(id).toMatch(/^child-\d+$/);
  });
});

describe("generateChildContainerId", () => {
  beforeEach(() => {
    resetChildContainerIdCounter();
  });

  it("generates sequential IDs using default generator", () => {
    const id1 = generateChildContainerId();
    const id2 = generateChildContainerId();

    expect(id1).toBe("child-1");
    expect(id2).toBe("child-2");
  });

  it("returns string type", () => {
    expect(typeof generateChildContainerId()).toBe("string");
  });
});

describe("resetChildContainerIdCounter", () => {
  it("resets default generator counter", () => {
    const id1 = generateChildContainerId();
    // Counter is now past child-1

    resetChildContainerIdCounter();

    const id2 = generateChildContainerId();
    // Should be child-1 again after reset
    expect(id2).toBe("child-1");
  });

  it("does not affect isolated generators", () => {
    const gen = createContainerIdGenerator();
    expect(gen()).toBe("child-1");
    expect(gen()).toBe("child-2");

    resetChildContainerIdCounter();

    // Isolated generator is unaffected
    expect(gen()).toBe("child-3");
  });
});
