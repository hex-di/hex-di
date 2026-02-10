/**
 * Tests for src/container/helpers.ts
 */
import { describe, it, expect } from "vitest";
import {
  isDisposableChild,
  isInheritanceMode,
  shallowClone,
  createMemoMapSnapshot,
} from "../src/container/helpers.js";
import { MemoMap } from "../src/util/memo-map.js";
import { port } from "@hex-di/core";

describe("isDisposableChild", () => {
  it("returns true for object with dispose function and isDisposed", () => {
    const child = { dispose: () => Promise.resolve(), isDisposed: false };
    expect(isDisposableChild(child)).toBe(true);
  });

  it("returns true when isDisposed is true", () => {
    const child = { dispose: () => Promise.resolve(), isDisposed: true };
    expect(isDisposableChild(child)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isDisposableChild(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isDisposableChild(undefined)).toBe(false);
  });

  it("returns false for non-object", () => {
    expect(isDisposableChild("string")).toBe(false);
    expect(isDisposableChild(42)).toBe(false);
  });

  it("returns false for object without dispose", () => {
    expect(isDisposableChild({ isDisposed: false })).toBe(false);
  });

  it("returns false for object with non-function dispose", () => {
    expect(isDisposableChild({ dispose: "not-a-function", isDisposed: false })).toBe(false);
  });

  it("returns false for object without isDisposed", () => {
    expect(isDisposableChild({ dispose: () => {} })).toBe(false);
  });
});

describe("isInheritanceMode", () => {
  it("returns true for 'shared'", () => {
    expect(isInheritanceMode("shared")).toBe(true);
  });

  it("returns true for 'forked'", () => {
    expect(isInheritanceMode("forked")).toBe(true);
  });

  it("returns true for 'isolated'", () => {
    expect(isInheritanceMode("isolated")).toBe(true);
  });

  it("returns false for other strings", () => {
    expect(isInheritanceMode("transient")).toBe(false);
    expect(isInheritanceMode("singleton")).toBe(false);
    expect(isInheritanceMode("scoped")).toBe(false);
    expect(isInheritanceMode("")).toBe(false);
  });

  it("returns false for non-string values", () => {
    expect(isInheritanceMode(null)).toBe(false);
    expect(isInheritanceMode(undefined)).toBe(false);
    expect(isInheritanceMode(42)).toBe(false);
    expect(isInheritanceMode(true)).toBe(false);
  });
});

describe("shallowClone", () => {
  it("clones plain objects", () => {
    const original = { a: 1, b: "two", c: true };
    const clone = shallowClone(original);
    expect(clone).toEqual(original);
    expect(clone).not.toBe(original);
  });

  it("returns null for null input", () => {
    expect(shallowClone(null)).toBeNull();
  });

  it("returns primitives as-is for non-object types", () => {
    expect(shallowClone(42)).toBe(42);
    expect(shallowClone("hello")).toBe("hello");
    expect(shallowClone(true)).toBe(true);
    expect(shallowClone(undefined)).toBeUndefined();
  });

  it("preserves prototype chain", () => {
    class MyClass {
      value: number;
      constructor(value: number) {
        this.value = value;
      }
      getValue(): number {
        return this.value;
      }
    }
    const original = new MyClass(42);
    const clone = shallowClone(original);
    expect(clone.value).toBe(42);
    expect(clone.getValue()).toBe(42);
    expect(clone).toBeInstanceOf(MyClass);
    expect(clone).not.toBe(original);
  });

  it("creates shallow copy (nested objects are shared)", () => {
    const nested = { inner: true };
    const original = { nested };
    const clone = shallowClone(original);
    expect(clone.nested).toBe(nested); // Same reference
  });

  it("clones arrays (preserves prototype)", () => {
    const original = [1, 2, 3];
    const clone = shallowClone(original);
    expect(clone).not.toBe(original);
    // Clone preserves array-like structure
    expect(clone[0]).toBe(1);
    expect(clone[1]).toBe(2);
    expect(clone[2]).toBe(3);
  });
});

describe("createMemoMapSnapshot", () => {
  it("creates empty snapshot for empty memo", () => {
    const memo = new MemoMap();
    const snapshot = createMemoMapSnapshot(memo);
    expect(snapshot.size).toBe(0);
    expect(snapshot.entries).toHaveLength(0);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.entries)).toBe(true);
  });

  it("creates snapshot with entries", () => {
    const PortA = port<string>()({ name: "PortA" });
    const PortB = port<number>()({ name: "PortB" });
    const memo = new MemoMap();
    memo.getOrElseMemoize(PortA, () => "hello", undefined);
    memo.getOrElseMemoize(PortB, () => 42, undefined);

    const snapshot = createMemoMapSnapshot(memo);
    expect(snapshot.size).toBe(2);
    expect(snapshot.entries).toHaveLength(2);
    expect(snapshot.entries[0].portName).toBe("PortA");
    expect(snapshot.entries[0].port).toBe(PortA);
    expect(snapshot.entries[1].portName).toBe("PortB");
    expect(snapshot.entries[1].port).toBe(PortB);
  });

  it("entries are frozen", () => {
    const PortA = port<string>()({ name: "PortA" });
    const memo = new MemoMap();
    memo.getOrElseMemoize(PortA, () => "hello", undefined);

    const snapshot = createMemoMapSnapshot(memo);
    expect(Object.isFrozen(snapshot.entries[0])).toBe(true);
  });

  it("includes resolution metadata", () => {
    const PortA = port<string>()({ name: "PortA" });
    const memo = new MemoMap();
    memo.getOrElseMemoize(PortA, () => "hello", undefined);

    const snapshot = createMemoMapSnapshot(memo);
    expect(snapshot.entries[0].resolvedAt).toBeGreaterThan(0);
    expect(snapshot.entries[0].resolutionOrder).toBe(0);
  });
});
