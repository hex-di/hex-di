/**
 * Extended tests for src/util/memo-map.ts
 * Covers surviving mutations: timestamps, resolution ordering, parent delegation, wrong port lookups.
 */
import { describe, it, expect, vi } from "vitest";
import { MemoMap } from "../src/util/memo-map.js";
import { port } from "@hex-di/core";

// Test ports
const PortA = port<string>()({ name: "PortA" });
const PortB = port<number>()({ name: "PortB" });
const PortC = port<boolean>()({ name: "PortC" });

describe("MemoMap extended", () => {
  describe("timestamps", () => {
    it("captures timestamps when captureTimestamps is not set (default true)", () => {
      const memo = new MemoMap(undefined, {});
      const beforeTime = Date.now();
      memo.getOrElseMemoize(PortA, () => "value", undefined);
      const afterTime = Date.now();

      const entries = [...memo.entries()];
      expect(entries).toHaveLength(1);
      const [, metadata] = entries[0];
      expect(metadata.resolvedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(metadata.resolvedAt).toBeLessThanOrEqual(afterTime);
    });

    it("captures timestamps when captureTimestamps is true", () => {
      const memo = new MemoMap(undefined, { captureTimestamps: true });
      memo.getOrElseMemoize(PortA, () => "value", undefined);

      const entries = [...memo.entries()];
      const [, metadata] = entries[0];
      expect(metadata.resolvedAt).toBeGreaterThan(0);
    });

    it("sets resolvedAt to 0 when captureTimestamps is false", () => {
      const memo = new MemoMap(undefined, { captureTimestamps: false });
      memo.getOrElseMemoize(PortA, () => "value", undefined);

      const entries = [...memo.entries()];
      const [, metadata] = entries[0];
      expect(metadata.resolvedAt).toBe(0);
    });
  });

  describe("resolution ordering", () => {
    it("tracks resolution order sequentially", () => {
      const memo = new MemoMap();
      memo.getOrElseMemoize(PortA, () => "a", undefined);
      memo.getOrElseMemoize(PortB, () => 42, undefined);
      memo.getOrElseMemoize(PortC, () => true, undefined);

      const entries = [...memo.entries()];
      expect(entries[0][1].resolutionOrder).toBe(0);
      expect(entries[1][1].resolutionOrder).toBe(1);
      expect(entries[2][1].resolutionOrder).toBe(2);
    });

    it("increments counter, not decrements", () => {
      const memo = new MemoMap();
      memo.getOrElseMemoize(PortA, () => "a", undefined);
      memo.getOrElseMemoize(PortB, () => 42, undefined);

      const entries = [...memo.entries()];
      expect(entries[1][1].resolutionOrder).toBeGreaterThan(entries[0][1].resolutionOrder);
    });
  });

  describe("cache behavior with different ports", () => {
    it("returns correct value for the matching port", () => {
      const memo = new MemoMap();
      memo.getOrElseMemoize(PortA, () => "valueA", undefined);
      memo.getOrElseMemoize(PortB, () => 42, undefined);

      // Looking up PortA should return "valueA", not any other value
      const resultA = memo.getOrElseMemoize(PortA, () => "different", undefined);
      expect(resultA).toBe("valueA");

      const resultB = memo.getOrElseMemoize(PortB, () => 999, undefined);
      expect(resultB).toBe(42);
    });

    it("does not return cached value for a different port", () => {
      const memo = new MemoMap();
      memo.getOrElseMemoize(PortA, () => "valueA", undefined);

      // PortB should call factory since it's a different port
      const factory = vi.fn(() => 42);
      const result = memo.getOrElseMemoize(PortB, factory, undefined);
      expect(factory).toHaveBeenCalledOnce();
      expect(result).toBe(42);
    });
  });

  describe("parent delegation in getIfPresent", () => {
    it("returns value from parent when not in child", () => {
      const parent = new MemoMap();
      parent.getOrElseMemoize(PortA, () => "parentValue", undefined);

      const child = new MemoMap(parent);
      const result = child.getIfPresent(PortA);
      expect(result).toBe("parentValue");
    });

    it("returns undefined when port is in neither child nor parent", () => {
      const parent = new MemoMap();
      const child = new MemoMap(parent);
      const result = child.getIfPresent(PortA);
      expect(result).toBeUndefined();
    });

    it("returns child value when port is in both child and parent", () => {
      const parent = new MemoMap();
      parent.getOrElseMemoize(PortA, () => "parentValue", undefined);

      const child = new MemoMap(parent);
      child.memoizeOwn(PortA, () => "childValue", undefined);

      const result = child.getIfPresent(PortA);
      expect(result).toBe("childValue");
    });
  });

  describe("memoizeOwn", () => {
    it("does NOT check parent cache", () => {
      const parent = new MemoMap();
      parent.getOrElseMemoize(PortA, () => "parentValue", undefined);

      const child = new MemoMap(parent);
      const result = child.memoizeOwn(PortA, () => "childValue", undefined);
      expect(result).toBe("childValue");
    });

    it("returns cached value on second call", () => {
      const memo = new MemoMap();
      memo.memoizeOwn(PortA, () => "first", undefined);
      const result = memo.memoizeOwn(PortA, () => "second", undefined);
      expect(result).toBe("first");
    });

    it("tracks timestamps with captureTimestamps false", () => {
      const memo = new MemoMap(undefined, { captureTimestamps: false });
      memo.memoizeOwn(PortA, () => "value", undefined);
      const entries = [...memo.entries()];
      expect(entries[0][1].resolvedAt).toBe(0);
    });
  });

  describe("getOrElseMemoizeAsync", () => {
    it("delegates to parent on cache hit", async () => {
      const parent = new MemoMap();
      parent.getOrElseMemoize(PortA, () => "parentValue", undefined);

      const child = new MemoMap(parent);
      const result = await child.getOrElseMemoizeAsync(PortA, async () => "childValue", undefined);
      expect(result).toBe("parentValue");
    });

    it("returns cached value without calling factory", async () => {
      const memo = new MemoMap();
      memo.getOrElseMemoize(PortA, () => "cached", undefined);

      const factory = vi.fn(async () => "new");
      const result = await memo.getOrElseMemoizeAsync(PortA, factory, undefined);
      expect(result).toBe("cached");
      expect(factory).not.toHaveBeenCalled();
    });

    it("creates new instance with async factory", async () => {
      const memo = new MemoMap();
      const result = await memo.getOrElseMemoizeAsync(PortA, async () => "asyncValue", undefined);
      expect(result).toBe("asyncValue");
    });

    it("sets resolvedAt to 0 when captureTimestamps is false", async () => {
      const memo = new MemoMap(undefined, { captureTimestamps: false });
      await memo.getOrElseMemoizeAsync(PortA, async () => "value", undefined);
      const entries = [...memo.entries()];
      expect(entries[0][1].resolvedAt).toBe(0);
    });
  });

  describe("has with parent", () => {
    it("checks parent cache when own cache misses", () => {
      const parent = new MemoMap();
      parent.getOrElseMemoize(PortA, () => "parentValue", undefined);

      const child = new MemoMap(parent);
      expect(child.has(PortA)).toBe(true);
      expect(child.has(PortB)).toBe(false);
    });
  });

  describe("fork", () => {
    it("creates a child that inherits parent's config", () => {
      const parent = new MemoMap(undefined, { captureTimestamps: false });
      const child = parent.fork();
      child.getOrElseMemoize(PortA, () => "value", undefined);

      const entries = [...child.entries()];
      expect(entries[0][1].resolvedAt).toBe(0);
    });
  });

  describe("dispose", () => {
    it("calls finalizers in LIFO order", async () => {
      const order: string[] = [];
      const memo = new MemoMap();

      memo.getOrElseMemoize(
        PortA,
        () => "a",
        () => {
          order.push("a");
        }
      );
      memo.getOrElseMemoize(
        PortB,
        () => 42,
        () => {
          order.push("b");
        }
      );
      memo.getOrElseMemoize(
        PortC,
        () => true,
        () => {
          order.push("c");
        }
      );

      await memo.dispose();

      expect(order).toEqual(["c", "b", "a"]);
    });

    it("sets isDisposed to true", async () => {
      const memo = new MemoMap();
      expect(memo.isDisposed).toBe(false);
      await memo.dispose();
      expect(memo.isDisposed).toBe(true);
    });

    it("aggregates finalizer errors", async () => {
      const memo = new MemoMap();
      memo.getOrElseMemoize(
        PortA,
        () => "a",
        () => {
          throw new Error("fail1");
        }
      );
      memo.getOrElseMemoize(
        PortB,
        () => 42,
        () => {
          throw new Error("fail2");
        }
      );

      await expect(memo.dispose()).rejects.toThrow(AggregateError);
    });

    it("clears cache after disposal", async () => {
      const memo = new MemoMap();
      memo.getOrElseMemoize(PortA, () => "a", undefined);
      expect(memo.has(PortA)).toBe(true);

      await memo.dispose();
      expect(memo.has(PortA)).toBe(false);
    });
  });

  describe("default config", () => {
    it("uses empty config when none provided", () => {
      const memo = new MemoMap();
      memo.getOrElseMemoize(PortA, () => "value", undefined);
      const entries = [...memo.entries()];
      // Default captureTimestamps is not false, so resolvedAt should be > 0
      expect(entries[0][1].resolvedAt).toBeGreaterThan(0);
    });
  });
});
