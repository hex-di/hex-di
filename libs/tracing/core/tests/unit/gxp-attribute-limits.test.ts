/**
 * GxP attribute size limit tests.
 *
 * Verifies MAX_KEY_LENGTH and MAX_VALUE_LENGTH enforcement
 * on span attributes at write time.
 */

import { describe, it, expect } from "vitest";
import { MemorySpan } from "../../src/index.js";

describe("MemorySpan - attribute size limits", () => {
  function createActiveSpan(): MemorySpan {
    const span = new MemorySpan();
    span.init("test", undefined, "internal", undefined, undefined, undefined, () => {});
    return span;
  }

  it("should silently drop attribute with key exceeding MAX_KEY_LENGTH (256)", () => {
    const span = createActiveSpan();
    const longKey = "k".repeat(257);
    span.setAttribute(longKey, "value");
    span.setAttribute("short", "ok");

    // End span to get SpanData
    let captured: Record<string, unknown> = {};
    const span2 = new MemorySpan();
    span2.init("test", undefined, "internal", undefined, undefined, undefined, data => {
      captured = data.attributes;
    });
    span2.setAttribute("k".repeat(257), "dropped");
    span2.setAttribute("short", "kept");
    span2.end();

    expect(captured["short"]).toBe("kept");
    expect(captured["k".repeat(257)]).toBeUndefined();
  });

  it("should truncate string values exceeding MAX_VALUE_LENGTH (4096)", () => {
    const span = new MemorySpan();
    let captured: Record<string, unknown> = {};
    span.init("test", undefined, "internal", undefined, undefined, undefined, data => {
      captured = data.attributes;
    });

    const longValue = "v".repeat(5000);
    span.setAttribute("key", longValue);
    span.end();

    const result = captured["key"] as string;
    expect(result).toContain("[TRUNCATED]");
    expect(result.length).toBeLessThan(5000);
    expect(result.length).toBe(4096 + "[TRUNCATED]".length);
  });

  it("should not affect number and boolean values", () => {
    const span = new MemorySpan();
    let captured: Record<string, unknown> = {};
    span.init("test", undefined, "internal", undefined, undefined, undefined, data => {
      captured = data.attributes;
    });

    span.setAttribute("count", 999999);
    span.setAttribute("active", true);
    span.end();

    expect(captured["count"]).toBe(999999);
    expect(captured["active"]).toBe(true);
  });

  it("should not truncate array values at span level", () => {
    const span = new MemorySpan();
    let captured: Record<string, unknown> = {};
    span.init("test", undefined, "internal", undefined, undefined, undefined, data => {
      captured = data.attributes;
    });

    const longArray = Array.from({ length: 200 }, (_, i) => `item-${i}`);
    span.setAttributes({ tags: longArray });
    span.end();

    // Span-level does not truncate arrays (that's the filter's job)
    const tags = captured["tags"];
    expect(Array.isArray(tags)).toBe(true);
    expect((tags as string[]).length).toBe(200);
  });
});
