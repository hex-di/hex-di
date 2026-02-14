/**
 * GxP annotation validation tests.
 *
 * Verifies sanitizeAnnotations handles non-serializable values,
 * circular references, depth limits, key limits, and type coercion.
 */

import { describe, it, expect } from "vitest";
import { sanitizeAnnotations } from "../../src/utils/validation.js";

describe("sanitizeAnnotations", () => {
  it("should replace function values with placeholder string", () => {
    const result = sanitizeAnnotations({ callback: () => {} });
    expect(result.callback).toBe("[non-serializable: function]");
  });

  it("should replace symbol values with placeholder string", () => {
    const result = sanitizeAnnotations({ tag: Symbol("test") });
    expect(result.tag).toBe("[non-serializable: symbol]");
  });

  it("should convert BigInt values to string", () => {
    const result = sanitizeAnnotations({ id: BigInt(9007199254740991) });
    expect(result.id).toBe("9007199254740991");
  });

  it("should detect and replace circular references", () => {
    const obj: Record<string, unknown> = { name: "test" };
    obj.self = obj;
    const result = sanitizeAnnotations({ nested: obj });
    const nested = result.nested as Record<string, unknown>;
    expect(nested.name).toBe("test");
    expect(nested.self).toBe("[circular reference]");
  });

  it("should convert undefined values to null", () => {
    const result = sanitizeAnnotations({ key: undefined });
    expect(result.key).toBeNull();
  });

  it("should truncate objects exceeding max depth", () => {
    const deep: Record<string, unknown> = { level: 0 };
    let current = deep;
    for (let i = 1; i <= 15; i++) {
      const child: Record<string, unknown> = { level: i };
      current.child = child;
      current = child;
    }
    const result = sanitizeAnnotations({ root: deep }, { maxDepth: 5, maxKeys: 1000 });
    let node = result.root as Record<string, unknown>;
    let depth = 0;
    while (node && typeof node === "object" && node.child && typeof node.child === "object") {
      node = node.child as Record<string, unknown>;
      depth++;
    }
    expect(depth).toBeLessThan(15);
  });

  it("should truncate objects exceeding max keys", () => {
    const manyKeys: Record<string, unknown> = {};
    for (let i = 0; i < 200; i++) {
      manyKeys[`key${i}`] = `value${i}`;
    }
    const result = sanitizeAnnotations(manyKeys, { maxDepth: 10, maxKeys: 50 });
    const keys = Object.keys(result);
    expect(keys.length).toBeLessThanOrEqual(51);
  });

  it("should pass valid annotations through unchanged", () => {
    const input = { name: "test", count: 42, active: true, tags: ["a", "b"] };
    const result = sanitizeAnnotations(input);
    expect(result).toEqual(input);
  });

  it("should pass empty annotations through unchanged", () => {
    const result = sanitizeAnnotations({});
    expect(result).toEqual({});
  });

  it("should preserve valid values while stripping invalid ones", () => {
    const result = sanitizeAnnotations({
      name: "valid",
      count: 42,
      callback: () => {},
      symbol: Symbol("x"),
      deep: { nested: true },
    });
    expect(result.name).toBe("valid");
    expect(result.count).toBe(42);
    expect(result.callback).toBe("[non-serializable: function]");
    expect(result.symbol).toBe("[non-serializable: symbol]");
    expect(result.deep).toEqual({ nested: true });
  });
});
