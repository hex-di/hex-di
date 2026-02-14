/**
 * Tests for the TracerLike bridge module.
 *
 * Covers:
 * - createTracerLikeAdapter: pushSpan → startSpan, popSpan → pop/end/setStatus
 * - TracerLikePort: correct name and direction
 * - tracerLikeAdapter: correct provides/requires/lifetime
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPortMetadata } from "@hex-di/core";
import {
  createTracerLikeAdapter,
  TracerLikePort,
  tracerLikeAdapter,
} from "../../../src/bridge/index.js";
import { TracerPort } from "../../../src/ports/index.js";
import type { Tracer } from "../../../src/ports/index.js";
import type { Span } from "../../../src/types/index.js";

// =============================================================================
// Helpers
// =============================================================================

function createMockSpan(): Span {
  return {
    context: {
      traceId: "00000000000000000000000000000001",
      spanId: "0000000000000001",
      traceFlags: 1,
    },
    setAttribute: vi.fn(),
    setAttributes: vi.fn(),
    addEvent: vi.fn(),
    setStatus: vi.fn(),
    recordException: vi.fn(),
    end: vi.fn(),
    isRecording: vi.fn(() => true),
  };
}

function createMockTracer(spans: Span[]): Tracer {
  let idx = 0;
  return {
    startSpan: vi.fn(() => {
      const span = spans[idx] ?? createMockSpan();
      idx++;
      return span;
    }),
    withSpan: vi.fn(),
    withSpanAsync: vi.fn(),
    getActiveSpan: vi.fn(() => undefined),
    getSpanContext: vi.fn(() => undefined),
    withAttributes: vi.fn(),
    isEnabled: vi.fn(() => true),
  };
}

// =============================================================================
// createTracerLikeAdapter
// =============================================================================

describe("createTracerLikeAdapter", () => {
  let span1: Span;
  let span2: Span;
  let tracer: Tracer;

  beforeEach(() => {
    span1 = createMockSpan();
    span2 = createMockSpan();
    tracer = createMockTracer([span1, span2]);
  });

  it("pushSpan calls tracer.startSpan with name and attributes", () => {
    const adapter = createTracerLikeAdapter(tracer);
    adapter.pushSpan("test-span", { key: "value" });

    expect(tracer.startSpan).toHaveBeenCalledWith("test-span", {
      attributes: { key: "value" },
    });
  });

  it("popSpan pops the last span, sets status, and ends it", () => {
    const adapter = createTracerLikeAdapter(tracer);
    adapter.pushSpan("span-1");
    adapter.popSpan("ok");

    expect(span1.setStatus).toHaveBeenCalledWith("ok");
    expect(span1.end).toHaveBeenCalled();
  });

  it("popSpan with error status sets error", () => {
    const adapter = createTracerLikeAdapter(tracer);
    adapter.pushSpan("span-1");
    adapter.popSpan("error");

    expect(span1.setStatus).toHaveBeenCalledWith("error");
    expect(span1.end).toHaveBeenCalled();
  });

  it("popSpan on empty stack is a no-op", () => {
    const adapter = createTracerLikeAdapter(tracer);
    // Should not throw
    adapter.popSpan("ok");
    expect(span1.end).not.toHaveBeenCalled();
  });

  it("LIFO nesting: inner span is popped before outer", () => {
    const adapter = createTracerLikeAdapter(tracer);

    adapter.pushSpan("outer");
    adapter.pushSpan("inner");

    adapter.popSpan("ok"); // pops inner (span2)
    expect(span2.setStatus).toHaveBeenCalledWith("ok");
    expect(span2.end).toHaveBeenCalled();

    adapter.popSpan("error"); // pops outer (span1)
    expect(span1.setStatus).toHaveBeenCalledWith("error");
    expect(span1.end).toHaveBeenCalled();
  });

  it("pushSpan without attributes passes undefined", () => {
    const adapter = createTracerLikeAdapter(tracer);
    adapter.pushSpan("no-attrs");

    expect(tracer.startSpan).toHaveBeenCalledWith("no-attrs", {
      attributes: undefined,
    });
  });
});

// =============================================================================
// TracerLikePort
// =============================================================================

describe("TracerLikePort", () => {
  it("has correct port name", () => {
    expect(TracerLikePort.__portName).toBe("TracerLike");
  });
});

// =============================================================================
// tracerLikeAdapter
// =============================================================================

describe("tracerLikeAdapter", () => {
  it("provides TracerLikePort", () => {
    expect(tracerLikeAdapter.provides.__portName).toBe(TracerLikePort.__portName);
  });

  it("requires TracerPort", () => {
    expect(tracerLikeAdapter.requires).toHaveLength(1);
    expect(tracerLikeAdapter.requires[0].__portName).toBe(TracerPort.__portName);
  });

  it("has singleton lifetime", () => {
    expect(tracerLikeAdapter.lifetime).toBe("singleton");
  });
});

describe("TracerLikePort metadata category for library detection", () => {
  it("TracerLikePort sets category to tracing/bridge", () => {
    expect(getPortMetadata(TracerLikePort)?.category).toBe("tracing/bridge");
  });
});
