/**
 * Path Tracking Tests
 *
 * Tests createTrackingProxy, trackSelector, and hasPathChanged.
 */

import { describe, expect, it } from "vitest";
import { createTrackingProxy, trackSelector, hasPathChanged } from "../src/index.js";

// =============================================================================
// createTrackingProxy
// =============================================================================

describe("createTrackingProxy", () => {
  it("records top-level property access", () => {
    const state = { name: "Alice", age: 30 };
    const { proxy, paths } = createTrackingProxy(state);

    void proxy.name;

    expect(paths.has("name")).toBe(true);
    expect(paths.has("age")).toBe(false);
  });

  it("records nested property access as dot-delimited paths", () => {
    const state = { user: { profile: { name: "Alice" } } };
    const { proxy, paths } = createTrackingProxy(state);

    void proxy.user.profile.name;

    expect(paths.has("user")).toBe(true);
    expect(paths.has("user.profile")).toBe(true);
    expect(paths.has("user.profile.name")).toBe(true);
  });

  it("records array index access", () => {
    const state = { items: ["a", "b", "c"] };
    const { proxy, paths } = createTrackingProxy(state);

    void proxy.items[1];

    expect(paths.has("items")).toBe(true);
    expect(paths.has("items.1")).toBe(true);
  });

  it("deduplicates paths when accessed multiple times", () => {
    const state = { count: 0 };
    const { proxy, paths } = createTrackingProxy(state);

    void proxy.count;
    void proxy.count;
    void proxy.count;

    expect(paths.size).toBe(1);
    expect(paths.has("count")).toBe(true);
  });

  it("ignores symbol key access", () => {
    const sym = Symbol("test");
    const state = { [sym]: "secret", visible: "yes" };
    const { proxy, paths } = createTrackingProxy(state);

    void (proxy as Record<symbol, unknown>)[sym];
    void proxy.visible;

    // Only string key tracked
    expect(paths.size).toBe(1);
    expect(paths.has("visible")).toBe(true);
  });

  it("handles null intermediate values gracefully", () => {
    const state = { nested: null as { deep: string } | null };
    const { proxy, paths } = createTrackingProxy(state);

    // Accessing nested tracks it, but the value is null so no child proxy
    const val = proxy.nested;
    expect(val).toBe(null);
    expect(paths.has("nested")).toBe(true);
  });

  it("works on frozen objects (tracks access, respects Proxy invariants)", () => {
    const state = Object.freeze({ x: 1, y: Object.freeze({ z: 2 }) });
    const { proxy, paths } = createTrackingProxy(state);

    // Accessing a frozen nested object: tracks the path to `y` but
    // cannot wrap the non-configurable value in a child proxy, so
    // deep access (y.z) won't be tracked through the proxy.
    const yVal = proxy.y;
    void yVal.z;

    expect(paths.has("y")).toBe(true);
    // Deep path not tracked because y is non-configurable
    // But the access still works and returns the correct value
    expect(yVal.z).toBe(2);
  });

  it("returns primitive values unchanged through proxy", () => {
    const state = { count: 42, label: "test", active: true };
    const { proxy } = createTrackingProxy(state);

    expect(proxy.count).toBe(42);
    expect(proxy.label).toBe("test");
    expect(proxy.active).toBe(true);
  });
});

// =============================================================================
// trackSelector
// =============================================================================

describe("trackSelector", () => {
  it("returns selector value and tracked paths", () => {
    const state = { user: { name: "Alice" }, count: 5 };
    const result = trackSelector(state, s => s.user.name);

    expect(result.value).toBe("Alice");
    expect(result.paths.has("user")).toBe(true);
    expect(result.paths.has("user.name")).toBe(true);
    expect(result.paths.has("count")).toBe(false);
  });

  it("tracks all paths for a computed selector", () => {
    const state = { a: 1, b: 2, c: 3 };
    const result = trackSelector(state, s => s.a + s.b);

    expect(result.value).toBe(3);
    expect(result.paths.has("a")).toBe(true);
    expect(result.paths.has("b")).toBe(true);
    expect(result.paths.has("c")).toBe(false);
  });

  it("handles selector returning object", () => {
    const state = { x: 1, y: 2, z: 3 };
    const result = trackSelector(state, s => ({ sum: s.x + s.y }));

    expect(result.value).toEqual({ sum: 3 });
    expect(result.paths.has("x")).toBe(true);
    expect(result.paths.has("y")).toBe(true);
  });
});

// =============================================================================
// hasPathChanged
// =============================================================================

describe("hasPathChanged", () => {
  it("returns false when tracked paths have same values", () => {
    const prev = { a: 1, b: 2, c: 3 };
    const next = { a: 1, b: 2, c: 99 };
    const paths = new Set(["a", "b"]);

    expect(hasPathChanged(prev, next, paths)).toBe(false);
  });

  it("returns true when a tracked path has changed", () => {
    const prev = { a: 1, b: 2 };
    const next = { a: 1, b: 5 };
    const paths = new Set(["a", "b"]);

    expect(hasPathChanged(prev, next, paths)).toBe(true);
  });

  it("handles nested path comparison", () => {
    const prev = { user: { name: "Alice", age: 30 } };
    const next = { user: { name: "Alice", age: 31 } };

    expect(hasPathChanged(prev, next, new Set(["user.name"]))).toBe(false);
    expect(hasPathChanged(prev, next, new Set(["user.age"]))).toBe(true);
  });

  it("uses Object.is semantics (NaN === NaN)", () => {
    const prev = { val: NaN };
    const next = { val: NaN };

    expect(hasPathChanged(prev, next, new Set(["val"]))).toBe(false);
  });

  it("uses Object.is semantics (+0 !== -0)", () => {
    const prev = { val: +0 };
    const next = { val: -0 };

    expect(hasPathChanged(prev, next, new Set(["val"]))).toBe(true);
  });

  it("returns false for empty paths set", () => {
    const prev = { a: 1 };
    const next = { a: 2 };

    expect(hasPathChanged(prev, next, new Set())).toBe(false);
  });

  it("handles undefined intermediate paths gracefully", () => {
    const prev = { a: { b: 1 } };
    const next = { a: undefined } as { a: { b: number } | undefined };

    expect(hasPathChanged(prev, next, new Set(["a.b"]))).toBe(true);
  });
});
