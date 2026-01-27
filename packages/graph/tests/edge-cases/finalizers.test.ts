/**
 * Finalizer handling edge case tests.
 *
 * Tests behavior of adapter finalizers.
 */

import { describe, expect, it, vi } from "vitest";
import { createAdapter, createAsyncAdapter } from "../../src/index.js";
import { LoggerPort } from "../fixtures.js";

describe("finalizer handling", () => {
  it("adapter preserves sync finalizer", () => {
    const finalizerFn = vi.fn();

    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
      finalizer: finalizerFn,
    });

    expect(adapter.finalizer).toBe(finalizerFn);
  });

  it("adapter preserves async finalizer", () => {
    const finalizerFn = vi.fn().mockResolvedValue(undefined);

    const adapter = createAsyncAdapter({
      provides: LoggerPort,
      requires: [],
      factory: async () => ({ log: () => {} }),
      finalizer: finalizerFn,
    });

    expect(adapter.finalizer).toBe(finalizerFn);
  });

  it("finalizer is undefined when not provided", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    expect(adapter.finalizer).toBeUndefined();
  });
});
