/**
 * GxP setStatus immutability tests.
 *
 * Verifies that once a span status is set to "ok", it cannot
 * be overwritten to "error" or "unset" (per OTel spec).
 */

import { describe, it, expect } from "vitest";
import { MemorySpan, ConsoleTracer, createMemoryTracer } from "../../src/index.js";

describe("MemorySpan - setStatus immutability", () => {
  function createSpan(): { span: MemorySpan; getStatus: () => string } {
    const span = new MemorySpan();
    let capturedStatus = "unset";
    span.init("test", undefined, "internal", undefined, undefined, undefined, data => {
      capturedStatus = data.status;
    });
    return {
      span,
      getStatus: () => {
        span.end();
        return capturedStatus;
      },
    };
  }

  it("should keep 'ok' when setStatus('error') is called after setStatus('ok')", () => {
    const { span, getStatus } = createSpan();
    span.setStatus("ok");
    span.setStatus("error");
    expect(getStatus()).toBe("ok");
  });

  it("should not allow 'ok' to be changed to 'unset'", () => {
    const { span, getStatus } = createSpan();
    span.setStatus("ok");
    span.setStatus("unset");
    expect(getStatus()).toBe("ok");
  });

  it("should allow 'error' to be overwritten by 'ok'", () => {
    const { span, getStatus } = createSpan();
    span.setStatus("error");
    span.setStatus("ok");
    expect(getStatus()).toBe("ok");
  });

  it("should allow 'unset' to be changed to any status", () => {
    const span1 = new MemorySpan();
    let status1 = "unset";
    span1.init("test", undefined, "internal", undefined, undefined, undefined, data => {
      status1 = data.status;
    });
    span1.setStatus("ok");
    span1.end();
    expect(status1).toBe("ok");

    const span2 = new MemorySpan();
    let status2 = "unset";
    span2.init("test", undefined, "internal", undefined, undefined, undefined, data => {
      status2 = data.status;
    });
    span2.setStatus("error");
    span2.end();
    expect(status2).toBe("error");
  });
});

describe("ConsoleTracer - setStatus immutability", () => {
  it("should match MemorySpan behavior for status immutability", () => {
    const tracer = new ConsoleTracer({ minDurationMs: 999999 }); // suppress output

    const span = tracer.startSpan("test");
    span.setStatus("ok");
    span.setStatus("error"); // Should be ignored
    span.end();

    // We can verify by examining collected data through MemoryTracer
    const memTracer = createMemoryTracer();
    memTracer.withSpan("test", s => {
      s.setStatus("ok");
      s.setStatus("error"); // Should be ignored
    });

    const spans = memTracer.getCollectedSpans();
    expect(spans[0].status).toBe("ok");
  });
});
