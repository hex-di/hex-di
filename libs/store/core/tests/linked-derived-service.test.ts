/**
 * LinkedDerivedService implementation tests
 */

import { describe, it, expect, vi } from "vitest";
import { createLinkedDerivedServiceImpl } from "../src/services/linked-derived-service-impl.js";
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

describe("LinkedDerivedService", () => {
  describe("read (select)", () => {
    it("computes initial value from select", () => {
      const celsius = createSignal(0);
      const linked = createLinkedDerivedServiceImpl<number>({
        portName: "Fahrenheit",
        containerName: "test",
        select: () => (celsius.get() * 9) / 5 + 32,
        write: f => celsius.set(((f - 32) * 5) / 9),
      });

      expect(linked.value).toBe(32); // 0C = 32F
    });

    it("recomputes when source changes", () => {
      const celsius = createSignal(0);
      const linked = createLinkedDerivedServiceImpl<number>({
        portName: "Fahrenheit",
        containerName: "test",
        select: () => (celsius.get() * 9) / 5 + 32,
        write: f => celsius.set(((f - 32) * 5) / 9),
      });

      celsius.set(100);
      expect(linked.value).toBe(212); // 100C = 212F
    });
  });

  describe("write (set)", () => {
    it("calls write function when set is called", () => {
      const celsius = createSignal(0);
      const linked = createLinkedDerivedServiceImpl<number>({
        portName: "Fahrenheit",
        containerName: "test",
        select: () => (celsius.get() * 9) / 5 + 32,
        write: f => celsius.set(((f - 32) * 5) / 9),
      });

      linked.set(212); // Set to 212F
      expect(celsius.get()).toBeCloseTo(100); // Should convert to 100C
    });

    it("set is referentially stable", () => {
      const linked = createLinkedDerivedServiceImpl<number>({
        portName: "Test",
        containerName: "test",
        select: () => 0,
        write: () => {},
      });

      expect(linked.set).toBe(linked.set);
    });
  });

  describe("subscribe", () => {
    it("notifies on changes", () => {
      const source = createSignal(5);
      const linked = createLinkedDerivedServiceImpl<number>({
        portName: "Double",
        containerName: "test",
        select: () => source.get() * 2,
        write: v => source.set(v / 2),
      });

      const listener = vi.fn();
      linked.subscribe(listener);

      source.set(10);

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("tracks subscriber count", () => {
      const linked = createLinkedDerivedServiceImpl<number>({
        portName: "Test",
        containerName: "test",
        select: () => 42,
        write: () => {},
      });

      expect(linked.subscriberCount).toBe(0);
      const unsub = linked.subscribe(vi.fn());
      expect(linked.subscriberCount).toBe(1);
      unsub();
      expect(linked.subscriberCount).toBe(0);
    });
  });

  describe("error handling", () => {
    it("throws DerivedComputationError when select throws on value access", () => {
      // computed() is lazy -- error occurs when .value is first accessed
      const linked = createLinkedDerivedServiceImpl<number>({
        portName: "Broken",
        containerName: "test",
        select: () => {
          throw new Error("broken");
        },
        write: () => {},
      });

      expectTaggedThrow(() => linked.value, "DerivedComputationFailed");
    });
  });

  describe("disposal", () => {
    it("throws on value access after disposal", () => {
      const linked = createLinkedDerivedServiceImpl<number>({
        portName: "Test",
        containerName: "test",
        select: () => 42,
        write: () => {},
      });

      linked.dispose();
      expectTaggedThrow(() => linked.value, "DisposedStateAccess");
    });

    it("throws on set after disposal", () => {
      const linked = createLinkedDerivedServiceImpl<number>({
        portName: "Test",
        containerName: "test",
        select: () => 42,
        write: () => {},
      });

      linked.dispose();
      expectTaggedThrow(() => linked.set(0), "DisposedStateAccess");
    });
  });
});
