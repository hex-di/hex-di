/**
 * Tests for the Console tracer adapter.
 *
 * Verifies:
 * - Console output formatting
 * - minDurationMs filtering
 * - Colorization (ANSI codes)
 * - Error handling and display
 * - Span hierarchy (indentation)
 * - ConsoleTracer API surface
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConsoleTracer, createConsoleTracer, ConsoleTracerAdapter } from "../../src/index.js";
import { formatSpan, formatDuration, colorize } from "../../src/adapters/console/formatter.js";
import type { SpanData } from "../../src/index.js";

describe("ConsoleTracer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("basic operations", () => {
    it("should create spans that log to console on end", () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const tracer = new ConsoleTracer({ colorize: false });
      tracer.withSpan("test-operation", span => {
        span.setAttribute("key", "value");
      });

      expect(logSpy).toHaveBeenCalled();
      const output = logSpy.mock.calls[0][0];
      expect(output).toContain("[TRACE]");
      expect(output).toContain("test-operation");
    });

    it("should handle withSpanAsync correctly", async () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const tracer = new ConsoleTracer({ colorize: false });
      const result = await tracer.withSpanAsync("async-op", async () => {
        return 42;
      });

      expect(result).toBe(42);
      expect(logSpy).toHaveBeenCalled();
    });

    it("should handle errors in withSpan", () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const tracer = new ConsoleTracer({ colorize: false });

      expect(() => {
        tracer.withSpan("failing", () => {
          throw new Error("test error");
        });
      }).toThrow("test error");

      expect(logSpy).toHaveBeenCalled();
      const output = logSpy.mock.calls[0][0];
      expect(output).toContain("test error");
    });

    it("should return undefined for getActiveSpan when no span active", () => {
      const tracer = new ConsoleTracer();
      expect(tracer.getActiveSpan()).toBeUndefined();
      expect(tracer.getSpanContext()).toBeUndefined();
    });
  });

  describe("minDurationMs filtering", () => {
    it("should filter out spans shorter than minDurationMs", () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const tracer = new ConsoleTracer({
        colorize: false,
        minDurationMs: 1000, // 1 second threshold
      });

      // This span should be very fast (sub-millisecond) and get filtered
      tracer.withSpan("fast-op", () => {});

      expect(logSpy).not.toHaveBeenCalled();
    });

    it("should show spans meeting the minimum duration", () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const tracer = new ConsoleTracer({
        colorize: false,
        minDurationMs: 0, // Show all spans
      });

      tracer.withSpan("any-op", () => {});

      expect(logSpy).toHaveBeenCalled();
    });
  });

  describe("withAttributes", () => {
    it("should create a new tracer instance with default attributes", () => {
      const tracer = new ConsoleTracer({ colorize: false });
      const enriched = tracer.withAttributes({ "service.name": "test" });

      expect(enriched).not.toBe(tracer);
      expect(enriched).toBeInstanceOf(ConsoleTracer);
    });

    it("should include default attributes in span output", () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const tracer = new ConsoleTracer({ colorize: false });
      const enriched = tracer.withAttributes({ "service.name": "my-service" });

      if (enriched instanceof ConsoleTracer) {
        enriched.withSpan("test", () => {});
        const output = logSpy.mock.calls[0][0];
        expect(output).toContain("service.name=my-service");
      }
    });
  });

  describe("startSpan manual usage", () => {
    it("should track active span", () => {
      const vi_logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const tracer = new ConsoleTracer({ colorize: false });
      const span = tracer.startSpan("manual");

      expect(tracer.getActiveSpan()).toBe(span);
      expect(span.isRecording()).toBe(true);

      span.end();
      vi_logSpy.mockRestore();
    });
  });
});

describe("ConsoleTracerAdapter", () => {
  it("should be defined", () => {
    expect(ConsoleTracerAdapter).toBeDefined();
  });
});

describe("createConsoleTracer", () => {
  it("should create a ConsoleTracer instance", () => {
    const tracer = createConsoleTracer({ colorize: false });
    expect(tracer).toBeInstanceOf(ConsoleTracer);
  });

  it("should accept custom options", () => {
    const tracer = createConsoleTracer({
      colorize: true,
      includeTimestamps: false,
      minDurationMs: 5,
      indent: false,
    });
    expect(tracer).toBeInstanceOf(ConsoleTracer);
  });
});

describe("formatSpan utility", () => {
  function createSpanData(overrides: Partial<SpanData> = {}): SpanData {
    return {
      context: {
        traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
        spanId: "00f067aa0ba902b7",
        traceFlags: 1,
      },
      name: "test-span",
      kind: "internal",
      startTime: 1000,
      endTime: 1050,
      status: "unset",
      attributes: {},
      events: [],
      links: [],
      ...overrides,
    };
  }

  it("should format a basic span", () => {
    const output = formatSpan(createSpanData(), 0, { colorize: false });
    expect(output).toContain("[TRACE]");
    expect(output).toContain("test-span");
    expect(output).toContain("50.0ms");
  });

  it("should return undefined when duration is below threshold", () => {
    const output = formatSpan(createSpanData(), 0, { minDurationMs: 100 });
    expect(output).toBeUndefined();
  });

  it("should show checkmark for ok status", () => {
    const output = formatSpan(createSpanData({ status: "ok" }), 0, { colorize: false });
    expect(output).toContain("\u2713");
  });

  it("should show X mark for error status", () => {
    const output = formatSpan(createSpanData({ status: "error" }), 0, { colorize: false });
    expect(output).toContain("\u2717");
  });

  it("should show circle for unset status", () => {
    const output = formatSpan(createSpanData({ status: "unset" }), 0, { colorize: false });
    expect(output).toContain("\u25CB");
  });

  it("should include timestamps when enabled", () => {
    const output = formatSpan(createSpanData(), 0, {
      colorize: false,
      includeTimestamps: true,
    });
    expect(output).toContain("1970-01-01T");
  });

  it("should not include timestamps when disabled", () => {
    const output = formatSpan(createSpanData(), 0, {
      colorize: false,
      includeTimestamps: false,
    });
    expect(output).not.toContain("1970-01-01T");
  });

  it("should indent nested spans", () => {
    const output = formatSpan(createSpanData(), 2, {
      colorize: false,
      indent: true,
    });
    expect(output).toMatch(/^\s+/);
    expect(output).toContain("\u2514\u2500"); // └─
  });

  it("should not indent when indent is false", () => {
    const output = formatSpan(createSpanData(), 2, {
      colorize: false,
      indent: false,
    });
    expect(output).toMatch(/^\[TRACE\]/);
  });

  it("should display attributes", () => {
    const output = formatSpan(
      createSpanData({ attributes: { "http.method": "GET", "http.url": "/api" } }),
      0,
      { colorize: false }
    );
    expect(output).toContain("http.method=GET");
    expect(output).toContain("http.url=/api");
  });

  it("should show error message for error spans", () => {
    const output = formatSpan(
      createSpanData({
        status: "error",
        attributes: { "error.message": "Something went wrong" },
      }),
      0,
      { colorize: false }
    );
    expect(output).toContain("Something went wrong");
  });

  it("should exclude error.* from regular attributes display", () => {
    const output = formatSpan(
      createSpanData({
        status: "error",
        attributes: { "error.message": "fail", "error.stack": "stack trace", "valid.key": "value" },
      }),
      0,
      { colorize: false }
    );
    // The separate attributes section should only show non-error attributes
    const lines = output?.split("\n");
    const attrLine = lines?.find(l => l.includes("valid.key"));
    if (attrLine) {
      expect(attrLine).not.toContain("error.message");
      expect(attrLine).not.toContain("error.stack");
    }
  });
});

describe("colorize utility", () => {
  it("should add ANSI codes when enabled", () => {
    const result = colorize("test", "cyan", true);
    expect(result).toContain("\x1b[36m"); // cyan
    expect(result).toContain("\x1b[0m"); // reset
    expect(result).toContain("test");
  });

  it("should return plain text when disabled", () => {
    const result = colorize("test", "cyan", false);
    expect(result).toBe("test");
  });
});

describe("formatDuration utility", () => {
  it("should format milliseconds", () => {
    expect(formatDuration(12.345)).toBe("12.3ms");
  });

  it("should format seconds for >= 1000ms", () => {
    expect(formatDuration(1234)).toBe("1.2s");
  });

  it("should format sub-millisecond", () => {
    expect(formatDuration(0.123)).toBe("0.1ms");
  });
});
