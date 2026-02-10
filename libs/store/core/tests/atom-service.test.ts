/**
 * AtomService implementation tests
 */

import { describe, it, expect, vi } from "vitest";
import { createAtomServiceImpl } from "../src/services/atom-service-impl.js";
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

function createTestAtom(initial = 0) {
  return createAtomServiceImpl<number>({
    portName: "Counter",
    containerName: "test",
    initial,
  });
}

describe("AtomService", () => {
  describe("initial value", () => {
    it("returns the initial value", () => {
      const atom = createTestAtom(42);
      expect(atom.value).toBe(42);
    });
  });

  describe("set", () => {
    it("sets a new value", () => {
      const atom = createTestAtom(0);
      atom.set(10);
      expect(atom.value).toBe(10);
    });

    it("is referentially stable", () => {
      const atom = createTestAtom(0);
      expect(atom.set).toBe(atom.set);
    });
  });

  describe("update", () => {
    it("updates value with a function", () => {
      const atom = createTestAtom(5);
      atom.update(current => current + 10);
      expect(atom.value).toBe(15);
    });

    it("is referentially stable", () => {
      const atom = createTestAtom(0);
      expect(atom.update).toBe(atom.update);
    });
  });

  describe("subscribe", () => {
    it("notifies listener on value change via set", () => {
      const atom = createTestAtom(0);
      const listener = vi.fn();
      atom.subscribe(listener);

      atom.set(5);

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("notifies listener on value change via update", () => {
      const atom = createTestAtom(0);
      const listener = vi.fn();
      atom.subscribe(listener);

      atom.update(v => v + 1);

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("unsubscribes correctly", () => {
      const atom = createTestAtom(0);
      const listener = vi.fn();
      const unsub = atom.subscribe(listener);

      atom.set(1);
      expect(listener).toHaveBeenCalledTimes(1);

      unsub();
      atom.set(2);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("tracks subscriber count", () => {
      const atom = createTestAtom(0);
      expect(atom.subscriberCount).toBe(0);

      const unsub = atom.subscribe(vi.fn());
      expect(atom.subscriberCount).toBe(1);

      unsub();
      expect(atom.subscriberCount).toBe(0);
    });
  });

  describe("complex types", () => {
    it("handles object values", () => {
      const atom = createAtomServiceImpl<{ x: number; y: number }>({
        portName: "Position",
        containerName: "test",
        initial: { x: 0, y: 0 },
      });

      atom.set({ x: 10, y: 20 });
      expect(atom.value).toEqual({ x: 10, y: 20 });
    });
  });

  describe("disposal", () => {
    it("throws on value access after disposal", () => {
      const atom = createTestAtom(0);
      atom.dispose();
      expectTaggedThrow(() => atom.value, "DisposedStateAccess");
    });

    it("throws on set after disposal", () => {
      const atom = createTestAtom(0);
      atom.dispose();
      expectTaggedThrow(() => atom.set(1), "DisposedStateAccess");
    });

    it("throws on update after disposal", () => {
      const atom = createTestAtom(0);
      atom.dispose();
      expectTaggedThrow(() => atom.update(v => v + 1), "DisposedStateAccess");
    });

    it("throws on subscribe after disposal", () => {
      const atom = createTestAtom(0);
      atom.dispose();
      expectTaggedThrow(() => atom.subscribe(vi.fn()), "DisposedStateAccess");
    });
  });
});
