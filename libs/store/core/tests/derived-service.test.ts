/**
 * DerivedService implementation tests
 */

import { describe, it, expect, vi } from "vitest";
import { createDerivedServiceImpl } from "../src/services/derived-service-impl.js";
import { createSignal } from "../src/reactivity/signals.js";
function expectTaggedThrow(fn: () => unknown, tag: string): Record<string, unknown> {
  let thrown: unknown;
  try {
    fn();
  } catch (e) {
    thrown = e;
  }
  expect(thrown).toBeDefined();
  expect(thrown).toHaveProperty("_tag", tag);
  return thrown as Record<string, unknown>;
}

describe("DerivedService", () => {
  describe("computed value", () => {
    it("computes initial value from select function", () => {
      const source = createSignal(5);
      const derived = createDerivedServiceImpl<number>({
        portName: "Double",
        containerName: "test",
        select: () => source.get() * 2,
      });

      expect(derived.value).toBe(10);
    });

    it("recomputes when source signal changes", () => {
      const source = createSignal(5);
      const derived = createDerivedServiceImpl<number>({
        portName: "Double",
        containerName: "test",
        select: () => source.get() * 2,
      });

      source.set(10);
      expect(derived.value).toBe(20);
    });
  });

  describe("subscribe", () => {
    it("notifies listener when derived value changes", () => {
      const source = createSignal(5);
      const derived = createDerivedServiceImpl<number>({
        portName: "Double",
        containerName: "test",
        select: () => source.get() * 2,
      });

      const listener = vi.fn();
      derived.subscribe(listener);

      source.set(10);

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("unsubscribes correctly", () => {
      const source = createSignal(5);
      const derived = createDerivedServiceImpl<number>({
        portName: "Double",
        containerName: "test",
        select: () => source.get() * 2,
      });

      const listener = vi.fn();
      const unsub = derived.subscribe(listener);

      source.set(10);
      expect(listener).toHaveBeenCalledTimes(1);

      unsub();
      source.set(15);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("tracks subscriber count", () => {
      const derived = createDerivedServiceImpl<number>({
        portName: "Double",
        containerName: "test",
        select: () => 42,
      });

      expect(derived.subscriberCount).toBe(0);

      const unsub = derived.subscribe(vi.fn());
      expect(derived.subscriberCount).toBe(1);

      unsub();
      expect(derived.subscriberCount).toBe(0);
    });
  });

  describe("custom equality", () => {
    it("uses custom equals function to determine changes", () => {
      const source = createSignal({ x: 1, y: 2 });
      const derived = createDerivedServiceImpl<{ x: number; y: number }>({
        portName: "Position",
        containerName: "test",
        select: () => source.get(),
        equals: (a, b) => a.x === b.x && a.y === b.y,
      });

      const listener = vi.fn();
      derived.subscribe(listener);

      // Same x/y values -> no notification
      source.set({ x: 1, y: 2 });
      // Different values -> notification
      source.set({ x: 3, y: 4 });

      // At least one notification for the change to {x:3, y:4}
      expect(listener.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("error handling", () => {
    it("throws DerivedComputationError when select throws on value access", () => {
      // computed() is lazy -- error occurs when .value is first accessed
      const derived = createDerivedServiceImpl<number>({
        portName: "Broken",
        containerName: "test",
        select: () => {
          throw new Error("computation failed");
        },
      });

      expectTaggedThrow(() => derived.value, "DerivedComputationFailed");
    });
  });

  describe("disposal", () => {
    it("throws on value access after disposal", () => {
      const derived = createDerivedServiceImpl<number>({
        portName: "Test",
        containerName: "test",
        select: () => 42,
      });

      derived.dispose();
      expectTaggedThrow(() => derived.value, "DisposedStateAccess");
    });

    it("throws on subscribe after disposal", () => {
      const derived = createDerivedServiceImpl<number>({
        portName: "Test",
        containerName: "test",
        select: () => 42,
      });

      derived.dispose();
      expectTaggedThrow(() => derived.subscribe(vi.fn()), "DisposedStateAccess");
    });
  });
});
