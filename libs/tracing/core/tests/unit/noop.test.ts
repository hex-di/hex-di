/**
 * Tests for the NoOp tracer adapter.
 *
 * Verifies zero-overhead behavior:
 * - Singleton span reuse (no allocations)
 * - isRecording() returns false
 * - withAttributes returns same tracer instance
 * - All mutation methods return same span instance
 * - withSpan/withSpanAsync execute functions correctly
 */

import { describe, it, expect } from "vitest";
import { NOOP_TRACER, NOOP_SPAN, NoOpTracerAdapter } from "../../src/index.js";

describe("NOOP_SPAN", () => {
  it("should return false for isRecording()", () => {
    expect(NOOP_SPAN.isRecording()).toBe(false);
  });

  it("should have all-zeros span context", () => {
    expect(NOOP_SPAN.context.traceId).toBe("00000000000000000000000000000000");
    expect(NOOP_SPAN.context.spanId).toBe("0000000000000000");
    expect(NOOP_SPAN.context.traceFlags).toBe(0);
  });

  it("should return same span instance from setAttribute", () => {
    const result = NOOP_SPAN.setAttribute("key", "value");
    expect(result).toBe(NOOP_SPAN);
  });

  it("should return same span instance from setAttributes", () => {
    const result = NOOP_SPAN.setAttributes({ key: "value" });
    expect(result).toBe(NOOP_SPAN);
  });

  it("should return same span instance from addEvent", () => {
    const result = NOOP_SPAN.addEvent({ name: "test", time: Date.now() });
    expect(result).toBe(NOOP_SPAN);
  });

  it("should return same span instance from setStatus", () => {
    const result = NOOP_SPAN.setStatus("ok");
    expect(result).toBe(NOOP_SPAN);
  });

  it("should return same span instance from recordException", () => {
    const result = NOOP_SPAN.recordException(new Error("test"));
    expect(result).toBe(NOOP_SPAN);
  });

  it("should be frozen (immutable)", () => {
    expect(Object.isFrozen(NOOP_SPAN)).toBe(true);
  });

  it("should have frozen context", () => {
    expect(Object.isFrozen(NOOP_SPAN.context)).toBe(true);
  });

  it("end() should be a no-op and not throw", () => {
    expect(() => NOOP_SPAN.end()).not.toThrow();
    expect(() => NOOP_SPAN.end(Date.now())).not.toThrow();
  });
});

describe("NOOP_TRACER", () => {
  it("should return NOOP_SPAN from startSpan", () => {
    const span = NOOP_TRACER.startSpan("test-span");
    expect(span).toBe(NOOP_SPAN);
  });

  it("should execute function in withSpan and return result", () => {
    const result = NOOP_TRACER.withSpan("test", span => {
      expect(span).toBe(NOOP_SPAN);
      return 42;
    });
    expect(result).toBe(42);
  });

  it("should execute async function in withSpanAsync and return result", async () => {
    const result = await NOOP_TRACER.withSpanAsync("test", async span => {
      expect(span).toBe(NOOP_SPAN);
      return "async-result";
    });
    expect(result).toBe("async-result");
  });

  it("should return undefined from getActiveSpan", () => {
    expect(NOOP_TRACER.getActiveSpan()).toBeUndefined();
  });

  it("should return undefined from getSpanContext", () => {
    expect(NOOP_TRACER.getSpanContext()).toBeUndefined();
  });

  it("should return same tracer instance from withAttributes", () => {
    const result = NOOP_TRACER.withAttributes({ "service.name": "test" });
    expect(result).toBe(NOOP_TRACER);
  });

  it("should be frozen (immutable)", () => {
    expect(Object.isFrozen(NOOP_TRACER)).toBe(true);
  });

  it("should propagate errors from withSpan", () => {
    expect(() => {
      NOOP_TRACER.withSpan("test", () => {
        throw new Error("expected error");
      });
    }).toThrow("expected error");
  });

  it("should propagate errors from withSpanAsync", async () => {
    await expect(
      NOOP_TRACER.withSpanAsync("test", async () => {
        throw new Error("expected async error");
      })
    ).rejects.toThrow("expected async error");
  });
});

describe("NoOpTracerAdapter", () => {
  it("should be defined", () => {
    expect(NoOpTracerAdapter).toBeDefined();
  });
});
