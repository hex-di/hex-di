/**
 * Adapter immutability edge case tests.
 *
 * Tests that adapters are properly frozen and immutable.
 */

import { describe, expect, it } from "vitest";
import { createAdapter, createAsyncAdapter } from "@hex-di/core";
import { LoggerPort } from "../fixtures.js";

describe("adapter immutability", () => {
  it("sync adapter is frozen", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    expect(Object.isFrozen(adapter)).toBe(true);
  });

  it("async adapter is frozen", () => {
    const adapter = createAsyncAdapter({
      provides: LoggerPort,
      requires: [],
      factory: async () => ({ log: () => {} }),
    });

    expect(Object.isFrozen(adapter)).toBe(true);
  });

  it("cannot modify adapter properties", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    expect(() => {
      // @ts-expect-error Testing runtime immutability
      adapter.lifetime = "scoped";
    }).toThrow();
  });
});
