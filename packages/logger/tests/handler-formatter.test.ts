import { describe, it, expect } from "vitest";
import { LogHandlerPort, LogFormatterPort, getFormatter } from "../src/index.js";
import type { LogEntry } from "../src/index.js";

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    level: "info",
    message: "test message",
    timestamp: new Date("2024-01-15T10:30:00.000Z").getTime(),
    context: {},
    annotations: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Port metadata
// ---------------------------------------------------------------------------

describe("LogHandlerPort", () => {
  it('name is "LogHandler"', () => {
    expect(LogHandlerPort.__portName).toBe("LogHandler");
  });
});

describe("LogFormatterPort", () => {
  it('name is "LogFormatter"', () => {
    expect(LogFormatterPort.__portName).toBe("LogFormatter");
  });
});

// ---------------------------------------------------------------------------
// JSON formatter
// ---------------------------------------------------------------------------

describe("JSON formatter", () => {
  const formatter = getFormatter("json");

  it("produces valid JSON string", () => {
    const output = formatter.format(makeEntry());
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it("includes level, message, timestamp", () => {
    const output = formatter.format(makeEntry());
    const parsed = JSON.parse(output);
    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("test message");
    expect(parsed.timestamp).toBe("2024-01-15T10:30:00.000Z");
  });

  it("flattens context fields to top level", () => {
    const output = formatter.format(
      makeEntry({ context: { correlationId: "cid-123", service: "api" } })
    );
    const parsed = JSON.parse(output);
    expect(parsed.correlationId).toBe("cid-123");
    expect(parsed.service).toBe("api");
    expect(parsed.context).toBeUndefined();
  });

  it("flattens annotation fields to top level", () => {
    const output = formatter.format(
      makeEntry({ annotations: { requestDuration: 42, path: "/health" } })
    );
    const parsed = JSON.parse(output);
    expect(parsed.requestDuration).toBe(42);
    expect(parsed.path).toBe("/health");
    expect(parsed.annotations).toBeUndefined();
  });

  it("includes error name, message, stack when present", () => {
    const err = new Error("something failed");
    const output = formatter.format(makeEntry({ error: err }));
    const parsed = JSON.parse(output);
    expect(parsed.error.name).toBe("Error");
    expect(parsed.error.message).toBe("something failed");
    expect(parsed.error.stack).toBeDefined();
  });

  it("includes traceId and spanId when spans present", () => {
    const output = formatter.format(
      makeEntry({
        spans: [{ traceId: "trace-abc", spanId: "span-def" }],
      })
    );
    const parsed = JSON.parse(output);
    expect(parsed.traceId).toBe("trace-abc");
    expect(parsed.spanId).toBe("span-def");
  });

  it("omits error when not present", () => {
    const output = formatter.format(makeEntry());
    const parsed = JSON.parse(output);
    expect(parsed.error).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Pretty formatter
// ---------------------------------------------------------------------------

describe("Pretty formatter", () => {
  const formatter = getFormatter("pretty");

  it("includes ISO timestamp", () => {
    const output = formatter.format(makeEntry());
    expect(output).toContain("2024-01-15T10:30:00.000Z");
  });

  it("includes aligned level label", () => {
    const outputInfo = formatter.format(makeEntry({ level: "info" }));
    expect(outputInfo).toContain("[ INFO]");

    const outputError = formatter.format(makeEntry({ level: "error" }));
    expect(outputError).toContain("[ERROR]");
  });

  it("includes message", () => {
    const output = formatter.format(makeEntry({ message: "hello world" }));
    expect(output).toContain("hello world");
  });

  it("includes inline JSON annotations when present", () => {
    const output = formatter.format(makeEntry({ annotations: { userId: "u42" } }));
    expect(output).toContain('"userId":"u42"');
  });

  it("appends error message when present", () => {
    const output = formatter.format(makeEntry({ error: new Error("boom") }));
    expect(output).toContain("error=boom");
  });

  it("appends traceId when spans present", () => {
    const output = formatter.format(
      makeEntry({
        spans: [{ traceId: "trace-xyz", spanId: "span-123" }],
      })
    );
    expect(output).toContain("traceId=trace-xyz");
  });
});

// ---------------------------------------------------------------------------
// Minimal formatter
// ---------------------------------------------------------------------------

describe("Minimal formatter", () => {
  const formatter = getFormatter("minimal");

  it("includes only level label and message", () => {
    const output = formatter.format(makeEntry({ level: "warn", message: "disk full" }));
    expect(output).toBe("[ WARN] disk full");
  });

  it("ignores annotations, context, error, spans", () => {
    const output = formatter.format(
      makeEntry({
        level: "error",
        message: "failure",
        context: { correlationId: "abc" },
        annotations: { key: "val" },
        error: new Error("ignored"),
        spans: [{ traceId: "t1", spanId: "s1" }],
      })
    );
    expect(output).toBe("[ERROR] failure");
  });
});

// ---------------------------------------------------------------------------
// getFormatter
// ---------------------------------------------------------------------------

describe("getFormatter", () => {
  it('getFormatter("json") returns JSON formatter', () => {
    const f = getFormatter("json");
    const output = f.format(makeEntry());
    expect(() => JSON.parse(output)).not.toThrow();
    const parsed = JSON.parse(output);
    expect(parsed.level).toBe("info");
  });

  it('getFormatter("pretty") returns pretty formatter', () => {
    const f = getFormatter("pretty");
    const output = f.format(makeEntry());
    expect(output).toContain("2024-01-15T10:30:00.000Z");
    expect(output).toContain("[ INFO]");
    expect(output).toContain("test message");
  });

  it('getFormatter("minimal") returns minimal formatter', () => {
    const f = getFormatter("minimal");
    const output = f.format(makeEntry());
    expect(output).toBe("[ INFO] test message");
  });
});
